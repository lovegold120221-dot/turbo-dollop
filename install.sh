#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────────────────────────
# Beatrice — One-paste installer for macOS and Debian/Ubuntu
# Works on freshly formatted machines with no dev tools installed.
# Usage: bash install.sh
# ─────────────────────────────────────────────────────────────────────────────

set -e

REPO_URL="${BEATRICE_REPO_URL:-https://github.com/lovegold120221-dot/turbo-dollop.git}"
REPO_BRANCH="${BEATRICE_BRANCH:-main}"
INSTALL_DIR="${BEATRICE_INSTALL_DIR:-$HOME/beatrice}"
NODE_VERSION="22"
PYTHON_VERSION_MIN="3.11"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

step()   { echo -e "\n${BLUE}▶ $1${NC}"; }
ok()     { echo -e "${GREEN}✓ $1${NC}"; }
warn()   { echo -e "${YELLOW}⚠ $1${NC}"; }
fail()   { echo -e "${RED}✗ $1${NC}"; exit 1; }

# ─── Detect OS ────────────────────────────────────────────────────────────────
detect_os() {
  if [ -f /etc/os-release ]; then
    . /etc/os-release
    OS_ID="$ID"
  elif [ "$(uname)" = "Darwin" ]; then
    OS_ID="macos"
  else
    fail "Unsupported operating system. Use install.ps1 for Windows."
  fi

  case "$OS_ID" in
    ubuntu|debian|pop|linuxmint|elementary) OS_FAMILY="debian" ;;
    macos|darwin) OS_FAMILY="macos" ;;
    *) fail "Detected OS '$OS_ID' is not supported. Use macOS, Ubuntu, or Debian." ;;
  esac

  echo -e "${BLUE}Detected OS:${NC} $OS_ID (${OS_FAMILY})"
}

# ─── Install system dependencies ──────────────────────────────────────────────
install_deps_debian() {
  step "Installing Debian/Ubuntu system dependencies"
  if [ "$(id -u)" -ne 0 ]; then SUDO="sudo"; else SUDO=""; fi
  $SUDO apt-get update
  $SUDO apt-get install -y --no-install-recommends \
    ca-certificates curl wget git gnupg lsb-release \
    build-essential python3 python3-pip python3-venv \
    libnss3 libatk1.0-0 libatk-bridge2.0-0 libcups2 libdrm2 \
    libxkbcommon0 libxcomposite1 libxdamage1 libxfixes3 libxrandr2 \
    libgbm1 libpango-1.0-0 libcairo2 libasound2t64 \
    chromium chromium-driver fonts-liberation \
    dumb-init unzip nginx ufw certbot python3-certbot-nginx \
    ffmpeg postgresql-client redis-tools
  ok "System packages installed"
}

install_deps_macos() {
  step "Installing macOS dependencies via Homebrew"
  if ! command -v brew >/dev/null 2>&1; then
    step "Installing Homebrew first"
    /bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
    [ -f /opt/homebrew/bin/brew ] && eval "$(/opt/homebrew/bin/brew shellenv)"
    [ -f /usr/local/bin/brew ] && eval "$(/usr/local/bin/brew shellenv)"
  fi
  brew update
  brew install git python@3.11 chromium nginx postgresql@15 ffmpeg supabase/tap/supabase
  ok "System packages installed"
}

# ─── Install PostgreSQL client (psql) for Supabase migrations ───────────────
install_postgres_client() {
  if command -v psql >/dev/null 2>&1; then
    ok "PostgreSQL client already installed: $(psql --version)"
    return
  fi
  step "Installing PostgreSQL client (psql)"
  if [ "$OS_FAMILY" = "debian" ]; then
    if [ "$(id -u)" -ne 0 ]; then SUDO="sudo"; else SUDO=""; fi
    $SUDO apt-get install -y --no-install-recommends postgresql-client
  elif [ "$OS_FAMILY" = "macos" ]; then
    brew install libpq
    brew link --force libpq 2>/dev/null || true
  fi
  ok "PostgreSQL client installed"
}

# ─── Install Supabase CLI (for self-hosted Supabase via Docker) ──────────────
install_supabase_cli() {
  if command -v supabase >/dev/null 2>&1; then
    ok "Supabase CLI already installed: $(supabase --version)"
    return
  fi
  step "Installing Supabase CLI (for self-hosted Supabase + migrations)"
  if [ "$OS_FAMILY" = "debian" ]; then
    if [ "$(id -u)" -ne 0 ]; then SUDO="sudo"; else SUDO=""; fi
    ARCH="$(uname -m)"
    case "$ARCH" in
      x86_64) SB_ARCH="amd64" ;;
      aarch64|arm64) SB_ARCH="arm64" ;;
      *) SB_ARCH="amd64" ;;
    esac
    curl -fsSL "https://github.com/supabase/cli/releases/latest/download/supabase_linux_${SB_ARCH}.tar.gz" -o /tmp/supabase.tar.gz
    tar -xzf /tmp/supabase.tar.gz -C /tmp supabase
    $SUDO mv /tmp/supabase /usr/local/bin/supabase
    $SUDO chmod +x /usr/local/bin/supabase
  elif [ "$OS_FAMILY" = "macos" ]; then
    brew install supabase/tap/supabase
  fi
  command -v supabase >/dev/null 2>&1 || warn "Supabase CLI install reported non-zero"
  ok "Supabase CLI ready"
}

# ─── Install ffmpeg (media transcoding for future media features) ───────────
install_ffmpeg() {
  if command -v ffmpeg >/dev/null 2>&1; then
    ok "ffmpeg already installed: $(ffmpeg -version 2>/dev/null | head -1)"
    return
  fi
  step "Installing ffmpeg (media transcoding)"
  if [ "$OS_FAMILY" = "debian" ]; then
    if [ "$(id -u)" -ne 0 ]; then SUDO="sudo"; else SUDO=""; fi
    $SUDO apt-get install -y --no-install-recommends ffmpeg
  elif [ "$OS_FAMILY" = "macos" ]; then
    brew install ffmpeg
  fi
  ok "ffmpeg installed"
}

# ─── Install WhatsApp Cloud API optional config ─────────────────────────────
install_whatsapp_cloud() {
  step "Configuring WhatsApp Cloud API env variables (optional)"
  cd "$INSTALL_DIR"
  if [ ! -f .env ]; then
    warn "Skipping — .env not yet created"
    return
  fi
  if ! grep -q "^WHATSAPP_CLOUD_PHONE_NUMBER_ID" .env; then
    cat >> .env <<'EOF'

# ── WhatsApp Cloud API (optional — alternative to Baileys) ──
# WHATSAPP_CLOUD_PHONE_NUMBER_ID=
# WHATSAPP_CLOUD_ACCESS_TOKEN=
# WHATSAPP_CLOUD_BUSINESS_ACCOUNT_ID=
# WHATSAPP_CLOUD_WEBHOOK_VERIFY_TOKEN=
EOF
    ok "Added WhatsApp Cloud API env placeholder to .env"
  else
    ok "WhatsApp Cloud API env already present"
  fi
}

# ─── Install Docker Engine + Compose (for containerized services) ────────────
install_docker() {
  if command -v docker >/dev/null 2>&1; then
    ok "Docker already installed: $(docker --version 2>/dev/null || echo 'present')"
  else
    step "Installing Docker Engine + Compose plugin"
    if [ "$OS_FAMILY" = "debian" ]; then
      if [ "$(id -u)" -ne 0 ]; then SUDO="sudo"; else SUDO=""; fi
      $SUDO install -m 0755 -d /etc/apt/keyrings
      curl -fsSL https://download.docker.com/linux/$(. /etc/os-release && echo "$ID")/gpg \
        | $SUDO gpg --dearmor -o /etc/apt/keyrings/docker.gpg
      $SUDO chmod a+r /etc/apt/keyrings/docker.gpg
      echo \
        "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/$(. /etc/os-release && echo "$ID") \
        $(. /etc/os-release && echo "$VERSION_CODENAME") stable" \
        | $SUDO tee /etc/apt/sources.list.d/docker.list >/dev/null
      $SUDO apt-get update
      $SUDO apt-get install -y --no-install-recommends \
        docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
      $SUDO systemctl enable docker 2>/dev/null || true
      $SUDO systemctl start docker 2>/dev/null || true
      # Allow current user to run docker without sudo
      if [ -n "$SUDO_USER" ]; then
        $SUDO usermod -aG docker "$SUDO_USER"
        ok "Added $SUDO_USER to docker group (re-login required for non-root use)"
      fi
    elif [ "$OS_FAMILY" = "macos" ]; then
      brew install --cask docker
      ok "Docker Desktop installed — launch it once to finish setup"
    fi
  fi

  if docker compose version >/dev/null 2>&1; then
    ok "Docker Compose: $(docker compose version)"
  else
    warn "Docker Compose plugin not detected — legacy 'docker-compose' may still work"
  fi
}

# ─── Install Ollama (local model proxy for Hermes, Eburon Coder Pro) ─────────
install_ollama() {
  if command -v ollama >/dev/null 2>&1; then
    ok "Ollama already installed: $(ollama --version 2>/dev/null || echo 'present')"
  else
    step "Installing Ollama"
    if [ "$OS_FAMILY" = "debian" ]; then
      curl -fsSL https://ollama.com/install.sh | sh
    elif [ "$OS_FAMILY" = "macos" ]; then
      brew install ollama
      brew services start ollama 2>/dev/null || ollama serve &
      sleep 3
    fi
    command -v ollama >/dev/null 2>&1 || warn "Ollama install command returned non-zero — continuing"
  fi

  # Ensure Ollama daemon is running before pulling
  if command -v ollama >/dev/null 2>&1; then
    if ! curl -sf http://localhost:11434/api/tags >/dev/null 2>&1; then
      step "Starting Ollama service"
      if [ "$OS_FAMILY" = "debian" ]; then
        if [ "$(id -u)" -eq 0 ]; then
          systemctl enable ollama 2>/dev/null || true
          systemctl start ollama 2>/dev/null || (nohup ollama serve >/var/log/ollama.log 2>&1 &)
        else
          nohup ollama serve >/tmp/ollama.log 2>&1 &
        fi
      else
        brew services start ollama 2>/dev/null || (nohup ollama serve >/tmp/ollama.log 2>&1 &)
      fi
      sleep 5
    fi

    step "Pulling Hermes 3 model (used by Hermes Multitask agent + Eburon Coder Pro fallback)"
    ollama pull hermes3:latest 2>/dev/null || warn "Failed to pull hermes3 — Beatrice will fall back to other agents"
  fi
}

# ─── Install OpenCode CLI skills from eburonhub-skills repo ─────────────────
install_opencode_skills() {
  step "Cloning eburonhub-skills repository for OpenCode CLI skills"
  local SKILLS_DIR="$INSTALL_DIR/.opencode/skills"
  mkdir -p "$SKILLS_DIR"

  if [ -d "$SKILLS_DIR/eburonhub-skills" ]; then
    step "eburonhub-skills already cloned — pulling latest"
    git -C "$SKILLS_DIR/eburonhub-skills" pull --ff-only
  else
    git clone --depth 1 https://github.com/lovegold120221-dot/eburonhub-skills.git "$SKILLS_DIR/eburonhub-skills"
  fi

  # If the repo has a top-level skills/ subdir, symlink its contents into skills/
  if [ -d "$SKILLS_DIR/eburonhub-skills/skills" ]; then
    find "$SKILLS_DIR/eburonhub-skills/skills" -mindepth 1 -maxdepth 1 \
      -exec ln -sfn {} "$SKILLS_DIR/" \;
  fi

  ok "OpenCode skills installed from eburonhub-skills"
}

# ─── Install OpenCode CLI (terminal sub-agent) ───────────────────────────────
install_opencode() {
  if [ -x "$HOME/.opencode/bin/opencode" ] || [ -x "/root/.opencode/bin/opencode" ]; then
    ok "OpenCode CLI already installed"
    return
  fi

  step "Installing OpenCode CLI (terminal sub-agent — 21+ skills)"
  if [ "$OS_FAMILY" = "debian" ]; then
    curl -fsSL https://opencode.ai/install | bash
  elif [ "$OS_FAMILY" = "macos" ]; then
    curl -fsSL https://opencode.ai/install | bash
  fi

  # Move to a stable path expected by server
  OPENCODE_FOUND="$(find "$HOME/.opencode/bin" "/root/.opencode/bin" -name opencode 2>/dev/null | head -1)"
  if [ -n "$OPENCODE_FOUND" ] && [ ! -f /usr/local/bin/opencode ]; then
    if [ "$(id -u)" -eq 0 ]; then
      ln -sf "$OPENCODE_FOUND" /usr/local/bin/opencode
    else
      sudo ln -sf "$OPENCODE_FOUND" /usr/local/bin/opencode
    fi
  fi
  ok "OpenCode CLI installed"
}

# ─── Install Node.js 22 ───────────────────────────────────────────────────────
install_node() {
  if command -v node >/dev/null 2>&1; then
    INSTALLED_NODE_VERSION="$(node -v | sed 's/v//' | cut -d. -f1)"
    if [ "$INSTALLED_NODE_VERSION" -ge "$NODE_VERSION" ]; then
      ok "Node.js $(node -v) already installed"
      return
    fi
    warn "Node.js $(node -v) is older than required v${NODE_VERSION}.x — upgrading"
  fi

  step "Installing Node.js ${NODE_VERSION}.x"

  if [ "$OS_FAMILY" = "debian" ]; then
    if [ "$(id -u)" -ne 0 ]; then SUDO="sudo"; else SUDO=""; fi
    $SUDO mkdir -p /etc/apt/keyrings
    curl -fsSL https://deb.nodesource.com/gpgkey/nodesource-repo.gpg.key | $SUDO gpg --dearmor -o /etc/apt/keyrings/nodesource.gpg
    echo "deb [signed-by=/etc/apt/keyrings/nodesource.gpg] https://deb.nodesource.com/node_${NODE_VERSION}.x nodistro main" \
      | $SUDO tee /etc/apt/sources.list.d/nodesource.list >/dev/null
    $SUDO apt-get update
    $SUDO apt-get install -y nodejs
  elif [ "$OS_FAMILY" = "macos" ]; then
    brew install node@22 || brew upgrade node@22 || true
    brew link --overwrite --force node@22 || true
  fi

  command -v node >/dev/null 2>&1 || fail "Node.js installation failed"
  ok "Node.js $(node -v) installed"
}

# ─── Clone or update repo ────────────────────────────────────────────────────
clone_repo() {
  if [ -d "$INSTALL_DIR/.git" ]; then
    step "Repository already exists at $INSTALL_DIR — pulling latest"
    git -C "$INSTALL_DIR" fetch --all
    git -C "$INSTALL_DIR" reset --hard "origin/${REPO_BRANCH}"
    git -C "$INSTALL_DIR" clean -fdx
  else
    step "Cloning Beatrice repository to $INSTALL_DIR"
    git clone --branch "$REPO_BRANCH" --depth 1 "$REPO_URL" "$INSTALL_DIR"
  fi
  ok "Repository ready at $INSTALL_DIR"
}

# ─── Install npm + Python dependencies ───────────────────────────────────────
install_npm_deps() {
  step "Installing npm dependencies (this can take a few minutes)"
  cd "$INSTALL_DIR"
  npm ci --include=dev
  ok "npm dependencies installed"
}

install_python_deps() {
  step "Setting up Python venv and installing browser-use + Playwright dependencies"
  cd "$INSTALL_DIR"
  if [ ! -d ".venv" ]; then
    python3 -m venv .venv
  fi
  .venv/bin/pip install --upgrade pip
  .venv/bin/pip install -r requirements.txt
  .venv/bin/python -m playwright install chromium 2>/dev/null || true
  ok "Python dependencies installed"
}

# ─── Install PM2 (process manager) ───────────────────────────────────────────
install_pm2() {
  if command -v pm2 >/dev/null 2>&1; then
    ok "PM2 already installed"
    return
  fi
  step "Installing PM2 process manager"
  if [ "$(id -u)" -eq 0 ]; then
    npm install -g pm2
  else
    sudo npm install -g pm2
  fi
  ok "PM2 installed"
}

# ─── Create sandbox directory structure ─────────────────────────────────────
setup_sandbox_dirs() {
  step "Creating sandbox directory structure"
  cd "$INSTALL_DIR"
  if [ "$(id -u)" -eq 0 ]; then SUDO=""; else SUDO="sudo"; fi
  $SUDO mkdir -p \
    /data/baileys \
    /data/beatrice-workspace \
    /data/wa-media \
    /data/workspace \
    "$INSTALL_DIR/baileys_auth"
  $SUDO chown -R "$(whoami)" /data "$INSTALL_DIR/baileys_auth" 2>/dev/null || true
  ok "Sandbox directories ready at /data/*"
}

# ─── Verify all required tools are available ─────────────────────────────────
verify_installation() {
  step "Verifying installed tools"
  local failed=0

  check_cmd() {
    local cmd="$1"
    local label="$2"
    if command -v "$cmd" >/dev/null 2>&1; then
      ok "$label: $(command -v $cmd)"
    else
      warn "MISSING: $label ($cmd)"
      failed=$((failed + 1))
    fi
  }

  check_cmd node    "Node.js"
  check_cmd npm     "npm"
  check_cmd python3 "Python 3"
  check_cmd git     "Git"
  check_cmd docker  "Docker"
  check_cmd psql    "PostgreSQL client (psql)"
  check_cmd ffmpeg  "ffmpeg"
  check_cmd ollama  "Ollama"
  check_cmd opencode "OpenCode CLI"
  check_cmd supabase "Supabase CLI"
  check_cmd pm2     "PM2"

  if docker compose version >/dev/null 2>&1; then
    ok "Docker Compose: $(docker compose version | head -1)"
  else
    warn "Docker Compose plugin not detected (optional — only needed for containerized deployment)"
  fi

  if [ -d "$INSTALL_DIR/.venv" ]; then
    ok "Python venv: $INSTALL_DIR/.venv"
  else
    warn "Python venv missing"
    failed=$((failed + 1))
  fi

  if [ -d "$INSTALL_DIR/dist" ]; then
    ok "Frontend build: $INSTALL_DIR/dist"
  else
    warn "Frontend dist/ missing"
    failed=$((failed + 1))
  fi

  if [ -d "$INSTALL_DIR/.opencode/skills/eburonhub-skills" ]; then
    ok "eburonhub-skills installed"
  else
    warn "eburonhub-skills missing"
    failed=$((failed + 1))
  fi

  if [ -d /data/baileys ] && [ -d /data/wa-media ] && [ -d /data/workspace ]; then
    ok "Sandbox data directories: /data/{baileys,wa-media,workspace}"
  else
    warn "Sandbox data directories missing"
    failed=$((failed + 1))
  fi

  if [ $failed -gt 0 ]; then
    warn "$failed component(s) reported warnings — review above. Beatrice may still run."
  else
    ok "All required components verified"
  fi
}

# ─── Configure .env ──────────────────────────────────────────────────────────
setup_env() {
  cd "$INSTALL_DIR"
  if [ ! -f .env ]; then
    if [ -f .env.whatsapp ]; then
      cp .env.whatsapp .env
      ok "Copied .env.whatsapp to .env"
    elif [ -f .env.example ]; then
      cp .env.example .env
      warn "Created .env from .env.example — fill in your API keys before running"
    else
      fail "No .env template found"
    fi
  else
    ok ".env already exists"
  fi

  if [ ! -f .env.local ] && [ -f .env.local.example ]; then
    cp .env.local.example .env.local
  fi
}

# ─── Build frontend ──────────────────────────────────────────────────────────
build_frontend() {
  step "Building frontend (Vite production build)"
  cd "$INSTALL_DIR"
  npm run build
  ok "Frontend built to dist/"
}

# ─── Start the server ────────────────────────────────────────────────────────
start_server() {
  cd "$INSTALL_DIR"
  step "Starting Beatrice on port 4200"
  if [ "$OS_FAMILY" = "debian" ] && [ "$(id -u)" -ne 0 ]; then
    SUDO="sudo"
  else
    SUDO=""
  fi

  cat > start.sh <<'EOF'
#!/usr/bin/env bash
cd "$(dirname "$0")"
export NODE_ENV=production
export PORT="${PORT:-4200}"
export PUPPETEER_SKIP_DOWNLOAD=true
export PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true
export PLAYWRIGHT_BROWSERS_PATH="$(pwd)/.venv/ms-playwright"
exec node_modules/.bin/tsx server/index.ts
EOF
  chmod +x start.sh
  ok "Created start.sh launcher"

  if command -v systemctl >/dev/null 2>&1 && [ "$OS_FAMILY" = "debian" ] && [ "$(id -u)" -eq 0 ]; then
    step "Installing systemd service for autostart"
    SERVICE_FILE="/etc/systemd/system/beatrice.service"
    cat > "$SERVICE_FILE" <<EOF
[Unit]
Description=Beatrice AI Server
After=network.target

[Service]
Type=simple
User=${SUDO_USER:-$(whoami)}
WorkingDirectory=$INSTALL_DIR
ExecStart=$INSTALL_DIR/start.sh
Restart=on-failure
RestartSec=5
Environment=NODE_ENV=production
Environment=PORT=4200
Environment=PUPPETEER_SKIP_DOWNLOAD=true
Environment=PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true
Environment=PLAYWRIGHT_BROWSERS_PATH=$INSTALL_DIR/.venv/ms-playwright

[Install]
WantedBy=multi-user.target
EOF
    systemctl daemon-reload
    systemctl enable beatrice.service
    systemctl start beatrice.service
    ok "Beatrice running as systemd service — http://localhost:4200"
  else
    warn "Starting in foreground (Ctrl+C to stop). For autostart run:  cd $INSTALL_DIR && ./start.sh &"
    bash start.sh
  fi
}

# ─── Main ────────────────────────────────────────────────────────────────────
main() {
  detect_os

  echo -e "${BLUE}"
  echo "╔════════════════════════════════════════════╗"
  echo "║   Beatrice — One-paste Installer          ║"
  echo "║   macOS · Debian · Ubuntu                  ║"
  echo "╚════════════════════════════════════════════╝"
  echo -e "${NC}"

  step "── STEP 1/14: System packages (apt/brew) ──"
  if [ "$OS_FAMILY" = "debian" ]; then install_deps_debian; fi
  if [ "$OS_FAMILY" = "macos" ]; then install_deps_macos; fi

  step "── STEP 2/14: Node.js ${NODE_VERSION} (apt/brew) ──"
  install_node

  step "── STEP 3/14: Docker Engine + Compose ──"
  install_docker

  step "── STEP 4/14: PostgreSQL client (psql) for Supabase migrations ──"
  install_postgres_client

  step "── STEP 5/14: ffmpeg (media transcoding) ──"
  install_ffmpeg

  step "── STEP 6/14: Clone or update repository ──"
  clone_repo

  step "── STEP 7/14: npm dependencies ──"
  install_npm_deps

  step "── STEP 8/14: Python venv + Playwright/Chromium ──"
  install_python_deps

  step "── STEP 9/14: Ollama (Hermes 3 model) ──"
  install_ollama

  step "── STEP 10/14: OpenCode CLI binary ──"
  install_opencode

  step "── STEP 11/14: OpenCode skills from eburonhub-skills ──"
  install_opencode_skills

  step "── STEP 12/14: Supabase CLI (for self-hosted Supabase) ──"
  install_supabase_cli

  step "── STEP 13/14: PM2 + sandbox dirs + .env + WhatsApp Cloud config + build ──"
  install_pm2
  setup_sandbox_dirs
  setup_env
  install_whatsapp_cloud
  build_frontend

  step "── STEP 14/14: Verify and start ──"
  verify_installation
  start_server

  echo -e "\n${GREEN}"
  echo "╔════════════════════════════════════════════╗"
  echo "║   Beatrice is live at http://localhost:4200  ║"
  echo "╚════════════════════════════════════════════╝"
  echo -e "${NC}"
  echo "  • Open http://localhost:4200 in your browser"
  echo "  • Edit $INSTALL_DIR/.env to add API keys (Supabase, Firebase, Eburon, Google OAuth)"
  echo "  • Restart after editing env:  cd $INSTALL_DIR && ./start.sh"
  echo "  • Logs (systemd):            journalctl -u beatrice -f"
  echo "  • Ollama models:             ollama list"
  echo "  • OpenCode skills:           $INSTALL_DIR/.opencode/skills/"
  echo "  • Docker:                    docker compose version"
  echo "  • Supabase (self-hosted):    cd $INSTALL_DIR && supabase start"
  echo "  • ffmpeg:                    ffmpeg -version"
  echo ""
}

main "$@"

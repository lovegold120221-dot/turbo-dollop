# Beatrice — AI Voice Agent by Eburon AI

Beatrice is a full-stack real-time AI voice and WhatsApp agent built for local development, self-hosted deployment, and production operation. It combines a React/Vite frontend, an Express backend, WhatsApp linked-device support, persistent memory, workspace storage, document generation, browser automation, and an OpenCode-powered sandbox sub-agent.

<p align="center">
  <a href="https://whatsapp.eburon.ai">
    <img src="https://img.shields.io/badge/Live%20App-whatsapp.eburon.ai-8A2BE2?style=for-the-badge" alt="Live App">
  </a>
  <a href="https://github.com/lovegold120221-dot/turbo-dollop">
    <img src="https://img.shields.io/badge/GitHub-turbo--dollop-181717?style=for-the-badge&logo=github" alt="GitHub Repository">
  </a>
</p>

---

## Table of Contents

- [What Beatrice Does](#what-beatrice-does)
- [Architecture](#architecture)
- [Tech Stack](#tech-stack)
- [One-Paste Local Install](#one-paste-local-install)
- [Manual Local Development](#manual-local-development)
- [Environment Configuration](#environment-configuration)
- [Database Setup](#database-setup)
- [Project Structure](#project-structure)
- [Core Features](#core-features)
- [Available Scripts](#available-scripts)
- [WhatsApp Runtime](#whatsapp-runtime)
- [Workspace and File Storage](#workspace-and-file-storage)
- [PWA System](#pwa-system)
- [Deployment](#deployment)
- [Troubleshooting](#troubleshooting)
- [Maintenance](#maintenance)
- [License](#license)

---

## What Beatrice Does

Beatrice is designed as an operational AI assistant that can:

- Hold real-time voice sessions through a browser interface.
- Pair with WhatsApp through Baileys linked-device sessions.
- Read and process WhatsApp messages, contacts, media, documents, and voice notes.
- Generate documents, websites, reports, proposals, forms, dashboards, and app artifacts.
- Store user memory, chat state, settings, and generated outputs.
- Run backend tools for Belgian administrative workflows.
- Use a sandbox sub-agent for coding, browser automation, research, and file operations.
- Sync generated workspace output locally and optionally to Google Drive.
- Run locally, on a VPS, through Docker Compose, or through static frontend deployment plus backend API service.

---

## Architecture

```text
Frontend: React 19 + Vite
  ├─ Realtime voice UI
  ├─ Chat and sandbox page
  ├─ WhatsApp pairing and chat views
  ├─ Profile, settings, memory, theme, and language controls
  ├─ Document viewer and artifact display
  ├─ IndexedDB workspace
  └─ Progressive Web App shell

Backend: Express + Node 22 + tsx
  ├─ REST API and health routes
  ├─ Baileys WhatsApp manager
  ├─ WhatsApp tool dispatch
  ├─ Belgian administrative tools
  ├─ Workspace persistence API
  ├─ OpenCode terminal/sandbox runner
  ├─ Browser automation bridge
  ├─ Local model/Ollama bridge
  ├─ File extraction and media cache
  └─ Production static file server for dist/

Data Layer
  ├─ Supabase/PostgreSQL
  ├─ Firebase Auth
  ├─ IndexedDB local workspace
  ├─ Server filesystem workspace
  ├─ WhatsApp media cache
  └─ Optional Google Drive sync
```

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 19, Vite 6, Tailwind CSS v4, motion, lucide-react |
| Backend | Node.js 22, Express 4, tsx, TypeScript |
| Realtime / Voice | Eburon Core voice/session routes |
| Database | Supabase/PostgreSQL |
| Auth | Firebase Auth |
| WhatsApp | `@whiskeysockets/baileys` |
| Local model runtime | Ollama |
| Sandbox agent | OpenCode CLI with local skills |
| Browser automation | Python venv, browser-use, Playwright Chromium |
| Document/output tools | jsPDF, html2canvas, local workspace storage |
| Deployment | Docker, Docker Compose, PM2, systemd, NGINX-compatible backend |

---

## One-Paste Local Install

The installer is intended for a fresh local machine or VPS and installs the app plus its local runtime dependencies.

### macOS / Debian / Ubuntu

Run this command in Terminal:

```bash
curl -fsSL https://raw.githubusercontent.com/lovegold120221-dot/turbo-dollop/main/bootstrap.sh | BEATRICE_INSTALL_DIR="$HOME/beatrice" bash
```

This downloads `bootstrap.sh`, detects macOS or Linux, downloads `install.sh` from the selected branch, installs local dependencies, clones the repository into `~/beatrice`, builds the frontend, creates a launcher, verifies tools, and starts the backend at:

```text
http://localhost:4200
```

### Windows PowerShell

Run PowerShell as Administrator:

```powershell
irm https://raw.githubusercontent.com/lovegold120221-dot/turbo-dollop/main/install.ps1 | iex
```

The Windows installer uses `%USERPROFILE%\beatrice` by default and creates `start.bat`.

### Optional installer overrides

Install into a custom folder:

```bash
curl -fsSL https://raw.githubusercontent.com/lovegold120221-dot/turbo-dollop/main/bootstrap.sh | BEATRICE_INSTALL_DIR="$HOME/apps/beatrice" bash
```

Install from a different branch:

```bash
curl -fsSL https://raw.githubusercontent.com/lovegold120221-dot/turbo-dollop/main/bootstrap.sh | BEATRICE_BRANCH="main" BEATRICE_INSTALL_DIR="$HOME/beatrice" bash
```

Install from a fork:

```bash
curl -fsSL https://raw.githubusercontent.com/lovegold120221-dot/turbo-dollop/main/bootstrap.sh | \
  BEATRICE_REPO_OWNER="lovegold120221-dot" \
  BEATRICE_REPO_NAME="turbo-dollop" \
  BEATRICE_BRANCH="main" \
  BEATRICE_INSTALL_DIR="$HOME/beatrice" \
  bash
```

### What the one-paste installer installs

| Component | Purpose |
|---|---|
| Git | Clone/update repository |
| Node.js 22 | Frontend and backend runtime |
| npm dependencies | React, Express, Baileys, Supabase, Firebase, Vite, TypeScript |
| Python 3.11 venv | Browser automation tooling |
| Playwright Chromium | Browser-use automation runtime |
| Docker + Compose | Containerized runtime/deployment support |
| PostgreSQL client | Supabase migration/client support |
| Supabase CLI | Local Supabase development support |
| ffmpeg | Audio/media processing |
| Ollama | Local model runtime bridge |
| OpenCode CLI | Sandbox sub-agent runtime |
| PM2 | Process management |
| `/data/*` directories | Local server storage for workspace/media/session files |

### After install

Edit your environment file:

```bash
nano ~/beatrice/.env
```

Then restart:

```bash
cd ~/beatrice
./start.sh
```

On Windows:

```powershell
cd $env:USERPROFILE\beatrice
.\start.bat
```

---

## Manual Local Development

Use this path when you already have Node.js, Git, Python, and local tooling installed.

```bash
git clone https://github.com/lovegold120221-dot/turbo-dollop.git
cd turbo-dollop
npm ci
cp .env.example .env
npm run dev:full
```

Development URLs:

```text
Frontend: http://localhost:3000
Backend:  http://localhost:4200
Health:   http://localhost:4200/api/health
```

Run frontend and backend separately:

```bash
npm run dev
npm run dev:api
```

Production-style local run:

```bash
npm run build
PORT=4200 NODE_ENV=production npm start
```

---

## Environment Configuration

Create `.env` from `.env.example` and set the runtime values used by your installation.

```bash
cp .env.example .env
```

### Required for normal app operation

| Variable | Required | Used by | Purpose |
|---|---:|---|---|
| `EBURON_CORE_KEY` | Yes | Backend | Core AI session, text, voice, vision, transcription routes |
| `VITE_SUPABASE_URL` | Yes | Frontend build | Public Supabase project endpoint |
| `VITE_SUPABASE_ANON_KEY` | Yes | Frontend build | Public Supabase anon key |
| `SUPABASE_URL` | Recommended | Backend | Server-side Supabase endpoint |
| `SUPABASE_PUBLISHABLE_KEY` | Recommended | Backend | Server-side Supabase publishable/anon key |
| `SUPABASE_SERVICE_ROLE_KEY` | Optional/admin | Backend repositories | Admin database operations where enabled |
| `VITE_FIREBASE_API_KEY` | Yes | Frontend build | Firebase Auth |
| `VITE_FIREBASE_AUTH_DOMAIN` | Yes | Frontend build | Firebase Auth domain |
| `VITE_FIREBASE_PROJECT_ID` | Yes | Frontend build | Firebase project |
| `VITE_FIREBASE_STORAGE_BUCKET` | Yes | Frontend build | Firebase storage bucket |
| `VITE_FIREBASE_MESSAGING_SENDER_ID` | Yes | Frontend build | Firebase sender ID |
| `VITE_FIREBASE_APP_ID` | Yes | Frontend build | Firebase app ID |
| `GOOGLE_CLIENT_ID` | Optional | Frontend/backend | Google OAuth / Drive flows |
| `GOOGLE_CLIENT_SECRET` | Optional | Frontend/backend | Google OAuth / Drive flows |
| `PORT` | Optional | Backend | Defaults to `4200` |
| `VITE_BACKEND_URL` | Optional | Frontend | Defaults to `http://localhost:4200` locally |
| `VITE_SANDBOX_URL` | Optional | Frontend | Defaults to backend URL locally |

### WhatsApp and workspace variables

| Variable | Default | Purpose |
|---|---|---|
| `WA_AUTH_ROOT` | `./baileys_auth` locally, `/data/baileys` in Docker | Baileys linked-device session storage |
| `WA_LOG_LEVEL` | `info` locally, `silent` in Docker | WhatsApp logger level |
| `WA_SYNC_FULL_HISTORY` | `true` in WhatsApp env | Enables larger history sync behavior |
| `WA_HISTORY_LIMIT` | `50000` in WhatsApp env | Maximum local history fetch target |
| `WA_HISTORY_RESPONSE_LIMIT` | `2000` | Maximum response window for history APIs |
| `WA_MEDIA_CACHE_DIR` | `/data/wa-media` | WhatsApp downloaded media cache |
| `WORKSPACE_DATA_DIR` | `/data/workspace` | Server JSON workspace storage |
| `BEATRICE_WORKSPACE_DIR` | `/data/beatrice-workspace` | Generated artifact workspace |
| `BEATRICE_PUBLIC_URL` | Production domain | Public base URL for generated/media links |

### Local model and sandbox variables

| Variable | Default | Purpose |
|---|---|---|
| `OLLAMA_BASE_URL` | `http://localhost:11434` | Ollama API endpoint |
| `OPENCODE_PATH` | `/root/.opencode/bin/opencode` | OpenCode binary path |
| `OPENCODE_MODEL` | Configured Eburon sandbox model alias | Sandbox model selection |
| `OPEN_TERMINAL_WORKDIR` | Repository root | Working directory for terminal tasks |
| `CEREBRAS_API_KEY` | Empty | Browser automation integration |
| `CEREBRAS_PYTHON` | `.venv/bin/python3` | Python runtime for browser scripts |

---

## Database Setup

### Remote Supabase

Apply the SQL files through the Supabase SQL editor in this order when using the legacy root migrations:

```text
supabase-migration.sql
supabase-migration-settings.sql
supabase-migration-memories.sql
supabase-migration-memory-v2.sql
supabase-migration-fix-rls.sql
websites-migration.sql
```

### Supabase CLI local development

The repository also includes Supabase CLI structure under `supabase/`.

```bash
supabase start
supabase db reset
supabase migration up
```

Useful local Supabase URLs:

```text
API:    http://127.0.0.1:54321
Studio: http://127.0.0.1:54323
```

Stop local Supabase:

```bash
supabase stop
```

---

## Project Structure

```text
.
├── bootstrap.sh                         # Universal curl bootstrap for macOS/Linux
├── install.sh                           # macOS/Linux full local installer
├── install.ps1                          # Windows full local installer
├── package.json                         # npm scripts and dependencies
├── vite.config.ts                       # Vite + React + Tailwind configuration
├── tsconfig.json                        # TypeScript configuration
├── Dockerfile                           # Generic production image
├── Dockerfile.whatsapp                  # WhatsApp/backend production image
├── docker-compose.whatsapp.yml          # WhatsApp backend compose runtime
├── docker-compose.dokploy.yml           # Dokploy-compatible deployment compose
├── ecosystem.config.cjs                 # PM2 production runtime
├── ecosystem.config.selfhosted.cjs      # PM2 self-hosted runtime
├── firebase.json                        # Firebase Hosting configuration
├── functions/                           # Firebase Functions proxy/runtime
├── public/                              # Static assets, PWA manifest, service worker
├── scripts/                             # Smoke checks and browser automation scripts
├── server/                              # Express backend, WhatsApp, tools, DB repos
├── src/                                 # React frontend application
├── supabase/                            # Supabase CLI config and migrations
├── *.sql                                # Root SQL migration helpers
└── README.md                            # Project documentation
```

### Frontend highlights

```text
src/
├── components/
│   ├── BeatriceAgent.tsx                # Main voice/session/tool lifecycle
│   ├── ChatPage.tsx                     # Text chat and sandbox display
│   ├── VideoPage.tsx                    # Camera/screen-sharing page
│   ├── ProfilePage.tsx                  # Persona, memory, language, theme controls
│   ├── AuthPage.tsx                     # Login/register UI
│   ├── WhatsApp*.tsx                    # WhatsApp pairing, onboarding, settings, chats
│   ├── DocumentViewer.tsx               # Artifact/log viewer
│   ├── PWAInstallPrompt.tsx             # PWA installation prompt
│   └── PWAUpdatePrompt.tsx              # PWA update prompt
├── hooks/usePWA.ts                      # PWA registration/update lifecycle
├── lib/audio.ts                         # Audio streaming and recording helpers
├── lib/supabase.ts                      # Browser Supabase client
├── lib/workspace.ts                     # IndexedDB workspace utilities
├── lib/whatsappClient.ts                # Browser WhatsApp API client
├── firebase.ts                          # Firebase initialization
├── constants.ts                         # Language and shared constants
├── version.ts                           # App version metadata
└── index.css                            # Tailwind/theme system
```

### Backend highlights

```text
server/
├── index.ts                             # Main Express API server
├── whatsapp.ts                          # Baileys session manager and media handling
├── whatsapp-tools.ts                    # WhatsApp tool routing and permissions
├── belgian-tools.ts                     # Belgian administrative utilities
├── file-extractor.ts                    # File/media content extraction
├── eburon-provider.ts                   # Eburon provider adapter
├── supabase.ts                          # Server Supabase client
└── db/
    ├── admin.ts                         # Admin Supabase client
    ├── server.ts                        # Server Supabase client helpers
    ├── workspace-storage.ts             # Filesystem workspace persistence
    └── repositories/                    # Messages, memory, media, settings repos
```

---

## Core Features

### Real-time voice agent

- Browser-based voice session UI.
- AudioWorklet-based audio processing.
- Interruption-aware conversational loop.
- Voice/persona configuration through the profile interface.
- Language-aware runtime behavior.

### WhatsApp integration

- Baileys linked-device pairing.
- QR/OTP pairing UI flow.
- Session persistence through `WA_AUTH_ROOT`.
- Media cache for images, audio, and documents.
- WhatsApp chat list and message retrieval routes.
- Tool dispatch layer for sending messages and reading history.

### Memory and profile

- User settings and profile preferences.
- Persistent memory records.
- Context-size controls.
- Theme and language preferences.
- Memory repository layer under `server/db/repositories`.

### Workspace and artifact generation

- Local IndexedDB workspace in the browser.
- Server filesystem workspace backup.
- Generated document/artifact storage.
- Optional Google Drive sync flow.
- Artifact viewer through `DocumentViewer`.

### Sandbox sub-agent

- OpenCode CLI integration.
- Configurable working directory.
- Local skills folder under `.opencode/skills`.
- Terminal-style progressive logs.
- Coding, browser, research, and artifact-generation support.

### Belgian administrative tools

Includes routes/utilities for Belgian administrative workflows such as business lookup, VAT validation, invoicing support, tax calendar assistance, registration tax calculations, language bridging, social security navigation, labor-law simplification, and mobility planning.

---

## Available Scripts

| Command | Purpose |
|---|---|
| `npm run dev` | Start Vite frontend on port `3000` |
| `npm run dev:api` | Start Express backend on port `4200` |
| `npm run dev:full` | Start backend and frontend together |
| `npm run build` | Build frontend into `dist/` |
| `npm run preview` | Preview Vite production build |
| `npm run start` | Start backend with `tsx server/index.ts` |
| `npm run lint` | TypeScript check with `tsc --noEmit` |
| `npm run clean` | Remove `dist/` |
| `npm run docker:whatsapp:build` | Build WhatsApp Docker image |
| `npm run docker:whatsapp:up` | Start WhatsApp Docker Compose runtime |
| `npm run docker:whatsapp:down` | Stop WhatsApp Docker Compose runtime |
| `npm run smoke:whatsapp` | Run WhatsApp server smoke check |
| `npm run db:start` | Start local Supabase |
| `npm run db:stop` | Stop local Supabase |
| `npm run db:reset` | Reset local Supabase database |
| `npm run db:migrate` | Apply local Supabase migrations |
| `npm run db:studio` | Print Supabase Studio URL |
| `npm run check:eburon-branding` | Check branding constraints |

---

## WhatsApp Runtime

### Local linked-device runtime

1. Start the backend.
2. Open the app.
3. Go to the WhatsApp pairing screen.
4. Pair using the QR/OTP flow.
5. Keep `WA_AUTH_ROOT` persisted so the session survives restarts.

Default local values:

```env
WA_AUTH_ROOT=./baileys_auth
WA_LOG_LEVEL=info
VITE_BACKEND_URL=http://localhost:4200
VITE_SANDBOX_URL=http://localhost:4200
```

### Docker WhatsApp runtime

Create `.env.whatsapp` from `.env.whatsapp.example`:

```bash
cp .env.whatsapp.example .env.whatsapp
```

Build and start:

```bash
npm run build
docker compose -f docker-compose.whatsapp.yml up -d --build
```

Stop:

```bash
docker compose -f docker-compose.whatsapp.yml down
```

Logs:

```bash
docker logs -f voxx-zero-whatsapp
```

Health check:

```bash
curl http://localhost:4200/api/health
```

---

## Workspace and File Storage

| Storage | Default | Purpose |
|---|---|---|
| Browser IndexedDB | Browser profile | Fast local workspace state |
| Server workspace JSON | `/data/workspace` | Backend backup of generated outputs |
| Beatrice workspace | `/data/beatrice-workspace` | Generated documents/sites/apps |
| WhatsApp auth | `/data/baileys` or `./baileys_auth` | Linked-device credentials |
| WhatsApp media | `/data/wa-media` | Downloaded images/audio/documents |
| Google Drive | `Beatrice_Workspace` | Optional cloud sync destination |

For local install, the installer creates:

```text
/data/baileys
/data/beatrice-workspace
/data/wa-media
/data/workspace
~/beatrice/baileys_auth
```

---

## PWA System

Beatrice includes an installable Progressive Web App shell.

- `public/manifest.json` defines install metadata.
- `public/sw.js` handles static caching and update detection.
- `src/hooks/usePWA.ts` registers the service worker.
- `src/version.ts` stores the app version/build metadata.
- `PWAInstallPrompt` and `PWAUpdatePrompt` handle user-facing install/update banners.

Update version before a new release:

```ts
export const APP_VERSION = '1.0.1';
export const APP_BUILD = 2;
```

Then rebuild:

```bash
npm run build
```

---

## Deployment

### Production backend / VPS

```bash
npm ci
npm run build
PORT=4200 NODE_ENV=production npm start
```

Recommended process manager:

```bash
pm2 start ecosystem.config.cjs
pm2 save
pm2 logs
```

### Docker Compose

```bash
npm run build
docker compose -f docker-compose.whatsapp.yml up -d --build
```

### Dokploy

Use `docker-compose.dokploy.yml` or the included Dockerfile depending on how the Dokploy app is configured. Build the frontend before deploying Docker images that copy `dist/`.

### Firebase Hosting

```bash
npm run build
firebase deploy --only hosting
```

### Firebase Functions

```bash
npm --prefix functions install
npm --prefix functions run build
firebase deploy --only functions
```

### Vercel / Render

The repository includes:

```text
vercel.json
render.yaml
```

Use these for alternative static/frontend or web-service deployments.

---

## Troubleshooting

### Installer starts but skips Linux/macOS dependency steps

Make sure `install.sh` calls `detect_os` at the start of `main()`:

```bash
grep -n "detect_os" install.sh
```

Expected result should include one line inside the function definition and one line inside `main()`.

### Port 4200 already in use

```bash
lsof -i :4200
PORT=4300 npm start
```

If changing the backend port, also update frontend environment values:

```env
VITE_BACKEND_URL=http://localhost:4300
VITE_SANDBOX_URL=http://localhost:4300
```

### Frontend opens but backend calls fail

Check backend health:

```bash
curl http://localhost:4200/api/health
```

Check local `.env` values:

```bash
cat .env | grep -E "VITE_BACKEND_URL|VITE_SANDBOX_URL|PORT"
```

### Supabase errors in browser

Confirm these values exist before building the frontend:

```env
VITE_SUPABASE_URL=
VITE_SUPABASE_ANON_KEY=
```

Then rebuild:

```bash
npm run build
```

### Server-side Supabase operations fail

Confirm backend values exist:

```env
SUPABASE_URL=
SUPABASE_PUBLISHABLE_KEY=
SUPABASE_SERVICE_ROLE_KEY=
```

Restart backend after editing `.env`.

### WhatsApp session is lost after restart

Confirm `WA_AUTH_ROOT` points to a persistent folder:

```env
WA_AUTH_ROOT=./baileys_auth
```

For Docker, confirm the `whatsapp_auth` volume exists:

```bash
docker volume ls | grep whatsapp_auth
```

### Playwright or browser automation fails

Reinstall Python browser dependencies:

```bash
cd ~/beatrice
.venv/bin/pip install -r requirements.txt
.venv/bin/python -m playwright install chromium
```

### Docker command requires sudo on Linux

Add your user to the Docker group and re-login:

```bash
sudo usermod -aG docker "$USER"
```

### PM2 logs

```bash
pm2 logs
pm2 status
```

### systemd logs on Linux root install

```bash
journalctl -u beatrice -f
```

---

## Maintenance

### Update local install

```bash
cd ~/beatrice
git fetch --all
git reset --hard origin/main
git clean -fdx
npm ci
npm run build
./start.sh
```

Or rerun the one-paste installer:

```bash
curl -fsSL https://raw.githubusercontent.com/lovegold120221-dot/turbo-dollop/main/bootstrap.sh | BEATRICE_INSTALL_DIR="$HOME/beatrice" bash
```

### Rebuild Docker runtime

```bash
npm run build
docker compose -f docker-compose.whatsapp.yml down
docker compose -f docker-compose.whatsapp.yml up -d --build
```

### Backup local runtime data

```bash
tar -czf beatrice-data-backup.tgz \
  ~/beatrice/.env \
  ~/beatrice/baileys_auth \
  /data/baileys \
  /data/beatrice-workspace \
  /data/wa-media \
  /data/workspace
```

### Clean generated build output

```bash
npm run clean
npm run build
```

---

## Security Notes

- Keep `.env`, WhatsApp auth folders, Supabase service keys, and OAuth credentials private.
- Do not commit live secrets.
- Review remote installer scripts before running them on production systems.
- Use HTTPS and a reverse proxy for public deployments.
- Keep `/data/baileys` and WhatsApp session storage backed up but protected.
- Run production deployments behind a process manager and firewall.

---

## License

Private Project — Eburon AI / Beatrice.

Built by Eburon AI.

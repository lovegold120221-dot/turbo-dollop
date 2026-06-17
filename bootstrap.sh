#!/usr/bin/env bash
# -----------------------------------------------------------------------------
# Beatrice - Universal one-paste bootstrap
# Detects macOS/Linux, downloads install.sh from the selected branch, and runs it.
# -----------------------------------------------------------------------------

set -e

REPO_OWNER="${BEATRICE_REPO_OWNER:-lovegold120221-dot}"
REPO_NAME="${BEATRICE_REPO_NAME:-turbo-dollop}"
REPO_BRANCH="${BEATRICE_BRANCH:-main}"
REPO_RAW_URL="${BEATRICE_RAW_URL:-https://raw.githubusercontent.com/${REPO_OWNER}/${REPO_NAME}/${REPO_BRANCH}}"
export BEATRICE_REPO_URL="${BEATRICE_REPO_URL:-https://github.com/${REPO_OWNER}/${REPO_NAME}.git}"
export BEATRICE_BRANCH

echo "Beatrice - one-paste local installer"
echo "Repository: ${BEATRICE_REPO_URL}"
echo "Branch:     ${BEATRICE_BRANCH}"
echo "Raw URL:    ${REPO_RAW_URL}"
echo "Detecting OS..."

UNAME="$(uname -s 2>/dev/null || echo unknown)"
INSTALLER="/tmp/beatrice-install.sh"

case "$UNAME" in
  Darwin)
    echo "macOS detected"
    curl -fsSL "${REPO_RAW_URL}/install.sh" -o "$INSTALLER"
    bash "$INSTALLER"
    ;;
  Linux)
    if [ -f /etc/os-release ]; then
      . /etc/os-release
      echo "Linux detected: ${ID:-unknown} ${VERSION_ID:-unknown}"
    else
      echo "Linux detected"
    fi
    curl -fsSL "${REPO_RAW_URL}/install.sh" -o "$INSTALLER"
    bash "$INSTALLER"
    ;;
  *)
    echo "Unsupported OS: $UNAME"
    echo "For Windows, run PowerShell as Administrator:"
    echo "irm https://raw.githubusercontent.com/${REPO_OWNER}/${REPO_NAME}/${REPO_BRANCH}/install.ps1 | iex"
    exit 1
    ;;
esac

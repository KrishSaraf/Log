#!/usr/bin/env bash
# Shared helpers for the Cloud Agent environment. Sourced by install/start/dev scripts.
# Keep this idempotent and side-effect free beyond exporting environment variables.

set -euo pipefail

# Repo root is the parent of this .cursor directory.
REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

# Node version this repo targets (see replit.md / .replit -> nodejs-24).
export NODE_MAJOR="24"

# Database connection shared by the api-server and the dashboard.
# The dashboard reads the shared `public.exercises` table and manages its own
# `hub` schema in the same database.
export PGHOST="${PGHOST:-localhost}"
export PGPORT="${PGPORT:-5432}"
export DB_ROLE="${DB_ROLE:-app}"
export DB_PASSWORD="${DB_PASSWORD:-app}"
export DB_NAME="${DB_NAME:-log_all}"
export DATABASE_URL="${DATABASE_URL:-postgresql://${DB_ROLE}:${DB_PASSWORD}@${PGHOST}:${PGPORT}/${DB_NAME}}"

# Put nvm's Node on PATH ahead of any harness-provided node so we honor Node 24.
use_node() {
  export NVM_DIR="${NVM_DIR:-$HOME/.nvm}"
  if [ -s "$NVM_DIR/nvm.sh" ]; then
    # shellcheck disable=SC1091
    . "$NVM_DIR/nvm.sh"
    nvm use "$NODE_MAJOR" >/dev/null 2>&1 || true
    local bin
    bin="$(nvm which "$NODE_MAJOR" 2>/dev/null | xargs -r dirname || true)"
    if [ -n "${bin:-}" ]; then
      export PATH="$bin:$PATH"
    fi
  fi
}

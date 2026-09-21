#!/usr/bin/env bash
# Launches one of the long-running dev servers with the correct Node version and
# environment. Used by the `terminals` entries in environment.json.
#   dev.sh api-server   -> Express API on :3000
#   dev.sh web          -> lyfta-exercises Vite app on :5173 (proxies /api -> :3000)
#   dev.sh dashboard    -> Next.js dashboard on :3001

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck disable=SC1091
. "$SCRIPT_DIR/lib.sh"
use_node

target="${1:-}"
case "$target" in
  api-server)
    export PORT=3000
    export NODE_ENV=development
    cd "$REPO_ROOT/artifacts/api-server"
    exec pnpm run dev
    ;;
  web)
    export PORT=5173
    export BASE_PATH=/
    export API_URL=http://localhost:3000
    cd "$REPO_ROOT/artifacts/lyfta-exercises"
    exec pnpm run dev
    ;;
  dashboard)
    cd "$REPO_ROOT/dashboard"
    exec npm run dev
    ;;
  *)
    echo "usage: dev.sh {api-server|web|dashboard}" >&2
    exit 2
    ;;
esac

#!/usr/bin/env bash
# Per-boot startup: make sure PostgreSQL is running before the dev servers start.
# Idempotent and safe to run on every boot.

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck disable=SC1091
. "$SCRIPT_DIR/lib.sh"

echo "==> Starting PostgreSQL cluster"
sudo pg_ctlcluster 16 main start 2>/dev/null || sudo service postgresql start || true

for _ in $(seq 1 30); do
  if sudo -u postgres pg_isready -q; then
    echo "    PostgreSQL is accepting connections"
    exit 0
  fi
  sleep 1
done

echo "PostgreSQL did not become ready in time" >&2
exit 1

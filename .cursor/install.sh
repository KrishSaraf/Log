#!/usr/bin/env bash
# Idempotent repository bootstrap for the Cloud Agent environment.
# Prepares Node 24, PostgreSQL 16, workspace + dashboard dependencies, the
# database schema, and seed data. Safe to run repeatedly.

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck disable=SC1091
. "$SCRIPT_DIR/lib.sh"

echo "==> Ensuring Node ${NODE_MAJOR} via nvm"
export NVM_DIR="${NVM_DIR:-$HOME/.nvm}"
if [ ! -s "$NVM_DIR/nvm.sh" ]; then
  echo "nvm not found at $NVM_DIR; installing nvm"
  curl -fsSL https://raw.githubusercontent.com/nvm-sh/nvm/v0.40.1/install.sh | bash
fi
# shellcheck disable=SC1091
. "$NVM_DIR/nvm.sh"
nvm install "$NODE_MAJOR" >/dev/null
nvm alias default "$NODE_MAJOR" >/dev/null
use_node
echo "    node $(node --version)"

echo "==> Enabling pnpm via corepack"
corepack enable >/dev/null 2>&1 || true
corepack prepare pnpm@10.33.3 --activate >/dev/null 2>&1 || true
echo "    pnpm $(pnpm --version)"

echo "==> Ensuring PostgreSQL 16 is installed"
if ! command -v pg_ctlcluster >/dev/null 2>&1; then
  sudo apt-get update -y
  sudo DEBIAN_FRONTEND=noninteractive apt-get install -y postgresql-16 postgresql-client-16
fi

echo "==> Starting PostgreSQL cluster"
sudo pg_ctlcluster 16 main start 2>/dev/null || sudo service postgresql start || true
# Wait for the server to accept connections.
for _ in $(seq 1 30); do
  if sudo -u postgres pg_isready -q; then break; fi
  sleep 1
done

echo "==> Ensuring database role and database exist"
sudo -u postgres psql -v ON_ERROR_STOP=1 <<SQL
DO \$\$ BEGIN
  IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = '${DB_ROLE}') THEN
    CREATE ROLE ${DB_ROLE} LOGIN PASSWORD '${DB_PASSWORD}' CREATEDB;
  END IF;
END \$\$;
SQL
if ! sudo -u postgres psql -tAc "SELECT 1 FROM pg_database WHERE datname='${DB_NAME}'" | grep -q 1; then
  sudo -u postgres createdb -O "${DB_ROLE}" "${DB_NAME}"
fi

echo "==> Installing workspace dependencies (pnpm)"
cd "$REPO_ROOT"
pnpm install

echo "==> Building shared library type declarations"
# Stale committed *.tsbuildinfo files make an incremental build skip emitting
# the lib dist/*.d.ts that packages reference; force a clean declaration build.
find "$REPO_ROOT" -name "*.tsbuildinfo" -not -path "*/node_modules/*" -delete 2>/dev/null || true
pnpm exec tsc --build --force

echo "==> Applying database schema (workspace api-server)"
pnpm --filter @workspace/db run push

echo "==> Seeding the exercise library if empty"
COUNT="$(PGPASSWORD="${DB_PASSWORD}" psql -h "${PGHOST}" -U "${DB_ROLE}" -d "${DB_NAME}" -tAc "SELECT count(*) FROM exercises;" 2>/dev/null || echo 0)"
if [ "${COUNT:-0}" -lt 1 ]; then
  curl -fsSL https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/dist/exercises.json -o /tmp/exercises.json
  pnpm --filter @workspace/scripts run seed-exercises
else
  echo "    exercises already seeded (${COUNT} rows)"
fi

echo "==> Installing dashboard dependencies (npm)"
cd "$REPO_ROOT/dashboard"
if [ ! -f .env.local ]; then
  echo "    creating dashboard/.env.local"
  SECRET="$(node -e "console.log(require('crypto').randomBytes(32).toString('base64'))")"
  cat > .env.local <<EOF
DATABASE_URL=${DATABASE_URL}
AUTH_SECRET=${SECRET}
AUTH_URL=http://localhost:3001
AUTH_DEV_LOGIN=1
NEXT_PUBLIC_AUTH_DEV_LOGIN=1
NVIDIA_BASE_URL=https://integrate.api.nvidia.com/v1
NVIDIA_VISION_MODEL=meta/llama-3.2-11b-vision-instruct
EOF
fi
npm install

echo "==> Applying dashboard schema (hub)"
npm run db:push

echo "==> Install complete"

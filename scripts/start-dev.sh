#!/usr/bin/env bash
# ─── THS-THM Dev Stack Starter ─────────────────────────────
# Starts the full development environment:
#   1. PostgreSQL (via Docker Compose)
#   2. Prisma migrations
#   3. API server (NestJS, watch mode)
#   4. Web server (Next.js, dev mode)
#
# Usage:
#   ./scripts/start-dev.sh            # start all services
#   ./scripts/start-dev.sh --db-only  # start database only
#   ./scripts/start-dev.sh --no-web   # start DB + API, skip web
# ────────────────────────────────────────────────────────────

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT_DIR"

# ─── Colors ─────────────────────────────────────────────────
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

log()   { echo -e "${GREEN}[✓]${NC} $1"; }
info()  { echo -e "${BLUE}[i]${NC} $1"; }
warn()  { echo -e "${YELLOW}[!]${NC} $1"; }
error() { echo -e "${RED}[✗]${NC} $1"; }

# ─── Parse args ─────────────────────────────────────────────
DB_ONLY=false
NO_WEB=false
for arg in "$@"; do
  case "$arg" in
    --db-only) DB_ONLY=true ;;
    --no-web)  NO_WEB=true  ;;
    --help|-h)
      echo "Usage: $0 [--db-only] [--no-web]"
      exit 0
      ;;
  esac
done

# ─── Pre-checks ─────────────────────────────────────────────
info "Checking prerequisites…"

if ! command -v docker &>/dev/null; then
  error "Docker is not installed. Please install Docker Desktop."
  exit 1
fi

if ! docker info &>/dev/null; then
  error "Docker daemon is not running. Start Docker and try again."
  exit 1
fi

if ! command -v pnpm &>/dev/null; then
  warn "pnpm not found. Installing via corepack…"
  corepack enable
  corepack prepare pnpm@latest --activate
fi

log "Prerequisites OK"

# ─── 1. Start PostgreSQL ────────────────────────────────────
echo ""
info "[1/4] Starting PostgreSQL…"

if docker ps --format '{{.Names}}' 2>/dev/null | grep -q 'ths-thm-system-db'; then
  log "PostgreSQL is already running"
else
  info "Starting PostgreSQL container…"
  docker compose up -d postgres
  log "PostgreSQL started (port 54321)"
fi

if [ "$DB_ONLY" = true ]; then
  echo ""
  log "Database is running. Exiting (--db-only)."
  exit 0
fi

# ─── 2. Install dependencies + Prisma ───────────────────────
echo ""
info "[2/4] Installing dependencies…"

if [ ! -d "node_modules" ]; then
  pnpm install
  log "Dependencies installed"
else
  log "node_modules found, skipping install"
fi

info "Generating Prisma client & applying migrations…"
pnpm --filter @ths-thm/api exec prisma generate
info "Applying pending migrations…"
pnpm --filter @ths-thm/api exec prisma migrate deploy 2>/dev/null || \
  warn "No pending migrations or DB not ready yet — API will handle this on startup"

log "Database schema ready"

# ─── 3. Start API server ────────────────────────────────────
echo ""
info "[3/4] Starting API server (NestJS)…"

# Check if port 3001 is in use
if (echo >/dev/tcp/localhost/3001) 2>/dev/null; then
  warn "Port 3001 is already in use — skipping API start"
  API_PID=""
else
  cd apps/api
  # Check if dist exists and is fresh
  if [ ! -f "dist/main.js" ]; then
    info "Building API…"
    npx nest build
    log "API build complete"
  fi

  # Start in background
  npx nest start --watch &
  API_PID=$!
  cd "$ROOT_DIR"
fi

# Wait for API to be ready
for i in $(seq 1 30); do
  if curl -s http://localhost:3001/api/health >/dev/null 2>&1; then
    log "API server ready (port 3001, PID $API_PID)"
    break
  fi
  if [ "$i" -eq 30 ]; then
    warn "API server did not start within 30s — check logs with: docker logs ths-thm-system-api"
  fi
  sleep 1
done

if [ "$NO_WEB" = true ]; then
  echo ""
  log "API is running. Exiting (--no-web)."
  log "  API:  http://localhost:3001"
  log "  Docs: http://localhost:3001/api/docs"
  exit 0
fi

# ─── 4. Start Web dev server ────────────────────────────────
echo ""
info "[4/4] Starting Web dev server (Next.js)…"

# Check if port 3000 is in use
if (echo >/dev/tcp/localhost/3000) 2>/dev/null; then
  warn "Port 3000 is already in use — skipping web start"
  WEB_PID=""
else
  cd apps/web
  npx next dev -p 3000 &
  WEB_PID=$!
  cd "$ROOT_DIR"
fi

# Wait for web to be ready
for i in $(seq 1 30); do
  if curl -s -o /dev/null -w '%{http_code}' http://localhost:3000/login 2>/dev/null | grep -q '200'; then
    log "Web dev server ready (port 3000, PID $WEB_PID)"
    break
  fi
  if [ "$i" -eq 30 ]; then
    warn "Web server did not start within 30s"
  fi
  sleep 1
done

# ─── Summary ────────────────────────────────────────────────
echo ""
echo "═══════════════════════════════════════════════════"
log "Full development stack is running!"
echo ""
log "  Frontend: http://localhost:3000"
log "  API:      http://localhost:3001"
log "  API Docs: http://localhost:3001/api/docs"
log "  Database: localhost:54321 (postgres:ths_thm_password/ths_thm_db)"
echo ""
info "To stop all services, run:"
info "  kill $API_PID $WEB_PID 2>/dev/null"
info "  docker compose stop"
echo "═══════════════════════════════════════════════════"

# Trap Ctrl+C to clean up
trap 'echo ""; info "Shutting down…"; kill $API_PID $WEB_PID 2>/dev/null; docker compose stop 2>/dev/null; log "All services stopped"; exit 0' INT TERM

# Keep running so background processes stay alive
wait

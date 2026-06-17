#!/usr/bin/env bash
# ═══════════════════════════════════════════════════════════════
# THS-THM Local Deploy Script
# Jalankan dari lokal untuk build + push + deploy ke VPS
# ═══════════════════════════════════════════════════════════════
#
# PRASYARAT:
#   1. Docker Desktop / Docker Engine sudah terinstall
#   2. Sudah login ke GHCR: echo "TOKEN" | docker login ghcr.io -u jefryarianto --password-stdin
#   3. SSH key sudah terpasang di VPS (ssh ths-thm@vps-ip)
#   4. .env staging sudah diisi di VPS: /opt/ths-thm-staging/.env
#
# USAGE:
#   chmod +x scripts/deploy-local.sh
#   ./scripts/deploy-local.sh staging      # Deploy ke staging
#   ./scripts/deploy-local.sh production   # Deploy ke production
#   ./scripts/deploy-local.sh staging --no-build  # Skip build, push & deploy aja
#
# ═══════════════════════════════════════════════════════════════

set -euo pipefail

# ═══════════════════════════════════════════════════════════════
# Colors
# ═══════════════════════════════════════════════════════════════
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m'

log()  { echo -e "${GREEN}[✓]${NC} $1"; }
warn() { echo -e "${YELLOW}[!]${NC} $1"; }
error(){ echo -e "${RED}[✗]${NC} $1"; exit 1; }
info() { echo -e "${BLUE}[i]${NC} $1"; }
step() { echo -e "\n${CYAN}══════════════════════════════════════════════${NC}"; echo -e "${CYAN}  $1${NC}"; echo -e "${CYAN}══════════════════════════════════════════════${NC}\n"; }

# ═══════════════════════════════════════════════════════════════
# Configuration — sesuaikan dengan VPS Anda
# ═══════════════════════════════════════════════════════════════
VPS_HOST="${VPS_HOST:-202.10.34.209}"           # IP VPS
VPS_USER="${VPS_USER:-ths-thm}"                 # User deploy di VPS
VPS_SSH_PORT="${VPS_SSH_PORT:-22}"              # Port SSH
SSH_KEY="${SSH_KEY:-$HOME/.ssh/ths-thm-deploy}" # Path SSH private key

GHCR_REGISTRY="ghcr.io"
GHCR_REPO="jefryarianto/ths-thm-system"

PROJECT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$PROJECT_DIR"

# ═══════════════════════════════════════════════════════════════
# Argument parser
# ═══════════════════════════════════════════════════════════════
TARGET="${1:-staging}"    # staging | production
SKIP_BUILD=false
NO_CACHE=""

shift 2>/dev/null || true
for arg in "$@"; do
  case "$arg" in
    --no-build) SKIP_BUILD=true ;;
    --no-cache) NO_CACHE="--no-cache" ;;
  esac
done

case "$TARGET" in
  staging)
    VPS_DIR="/opt/ths-thm-staging"
    COMPOSE_FILE="docker-compose.staging.yml"
    DOMAIN="staging.ths-thm.cloud"
    ;;
  production)
    VPS_DIR="/opt/ths-thm"
    COMPOSE_FILE="docker-compose.production.yml"
    DOMAIN="ths-thm.cloud"
    ;;
  *)
    error "Target harus 'staging' atau 'production'. Contoh: ./scripts/deploy-local.sh staging"
    ;;
esac

# ═══════════════════════════════════════════════════════════════
# Prerequisites Check
# ═══════════════════════════════════════════════════════════════
step "Pre-flight Check"

# Cek Docker
if ! command -v docker &> /dev/null; then
  error "Docker tidak ditemukan. Install Docker Desktop dulu: https://docs.docker.com/desktop/"
fi

# Cek Docker running
if ! docker info &> /dev/null 2>&1; then
  error "Docker daemon tidak berjalan. Jalankan Docker Desktop dulu."
fi
log "Docker running"

# Cek login GHCR
if ! docker pull ghcr.io/$GHCR_REPO/api:latest &> /dev/null 2>&1; then
  info "Belum login ke GHCR. Jalankan:"
  echo "  echo GITHUB_TOKEN | docker login ghcr.io -u jefryarianto --password-stdin"
  echo ""
  echo "  (Buat token di https://github.com/settings/tokens → generate classic → scope: read:packages, write:packages)"
  error "Login GHCR diperlukan"
fi
log "GHCR authenticated"

# Cek SSH key
if ! ssh -i "$SSH_KEY" -o BatchMode=yes -o ConnectTimeout=5 -p "$VPS_SSH_PORT" "$VPS_USER@$VPS_HOST" "echo OK" &> /dev/null; then
  warn "SSH key tidak bisa connect. Coba dengan password dulu:"
  echo "  ssh-copy-id -i $SSH_KEY -p $VPS_SSH_PORT $VPS_USER@$VPS_HOST"
  echo "  (Atau: ssh $VPS_USER@$VPS_HOST -p $VPS_SSH_PORT lalu copy public key manual)"
  error "SSH connection failed"
fi
log "SSH connected to $VPS_USER@$VPS_HOST"

# ═══════════════════════════════════════════════════════════════
# Step 1: Build Docker Images
# ═══════════════════════════════════════════════════════════════
if [ "$SKIP_BUILD" = false ]; then
  step "Build Docker Images"

  info "Building API image..."
  docker build \
    $NO_CACHE \
    -t "$GHCR_REGISTRY/$GHCR_REPO/api:latest" \
    -t "$GHCR_REGISTRY/$GHCR_REPO/api:$(git rev-parse --short HEAD)" \
    -f apps/api/Dockerfile \
    .
  log "API image built"

  info "Building Web image..."
  docker build \
    $NO_CACHE \
    -t "$GHCR_REGISTRY/$GHCR_REPO/web:latest" \
    -t "$GHCR_REGISTRY/$GHCR_REPO/web:$(git rev-parse --short HEAD)" \
    -f apps/web/Dockerfile \
    .
  log "Web image built"
else
  info "Skipping build (--no-build flag)"
fi

# ═══════════════════════════════════════════════════════════════
# Step 2: Push Images ke GHCR
# ═══════════════════════════════════════════════════════════════
step "Push Images ke GHCR"

info "Pushing API image..."
docker push "$GHCR_REGISTRY/$GHCR_REPO/api:latest"
docker push "$GHCR_REGISTRY/$GHCR_REPO/api:$(git rev-parse --short HEAD)"
log "API image pushed"

info "Pushing Web image..."
docker push "$GHCR_REGISTRY/$GHCR_REPO/web:latest"
docker push "$GHCR_REGISTRY/$GHCR_REPO/web:$(git rev-parse --short HEAD)"
log "Web image pushed"

# ═══════════════════════════════════════════════════════════════
# Step 3: Copy Files ke VPS
# ═══════════════════════════════════════════════════════════════
step "Copy Files ke VPS"

info "Copying docker-compose files..."
scp -i "$SSH_KEY" -P "$VPS_SSH_PORT" \
  "$COMPOSE_FILE" \
  "$VPS_USER@$VPS_HOST:$VPS_DIR/"

# Pilih nginx config sesuai target
case "$TARGET" in
  staging)   NGINX_CONF="nginx/staging.conf" ;;
  production) NGINX_CONF="nginx/production.conf" ;;
esac

info "Copying nginx config ($NGINX_CONF)..."
ssh -i "$SSH_KEY" -p "$VPS_SSH_PORT" "$VPS_USER@$VPS_HOST" "mkdir -p $VPS_DIR/nginx"
scp -i "$SSH_KEY" -P "$VPS_SSH_PORT" \
  "$NGINX_CONF" \
  "$VPS_USER@$VPS_HOST:$VPS_DIR/nginx/"

log "Files copied"

# ═══════════════════════════════════════════════════════════════
# Step 4: Deploy di VPS
# ═══════════════════════════════════════════════════════════════
step "Deploy ke VPS ($TARGET)"

DEPLOY_SCRIPT=$(cat << EOF
set -e
echo "🚀 Deploying $TARGET to $DOMAIN..."

cd $VPS_DIR

# Pull latest images
echo "  Pulling images..."
docker compose -f $COMPOSE_FILE pull

# Run database migrations
echo "  Running migrations..."
docker compose -f $COMPOSE_FILE run --rm api sh -c "npx prisma migrate deploy" || echo "  ⚠️ Migration skipped (maybe first deploy)"

# Restart services
echo "  Starting services..."
docker compose -f $COMPOSE_FILE up -d --remove-orphans

# Wait for health
echo "  Waiting for API to be healthy..."
for i in \$(seq 1 30); do
  if curl -sf http://localhost:3001/api/health > /dev/null 2>&1; then
    echo "  ✅ API is healthy!"
    break
  fi
  if [ \$i -eq 30 ]; then
    echo "  ❌ API health check failed. Logs:"
    docker compose -f $COMPOSE_FILE logs api --tail=50
    exit 1
  fi
  echo "  Attempt \$i/30..."
  sleep 5
done

# Health check detail
echo ""
echo "  Health response:"
curl -sf http://localhost:3001/api/health | python3 -m json.tool 2>/dev/null || curl -sf http://localhost:3001/api/health

# Show running containers
echo ""
echo "  Running containers:"
docker compose -f $COMPOSE_FILE ps

echo ""
echo "✅ Deploy $TARGET selesai!"
echo "   URL: https://$DOMAIN"
echo "   Health: http://localhost:3001/api/health"
EOF
)

ssh -i "$SSH_KEY" -p "$VPS_SSH_PORT" "$VPS_USER@$VPS_HOST" bash <<< "$DEPLOY_SCRIPT"

# ═══════════════════════════════════════════════════════════════
# Done
# ═══════════════════════════════════════════════════════════════
step "Deploy Complete!"

echo ""
echo "  Target:   $TARGET"
echo "  Domain:   https://$DOMAIN"
echo "  VPS:      $VPS_USER@$VPS_HOST:$VPS_DIR"
echo "  Images:   $GHCR_REGISTRY/$GHCR_REPO/{api,web}:latest"
echo "  Commit:   $(git rev-parse --short HEAD)"
echo ""
echo "  Untuk deploy selanjutnya:"
echo "    git push origin master          # Via CI (otomatis)"
echo "    ./scripts/deploy-local.sh $TARGET  # Via lokal (manual)"
echo "    ./scripts/deploy-local.sh $TARGET --no-build --no-cache  # Skip build"
echo ""

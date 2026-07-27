#!/usr/bin/env bash
# ═══════════════════════════════════════════════════════════════
# THS-THM Rollback Script
# Rollback deployment ke previous image tag
# ═══════════════════════════════════════════════════════════════
#
# USAGE:
#   chmod +x scripts/rollback-deployment.sh
#   ./scripts/rollback-deployment.sh staging
#   ./scripts/rollback-deployment.sh production
#
# PRASYARAT:
#   1. SSH key sudah terpasang di VPS
#   2. Previous image tag tersedia di GHCR
#   3. Docker Compose file sudah ada di VPS
#
# ═══════════════════════════════════════════════════════════════

set -euo pipefail

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
# Configuration
# ═══════════════════════════════════════════════════════════════
VPS_HOST="${VPS_HOST:-202.10.34.209}"
VPS_USER="${VPS_USER:-ths-thm}"
VPS_SSH_PORT="${VPS_SSH_PORT:-22}"
SSH_KEY="${SSH_KEY:-$HOME/.ssh/ths-thm-deploy}"

GHCR_REGISTRY="ghcr.io"
GHCR_REPO="jefryarianto/ths-thm-system"

# ═══════════════════════════════════════════════════════════════
# Argument parser
# ═══════════════════════════════════════════════════════════════
TARGET="${1:-staging}"
PREVIOUS_TAG="${2:-}"

if [ -z "$PREVIOUS_TAG" ]; then
  error "Tag sebelumnya wajib diisi. Contoh:\n  ./scripts/rollback-deployment.sh staging v1.2.3\n  ./scripts/rollback-deployment.sh production $(git rev-parse --short HEAD~1)"
fi

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
    error "Target harus 'staging' atau 'production'"
    ;;
esac

# ═══════════════════════════════════════════════════════════════
# Pre-flight Check
# ═══════════════════════════════════════════════════════════════
step "Pre-flight Check"

if ! command -v docker &> /dev/null; then
  error "Docker tidak ditemukan"
fi
log "Docker running"

if ! ssh -i "$SSH_KEY" -o BatchMode=yes -o ConnectTimeout=5 -p "$VPS_SSH_PORT" "$VPS_USER@$VPS_HOST" "echo OK" &> /dev/null; then
  error "SSH connection failed. Cek SSH key dan VPS_HOST"
fi
log "SSH connected to $VPS_USER@$VPS_HOST"

# ═══════════════════════════════════════════════════════════════
# Step 1: Pull previous images
# ═══════════════════════════════════════════════════════════════
step "Pull Previous Images ($PREVIOUS_TAG)"

info "Pulling API image ($PREVIOUS_TAG)..."
docker pull "$GHCR_REGISTRY/$GHCR_REPO/api:$PREVIOUS_TAG" || error "Gagal pull API image"
log "API image pulled"

info "Pulling Web image ($PREVIOUS_TAG)..."
docker pull "$GHCR_REGISTRY/$GHCR_REPO/web:$PREVIOUS_TAG" || error "Gagal pull Web image"
log "Web image pulled"

# ═══════════════════════════════════════════════════════════════
# Step 2: Tag images as latest untuk rollback
# ═══════════════════════════════════════════════════════════════
step "Tag Images untuk Rollback"

docker tag "$GHCR_REGISTRY/$GHCR_REPO/api:$PREVIOUS_TAG" "$GHCR_REGISTRY/$GHCR_REPO/api:latest"
docker tag "$GHCR_REGISTRY/$GHCR_REPO/web:$PREVIOUS_TAG" "$GHCR_REGISTRY/$GHCR_REPO/web:latest"
log "Images tagged as latest"

# ═══════════════════════════════════════════════════════════════
# Step 3: Push rolled-back images
# ═══════════════════════════════════════════════════════════════
step "Push Rolled-back Images ke GHCR"

info "Pushing API image..."
docker push "$GHCR_REGISTRY/$GHCR_REPO/api:latest"
log "API image pushed"

info "Pushing Web image..."
docker push "$GHCR_REGISTRY/$GHCR_REPO/web:latest"
log "Web image pushed"

# ═══════════════════════════════════════════════════════════════
# Step 4: Deploy rolled-back images ke VPS
# ═══════════════════════════════════════════════════════════════
step "Deploy Rollback ke VPS ($TARGET)"

DEPLOY_SCRIPT=$(cat << EOF
set -e
echo "🔄 Rolling back $TARGET to $PREVIOUS_TAG..."

cd $VPS_DIR

# Pull rolled-back images
echo "  Pulling images..."
docker compose -f $COMPOSE_FILE pull

# Restart services with previous images
echo "  Restarting services..."
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

echo ""
echo "  Health response:"
curl -sf http://localhost:3001/api/health | python3 -m json.tool 2>/dev/null || curl -sf http://localhost:3001/api/health

echo ""
echo "  Running containers:"
docker compose -f $COMPOSE_FILE ps

echo ""
echo "✅ Rollback $TARGET selesai!"
echo "   URL: https://$DOMAIN"
echo "   Rolled back to: $PREVIOUS_TAG"
EOF
)

ssh -i "$SSH_KEY" -p "$VPS_SSH_PORT" "$VPS_USER@$VPS_HOST" bash <<< "$DEPLOY_SCRIPT"

# ═══════════════════════════════════════════════════════════════
# Done
# ═══════════════════════════════════════════════════════════════
step "Rollback Complete!"

echo ""
echo "  Target:     $TARGET"
echo "  Domain:     https://$DOMAIN"
echo "  VPS:        $VPS_USER@$VPS_HOST:$VPS_DIR"
echo "  Rolled to:  $PREVIOUS_TAG"
echo ""
echo "  Untuk verify:"
echo "    curl https://$DOMAIN/api/health"
echo ""
echo "  Jika perlu rollback lagi:"
echo "    ./scripts/rollback-deployment.sh $TARGET <tag-sebelumnya>"
echo ""

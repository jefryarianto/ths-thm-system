#!/usr/bin/env bash
# ═══════════════════════════════════════════════════════════════
# THS-THM VPS Setup Script
# For ths-thm.cloud — Ubuntu 22.04/24.04 LTS
# ═══════════════════════════════════════════════════════════════

set -euo pipefail

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

log() { echo -e "${GREEN}[✓]${NC} $1"; }
warn() { echo -e "${YELLOW}[!]${NC} $1"; }
error() { echo -e "${RED}[✗]${NC} $1"; exit 1; }
info() { echo -e "${BLUE}[i]${NC} $1"; }

# ═══════════════════════════════════════════════════════════════
# Configuration
# ═══════════════════════════════════════════════════════════════

DEPLOY_USER="${DEPLOY_USER:-ths-thm}"
DEPLOY_DIR="/opt"
STAGING_DIR="${DEPLOY_DIR}/ths-thm-staging"
PRODUCTION_DIR="${DEPLOY_DIR}/ths-thm"
GHCR_REPO="${GHCR_REPO:-jefryarianto/ths-thm-system}"
SSH_PORT="${SSH_PORT:-22}"

# ═══════════════════════════════════════════════════════════════
# System Updates
# ═══════════════════════════════════════════════════════════════

info "Updating system packages..."
sudo apt-get update -y
sudo apt-get upgrade -y

log "System updated"

# ═══════════════════════════════════════════════════════════════
# Install Docker
# ═══════════════════════════════════════════════════════════════

if ! command -v docker &> /dev/null; then
    info "Installing Docker..."
    
    sudo apt-get install -y \
        ca-certificates \
        curl \
        gnupg \
        lsb-release
    
    sudo mkdir -p /etc/apt/keyrings
    curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo gpg --dearmor -o /etc/apt/keyrings/docker.gpg
    
    echo \
      "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu \
      $(. /etc/os-release && echo "$VERSION_CODENAME") stable" | \
      sudo tee /etc/apt/sources.list.d/docker.list > /dev/null
    
    sudo apt-get update -y
    sudo apt-get install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
    
    sudo usermod -aG docker $USER
    
    log "Docker installed"
else
    log "Docker already installed"
fi

# ═══════════════════════════════════════════════════════════════
# Install Docker Compose
# ═══════════════════════════════════════════════════════════════

if ! docker compose version &> /dev/null; then
    info "Installing Docker Compose..."
    sudo apt-get install -y docker-compose-plugin
    log "Docker Compose installed"
else
    log "Docker Compose already installed"
fi

# ═══════════════════════════════════════════════════════════════
# Create Deploy User (if not exists)
# ═══════════════════════════════════════════════════════════════

if ! id "$DEPLOY_USER" &> /dev/null; then
    info "Creating deploy user: $DEPLOY_USER"
    sudo adduser --disabled-password --gecos "" "$DEPLOY_USER"
    sudo usermod -aG docker "$DEPLOY_USER"
    log "Deploy user created"
else
    log "Deploy user already exists"
fi

# ═══════════════════════════════════════════════════════════════
# Create Directory Structure
# ═══════════════════════════════════════════════════════════════

info "Creating directory structure..."

# Production directories
sudo mkdir -p "$PRODUCTION_DIR"/{nginx,nginx/certs,nginx/ssl-certs}
sudo mkdir -p "$PRODUCTION_DIR"/postgres_data

# Staging directories
sudo mkdir -p "$STAGING_DIR"/{nginx,nginx/certs,nginx/ssl-certs}
sudo mkdir -p "$STAGING_DIR"/staging_postgres_data

# Set permissions
sudo chown -R "$DEPLOY_USER":"$DEPLOY_USER" "$PRODUCTION_DIR" "$STAGING_DIR"

log "Directory structure created"

# ═══════════════════════════════════════════════════════════════
# Configure Firewall (UFW)
# ═══════════════════════════════════════════════════════════════

info "Configuring firewall..."

sudo apt-get install -y ufw

# Reset firewall
sudo ufw --force reset

# Default policies
sudo ufw default deny incoming
sudo ufw default allow outgoing

# SSH (allow custom port)
sudo ufw allow "$SSH_PORT/tcp" comment 'SSH'

# HTTP/HTTPS
sudo ufw allow 80/tcp comment 'HTTP'
sudo ufw allow 443/tcp comment 'HTTPS'

# Enable firewall
sudo ufw --force enable

log "Firewall configured (SSH:$SSH_PORT, HTTP:80, HTTPS:443)"

# ═══════════════════════════════════════════════════════════════
# Install fail2ban (optional but recommended)
# ═══════════════════════════════════════════════════════════════

if ! command -v fail2ban-client &> /dev/null; then
    info "Installing fail2ban..."
    sudo apt-get install -y fail2ban
    
    # Create custom jail for SSH + Nginx
    sudo tee /etc/fail2ban/jail.local > /dev/null << 'EOF'
[DEFAULT]
bantime = 3600
findtime = 600
maxretry = 5

[sshd]
enabled = true
port = ssh
filter = sshd
logpath = /var/log/auth.log
maxretry = 3

[nginx-http-auth]
enabled = true
filter = nginx-http-auth
logpath = /var/log/nginx/error.log
maxretry = 5
bantime = 1800

[nginx-limit-req]
enabled = true
filter = nginx-limit-req
logpath = /var/log/nginx/error.log
maxretry = 10
bantime = 600

[nginx-botsearch]
enabled = true
filter = nginx-botsearch
logpath = /var/log/nginx/access.log
maxretry = 2
bantime = 86400
EOF
    
    sudo systemctl enable fail2ban
    sudo systemctl start fail2ban
    
    log "fail2ban installed and configured"
else
    log "fail2ban already installed"
fi

# ═══════════════════════════════════════════════════════════════
# Configure Log Rotation for Docker
# ═══════════════════════════════════════════════════════════════

info "Configuring Docker log rotation..."

sudo mkdir -p /etc/docker
sudo tee /etc/docker/daemon.json > /dev/null << 'EOF'
{
  "log-driver": "json-file",
  "log-opts": {
    "max-size": "10m",
    "max-file": "3"
  }
}
EOF

sudo systemctl restart docker

log "Docker log rotation configured"

# ═══════════════════════════════════════════════════════════════
# Setup Database Backup Cron
# ═══════════════════════════════════════════════════════════════

info "Setting up database backup cron..."

sudo mkdir -p /opt/backups/ths-thm
sudo chown "$DEPLOY_USER":"$DEPLOY_USER" /opt/backups/ths-thm

# Daily backup at 2 AM
sudo tee /etc/cron.d/ths-thm-backup > /dev/null << 'EOF'
# THS-THM Database Backup — daily at 2 AM
0 2 * * * ths-thm /opt/ths-thm/scripts/backup-database.sh >> /var/log/ths-thm-backup.log 2>&1
EOF

log "Database backup cron configured (daily at 2 AM)"

# ═══════════════════════════════════════════════════════════════
# Install Certbot (Let's Encrypt)
# ═══════════════════════════════════════════════════════════════

if ! command -v certbot &> /dev/null; then
    info "Installing certbot for SSL certificates..."
    sudo apt-get install -y certbot
    
    # Add certbot renewal cron job
    echo "0 0,12 * * * certbot renew --quiet --post-hook 'docker compose -f ${PRODUCTION_DIR}/docker-compose.production.yml exec -T nginx nginx -s reload'" | sudo tee /etc/cron.d/certbot-renew > /dev/null
    
    log "Certbot installed with auto-renewal cron"
else
    log "Certbot already installed"
fi

# ═════════════════════════════════════════════════════════════=
# Scaffold .env Files
# ═════════════════════════════════════════════════════════════=

info "Scaffolding .env files..."

# Production .env
if [ ! -f "$PRODUCTION_DIR/.env" ]; then
    cat > "$PRODUCTION_DIR/.env" << 'PRODENV'
# Production Environment — ths-thm.cloud
DB_PASSWORD=CHANGE_ME
JWT_SECRET=CHANGE_ME
JWT_REFRESH_SECRET=CHANGE_ME
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=CHANGE_ME
SMTP_PASS=CHANGE_ME
FCM_PROJECT_ID=CHANGE_ME
FCM_PRIVATE_KEY=CHANGE_ME
FCM_CLIENT_EMAIL=CHANGE_ME
GHCR_REGISTRY=ghcr.io
GHCR_REPO=jefryarianto/ths-thm-system
IMAGE_TAG=latest
PRODENV
    sudo chown "$DEPLOY_USER":"$DEPLOY_USER" "$PRODUCTION_DIR/.env"
    warn "Production .env created — please edit $PRODUCTION_DIR/.env with real secrets!"
else
    log "Production .env already exists"
fi

# Staging .env
if [ ! -f "$STAGING_DIR/.env" ]; then
    cat > "$STAGING_DIR/.env" << 'STAGINGENV'
# Staging Environment — staging.ths-thm.cloud
STAGING_DB_PASSWORD=CHANGE_ME_STAGING
STAGING_JWT_SECRET=CHANGE_ME
STAGING_JWT_REFRESH_SECRET=CHANGE_ME
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=CHANGE_ME
SMTP_PASS=CHANGE_ME
FCM_PROJECT_ID=CHANGE_ME
FCM_PRIVATE_KEY=CHANGE_ME
FCM_CLIENT_EMAIL=CHANGE_ME
GHCR_REGISTRY=ghcr.io
GHCR_REPO=jefryarianto/ths-thm-system
IMAGE_TAG=latest
STAGINGENV
    sudo chown "$DEPLOY_USER":"$DEPLOY_USER" "$STAGING_DIR/.env"
    warn "Staging .env created — please edit $STAGING_DIR/.env with real secrets!"
else
    log "Staging .env already exists"
fi

# ═══════════════════════════════════════════════════════════════
# Print Summary
# ═══════════════════════════════════════════════════════════════

echo ""
echo "═══════════════════════════════════════════════════════════════"
echo -e "${GREEN}  THS-THM VPS Setup Complete!${NC}"
echo "═══════════════════════════════════════════════════════════════"
echo ""
echo "  Production: $PRODUCTION_DIR"
echo "  Staging:    $STAGING_DIR"
echo "  Deploy user: $DEPLOY_USER"
echo "  SSH port:   $SSH_PORT"
echo ""
echo "  Next steps:"
echo "  1. Copy docker-compose files to VPS"
echo "  2. Create .env files with secrets"
echo "  3. Login to GHCR: docker login ghcr.io"
echo "  4. Run: docker compose pull && docker compose up -d"
echo ""
echo "  CI/CD requires these GitHub secrets:"
echo "    VPS_SSH_HOST = $(hostname -f 2>/dev/null || echo 'your-vps-ip')"
echo "    VPS_SSH_USERNAME = $DEPLOY_USER"
echo "    VPS_SSH_PRIVATE_KEY = (your SSH private key)"
echo "═══════════════════════════════════════════════════════════════"

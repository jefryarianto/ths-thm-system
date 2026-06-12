# deploy-to-vps.ps1 - Script deployment otomatis ke VPS ths-thm.cloud
# USAGE: .\deploy-to-vps.ps1 (dengan input password manual)

$VPS_HOST = "202.10.34.209"
$VPS_USER = "root"
$SSH_KEY_PATH = "$env:USERPROFILE\.ssh\ths-thm-key-new"

Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host "Deploy THS-THM ke VPS ths-thm.cloud" -ForegroundColor Cyan
Write-Host "========================================`n" -ForegroundColor Cyan

# Check jika SSH key sudah tercopy ke VPS
Write-Host "[1/4] Testing SSH connection..." -ForegroundColor Yellow
$testResult = ssh -i $SSH_KEY_PATH -o BatchMode=yes -o ConnectTimeout=5 $VPS_USER@$VPS_HOST "echo 'SSH OK'" 2>&1
if ($LASTEXITCODE -eq 0) {
    Write-Host "  [OK] SSH key authentication works!" -ForegroundColor Green
} else {
    Write-Host "  [!] SSH key not configured on VPS yet" -ForegroundColor Red
    Write-Host "`n[STEP 1] Copy SSH public key ke VPS" -ForegroundColor Yellow
    Write-Host "  Copy command ini dan jalankan manual:" -ForegroundColor Gray
    Write-Host "`n  Get-Content '$SSH_KEY_PATH.pub' | ssh root@$VPS_HOST " mkdir -p ~/.ssh && cat >> ~/.ssh/authorized_keys ""`n"
    Write-Host "  Atau jalankan dengan password, lalu paste public key:`n"
    Write-Host "  ssh root@$VPS_HOST" -ForegroundColor White
    Write-Host "  Password: 5tr6w1nG" -ForegroundColor White
    Read-Host "  Tekan Enter setelah SSH key tercopy"
}

# Verify SSH connection
Write-Host "`n[2/4] Verifying SSH..." -ForegroundColor Yellow
$testResult = ssh -i $SSH_KEY_PATH -o BatchMode=yes -o ConnectTimeout=5 $VPS_USER@$VPS_HOST "echo 'OK'" 2>&1
if ($LASTEXITCODE -ne 0) {
    Write-Host "  [ERROR] SSH connection failed. Pastikan SSH key sudah ditambahkan ke ~/.ssh/authorized_keys di VPS" -ForegroundColor Red
    exit 1
}
Write-Host "  [OK] SSH connected!" -ForegroundColor Green

# Deploy script ke VPS
Write-Host "`n[3/4] Sending deployment script to VPS..." -ForegroundColor Yellow
$deployScript = @"
#!/bin/bash
set -e

echo "=== THS-THM VPS Setup & Deploy ==="

# Update packages
apt update -qq

# Install Docker if not installed
if ! command -v docker &> /dev/null; then
    echo "Installing Docker..."
    apt install -y docker.io docker-compose git
fi

# Clone or update repo
if [ ! -d "/opt/ths-thm" ]; then
    echo "Cloning repository..."
    cd /opt
    git clone https://github.com/jefryarianto/ths-thm-project.git ths-thm
else
    echo "Updating repository..."
    cd /opt/ths-thm
    git pull origin master
fi

cd /opt/ths-thm

# Setup .env if not exists
if [ ! -f ".env" ]; then
    echo "Setting up .env..."
    cp .env.example .env
    echo "  Edit .env dengan nilai production Anda!"
fi

# Setup Nginx config
if [ ! -f "/etc/nginx/sites-available/ths-thm.cloud" ]; then
    echo "Setting up Nginx..."
    cp nginx/production.conf /etc/nginx/sites-available/ths-thm.cloud
    ln -sf /etc/nginx/sites-available/ths-thm.cloud /etc/nginx/sites-enabled/
fi

# Get SSL certificate
if [ ! -d "/etc/letsencrypt/live/ths-thm.cloud" ]; then
    echo "Requesting SSL certificate..."
    certbot --nginx -d ths-thm.cloud --non-interactive --agree-tos --email admin@ths-thm.cloud
fi

# Docker deployment
echo "Deploying with Docker..."
docker compose -f docker-compose.production.yml pull
docker compose -f docker-compose.production.yml run --rm api npx prisma migrate deploy
docker compose -f docker-compose.production.yml up -d

# Health check
echo "Waiting for API to be healthy..."
for i in {1..30}; do
    if curl -sf http://localhost:3001/api/health > /dev/null 2>&1; then
        echo "  [OK] API is healthy!"
        break
    fi
    echo "  Attempt $i/30..."
    sleep 2
done

echo ""
echo "=== Deployment Complete! ==="
echo "URL: https://ths-thm.cloud"
echo "Health: http://localhost:3001/api/health"
"@

# Send script via SSH
$deployScript | ssh -i $SSH_KEY_PATH $VPS_USER@$VPS_HOST "cat > /tmp/deploy.sh && chmod +x /tmp/deploy.sh"

if ($LASTEXITCODE -eq 0) {
    Write-Host "  [OK] Script sent to VPS" -ForegroundColor Green
} else {
    Write-Host "  [ERROR] Failed to send script" -ForegroundColor Red
    exit 1
}

# Execute deployment
Write-Host "`n[4/4] Executing deployment on VPS..." -ForegroundColor Yellow
Write-Host "  (This will take 5-10 minutes)`n" -ForegroundColor Gray

ssh -i $SSH_KEY_PATH $VPS_USER@$VPS_HOST "/tmp/deploy.sh"

if ($LASTEXITCODE -eq 0) {
    Write-Host "`n========================================" -ForegroundColor Green
    Write-Host "  DEPLOYMENT SUCCESSFUL!" -ForegroundColor Green
    Write-Host "========================================" -ForegroundColor Green
    Write-Host "`nProduction URL: https://ths-thm.cloud" -ForegroundColor White
    Write-Host "API Health: http://localhost:3001/api/health" -ForegroundColor White
    Write-Host "`nUntuk deploy selanjutnya cukup: git push origin master" -ForegroundColor Cyan
} else {
    Write-Host "`n[WARNING] Deployment completed with some errors" -ForegroundColor Yellow
    Write-Host "Check VPS logs untuk detail" -ForegroundColor Gray
}

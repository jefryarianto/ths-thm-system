# ═══════════════════════════════════════════════════════════════
# deploy-to-vps.ps1 — THS-THM Local Deploy Script (PowerShell)
# ═══════════════════════════════════════════════════════════════
#
# PRASYARAT:
#   1. Docker Desktop sudah terinstall dan running
#   2. Login ke GHCR: echo "TOKEN" | docker login ghcr.io -u jefryarianto --password-stdin
#      (Buat token di https://github.com/settings/tokens → classic → scope: read:packages, write:packages)
#   3. SSH key sudah terpasang di VPS
#   4. .env staging/production sudah diisi di VPS
#
# USAGE:
#   .\deploy-to-vps.ps1 staging          # Deploy ke staging
#   .\deploy-to-vps.ps1 production       # Deploy ke production
#   .\deploy-to-vps.ps1 staging -NoBuild # Skip build, push & deploy aja
#   .\deploy-to-vps.ps1 staging -NoCache # Build tanpa cache
#
# ═══════════════════════════════════════════════════════════════

param(
    [Parameter(Position=0)]
    [ValidateSet("staging", "production")]
    [string]$Target = "staging",

    [switch]$NoBuild,
    [switch]$NoCache
)

$ErrorActionPreference = "Stop"

# ═══════════════════════════════════════════════════════════════
# Configuration — sesuaikan dengan VPS Anda
# ═══════════════════════════════════════════════════════════════
$VPS_HOST = "202.10.34.209"
$VPS_USER = "ths-thm"
$VPS_SSH_PORT = 22
$SSH_KEY = "$env:USERPROFILE\.ssh\ths-thm-deploy"

$GHCR_REGISTRY = "ghcr.io"
$GHCR_REPO = "jefryarianto/ths-thm-system"

$PROJECT_DIR = Split-Path -Parent $MyInvocation.MyCommand.Path

# ═══════════════════════════════════════════════════════════════
# Function helpers
# ═══════════════════════════════════════════════════════════════
function Write-Info  { Write-Host "[i] $($args[0])" -ForegroundColor Blue }
function Write-Step { Write-Host "`n══════════════════════════════════════════════" -ForegroundColor Cyan; Write-Host "  $($args[0])" -ForegroundColor Cyan; Write-Host "══════════════════════════════════════════════`n" -ForegroundColor Cyan }
function Write-OK   { Write-Host "[✓] $($args[0])" -ForegroundColor Green }
function Write-Warn { Write-Host "[!] $($args[0])" -ForegroundColor Yellow }
function Write-Err  { Write-Host "[✗] $($args[0])" -ForegroundColor Red; exit 1 }

# ═══════════════════════════════════════════════════════════════
# Set target config
# ═══════════════════════════════════════════════════════════════
switch ($Target) {
    "staging" {
        $VPS_DIR = "/opt/ths-thm-staging"
        $COMPOSE_FILE = "docker-compose.staging.yml"
        $DOMAIN = "staging.ths-thm.cloud"
    }
    "production" {
        $VPS_DIR = "/opt/ths-thm"
        $COMPOSE_FILE = "docker-compose.production.yml"
        $DOMAIN = "ths-thm.cloud"
    }
}

# ═══════════════════════════════════════════════════════════════
# Prerequisites Check
# ═══════════════════════════════════════════════════════════════
Write-Step "Pre-flight Check"

# Cek Docker
$dockerVersion = docker --version 2>&1
if ($LASTEXITCODE -ne 0) {
    Write-Err "Docker tidak ditemukan. Install Docker Desktop dulu: https://docs.docker.com/desktop/"
}
Write-OK "Docker: $dockerVersion"

# Cek Docker running
$dockerInfo = docker info 2>&1
if ($LASTEXITCODE -ne 0) {
    Write-Err "Docker daemon tidak berjalan. Jalankan Docker Desktop dulu."
}
Write-OK "Docker running"

# Cek login GHCR
$ghcrCheck = docker pull "$GHCR_REGISTRY/$GHCR_REPO/api:latest" 2>&1
if ($LASTEXITCODE -ne 0) {
    Write-Warn "Belum login ke GHCR. Jalankan perintah berikut:"
    Write-Host "  echo GITHUB_TOKEN | docker login $GHCR_REGISTRY -u jefryarianto --password-stdin" -ForegroundColor White
    Write-Host "`n(Buat token di https://github.com/settings/tokens → Generate classic token → scope: read:packages, write:packages)" -ForegroundColor Gray
    Write-Err "Login GHCR diperlukan"
}
Write-OK "GHCR authenticated"

# Cek SSH connection
$sshTest = ssh -i "$SSH_KEY" -o BatchMode=yes -o ConnectTimeout=5 -p $VPS_SSH_PORT "$VPS_USER@$VPS_HOST" "echo OK" 2>&1
if ($LASTEXITCODE -ne 0) {
    Write-Warn "SSH key tidak bisa connect. Coba jalankan:"
    Write-Host "  type `"$SSH_KEY.pub`" | ssh $VPS_USER@$VPS_HOST -p $VPS_SSH_PORT `"mkdir -p ~/.ssh && cat >> ~/.ssh/authorized_keys`"" -ForegroundColor White
    Write-Err "SSH connection failed"
}
Write-OK "SSH connected to $VPS_USER@$VPS_HOST"

# ═══════════════════════════════════════════════════════════════
# Step 1: Build Docker Images
# ═══════════════════════════════════════════════════════════════
if (-not $NoBuild) {
    Write-Step "Build Docker Images"

    $buildArgs = @("build")
    if ($NoCache) { $buildArgs += "--no-cache" }

    $commitHash = git rev-parse --short HEAD

    Write-Info "Building API image..."
    $apiResult = docker build @buildArgs @("-t", "$GHCR_REGISTRY/$GHCR_REPO/api:latest", "-t", "$GHCR_REGISTRY/$GHCR_REPO/api:$commitHash") "-f" "apps/api/Dockerfile" "." 2>&1
    if ($LASTEXITCODE -ne 0) { Write-Err "API build failed: $apiResult" }
    Write-OK "API image built"

    Write-Info "Building Web image..."
    $webResult = docker build @buildArgs @("-t", "$GHCR_REGISTRY/$GHCR_REPO/web:latest", "-t", "$GHCR_REGISTRY/$GHCR_REPO/web:$commitHash") "-f" "apps/web/Dockerfile" "." 2>&1
    if ($LASTEXITCODE -ne 0) { Write-Err "Web build failed: $webResult" }
    Write-OK "Web image built"
}
else {
    Write-Info "Skipping build (-NoBuild flag)"
}

# ═══════════════════════════════════════════════════════════════
# Step 2: Push Images ke GHCR
# ═══════════════════════════════════════════════════════════════
Write-Step "Push Images ke GHCR"

$commitHash = git rev-parse --short HEAD

Write-Info "Pushing API image..."
docker push "$GHCR_REGISTRY/$GHCR_REPO/api:latest" 2>&1 | Out-Null
if ($LASTEXITCODE -ne 0) { Write-Err "API push failed" }
docker push "$GHCR_REGISTRY/$GHCR_REPO/api:$commitHash" 2>&1 | Out-Null
if ($LASTEXITCODE -ne 0) { Write-Err "API push failed (commit tag)" }
Write-OK "API image pushed"

Write-Info "Pushing Web image..."
docker push "$GHCR_REGISTRY/$GHCR_REPO/web:latest" 2>&1 | Out-Null
if ($LASTEXITCODE -ne 0) { Write-Err "Web push failed" }
docker push "$GHCR_REGISTRY/$GHCR_REPO/web:$commitHash" 2>&1 | Out-Null
if ($LASTEXITCODE -ne 0) { Write-Err "Web push failed (commit tag)" }
Write-OK "Web image pushed"

# ═══════════════════════════════════════════════════════════════
# Step 3: Copy Files ke VPS
# ═══════════════════════════════════════════════════════════════
Write-Step "Copy Files ke VPS"

Write-Info "Copying docker-compose file: $COMPOSE_FILE"
scp -i "$SSH_KEY" -P $VPS_SSH_PORT "$PROJECT_DIR\$COMPOSE_FILE" "$VPS_USER@$VPS_HOST`:$VPS_DIR/"
if ($LASTEXITCODE -ne 0) { Write-Err "SCP compose file failed" }

Write-Info "Creating nginx directory on VPS..."
ssh -i "$SSH_KEY" -p $VPS_SSH_PORT "$VPS_USER@$VPS_HOST" "mkdir -p $VPS_DIR/nginx" 2>&1 | Out-Null

# Pilih nginx config sesuai target
$NGINX_CONF = if ($Target -eq "production") { "nginx\production.conf" } else { "nginx\staging.conf" }

Write-Info "Copying nginx config ($NGINX_CONF)..."
scp -i "$SSH_KEY" -P $VPS_SSH_PORT "$PROJECT_DIR\$NGINX_CONF" "$VPS_USER@$VPS_HOST`:$VPS_DIR/nginx/"
if ($LASTEXITCODE -ne 0) { Write-Err "SCP nginx config failed" }

Write-OK "Files copied"

# ═══════════════════════════════════════════════════════════════
# Step 4: Deploy di VPS
# ═══════════════════════════════════════════════════════════════
Write-Step "Deploy ke VPS ($Target)"

# ── Buat deploy script ─────────────────────────────────────
# Gunakan template literal (verbatim) lalu inject variabel PowerShell via -replace
$deployTemplate = @'
set -e

echo "  ___ ___ _   _ _____ ___ _    ___   __  __"
echo " |_ _|_ _| | | |_   _|_ _| |  | \ \ / /  \\"
echo "  | | | || |_| | | |  | || |__| |\ V /  | |"
echo " |___|___|\___/  |_| |___|____|_| \_/   |_|"
echo ""
echo "___TARGET___ deploy to ___DOMAIN___..."
echo ""

cd ___VPS_DIR___

# Pull latest images
echo "  Pulling images..."
docker compose -f ___COMPOSE_FILE___ pull

# Run database migrations
echo "  Running migrations..."
docker compose -f ___COMPOSE_FILE___ run --rm api sh -c "npx prisma migrate deploy" || echo "  (migration skipped — mungkin first deploy)"

# Restart services
echo "  Starting services..."
docker compose -f ___COMPOSE_FILE___ up -d --remove-orphans

# Wait for health
echo "  Waiting for API to be healthy..."
for i in $(seq 1 30); do
  if curl -sf http://localhost:3001/api/health > /dev/null 2>&1; then
    echo "  API is healthy!"
    break
  fi
  if [ $i -eq 30 ]; then
    echo "  API health check FAILED. Logs:"
    docker compose -f ___COMPOSE_FILE___ logs api --tail=50
    exit 1
  fi
  echo "  Attempt $i/30..."
  sleep 5
done

# Health check detail
echo ""
echo "  Health response:"
curl -sf http://localhost:3001/api/health | python3 -m json.tool 2>/dev/null || curl -sf http://localhost:3001/api/health

echo ""
echo "  Running containers:"
docker compose -f ___COMPOSE_FILE___ ps

echo ""
echo "Deploy ___TARGET___ selesai!"
echo "  URL: https://___DOMAIN___"
echo "  Health: http://localhost:3001/api/health"
'@

# Inject PowerShell variables into template
$deployScript = $deployTemplate `
    -replace '___TARGET___', $Target `
    -replace '___DOMAIN___', $DOMAIN `
    -replace '___VPS_DIR___', $VPS_DIR `
    -replace '___COMPOSE_FILE___', $COMPOSE_FILE

# Pipe via SSH to temp file on VPS (aman dari escaping problem)
$deployScript | ssh -i "$SSH_KEY" -p $VPS_SSH_PORT "$VPS_USER@$VPS_HOST" "cat > /tmp/deploy.sh && chmod +x /tmp/deploy.sh"
if ($LASTEXITCODE -ne 0) { Write-Err "Gagal kirim deploy script ke VPS" }

Write-Info "Menjalankan deploy script di VPS..."
ssh -i "$SSH_KEY" -p $VPS_SSH_PORT "$VPS_USER@$VPS_HOST" "/tmp/deploy.sh"

if ($LASTEXITCODE -eq 0) {
    Write-Step "Deploy Complete!"
    Write-Host ""
    Write-Host "  Target:   $Target" -ForegroundColor White
    Write-Host "  Domain:   https://$DOMAIN" -ForegroundColor White
    Write-Host "  VPS:      $VPS_USER@$VPS_HOST : $VPS_DIR" -ForegroundColor White
    Write-Host "  Images:   $GHCR_REGISTRY/$GHCR_REPO/{api,web}:latest" -ForegroundColor White
    Write-Host "  Commit:   $commitHash" -ForegroundColor White
    Write-Host ""
    Write-Host "  Untuk deploy selanjutnya:" -ForegroundColor Cyan
    Write-Host "    git push origin master          # Via CI (otomatis)" -ForegroundColor Gray
    Write-Host "    .\deploy-to-vps.ps1 $Target     # Via lokal (manual)" -ForegroundColor Gray
    Write-Host "    .\deploy-to-vps.ps1 $Target -NoBuild  # Skip build" -ForegroundColor Gray
}
else {
    Write-Err "Deploy gagal. Cek log di atas."
}

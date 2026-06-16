# ─── THS-THM Dev Stack Starter (PowerShell) ──────────────────
# Starts the full development environment on Windows:
#   1. PostgreSQL (via Docker Compose)
#   2. Prisma migrations
#   3. API server (NestJS, watch mode)
#   4. Web server (Next.js, dev mode)
#
# Usage:
#   .\scripts\start-dev.ps1              # start all services
#   .\scripts\start-dev.ps1 -DbOnly      # start database only
#   .\scripts\start-dev.ps1 -NoWeb       # start DB + API, skip web
# ─────────────────────────────────────────────────────────────

param(
  [switch] $DbOnly,
  [switch] $NoWeb,
  [switch] $Help
)

if ($Help) {
  Write-Host "Usage: .\scripts\start-dev.ps1 [-DbOnly] [-NoWeb]"
  exit 0
}

$RootDir = Split-Path -Parent (Split-Path -Parent $PSCommandPath)
Set-Location $RootDir

function Log  { Write-Host "✓ $args" -ForegroundColor Green }
function Info { Write-Host "i $args" -ForegroundColor Cyan }
function Warn { Write-Host "! $args" -ForegroundColor Yellow }
function Err  { Write-Host "✗ $args" -ForegroundColor Red; exit 1 }

# ─── Pre-checks ──────────────────────────────────────────────
Info "Checking prerequisites..."

$dockerCmd = Get-Command docker -ErrorAction SilentlyContinue
if (-not $dockerCmd) { Err "Docker is not installed. Install Docker Desktop." }

try {
  $null = docker info 2>&1
} catch {
  Err "Docker daemon is not running. Start Docker Desktop and try again."
}

$pnpmCmd = Get-Command pnpm -ErrorAction SilentlyContinue
if (-not $pnpmCmd) {
  Warn "pnpm not found. Installing..."
  npm install -g pnpm
}

Log "Prerequisites OK"

# ─── 1. Start PostgreSQL ─────────────────────────────────────
Write-Host ""
Info "[1/4] Starting PostgreSQL..."

$dbRunning = docker ps --format "{{.Names}}" 2>&1 | Select-String -Quiet "ths-thm-system-db"
if ($dbRunning) {
  Log "PostgreSQL is already running"
} else {
  Info "Starting PostgreSQL container..."
  docker compose up -d postgres 2>&1 | Out-Null
  Log "PostgreSQL started (port 54321)"
}

if ($DbOnly) {
  Write-Host ""
  Log "Database is running. Exiting (-DbOnly)."
  exit 0
}

# ─── 2. Install dependencies + Prisma ────────────────────────
Write-Host ""
Info "[2/4] Installing dependencies..."

if (-not (Test-Path "node_modules")) {
  pnpm install
  Log "Dependencies installed"
} else {
  Log "node_modules found, skipping install"
}

Info "Generating Prisma client..."
pnpm --filter @ths-thm/api exec prisma generate

Info "Applying pending migrations..."
$migrateExit = 0
pnpm --filter @ths-thm/api exec prisma migrate deploy 2>&1 | Out-Null; $migrateExit = $LASTEXITCODE
if ($migrateExit -eq 0) {
  Log "Database schema up to date"
} else {
  Warn "Migrate exited with code $migrateExit (no pending migrations or DB not ready)"
}

# ─── 3. Start API server ─────────────────────────────────────
Write-Host ""
Info "[3/4] Starting API server (NestJS)..."

# Kill any stale process on port 3001
# Check if port 3001 is in use and offer to kill
$portCheck = netstat -ano | Select-String ":3001 "
if ($portCheck) {
  $existingPid = $portCheck.Line.Trim() -split "\s+" | Select-Object -Last 1
  Warn "Port 3001 is in use by PID $existingPid. Stopping..."
  Stop-Process -Id $existingPid -Force -ErrorAction SilentlyContinue
  Start-Sleep 1
}

Set-Location apps/api
if (-not (Test-Path "dist/main.js")) {
  Info "Building API..."
  npx nest build
  Log "API build complete"
}

# Start in background with visible output
$apiProc = Start-Process -NoNewWindow -PassThru `
  -FilePath "npx.cmd" `
  -ArgumentList "nest start" `
  -WorkingDirectory "$RootDir/apps/api"
$apiPID = $apiProc.Id
Log "API starting (PID $apiPID)...

# Wait for API to be ready
$apiReady = $false
for ($i = 1; $i -le 30; $i++) {
  try {
    $response = Invoke-WebRequest -Uri "http://localhost:3001/api/health" -UseBasicParsing -TimeoutSec 2
    if ($response.StatusCode -eq 200) {
      Log "API server ready (port 3001)"
      $apiReady = $true
      break
    }
  } catch {}
  Start-Sleep 1
}
if (-not $apiReady) { Warn "API server did not start within 30s" }

if ($NoWeb) {
  Write-Host ""
  Log "API is running. Exiting (-NoWeb)."
  Log "  API:  http://localhost:3001"
  Log "  Docs: http://localhost:3001/api/docs"
  exit 0
}

# ─── 4. Start Web dev server ─────────────────────────────────
Write-Host ""
Info "[4/4] Starting Web dev server (Next.js)..."

# Kill any stale process on port 3000
# Check if port 3000 is in use
$portCheckWeb = netstat -ano | Select-String ":3000 "
if ($portCheckWeb) {
  $existingPid = $portCheckWeb.Line.Trim() -split "\s+" | Select-Object -Last 1
  Warn "Port 3000 is in use by PID $existingPid. Stopping..."
  Stop-Process -Id $existingPid -Force -ErrorAction SilentlyContinue
  Start-Sleep 1
}

# Start in background with visible output
$webProc = Start-Process -NoNewWindow -PassThru `
  -FilePath "npx.cmd" `
  -ArgumentList "next dev -p 3000" `
  -WorkingDirectory "$RootDir/apps/web"
$webPID = $webProc.Id

# Wait for web to be ready
$webReady = $false
for ($i = 1; $i -le 30; $i++) {
  try {
    $response = Invoke-WebRequest -Uri "http://localhost:3000/login" -UseBasicParsing -TimeoutSec 2
    if ($response.StatusCode -eq 200) {
      Log "Web dev server ready (port 3000)"
      $webReady = $true
      break
    }
  } catch {}
  Start-Sleep 1
}
if (-not $webReady) { Warn "Web server did not start within 30s" }

# ─── Summary ─────────────────────────────────────────────────
Write-Host ""
Write-Host "═══════════════════════════════════════════════════" -ForegroundColor Cyan
Log "Full development stack is running!"
Write-Host ""
Log "  Frontend: http://localhost:3000"
Log "  API:      http://localhost:3001"
Log "  API Docs: http://localhost:3001/api/docs"
Log "  Database: localhost:54321 (postgres:ths_thm_password/ths_thm_db)"
Write-Host ""
Info "To stop all services, run:"
Info "  Stop-Process -Id $apiPID -Force; Stop-Process -Id $webPID -Force"
Info "  docker compose stop"
Write-Host "═══════════════════════════════════════════════════" -ForegroundColor Cyan

# Keep the script alive
Write-Host ""
Info "Press Ctrl+C to stop all services..."
while ($true) {
  Start-Sleep 1
}

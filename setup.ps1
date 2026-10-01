# THS-THM System Setup Script
# Jalankan: .\setup.ps1

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  THS-THM System - Setup Script" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan

$root = Split-Path -Parent $MyInvocation.MyCommand.Path

# Check Node.js
Write-Host "`n[1/6] Checking Node.js..." -ForegroundColor Yellow
try {
    $nodeVersion = node --version 2>$null
    Write-Host "  Node.js $nodeVersion detected" -ForegroundColor Green
} catch {
    Write-Host "  ERROR: Node.js not found. Install from https://nodejs.org" -ForegroundColor Red
    exit 1
}

# Check pnpm
Write-Host "`n[2/6] Checking pnpm..." -ForegroundColor Yellow
try {
    $pnpmVersion = pnpm --version 2>$null
    Write-Host "  pnpm $pnpmVersion detected" -ForegroundColor Green
} catch {
    Write-Host "  Installing pnpm..." -ForegroundColor Yellow
    npm install -g pnpm
    if ($?) { Write-Host "  pnpm installed" -ForegroundColor Green }
}

# Copy .env if not exists
Write-Host "`n[3/6] Setting up environment..." -ForegroundColor Yellow
$envFile = Join-Path $root ".env"
if (-not (Test-Path $envFile)) {
    Copy-Item (Join-Path $root ".env.example") $envFile
    Write-Host "  .env created from .env.example - ** EDIT VALUES BEFORE RUNNING **" -ForegroundColor Yellow
    Write-Host "  IMPORTANT: Replace all 'change-me-' and 'your-' placeholder values!" -ForegroundColor Red
} else {
    Write-Host "  .env already exists" -ForegroundColor Green
}

# Install API dependencies
Write-Host "`n[4/6] Installing apps/api dependencies..." -ForegroundColor Yellow
Set-Location (Join-Path $root "apps\api")
pnpm install
if ($?) {
    Write-Host "  apps/api dependencies installed" -ForegroundColor Green
    npx prisma generate
    Write-Host "  Prisma client generated" -ForegroundColor Green
}

# Install Web dependencies
Write-Host "`n[5/6] Installing apps/web dependencies..." -ForegroundColor Yellow
Set-Location (Join-Path $root "apps\web")
pnpm install
if ($?) {
    Write-Host "  apps/web dependencies installed" -ForegroundColor Green
}

# Install Flutter mobile dependencies
Write-Host "`n[6/6] Installing apps/mobile_flutter dependencies..." -ForegroundColor Yellow
Set-Location (Join-Path $root "apps\mobile_flutter")
pnpm install
if ($?) {
    Write-Host "  apps/mobile_flutter dependencies installed" -ForegroundColor Green
}

# Done
Set-Location $root
Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host "  Setup Complete!" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "  Next steps (Development):" -ForegroundColor White
Write-Host "  1. Edit .env with your database credentials" -ForegroundColor White
Write-Host "  2. cd apps/api && npx prisma migrate dev" -ForegroundColor White
Write-Host "  3. cd apps/api && pnpm run start:dev" -ForegroundColor White
Write-Host "  4. cd apps/web && pnpm run dev" -ForegroundColor White
Write-Host "  5. cd apps/mobile_flutter && flutter run" -ForegroundColor White
Write-Host ""
Write-Host "  Production Deployment (VPS):" -ForegroundColor White
Write-Host "  1. Push ke branch master — GitHub Actions build & deploy otomatis" -ForegroundColor White
Write-Host "  2. Workflow: .github/workflows/production.yml (GHCR + Docker Compose + Trivy)" -ForegroundColor White
Write-Host "  3. Prisma migration dijalankan otomatis saat deploy (migrate deploy)" -ForegroundColor White
Write-Host ""
Write-Host "  WARNING: 'migrate dev' is for DEVELOPMENT only." -ForegroundColor Red
Write-Host "  Use 'migrate deploy' in production!" -ForegroundColor Red
Write-Host "========================================" -ForegroundColor Cyan

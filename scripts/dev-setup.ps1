# Development environment setup script for THS-THM System (PowerShell)

Write-Host "Development Environment Setup" -ForegroundColor Green
Write-Host ""

# Check if Docker is installed
$dockerExists = docker --version 2>$null
if (-not $dockerExists) {
    Write-Host "Docker is not installed. Please install Docker Desktop first." -ForegroundColor Red
    exit 1
}

# Create .env if it doesn't exist
if (-not (Test-Path .env)) {
    Write-Host "Creating .env file from .env.example..." -ForegroundColor Yellow
    Copy-Item .env.example .env
    Write-Host ".env created. Please review with your configuration." -ForegroundColor Green
} else {
    Write-Host ".env file already exists" -ForegroundColor Green
}

Write-Host ""
Write-Host "Building development image..." -ForegroundColor Yellow
docker-compose -f docker-compose.dev.yml build

Write-Host ""
Write-Host "Starting services (PostgreSQL, Redis, Dev container)..." -ForegroundColor Yellow
docker-compose -f docker-compose.dev.yml up -d

Write-Host ""
Write-Host "Waiting for services to be healthy..." -ForegroundColor Yellow
Start-Sleep -Seconds 10

Write-Host ""
Write-Host "Services started successfully!" -ForegroundColor Green
Write-Host ""
Write-Host "Access points:" -ForegroundColor Cyan
Write-Host "   API:             http://localhost:3001" 
Write-Host "   Web Dashboard:   http://localhost:3002" 
Write-Host "   Prisma Studio:   http://localhost:5555" 
Write-Host "   Database:        localhost:54321"
Write-Host "   Redis:           localhost:6379"
Write-Host ""
Write-Host "Useful commands:" -ForegroundColor Cyan
Write-Host "   View logs:          docker-compose -f docker-compose.dev.yml logs -f dev"
Write-Host "   Stop services:      docker-compose -f docker-compose.dev.yml down"
Write-Host "   Database reset:     docker-compose -f docker-compose.dev.yml exec dev pnpm db:seed"
Write-Host ""

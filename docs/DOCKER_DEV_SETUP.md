# Docker Development Setup for THS-THM System

This guide explains how to set up and use the development Docker environment for the THS-THM monorepo.

## Quick Start

### Windows (PowerShell)
```powershell
.\scripts\dev-setup.ps1
```

### Linux/macOS (Bash)
```bash
chmod +x scripts/dev-setup.sh
./scripts/dev-setup.sh
```

Or manually:
```bash
docker-compose -f docker-compose.dev.yml up -d
```

## What's Included

The development setup includes:

| Service | Port | Purpose |
|---------|------|---------|
| **API (NestJS)** | 3001 | Backend REST API with hot-reload |
| **Web (Next.js)** | 3002 | Frontend dashboard with fast refresh |
| **PostgreSQL** | 54321 | Database (connection: ths_thm_password) |
| **Redis** | 6379 | Cache & job queue |
| **Prisma Studio** | 5555 | Database GUI |

## Key Features

✅ **Hot Reload**: Source code changes auto-rebuild both API and Web  
✅ **Volume Mounts**: `./apps/api/src`, `./apps/web`, `./packages` mounted live  
✅ **Isolated Environment**: Separate `_dev` containers/volumes to avoid conflicts  
✅ **Health Checks**: Automatic service health monitoring  
✅ **Database**: Pre-configured PostgreSQL with auto-migration on startup  

## Essential Commands

### Start Development Environment
```bash
docker-compose -f docker-compose.dev.yml up -d
```

### View Logs
```bash
# All services
docker-compose -f docker-compose.dev.yml logs -f

# Just API
docker-compose -f docker-compose.dev.yml logs -f dev

# Follow logs in real-time
docker-compose -f docker-compose.dev.yml logs -f
```

### Stop Services
```bash
docker-compose -f docker-compose.dev.yml down
```

### Rebuild Image
```bash
docker-compose -f docker-compose.dev.yml build --no-cache
```

### Access Database

#### Prisma Studio (GUI)
```bash
docker-compose -f docker-compose.dev.yml exec dev pnpm db:studio
# Opens at http://localhost:5555
```

#### psql CLI
```bash
docker-compose -f docker-compose.dev.yml exec postgres psql -U ths_thm -d ths_thm_db
```

#### Connection String (from host)
```
postgresql://ths_thm:ths_thm_password@localhost:54321/ths_thm_db
```

### Database Operations

#### Run Migrations
```bash
docker-compose -f docker-compose.dev.yml exec dev pnpm db:migrate
```

#### Seed Database
```bash
docker-compose -f docker-compose.dev.yml exec dev pnpm db:seed
```

#### Generate Prisma Client
```bash
docker-compose -f docker-compose.dev.yml exec dev pnpm db:generate
```

#### Reset Database
```bash
docker-compose -f docker-compose.dev.yml exec dev pnpm db:migrate reset
```

### Run Tests

#### Unit & Integration Tests
```bash
docker-compose -f docker-compose.dev.yml exec dev pnpm test
```

#### With Coverage
```bash
docker-compose -f docker-compose.dev.yml exec dev pnpm test:cov
```

#### E2E Tests
```bash
docker-compose -f docker-compose.dev.yml exec dev pnpm test:e2e
```

### Linting & Formatting

```bash
# Check lint
docker-compose -f docker-compose.dev.yml exec dev pnpm lint

# Auto-fix lint errors
docker-compose -f docker-compose.dev.yml exec dev pnpm lint -- --fix

# Format code
docker-compose -f docker-compose.dev.yml exec dev pnpm format

# Check format only
docker-compose -f docker-compose.dev.yml exec dev pnpm format:check
```

### Type Checking
```bash
docker-compose -f docker-compose.dev.yml exec dev pnpm typecheck
```

### Install New Packages

```bash
# Add to specific workspace
docker-compose -f docker-compose.dev.yml exec dev pnpm --filter @ths-thm/api add <package>
docker-compose -f docker-compose.dev.yml exec dev pnpm --filter @ths-thm/web add <package>

# Update all dependencies
docker-compose -f docker-compose.dev.yml exec dev pnpm update
```

## Environment Variables

Create a `.env` file in the root (copy from `.env.example`):

```bash
# Database
DATABASE_URL=postgresql://ths_thm:ths_thm_password@postgres:5432/ths_thm_db

# Authentication
JWT_SECRET=your-dev-secret-key-here
JWT_REFRESH_SECRET=your-dev-refresh-secret-here

# Firebase/FCM
FCM_PROJECT_ID=your-project-id
FCM_PRIVATE_KEY=your-private-key
FCM_CLIENT_EMAIL=your-client-email

# SMTP (for password reset emails)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASSWORD=your-app-password

# Application
APP_PORT=3001
NODE_ENV=development
CORS_ORIGINS=http://localhost:3000,http://localhost:3002,http://localhost:3001
```

## Accessing Services

### API
- **Base URL**: http://localhost:3001
- **Health Check**: http://localhost:3001/api/health
- **Swagger Docs**: http://localhost:3001/api/docs

### Web Dashboard
- **URL**: http://localhost:3002
- **Auto-refresh**: Changes are reflected immediately via Next.js fast refresh

### Database Management
- **Prisma Studio**: http://localhost:5555
- **psql**: `localhost:54321` (Port forwarded from container)

## Troubleshooting

### Container Won't Start

```bash
# Check logs
docker-compose -f docker-compose.dev.yml logs dev

# Rebuild from scratch
docker-compose -f docker-compose.dev.yml down -v
docker-compose -f docker-compose.dev.yml build --no-cache
docker-compose -f docker-compose.dev.yml up -d
```

### Database Connection Error

```bash
# Ensure PostgreSQL is healthy
docker-compose -f docker-compose.dev.yml ps

# Manually run migration
docker-compose -f docker-compose.dev.yml exec dev pnpm db:migrate
```

### Port Already in Use

Change the host port in `docker-compose.dev.yml`:

```yaml
ports:
  - '3001:3001'  # Change first number, e.g., '3005:3001'
  - '3002:3002'
```

### Hot Reload Not Working

Ensure source volumes are mounted:

```bash
# Verify volume mounts
docker-compose -f docker-compose.dev.yml exec dev ls -la apps/api/src
```

If missing, manually re-mount:

```bash
docker-compose -f docker-compose.dev.yml down
docker-compose -f docker-compose.dev.yml up -d
```

### Memory/Performance Issues

Increase Docker memory limits:

**Windows/macOS**: Docker Desktop → Preferences → Resources → Memory  
**Linux**: Check available system memory with `free -h`

## Development Workflow

1. **Start environment**: `docker-compose -f docker-compose.dev.yml up -d`
2. **Edit code**: Changes to `/apps/api/src` and `/apps/web` auto-rebuild
3. **Check logs**: `docker-compose -f docker-compose.dev.yml logs -f dev`
4. **Test changes**: API at 3001, Web at 3002
5. **Run tests**: `docker-compose -f docker-compose.dev.yml exec dev pnpm test`
6. **Commit & push**: Use normal git workflow

## What's Different from Production

| Aspect | Dev | Prod |
|--------|-----|------|
| **Build** | Multi-stage with devDeps | Multi-stage prod-only |
| **Hot Reload** | Enabled (volume mounts) | Disabled |
| **Node Modules** | Named volume for cache | Copied in image |
| **Environment** | NODE_ENV=development | NODE_ENV=production |
| **Migrations** | Auto-run on startup | Manual deploy step |
| **Image Size** | Larger (~1.2GB) | Smaller (~450MB) |

## Next Steps

- Copy `.env.example` to `.env` and fill in your configuration
- Run `./scripts/dev-setup.ps1` (Windows) or `./scripts/dev-setup.sh` (Linux/macOS)
- Visit http://localhost:3002 to see the web dashboard
- Check http://localhost:3001/api/docs for API documentation
- Use Prisma Studio at http://localhost:5555 to explore the database

Need help? Check the main [README.md](../README.md) or review the compose files for details.

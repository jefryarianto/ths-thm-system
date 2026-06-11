# THS-THM Testing Guide

## Prerequisites

> **⚠️ Node.js >= 20.x LTS (recommended: 22.x) is required.**  
> **Node.js v26 is NOT compatible** — Next.js 15.5.19 has a prerendering bug (`<Html> should not be imported outside of pages/_document`) on Windows + Node.js 26.  
> Use a version manager like [`nvm-windows`](https://github.com/coreybutler/nvm-windows) or [`fnm`](https://github.com/Schniz/fnm) to switch.

## Test Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    CI Pipeline (GitHub Actions)              │
├──────────┬──────────┬──────────┬───────────┬───────────────┤
│ typecheck│   lint   │ test (API)│ e2e (API) │ e2e-web       │
│ + mobile │          │ unit+cov │ NestJS    │ Playwright    │
│   tests  │          │ +mobile  │           │               │
├──────────┴──────────┴──────────┴───────────┴───────────────┤
│                    Deploy Stages                             │
│         build-api → smoke-test → deploy-production          │
│         build-web → deploy-staging                          │
└─────────────────────────────────────────────────────────────┘
```

## Test Layers

### 1. Unit Tests

| App | Framework | Location | Run Command |
|-----|-----------|----------|-------------|
| API | Jest | `apps/api/src/` | `pnpm --filter @ths-thm/api test` |
| Web | Vitest | `apps/web/src/` | `pnpm --filter @ths-thm/web test` |
| Mobile | Jest | `apps/mobile/src/` | `cd apps/mobile && npx jest` |

**Mobile tests (15 total):**
- `use-gamification.test.ts` — 9 tests for gamification hooks
- `use-screen.test.ts` — 6 tests for screen hooks (activities, candidates, documents)

**Web tests (133 total):**
- Component tests for dashboard, letters, mail, etc.
- Run with: `cd apps/web && npx vitest run`

### 2. Integration / API Tests

| Type | Framework | Location | Run Command |
|------|-----------|----------|-------------|
| API Integration | Jest (e2e config) | `apps/api/test/` | `pnpm --filter @ths-thm/api test:e2e` |
| API Coverage | Jest | `apps/api/src/` | `pnpm run test:cov` |

**Requirements:** PostgreSQL database (see Docker setup below).

### 3. End-to-End Tests

#### Web (Playwright)

| Aspect | Detail |
|--------|--------|
| **Framework** | Playwright 1.60 |
| **Location** | `apps/web/e2e/` |
| **Run command** | `cd apps/web && npx playwright test` |
| **Tests** | `login.spec.ts` (3 tests), `dashboard.spec.ts` (3 tests), `member-import.spec.ts` (1 test) |
| **Selectors** | Prefer `data-testid` attributes for robustness |

**Running locally:**
```bash
# Start API + DB via Docker Compose
docker compose -f docker-compose.e2e.yml up --build
```

Or manually:
```bash
# 1. Start PostgreSQL
docker run -d --name ths-thm-test-db \
  -e POSTGRES_USER=ths_thm \
  -e POSTGRES_PASSWORD=test_password \
  -e POSTGRES_DB=ths_thm_e2e \
  -p 5432:5432 postgres:16-alpine

# 2. Run migrations + seed
cd apps/api
DATABASE_URL=postgresql://ths_thm:test_password@localhost:5432/ths_thm_e2e npx prisma migrate deploy
DATABASE_URL=postgresql://ths_thm:test_password@localhost:5432/ths_thm_e2e npx ts-node prisma/seed.ts

# 3. Start API
DATABASE_URL=postgresql://ths_thm:test_password@localhost:5432/ths_thm_e2e \
  JWT_SECRET=test-jwt-secret \
  node dist/main.js &

# 4. Start Web
cd apps/web
NEXT_PUBLIC_API_URL=http://localhost:3001 npx next dev -p 3002 &

# 5. Run Playwright
npx playwright install chromium
E2E_BASE_URL=http://localhost:3002 npx playwright test
```

**CI Configuration:** See `.github/workflows/ci.yml` → `e2e-web` job.

#### Mobile (Maestro)

| Aspect | Detail |
|--------|--------|
| **Framework** | Maestro |
| **Location** | `apps/mobile/e2e/` |
| **Run command** | `maestro test apps/mobile/e2e/` |
| **Flows** | `login.yaml`, `full-flow.yaml`, `home-screen.yaml`, `gamification.yaml`, `documents.yaml` |
| **Selectors** | Prefer `testID` props in React Native + `tapOn: { id: "..." }` in Maestro |

**Running locally:**
```bash
# Install Maestro
curl -Ls "https://get.maestro.mobile.dev" | bash

# Build APK via EAS
eas build --platform android --profile preview

# Install on emulator/device
maestro install app-release.apk

# Run tests
maestro test apps/mobile/e2e/
```

**CI Configuration:** See `.github/workflows/ci.yml` → `e2e-mobile` job (syntax validation only; full execution requires device/emulator).

### 4. Type Checking

| App | Command |
|-----|---------|
| All | `pnpm run typecheck` |
| API | `cd apps/api && npx tsc --noEmit` |
| Web | `cd apps/web && npx tsc --noEmit` |
| Mobile | `cd apps/mobile && npx tsc --noEmit` |

### 5. Linting

| App | Command |
|-----|---------|
| All | `pnpm run lint` |
| Format check | `pnpm run format:check` |

## CI Pipeline Dependencies

The GitHub Actions workflow (`.github/workflows/ci.yml`) has the following job dependency graph:

```
typecheck ──┬── lint
            ├── test-mobile
            ├── test (API) ──┬── e2e (API)
            │                ├── e2e-web (Playwright)
            │                └── build-api ──┬── smoke-test ──┬── deploy-production
            └── build-web ──────────────────┘                └── deploy-staging
                  (deploy-staging runs from develop branch)
                  (deploy-production runs from main branch)
```

**Key dependencies:**
- `e2e (API)` waits for `test (API)` — ensures API unit tests pass before E2E
- `e2e-web` waits for `test (API)` — ensures API is working before web E2E
- `build-api` waits for `typecheck` + `test (API)` — only build if tests pass
- `smoke-test` waits for `build-api` + `e2e (API)` — only smoke-test if build + E2E pass
- `deploy-production` waits for `typecheck`, `test`, `e2e`, `smoke-test`, `build-api`, `build-web`
- `test-mobile` and `e2e-mobile` run independently (no blocking dependency on other jobs)

## Environment Variables for Testing

| Variable | Purpose | Example |
|----------|---------|---------|
| `DATABASE_URL` | Database connection | `postgresql://ths_thm:test_password@localhost:5432/ths_thm_test` |
| `JWT_SECRET` | JWT signing | `test-jwt-secret` |
| `JWT_REFRESH_SECRET` | Refresh token signing | `test-jwt-refresh-secret` |
| `NEXT_PUBLIC_API_URL` | Web → API URL | `http://localhost:3001` |
| `E2E_BASE_URL` | Playwright base URL | `http://localhost:3002` |

## Test Credentials (Seed Data)

| Role | Email | Password |
|------|-------|----------|
| Superadmin | `superadmin@ths-thm.org` | `password123` |
| Admin | `admin@ths-thm.org` | `password123` |

## Docker Resources

| File | Purpose |
|------|---------|
| `docker-compose.yml` | Development (API + Web + PostgreSQL on port 54321) |
| `docker-compose.test.yml` | API E2E tests (PostgreSQL on port 5433) |
| `docker-compose.e2e.yml` | Full Playwright E2E suite (API + Web + PostgreSQL + Playwright) |
| `apps/api/Dockerfile` | API production image |
| `apps/api/Dockerfile.test` | API test runner image |
| `apps/web/Dockerfile` | Web production image |
| `apps/web/Dockerfile.e2e` | Web E2E test image (pnpm multi-stage) |

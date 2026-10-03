# THS-THM Testing Guide

## Prerequisites

> **⚠️ Node.js >= 20.x LTS (recommended: 22.x) is required.**  
> **Node.js v26 is NOT compatible** — Next.js 15.5.19 has a prerendering bug (`<Html> should not be imported outside of pages/_document`) on Windows + Node.js 26.  
> Use a version manager like [`nvm-windows`](https://github.com/coreybutler/nvm-windows) or [`fnm`](https://github.com/Schniz/fnm) to switch.

## Test Architecture

```
.github/workflows/ci.yml          .github/workflows/e2e.yml
┌───────────────────────────┐     ┌──────────────────────┐
│ lint      typecheck       │     │ e2e (Playwright/Web) │
│ contract  test-api (cov)  │     └──────────────────────┘
│ test-web  repo-hygiene    │     .github/workflows/flutter-apk-build.yml
└───────────────────────────┘     ┌──────────────────────┐
                                  │ build (APK debug)    │
.github/workflows/production.yml  └──────────────────────┘
build-and-push → deploy → scan-images
```

## Test Layers

### 1. Unit Tests

| App    | Framework | Location                    | Run Command                                                    |
| ------ | --------- | --------------------------- | -------------------------------------------------------------- |
| API    | Jest      | `apps/api/src/`             | `pnpm --filter @ths-thm/api test`                              |
| Web    | Vitest    | `apps/web/src/`             | `pnpm --filter @ths-thm/web test`                              |
| Mobile | Flutter   | `apps/mobile_flutter/test/` | `pnpm test:mobile` or `cd apps/mobile_flutter && flutter test` |

**Mobile tests (`apps/mobile_flutter/test/`):**

- `api_client_test.dart` — token refresh, header auth, error mapping
- `assessment_outbox_test.dart` — antrian/offline assessment
- `org_structure_fields_test.dart` — pemetaan field struktur organisasi
- `widget_test.dart` — smoke test widget

**Web tests (133 total):**

- Component tests for dashboard, letters, mail, etc.
- Run with: `cd apps/web && npx vitest run`

### 2. Integration / API Tests

| Type            | Framework         | Location         | Run Command                           |
| --------------- | ----------------- | ---------------- | ------------------------------------- |
| API Integration | Jest (e2e config) | `apps/api/test/` | `pnpm --filter @ths-thm/api test:e2e` |
| API Coverage    | Jest              | `apps/api/src/`  | `pnpm run test:cov`                   |

**Requirements:** PostgreSQL database (see Docker setup below).

### 3. End-to-End Tests

#### Web (Playwright)

| Aspect          | Detail                                                                                     |
| --------------- | ------------------------------------------------------------------------------------------ |
| **Framework**   | Playwright 1.60                                                                            |
| **Location**    | `apps/web/e2e/`                                                                            |
| **Run command** | `cd apps/web && npx playwright test`                                                       |
| **Tests**       | `login.spec.ts` (3 tests), `dashboard.spec.ts` (3 tests), `member-import.spec.ts` (1 test) |
| **Selectors**   | Prefer `data-testid` attributes for robustness                                             |

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

**CI Configuration:** See `.github/workflows/e2e.yml` → `e2e` job.

#### Mobile (Flutter)

| Aspect           | Detail                                                           |
| ---------------- | ---------------------------------------------------------------- |
| **Framework**    | Flutter test (`flutter_test`)                                    |
| **Location**     | `apps/mobile_flutter/test/`                                      |
| **Unit tests**   | `cd apps/mobile_flutter && flutter test` (or `pnpm test:mobile`) |
| **Static check** | `cd apps/mobile_flutter && flutter analyze`                      |
| **APK build**    | `flutter build apk --release -t lib/main.dart`                   |

**CI Configuration:**

- Build APK: `.github/workflows/flutter-apk-build.yml` → `build` job
- Unit test + analyze: `pnpm test:mobile` / `pnpm lint:mobile` (belum ada job CI khusus; jalankan lokal)
- E2E mobile: belum otomatis — verifikasi manual di emulator/device

### 4. Type Checking

| App    | Command                                     |
| ------ | ------------------------------------------- |
| All    | `pnpm run typecheck`                        |
| API    | `cd apps/api && npx tsc --noEmit`           |
| Web    | `cd apps/web && npx tsc --noEmit`           |
| Mobile | `cd apps/mobile_flutter && flutter analyze` |

### 5. Linting

| App          | Command                 |
| ------------ | ----------------------- |
| All          | `pnpm run lint`         |
| Format check | `pnpm run format:check` |

## CI Pipeline Dependencies

Testing runs across several independent workflows. Job dependency graph:

```
.github/workflows/ci.yml  (jobs run in parallel, no `needs:`)
├── lint
├── typecheck
├── contract
├── test-api      # Jest unit + integration (coverage)
├── test-web      # Vitest + next build
└── repo-hygiene  # guard artefak/junk (lihat .github/ISSUE_TEMPLATE)

.github/workflows/e2e.yml
└── e2e           # Playwright (Web), trigger: push/PR + schedule + workflow_dispatch

.github/workflows/flutter-apk-build.yml
└── build         # flutter build apk (debug)

.github/workflows/production.yml  (push ke master)
build-and-push ──→ deploy ──→ scan-images
```

**Key dependencies:**

- Job pada `ci.yml` berjalan **paralel** (tidak ada `needs:`) — failure salah satu tidak memblokir yang lain
- `e2e` (`.github/workflows/e2e.yml`) berdiri sendiri; boot API + Web via Docker sebelum Playwright
- `deploy` menunggu `build-and-push` (image harus ada di registry)
- `scan-images` menunggu `build-and-push` + `deploy` (image scanning pasca-deploy)
- Mobile Flutter (`flutter test` / `flutter analyze`) **belum** punya job CI — jalankan via `pnpm test:mobile` / `pnpm lint:mobile`

## Environment Variables for Testing

| Variable              | Purpose               | Example                                                          |
| --------------------- | --------------------- | ---------------------------------------------------------------- |
| `DATABASE_URL`        | Database connection   | `postgresql://ths_thm:test_password@localhost:5432/ths_thm_test` |
| `JWT_SECRET`          | JWT signing           | `test-jwt-secret`                                                |
| `JWT_REFRESH_SECRET`  | Refresh token signing | `test-jwt-refresh-secret`                                        |
| `NEXT_PUBLIC_API_URL` | Web → API URL         | `http://localhost:3001`                                          |
| `E2E_BASE_URL`        | Playwright base URL   | `http://localhost:3002`                                          |

## Test Credentials (Seed Data)

| Role       | Email                    | Password      |
| ---------- | ------------------------ | ------------- |
| Superadmin | `superadmin@ths-thm.org` | `password123` |
| Admin      | `admin@ths-thm.org`      | `password123` |

## Docker Resources

| File                       | Purpose                                                         |
| -------------------------- | --------------------------------------------------------------- |
| `docker-compose.yml`       | Development (API + Web + PostgreSQL on port 54321)              |
| `docker-compose.test.yml`  | API E2E tests (PostgreSQL on port 5433)                         |
| `docker-compose.e2e.yml`   | Full Playwright E2E suite (API + Web + PostgreSQL + Playwright) |
| `apps/api/Dockerfile`      | API production image                                            |
| `apps/api/Dockerfile.test` | API test runner image                                           |
| `apps/web/Dockerfile`      | Web production image                                            |
| `apps/web/Dockerfile.e2e`  | Web E2E test image (pnpm multi-stage)                           |

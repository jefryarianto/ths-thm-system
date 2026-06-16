# Deployment Safety Checklist

This checklist outlines the verification steps that should be completed before merging code to `master` / deploying to production.

---

## Before Merge (PR Stage)

### 1. TypeScript Compilation

- [ ] `pnpm run typecheck` — zero type errors across all packages

### 2. Linting & Formatting

- [ ] `pnpm run lint` — zero lint warnings/errors
- [ ] `pnpm run format:check` — Prettier formatting is consistent

### 3. API Unit Tests

- [ ] `pnpm run test:cov` — all unit tests pass, coverage threshold met
- [ ] PostgreSQL is available locally or via Docker

### 4. Playwright E2E Tests (Web)

- [ ] `cd apps/web && npx playwright test` — all E2E tests pass
- [ ] Run with the same Playwright version used in CI (`@playwright/test` in `apps/web/package.json`)
- [ ] If sharding is enabled: `npx playwright test --shard=1/N && npx playwright test --shard=2/N ...`

### 5. API E2E Tests

- [ ] `pnpm run test:e2e` — API E2E tests pass against a test database
- [ ] Requires PostgreSQL + `prisma migrate deploy` + seed data

### 6. PR Review

- [ ] New features include corresponding E2E or unit tests
- [ ] Schema changes include a new migration (`prisma migrate dev --name <desc>`)
- [ ] Environment variables / secrets are documented in `.env.example` or the deployment config
- [ ] No `.only` or `.skip` left in test files

---

## Before Deploy to Staging

### 7. Docker Build

- [ ] `docker compose build` — no build errors for API and Web images
- [ ] Smoke test: `docker compose up -d && curl http://localhost:3001/api/health`

### 8. Database Migrations

- [ ] `npx prisma migrate deploy` runs cleanly against the staging database
- [ ] Rollback plan exists: know which `prisma migrate resolve` commands to run if migration fails

### 9. Staging Verification

- [ ] Smoke: Health endpoint returns `{"status": "ok"}`
- [ ] Smoke: Web dashboard loads and can log in with test credentials
- [ ] Feature-flag toggles are set correctly for the release

---

## Before Deploy to Production

### 10. CI Pipeline

- [ ] **All CI jobs pass** on the target commit:
  - `typecheck` ✓, `lint` ✓, `test` ✓, `e2e` ✓
  - `e2e-web` (all shards) ✓
  - `smoke-test` ✓
  - `build-api` + `build-web` ✓
- [ ] No test results show regressions compared to the previous run

### 11. Migration Safety

- [ ] `prisma migrate deploy` is **backward-compatible** (old code can still run against the new schema)
- [ ] If the migration is destructive, a data-backup step has been verified

### 12. Rollback Plan

- [ ] Previous Docker images are tagged and available in GHCR
- [ ] A `docker compose pull && docker compose up -d` rollback would restore the previous version
- [ ] Database rollback steps are documented (if migration is reversible)

### 13. Monitoring

- [ ] Health checks are configured for API + Web
- [ ] Error tracking (Sentry / similar) is active
- [ ] Deployment notifications are configured (Slack, email, etc.)

---

## Post-Deployment

### 14. Verification

- [ ] Health endpoint responds correctly in production
- [ ] Key user flows are functional (login, member listing, training, etc.)
- [ ] No spike in error rates within 15 minutes of deploy
- [ ] Scheduled tasks / cron jobs are running as expected

### 15. Communication

- [ ] Team is notified of the deployment
- [ ] Release notes / changelog is updated
- [ ] Rollback decision deadline is communicated (e.g., "monitor for 30 min")

---

> **Note:** Not every step is required for every single commit. Use judgment:
>
> - A dependency update → run typecheck + lint + unit tests (skip E2E if risk is low)
> - A new feature → run full checklist
> - An urgent hotfix → run typecheck + unit tests + staging smoke, then expedite

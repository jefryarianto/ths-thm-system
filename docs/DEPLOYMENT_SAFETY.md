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

## Disaster Recovery — Database Backup & Restore

### Backup System

Backups run automatically via **systemd timer** (`ths-thm-backup.timer`) daily at 02:00 AM.

| Component | Detail |
|:----------|:-------|
| **Script** | `scripts/backup-database.sh` |
| **Schedule** | `systemd timer` — daily @ 02:00 + 10 min after boot |
| **Format** | `pg_dump --format=custom --compress=9` (compressed, parallel-restore capable) |
| **Location** | `/opt/backups/ths-thm/{production,staging}/` |
| **Retention** | 30 days (auto-cleaned) |
| **Offsite** | Optional rsync to remote host (`OFFSITE_HOST` env var) |
| **Notification** | Optional Slack webhook on failure (`SLACK_WEBHOOK_URL`) |

### Restore Commands

```bash
# List available backups
sudo -u ths-thm ./scripts/restore-database.sh --list

# Dry-run restore of latest backup
sudo -u ths-thm ./scripts/restore-database.sh --latest --dry-run

# Restore latest backup to production (with confirmation)
sudo -u ths-thm ./scripts/restore-database.sh --latest

# Restore a specific file
sudo -u ths-thm ./scripts/restore-database.sh --file /opt/backups/ths_thm_db_20260101_020000.sql.gz

# Restore from stdin (pipe)
gunzip -c backup.sql.gz | sudo -u ths-thm ./scripts/restore-database.sh --stdin --staging

# Fetch from offsite first, then restore
OFFSITE_HOST=backup@backup.example.com OFFSITE_DIR=/backups/ths-thm/production \
  sudo -u ths-thm ./scripts/restore-database.sh --from-offsite --latest
```

### Manual Backup

```bash
# Production
sudo -u ths-thm ./scripts/backup-database.sh --production

# Staging
sudo -u ths-thm TARGET=staging ./scripts/backup-database.sh

# Offsite sync only (skip pg_dump)
sudo -u ths-thm ./scripts/backup-database.sh --offsite-only
```

### Systemd Service Management

```bash
# View timer status
sudo systemctl status ths-thm-backup.timer
sudo systemctl list-timers --all | grep ths-thm

# View last backup log
sudo journalctl -u ths-thm-backup.service -n 50 --no-pager

# View backup failure logs
sudo journalctl -u ths-thm-backup.service -p err -n 20 --no-pager

# Trigger backup immediately (without waiting for timer)
sudo systemctl start ths-thm-backup.service
```

### Disaster Recovery Procedure

**If database is corrupted or lost:**

1. **Stop the API** to prevent further writes:
   ```bash
   docker compose -f docker-compose.production.yml stop api
   ```

2. **Verify latest backup exists:**
   ```bash
   ./scripts/restore-database.sh --list
   ```

3. **Restore the latest backup:**
   ```bash
   ./scripts/restore-database.sh --latest
   ```

4. **Run database migrations** (if restore is from an older schema):
   ```bash
   docker compose -f docker-compose.production.yml run --rm api sh -c "cd apps/api && npx prisma migrate deploy"
   ```

5. **Restart the API:**
   ```bash
   docker compose -f docker-compose.production.yml start api
   ```

6. **Verify:**
   ```bash
   curl -sf https://ths-thm.cloud/api/health
   ```

**If offsite backup is needed:**

```bash
OFFSITE_HOST=backup@backup.example.com \
  OFFSITE_DIR=/backups/ths-thm/production \
  OFFSITE_KEY=/home/ths-thm/.ssh/backup-key \
  ./scripts/restore-database.sh --from-offsite --latest
```

---

> **Note:** Not every step is required for every single commit. Use judgment:
>
> - A dependency update → run typecheck + lint + unit tests (skip E2E if risk is low)
> - A new feature → run full checklist
> - An urgent hotfix → run typecheck + unit tests + staging smoke, then expedite

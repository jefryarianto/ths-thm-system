# Priority 1: Security & Infrastructure Improvements

## Goal

Harden the repo's security posture and CI pipeline by (a) masking sensitive files via `.gitignore`, (b) adding dependency auditing and typechecking for all three apps to CI, and (c) cleaning up lockfile inconsistency.

---

## Prerequisites

- Git repo with write access
- pnpm installed (v9+)
- Node.js v22

---

## Tasks

### Task 1 — Expand `.gitignore` for sensitive artifacts

**What**: Add patterns to `.gitignore` to prevent future commits of secrets and dev artifacts.

**Changes** (`.gitignore` at repo root):

```gitignore
# Sensitive credentials (already exist but verify completeness)
.env
.env.local
.env.*.local

# Add these if missing:
client_secret_*.json
*firebase-adminsdk-*.json
temp_key.pem
api-error.txt
api-output.txt
api-server-error.log
api-server.log
.freebuff/
package-lock.json
```

### Task 2 — Add `pnpm audit` to CI

**What**: Fail CI on high/critical dependency vulnerabilities.

**File**: `.github/workflows/ci.yml`

**Add step** after `Install dependencies`:

```yaml
- name: Audit dependencies
  run: pnpm audit --audit-level=high
```

### Task 3 — Add typecheck for Web and Mobile to CI

**What**: Ensure frontend and mobile code passes TypeScript checks in CI.

**File**: `.github/workflows/ci.yml`

**Add steps** inside the `test` job (after `Run API Tests`):

```yaml
- name: Typecheck Web
  run: pnpm --filter @ths-thm/web typecheck

- name: Typecheck Mobile
  run: pnpm --filter @ths-thm/mobile typecheck
```

### Task 4 — Add test enforcement for Web and Mobile to CI

**What**: Run unit tests for web and mobile apps in CI.

**File**: `.github/workflows/ci.yml`

**Add steps** inside the `test` job (after `Typecheck Mobile`):

```yaml
- name: Run Web Tests
  run: pnpm --filter @ths-thm/web test

- name: Run Mobile Tests
  run: pnpm --filter @ths-thm/mobile test
```

**Note**: Verify that `@ths-thm/web` and `@ths-thm/mobile` have working `test` scripts in their `package.json`. If mobile lacks a test runner config, this step will require adding Jest config first (see Risk block).

### Task 5 — Clean up lockfile inconsistency

**What**: Remove `package-lock.json` from root and `.kilo/` since the monorepo uses `pnpm-lock.yaml`.

**Changes**:

1. Check if `package-lock.json` at repo root is tracked by git:
   ```bash
   git ls-files package-lock.json
   ```
2. If tracked, remove and add to `.gitignore`:
   ```bash
   git rm --cached package-lock.json
   echo "package-lock.json" >> .gitignore
   git add .gitignore
   ```
3. Remove `package-lock.json` inside `.kilo/` (it is a dev artifact):
   ```bash
   rm -f .kilo/package-lock.json
   ```
4. Commit both changes together.

### Task 6 — Verify `.env.example` covers all env vars

**What**: Ensure every environment variable used in `docker-compose.production.yml`, Render `render.yaml`, and `.env.production` is documented in `.env.example`.

**Checklist** — verify these are all present in `.env.example`:
- `DATABASE_URL`
- `REDIS_URL`
- `JWT_SECRET` / `JWT_REFRESH_SECRET`
- `JWT_EXPIRES_IN` / `JWT_REFRESH_EXPIRES_IN`
- `NODE_ENV`
- `APP_PORT`
- `FCM_PROJECT_ID`, `FCM_PRIVATE_KEY`, `FCM_CLIENT_EMAIL`
- `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`
- `RESEND_API_KEY`, `RESEND_DOMAIN`
- `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `GOOGLE_CALLBACK_URL`
- `SENTRY_DSN`, `SENTRY_ORG`, `SENTRY_PROJECT`
- `THROTTLE_TTL`, `THROTTLE_LIMIT`
- `FRONTEND_URL`
- `CORS_ORIGINS`

**Action**: Add any missing vars with placeholder values.

---

## Risk & Mitigation

| Risk | Mitigation |
|------|-----------|
| Mobile app has no Jest config; `test` script may fail | Check `apps/mobile/package.json` `test` script before adding CI step; if missing, skip Task 4 until mobile tests are configured |
| `pnpm audit` breaks CI on existing vulns | Run `pnpm audit` locally first; triage and fix existing issues before enabling in CI, or set `audit-level` to `critical` as a starting point |
| `package-lock.json` removal breaks a developer's workflow | Communicate the change in the next team update; pnpm is the canonical package manager for this monorepo |
| `.env.example` gets stale during rapid development | Add a CI check script that compares `.env.example` keys against `docker-compose.*.yml` env vars (future improvement, not in this plan) |

---

## Acceptance Criteria

- [ ] `.gitignore` covers all sensitive file patterns listed in Task 1
- [ ] CI fails on `pnpm audit --audit-level=high` vulnerabilities
- [ ] CI runs `typecheck` for `@ths-thm/web` and `@ths-thm/mobile`
- [ ] CI runs `test` for `@ths-thm/web` and `@ths-thm/mobile` (if test scripts exist)
- [ ] Root `package-lock.json` removed and `.gitignore` updated
- [ ] `.kilo/package-lock.json` removed
- [ ] All env vars in production configs are documented in `.env.example`
- [ ] All CI changes pass on the next push to `master` or `develop`

---

## Open Questions

1. Does `apps/mobile/package.json` have a working `test` script with a test runner? If not, Task 4 should be deferred.
2. Should the `pnpm audit` threshold be `high` or `critical` initially? `critical` is safer for first rollout.
3. Should Sensitive file removal (not just `.gitignore`) be scheduled as a separate action?

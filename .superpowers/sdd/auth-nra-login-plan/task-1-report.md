# Task 1 report — API login accepts email, phone, and NRA

Status: DONE
Branch: `master` (BASE `9638baf2a156422a9f8dd5344e4ec810186e90e7`)
Commit: `a8f4924f feat(api): dukungi login NRA` (pushed to `origin/master`; working tree clean)

## Scope implemented

- `apps/api/src/modules/auth/auth.service.ts`
  - Added private `normalizeNra()`: uppercase, strip `[\s\-().]`, match the exact brief regex, return `g1-g2-g3-g4` or `null`.
  - `login()` detection order is email → NRA → phone; a 15-digit hyphenless numeric NRA is therefore not misdetected as a phone number.
  - NRA lookup uses `anggota.findFirst({ where: { nomorAnggota: { equals: nra, mode: 'insensitive' }, deletedAt: null } })`.
  - Extracted the existing phone-member → user mapping into private `findUserByMember()` (email case-insensitive, then `namaLengkap` case-insensitive); both phone and NRA branches reuse it. Phone self-healing (`user.phone` update) remains only on the phone path.
  - Audit `LOGIN` method is `nra` for NRA logins (`email`/`phone` unchanged).
  - Generic 401 message is now `Email/HP/NRA atau password salah` (both not-found and bad-password paths, per the plan's global constraint).
- `apps/api/src/modules/auth/dto/auth.dto.ts`: Swagger example now includes `LTK-0101-001-2026`; `@IsString()` untouched.
- Loosened numeric-only NRA regex to `[A-Z0-9]{3,4}-[A-Z0-9]{2,4}-\d{3}-\d{4}` in `nra.service.spec.ts`, `app.e2e-spec.ts`, and `migrate-nra.ts` (including that script's existing doc line). Generator behavior and generator logic untouched.
- No new comments, no new dependencies, no Prisma schema/migration, no web or mobile changes.

## TDD — RED (before production code)

Command (from `C:\ths-thm-system\apps\api`):

```
npm test -- --runInBand src/modules/auth/auth.service.spec.ts
```

Output (key lines, first run — tests written first, implementation absent):

```
FAIL src/modules/auth/auth.service.spec.ts (30.61 s)
    login with NRA
      × should look up member by NRA with separators (8 ms)
      × should normalize NRA without separators (3 ms)
      × should accept alphabetic district NRA (3 ms)
      × should accept lowercase NRA (3 ms)
      × should map NRA member to user by email (2 ms)
      × should fall back to namaLengkap when NRA member has no email (2 ms)
      × should reject unknown NRA with the generic message (39 ms)
      × should write LOGIN audit with method nra (3 ms)
```

Failure evidence was the expected missing behavior, e.g.:

```
Expected: {"where": {"deletedAt": null, "nomorAnggota": {"equals": "0114-0101-001-2026", "mode": "insensitive"}}}
Received: ... "where": {"noHpNormalized": "011401010012026"} ...
Expected substring: "Email/HP/NRA atau password salah"
Received message:   "Email/HP atau password salah"
Expected: ObjectContaining {"details": ObjectContaining {"method": "nra"}, ...}
Received: {"details": {"method": "email", "mustChangePassword": false}, ...}
Test Suites: 1 failed, 1 total
Tests:       8 failed, 56 passed, 64 total
```

All 8 failures were the new NRA tests; all 56 pre-existing tests passed.

## TDD — GREEN (after minimal implementation)

Intermediate GREEN run: 63 passed / 1 failed. That single failure was a test-fixture bug: a queued `mockResolvedValueOnce(null)` was consumed by the only lookup when the member had no email. Fixed by giving the member an email whose user lookup misses, so the test exercises a real email → `namaLengkap` fallback and asserts call order.

Final focused run:

```
npm test -- --runInBand src/modules/auth/auth.service.spec.ts
PASS src/modules/auth/auth.service.spec.ts (10.493 s)
    login with NRA
      √ should look up member by NRA with separators
      √ should normalize NRA without separators
      √ should accept alphabetic district NRA
      √ should accept lowercase NRA
      √ should map NRA member to user by email
      √ should fall back to namaLengkap when NRA member email match fails
      √ should reject unknown NRA with the generic message
      √ should write LOGIN audit with method nra
Test Suites: 1 passed, 1 total
Tests:       64 passed, 64 total
```

## Verification

| Check | Command | Result |
|---|---|---|
| Focused test | `npm test -- --runInBand src/modules/auth/auth.service.spec.ts` | PASS — 64/64 |
| Full API suite | `npm test -- --runInBand` | PASS — 104 suites, 1577 tests, 0 failures |
| Typecheck | `npm run tsc:check` | PASS — no output/errors |
| Lint (changed sources, no `--fix`) | `npx eslint src/modules/auth/auth.service.ts src/modules/auth/dto/auth.dto.ts src/modules/auth/auth.service.spec.ts src/common/services/__tests__/nra.service.spec.ts` | 0 errors; 2 pre-existing `no-explicit-any` warnings at `auth.service.ts:1277-1278` (untouched `issueTokenPair` code) |
| Whitespace | `git diff --check` | clean |
| Commit/push | `git commit -m "feat(api): dukungi login NRA"` / `git push origin master` | `a8f4924f`, `9638baf2..a8f4924f master -> master` |

Run after the final (comment-restoration) edit: focused test re-run PASS 64/64; `git diff --check` clean before commit.

## Self-review

- Completeness: all brief bullets covered; 8 required unit-test scenarios present; detection order enforced by `isEmail ? null : normalizeNra(...)` before the phone regex.
- Mutation check: removing normalization breaks separators/no-separator/lowercase tests; moving NRA after phone breaks the numeric-NRA test; removing the name fallback breaks the fallback test; reverting the message breaks the generic-401 test; hardcoding the audit method breaks the audit test.
- Reuse: `findUserByMember()` replaces the duplicated email/name mapping instead of copying it.
- YAGNI: no extra classes, fields, helpers, or dependencies; `select` was deliberately not added to the NRA query so the query shape stays exactly as specified.
- Comments: no new comments; one stale identifier comment removed, one existing security comment retained.
- Test hygiene: fixtures use hand-derived literal NRA strings and exact expected query/audit shapes; mocks are scoped per test; no assertion checks a mock's own existence.

## Concerns

- `npm run test:e2e` was not run: it requires a live seeded database and writes test data. `app.e2e-spec.ts` was updated only for the regex; no e2e login case was added because the brief specifies unit tests.
- Updating the bad-password message as well as the not-found message goes one line beyond the literal brief bullet, but is required by the plan's global constraint that the login error message be `Email/HP/NRA atau password salah`.

## Final review fix wave — finding 1 (IMPORTANT)

Status: DONE (not pushed)

### Scope
- Fixed NRA-shaped phone identifier fallback in `apps/api/src/modules/auth/auth.service.ts`.
- Added regression test in `apps/api/src/modules/auth/auth.service.spec.ts`.
- No new comments, no dependencies, no schema/migration/generator/web/mobile changes.
- Deferred minors left unchanged: `auth.service.ts:190` stale comment unchanged; `apps/mobile_flutter/lib/presentation/screens/login_screen.dart:328` `_EmailField` unchanged.

### TDD
- Added failing regression test: `should resolve NRA-shaped phone identifier by phone when no member matches` (`081234562019` normalizes as NRA shape, no member match, resolves by `users.phone`, audit `method: 'phone'`).

#### RED
Command:
```bash
cd /c/ths-thm-system/apps/api && npm test -- --runInBand src/modules/auth/auth.service.spec.ts -t "should resolve NRA-shaped phone identifier by phone when no member matches"
```
Result: FAIL (1 failed, 64 skipped, 65 total)
Failure: `UnauthorizedException: Email/HP/NRA atau password salah` at `modules/auth/auth.service.ts:191:13` (user not resolved; NRA-shaped phone fell through NRA branch).

#### GREEN
Command:
```bash
cd /c/ths-thm-system/apps/api && npm test -- --runInBand src/modules/auth/auth.service.spec.ts -t "should resolve NRA-shaped phone identifier by phone when no member matches"
```
Result: PASS (1 passed, 64 skipped, 65 total)

### Verification
| Check | Command | Result |
|---|---|---|
| Focused auth spec | `cd /c/ths-thm-system/apps/api && npm test -- --runInBand src/modules/auth/auth.service.spec.ts` | PASS — 1 suite, 65 tests passed |
| Full API suite | `cd /c/ths-thm-system/apps/api && npm test -- --runInBand` | PASS — 104 suites passed, 1578 tests passed, 0 failures |
| Typecheck | `cd /c/ths-thm-system/apps/api && npm run tsc:check` | PASS — `tsc --noEmit` clean |

### Covering test files
- `apps/api/src/modules/auth/auth.service.spec.ts`

### Files changed
- `apps/api/src/modules/auth/auth.service.ts`
- `apps/api/src/modules/auth/auth.service.spec.ts`
- `.superpowers/sdd/auth-nra-login-plan/task-1-report.md`

# Unique User Email Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Mencegah dua user memiliki email yang sama setelah `trim + lowercase`, tanpa mengubah login, username, atau UI.

**Architecture:** Normalisasi email dilakukan sekali di boundary Prisma lewat query extension, lalu dijamin oleh unique index `lower(email)` di PostgreSQL. Helper `assertEmailAvailable` dipakai pada jalur create/update yang bersifat user-facing untuk menghasilkan `ConflictException` yang jelas.

**Tech Stack:** NestJS, Prisma 5.19 query extensions, PostgreSQL, Jest.

**Spec:** `docs/superpowers/specs/2026-11-24-unique-user-email-design.md`

## Global Constraints

- Username tidak ditambahkan; alur login email/HP tidak diubah.
- Email harus unik secara case-insensitive setelah `trim`.
- Index exact `users_email_key` tetap dipertahankan.
- Migration wajib lewat `prisma migrate deploy`; dilarang `prisma db push`.
- Prisma 5.19 query extension, bukan middleware lama.
- Produksi sudah dicek: 0 grup duplikat case-insensitive, 0 email perlu normalisasi.
- Jangan menambah komentar baru tanpa permintaan.

## Review Focus

- `User@Example.COM` dan `user@example.com` harus dianggap sama → Task 1 `normalizeEmail` spec + Task 2 e2e.
- Spasi di awal/akhir email dibuang sebelum disimpan → Task 1 spec.
- Update email ke email user lain, beda huruf, harus 409 → Task 3 auth/users spec.
- Update email ke email sendiri tidak boleh 409 → Task 3 spec dengan `excludeUserId`.
- `createMany` / `upsert` nested tetap ternormalisasi → Task 1 `normalizeUserEmailData` spec.

---

### Task 1: Email utility

**Files:**
- Create: `apps/api/src/common/utils/email.util.ts`
- Create: `apps/api/src/common/utils/email.util.spec.ts`

**Interfaces:**
- Consumes: `PrismaClient` type from `@prisma/client`, `ConflictException` from `@nestjs/common`.
- Produces: `normalizeEmail(raw?: string | null): string`.
- Produces: `normalizeUserEmailData<T>(data: T): T`.
- Produces: `assertEmailAvailable(prisma: Pick<PrismaClient, 'user'>, email: string, excludeUserId?: string): Promise<void>`.

- [ ] **Step 1: Write failing tests**

```ts
describe('normalizeEmail', () => {
  it('trims and lowercases', () => {
    expect(normalizeEmail('  User@Example.COM ')).toBe('user@example.com');
  });

  it('returns empty string for nullish input', () => {
    expect(normalizeEmail(null)).toBe('');
    expect(normalizeEmail(undefined)).toBe('');
  });
});

describe('normalizeUserEmailData', () => {
  it('normalizes object, array, and nested upsert data', () => {
    expect(normalizeUserEmailData({ email: ' A@B.COM ' })).toEqual({ email: 'a@b.com' });
    expect(normalizeUserEmailData([{ email: ' A@B.COM ' }])).toEqual([{ email: 'a@b.com' }]);
    expect(
      normalizeUserEmailData({
        create: { email: ' A@B.COM ' },
        update: { email: ' C@D.COM ' },
      }),
    ).toEqual({
      create: { email: 'a@b.com' },
      update: { email: 'c@d.com' },
    });
  });
});

describe('assertEmailAvailable', () => {
  const prisma = { user: { findFirst: jest.fn() } } as unknown as Pick<PrismaClient, 'user'>;

  it('throws ConflictException when email is used by another user', async () => {
    prisma.user.findFirst.mockResolvedValueOnce({ id: 'other' } as never);
    await expect(assertEmailAvailable(prisma, ' User@Example.COM ')).rejects.toThrow(
      ConflictException,
    );
    expect(prisma.user.findFirst).toHaveBeenCalledWith({
      where: { email: { equals: 'user@example.com', mode: 'insensitive' } },
      select: { id: true },
    });
  });

  it('excludes the current user on update', async () => {
    prisma.user.findFirst.mockResolvedValueOnce(null);
    await assertEmailAvailable(prisma, 'user@example.com', 'u1');
    expect(prisma.user.findFirst).toHaveBeenCalledWith({
      where: {
        email: { equals: 'user@example.com', mode: 'insensitive' },
        id: { not: 'u1' },
      },
      select: { id: true },
    });
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm --dir apps/api exec jest src/common/utils/email.util.spec.ts --runInBand`
Expected: FAIL with module not found.

- [ ] **Step 3: Implement the three exported functions**

`assertEmailAvailable` uses `findFirst` with `mode: 'insensitive'` and `select: { id: true }`, adding `id: { not: excludeUserId }` only when provided. `normalizeUserEmailData` handles one-level arrays and nested `create`/`update` objects without mutating input.

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm --dir apps/api exec jest src/common/utils/email.util.spec.ts --runInBand`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add apps/api/src/common/utils/email.util.ts apps/api/src/common/utils/email.util.spec.ts
git commit -m "feat(api): normalisasi email user"
```

---

### Task 2: Prisma write boundary and unique index

**Files:**
- Modify: `apps/api/src/prisma/prisma.service.ts:3`, `:33-95`
- Modify: `apps/api/test/app.e2e-spec.ts:94-115`
- Create: `apps/api/prisma/migrations/20261124120000_users_email_case_insensitive_unique/migration.sql`

**Interfaces:**
- Consumes: `normalizeUserEmailData` from Task 1.
- Produces: all Prisma `user` writes normalize `email` before hitting PostgreSQL.
- Produces: DB constraint `users_email_lower_key`.

- [ ] **Step 1: Write failing e2e tests in `app.e2e-spec.ts`**

Add inside `describe('Auth')` after the existing register test:

```ts
it('POST /api/auth/register — stores normalized email and rejects case variant', async () => {
  const email = `case-${Date.now()}@example.com`;

  await request(app.getHttpServer())
    .post('/api/auth/register')
    .send({ email, password: 'test1234', namaLengkap: 'Case User' })
    .expect(201)
    .expect((res: any) => {
      expect(res.body.data.user.email).toBe(email.toLowerCase());
    });

  await request(app.getHttpServer())
    .post('/api/auth/register')
    .send({
      email: email.toUpperCase(),
      password: 'test1234',
      namaLengkap: 'Case User Duplicate',
    })
    .expect(409);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm --dir apps/api exec jest --config ./test/jest-e2e.json -t "stores normalized email" --runInBand`
Expected: FAIL because stored email is not lowercased or duplicate variant returns 201.

- [ ] **Step 3: Add the Prisma extension**

Import `normalizeUserEmailData`. Chain a third extension after `auditExtension` that hooks `query.user` for `create`, `createMany`, `update`, `updateMany`, and `upsert`; normalize `args.data`, and for `upsert` normalize both `args.create` and `args.update`. Return the new extension cast as `this`.

- [ ] **Step 4: Add the migration**

```sql
UPDATE "users"
SET "email" = lower(trim("email"))
WHERE "email" IS NOT NULL AND "email" <> lower(trim("email"));

CREATE UNIQUE INDEX IF NOT EXISTS "users_email_lower_key"
ON "users" (lower("email"));
```

- [ ] **Step 5: Run test to verify it passes**

Run: `pnpm --dir apps/api exec jest --config ./test/jest-e2e.json -t "stores normalized email" --runInBand`
Expected: PASS with 201 then 409.

- [ ] **Step 6: Commit**

```bash
git add apps/api/src/prisma/prisma.service.ts apps/api/test/app.e2e-spec.ts apps/api/prisma/migrations/20261124120000_users_email_case_insensitive_unique/migration.sql
git commit -m "feat(api): tegakkan email user unik case-insensitive"
```

---

### Task 3: Friendly conflicts on user-facing writes

**Files:**
- Modify: `apps/api/src/modules/auth/auth.service.ts:332-346`, `:864-870`
- Modify: `apps/api/src/modules/auth/auth.service.spec.ts:428-469`, `:489-508`
- Modify: `apps/api/src/modules/users/users.service.ts:269-285`, `:304-314`
- Modify: `apps/api/src/modules/users/users.service.spec.ts:16-23`, `:162-212`

**Interfaces:**
- Consumes: `assertEmailAvailable`, `normalizeEmail` from Task 1.
- Produces: `ConflictException('Email sudah terdaftar')` for duplicate case variants in register, profile email update, admin user create, and admin user update.

- [ ] **Step 1: Write failing specs**

In `auth.service.spec.ts`:
- register with `' TEST@THS-THM.ORG '` while `user.findFirst` returns `{ id: 'u2' }` → rejects `ConflictException`.
- `updateProfile('u1', { email: 'TEST@THS-THM.ORG' })` while `findFirst` returns `{ id: 'u2' }` → rejects `ConflictException`.
- `updateProfile('u1', { email: 'test@ths-thm.org' })` with `findFirst` returning `null` → calls `findFirst` with `id: { not: 'u1' }`.

In `users.service.spec.ts`:
- Add `findFirst: jest.fn()` to `mockPrisma.user`.
- `create` with `' NEW@TEST.COM '` → asserts `create` receives `email: 'new@test.com'`.
- `create` while `findFirst` returns `{ id: 'other' }` → rejects `ConflictException`.
- `update('1', { email: ' NEW@TEST.COM ' })` → asserts `findFirst` receives `id: { not: '1' }` and `update` receives lowercase email.

- [ ] **Step 2: Run tests to verify they fail**

Run: `pnpm --dir apps/api exec jest src/modules/auth/auth.service.spec.ts src/modules/users/users.service.spec.ts --runInBand`
Expected: FAIL because exact `findUnique` checks and raw email writes are still present.

- [ ] **Step 3: Implement call sites**

Use `await assertEmailAvailable(this.prisma, dto.email)` before register/admin create. Use `await assertEmailAvailable(this.prisma, dto.email, userIdOrId)` before profile/admin update when email is provided. Store `normalizeEmail(dto.email)` in `create`/`update` data.

- [ ] **Step 4: Run tests to verify they pass**

Run: `pnpm --dir apps/api exec jest src/modules/auth/auth.service.spec.ts src/modules/users/users.service.spec.ts --runInBand`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add apps/api/src/modules/auth/auth.service.ts apps/api/src/modules/auth/auth.service.spec.ts apps/api/src/modules/users/users.service.ts apps/api/src/modules/users/users.service.spec.ts
git commit -m "fix(api): tolak email user yang sudah dipakai"
```

---

### Task 4: Full verification

**Files:** None.

- [ ] **Step 1: Run API unit tests**

Run: `pnpm --dir apps/api test --runInBand`
Expected: all suites pass.

- [ ] **Step 2: Run API e2e tests**

Run: `pnpm --dir apps/api exec jest --config ./test/jest-e2e.json --runInBand`
Expected: all suites pass.

- [ ] **Step 3: Run lint and typecheck**

Run: `pnpm --dir apps/api exec eslint "src/**/*.ts"` then `pnpm --dir apps/api typecheck`
Expected: 0 errors.

- [ ] **Step 4: Check diff**

Run: `git diff --check`
Expected: no output.

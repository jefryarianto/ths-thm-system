# KTA Admin Validation Review Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Admin web dapat memverifikasi KTA dari snapshot pengajuan, bukti pembayaran privat, dan catatan validasi per level role; verifikasi ditolak tanpa bukti valid.

**Architecture:** Tambah kolom JSON snapshot nullable di `KtaApplication`, endpoint proof terautentikasi yang streaming file dari `UPLOAD_DIR/kta-proofs`, dan catatan verifikasi ke `KtaAppHistory` yang sudah ada. Web menambah panel tinjau pakai komponen baru dan mengubah alur verifikasi distrik menjadi “tinjau dulu, lalu verifikasi”.

**Tech Stack:** NestJS + Prisma/PostgreSQL, Next.js + React + Tailwind, Jest, Vitest/Playwright, OpenAPI codegen.

**Spec:** `docs/superpowers/specs/2026-11-26-kta-admin-validation-review-design.md`.

## Global Constraints

- `histories` harus tetap array datar; pengelompokan per level dilakukan di UI.
- `catatan` pada `verify-payment` opsional; `buktiPath?: string` tetap diterima untuk kompatibilitas mobile tetapi diabaikan.
- Nama file bukti harus diawali `kta-proof-` dan berakhir `.jpg`, `.jpeg`, `.png`, `.webp`, atau `.pdf`.
- `UPLOAD_DIR` default `./uploads`; file proof berada di `UPLOAD_DIR/kta-proofs`.
- Jangan mempublikasikan `kta-proof-*` lewat `PUBLIC_UPLOAD_PREFIXES`.
- Role proof/detail: `admin_ranting`, `admin_wilayah`, `admin_distrik`, `admin_nasional`, `superadmin`; scope `branch`.
- Role verify: `admin_distrik`, `superadmin`.
- `biaya` Prisma Decimal bisa berupa string; web wajib memakai `formatRupiah`.
- API tests require dummy env vars: `NODE_ENV=test DATABASE_URL='postgresql://test:test@localhost:5432/test' JWT_SECRET='test-jwt-secret-0123456789abcdef' JWT_REFRESH_SECRET='test-refresh-secret-0123456789abcdef'`.
- Commit dengan Conventional Commits; jangan commit secrets atau generated artifacts yang tidak sengaja berubah.

## Review Focus

- Bukti kosong/nama file tidak valid → `verifyPayment` harus menolak sebelum mengubah status. Test: Task 3.
- File proof hanya untuk admin ber-scope → endpoint proof harus menolak role/scope salah dan path traversal. Test: Task 2.
- Snapshot harus immutable dan berisi data saat submit, bukan data terbaru. Test: Task 1 dan Task 4.
- Mobile mengirim `{ buktiPath: '' }` → tidak boleh gagal, tidak boleh menimpa path tersimpan. Test: Task 3.
- PDF proof tidak boleh dirender sebagai `<img>`; tetap bisa dilihat/unduh. Test: Task 4.

## File Structure

**Create**
- `apps/api/prisma/migrations/20261126000000_add_kta_submitted_snapshot/migration.sql`
- `apps/api/src/common/utils/kta-snapshot.util.ts`
- `apps/api/src/modules/members/dto/verify-payment-kta.dto.ts`
- `apps/api/src/modules/members/kta-application.snapshot.spec.ts`
- `apps/api/src/modules/members/kta-application.proof.spec.ts`
- `apps/api/src/modules/members/kta-application.verify-payment.spec.ts`
- `apps/web/src/components/kta/KtaReviewPanel.tsx`
- `apps/web/src/components/kta/KtaProofPreview.tsx`
- `apps/web/src/components/kta/__tests__/KtaReviewPanel.test.tsx`
- `apps/web/src/components/kta/__tests__/KtaProofPreview.test.tsx`
- `apps/web/src/components/kta/__tests__/kta-detail-review.test.tsx`
- `apps/web/src/components/kta/__tests__/kta-district-verify.test.tsx`

**Modify**
- `apps/api/prisma/schema.prisma`
- `apps/api/src/common/utils/kta-proof-upload.util.ts`
- `apps/api/src/modules/members/kta-application.controller.ts`
- `apps/api/src/modules/members/kta-application.service.ts`
- `apps/api/src/modules/members/kta-application.upload-proof.spec.ts`
- `apps/api/src/common/constants/role-contract.spec.ts`
- `apps/web/src/components/kta/types.ts`
- `apps/web/src/components/bukti-preview-modal.tsx`
- `apps/web/app/(dashboard)/kta/[id]/page.tsx`
- `apps/web/app/(dashboard)/kta/distrik-process/page.tsx`
- `apps/web/e2e/kta-admin.spec.ts`
- Generated: `apps/api/swagger.json`, `apps/web/src/types/api.d.ts`, `packages/api-client/src/index.ts`

---

### Task 1: Snapshot schema and submit capture

**Files**
- Modify: `apps/api/prisma/schema.prisma:2343-2371`
- Create: `apps/api/prisma/migrations/20261126000000_add_kta_submitted_snapshot/migration.sql`
- Create: `apps/api/src/common/utils/kta-snapshot.util.ts`
- Modify: `apps/api/src/modules/members/kta-application.controller.ts:51-57`
- Modify: `apps/api/src/modules/members/kta-application.service.ts:258-311,349-442`
- Test: `apps/api/src/modules/members/kta-application.snapshot.spec.ts`

**Interfaces**
- Produces: `KtaSnapshotV1` and `buildKtaSnapshot(member, submitter, payload, missingFields): Prisma.InputJsonValue` in `kta-snapshot.util.ts`.
- Produces: `KtaApplication.submittedSnapshot` JSON scalar returned by Prisma.
- Produces: `submitSelf(userEmail, submitter, payload?)`; controller `create` passes its `CreateKtaDto` body.
- Consumes by later tasks: web type `submittedSnapshot: KtaSnapshotV1 | null`.

- [ ] **Step 1: Add failing snapshot tests**

Create `kta-application.snapshot.spec.ts` with tests:
- `submit()` with a `CreateKtaDto` payload writes `submittedSnapshot.version === 1`, `payload.namaLengkap` from DTO, `anggota.namaLengkap` from member, `anggota.ranting.nama`, `submittedBy.role`, and `missingFields: []`.
- `submitSelf()` writes snapshot with `payload: null`.
- `submitSelf()` called with a payload writes that payload into snapshot.
- `submitBulk()` writes one snapshot per created application with `payload: null`.
- Snapshot remains unchanged when a later member update is mocked.

- [ ] **Step 2: Run tests to verify failure**

Run: `NODE_ENV=test DATABASE_URL='postgresql://test:test@localhost:5432/test' JWT_SECRET='test-jwt-secret-0123456789abcdef' JWT_REFRESH_SECRET='test-refresh-secret-0123456789abcdef' pnpm --filter @ths-thm/api exec jest src/modules/members/kta-application.snapshot.spec.ts --runInBand`  
Expected: FAIL because `buildKtaSnapshot` and `submittedSnapshot` do not exist.

- [ ] **Step 3: Add nullable JSONB column**

In `schema.prisma`, add:
`submittedSnapshot Json? @map("submitted_snapshot")` to `KtaApplication`.  
Migration must be additive nullable `ADD COLUMN "submitted_snapshot" JSONB;` with no backfill and no destructive change.

- [ ] **Step 4: Implement snapshot builder**

In `kta-snapshot.util.ts`, implement `KtaSnapshotV1` with fields from the approved design: `version`, `submittedAt`, `submittedBy`, `payload`, `anggota`, `missingFields`. Use ISO strings for dates; `ranting`/`wilayah`/`distrik` as `{ id, nama }`; `alamatDistrik` from `distrik.alamat`.

- [ ] **Step 5: Write snapshot on all submit paths**

Update `submit`, `submitSelf`, and `submitBulk` so `tx.ktaApplication.create` includes `submittedSnapshot`. Capture `missingFields` from the existing `calculateMissingFields(member)` call. For `submitBulk`, capture member values inside the existing eligibility loop. Update controller `create` to pass its DTO body to `submitSelf`.

- [ ] **Step 6: Run tests and prisma generation**

Run: `NODE_ENV=test DATABASE_URL='postgresql://test:test@localhost:5432/test' JWT_SECRET='test-jwt-secret-0123456789abcdef' JWT_REFRESH_SECRET='test-refresh-secret-0123456789abcdef' pnpm --filter @ths-thm/api exec jest src/modules/members/kta-application.snapshot.spec.ts --runInBand && pnpm --filter @ths-thm/api prisma:generate`  
Expected: PASS; Prisma client updated.

- [ ] **Step 7: Commit**

```bash
git add apps/api/prisma/schema.prisma apps/api/prisma/migrations/20261126000000_add_kta_submitted_snapshot apps/api/src/common/utils/kta-snapshot.util.ts apps/api/src/modules/members/kta-application.controller.ts apps/api/src/modules/members/kta-application.service.ts apps/api/src/modules/members/kta-application.snapshot.spec.ts
git commit -m "feat(kta): snapshot submitted application data"
```

---

### Task 2: Authenticated KTA proof endpoint

**Files**
- Modify: `apps/api/src/common/utils/kta-proof-upload.util.ts:1-68`
- Modify: `apps/api/src/modules/members/kta-application.controller.ts:223-240`
- Modify: `apps/api/src/modules/members/kta-application.service.ts:1050-1076`
- Modify: `apps/api/src/common/constants/role-contract.spec.ts:181-198`
- Test: `apps/api/src/modules/members/kta-application.proof.spec.ts`

**Interfaces**
- Produces: `resolveKtaProofFile(path: string | null | undefined): { absolutePath: string; fileName: string; mimeType: string } | null`.
- Produces: `KtaApplicationService.getProof(applicationId: string, scope?: UserScope): Promise<{ absolutePath; fileName; mimeType }>`.
- Produces: `KtaApplicationController.getProof(id, req, res)` declared before `@Get(':id')`.

- [ ] **Step 1: Add failing proof tests**

Create `kta-application.proof.spec.ts` with tests:
- `resolveKtaProofFile('/api/uploads/kta-proofs/kta-proof-123.png')` returns resolved path, filename, `image/png`.
- `resolveKtaProofFile('/api/uploads/kta-proofs/evil.png')` and `../kta-proof-123.png` return `null`.
- `getProof()` with valid `buktiBayarPath` returns metadata.
- `getProof()` rejects when `buktiBayarPath` is null or file does not exist.
- Controller method metadata has the five admin roles, `ScopeGuard`, and `@RequireScope('branch')`.
- Add `getProof` to the `KtaApplicationController` list in `role-contract.spec.ts`.

- [ ] **Step 2: Run tests to verify failure**

Run: `NODE_ENV=test DATABASE_URL='postgresql://test:test@localhost:5432/test' JWT_SECRET='test-jwt-secret-0123456789abcdef' JWT_REFRESH_SECRET='test-refresh-secret-0123456789abcdef' pnpm --filter @ths-thm/api exec jest src/modules/members/kta-application.proof.spec.ts src/common/constants/role-contract.spec.ts --runInBand`  
Expected: FAIL because helper/method do not exist.

- [ ] **Step 3: Implement strict proof path resolution**

In `kta-proof-upload.util.ts`, add `resolveKtaProofFile`. Use `basename`, require `kta-proof-` prefix and allowlisted extension, resolve under `UPLOAD_DIR/kta-proofs`, verify containment with `resolve`/`sep`, require `existsSync`, and derive MIME from extension.

- [ ] **Step 4: Implement service and controller**

Add `getProof()` using the existing scope lookup pattern from `getApplicationDetail`. Add controller route before `@Get(':id')` with the same roles/scope as `findOne`, then set `Content-Type`, `Content-Disposition: inline; filename="..."`, and pipe `createReadStream(absolutePath)` to `@Res()`.

- [ ] **Step 5: Run tests**

Run: `NODE_ENV=test DATABASE_URL='postgresql://test:test@localhost:5432/test' JWT_SECRET='test-jwt-secret-0123456789abcdef' JWT_REFRESH_SECRET='test-refresh-secret-0123456789abcdef' pnpm --filter @ths-thm/api exec jest src/modules/members/kta-application.proof.spec.ts src/common/constants/role-contract.spec.ts --runInBand`  
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add apps/api/src/common/utils/kta-proof-upload.util.ts apps/api/src/modules/members/kta-application.controller.ts apps/api/src/modules/members/kta-application.service.ts apps/api/src/common/constants/role-contract.spec.ts apps/api/src/modules/members/kta-application.proof.spec.ts
git commit -m "feat(kta): add authenticated payment proof endpoint"
```

---

### Task 3: Verification guard and validation note

**Files**
- Create: `apps/api/src/modules/members/dto/verify-payment-kta.dto.ts`
- Modify: `apps/api/src/modules/members/kta-application.controller.ts:300-309`
- Modify: `apps/api/src/modules/members/kta-application.service.ts:811-854`
- Modify: `apps/api/src/modules/members/kta-application.upload-proof.spec.ts:125-137`
- Test: `apps/api/src/modules/members/kta-application.verify-payment.spec.ts`

**Interfaces**
- Produces: `VerifyPaymentKtaDto { buktiPath?: string; catatan?: string }`.
- Changes: `verifyPayment(applicationId, distrikAdminId, dto: VerifyPaymentKtaDto = {})`.
- Consumes: `resolveKtaProofFile` from Task 2.

- [ ] **Step 1: Add failing verification tests**

Create `kta-application.verify-payment.spec.ts` with tests:
- `verifyPayment()` rejects `PAYMENT_PENDING` when `buktiBayarPath` is null.
- rejects when filename is invalid.
- keeps the stored `buktiBayarPath` when body supplies a different `buktiPath`.
- writes `dto.catatan` into the `PAYMENT_VERIFIED` history row.
- allows missing `catatan` and writes `catatan: undefined`.
- controller passes `body` to the service.

- [ ] **Step 2: Run tests to verify failure**

Run: `NODE_ENV=test DATABASE_URL='postgresql://test:test@localhost:5432/test' JWT_SECRET='test-jwt-secret-0123456789abcdef' JWT_REFRESH_SECRET='test-refresh-secret-0123456789abcdef' pnpm --filter @ths-thm/api exec jest src/modules/members/kta-application.verify-payment.spec.ts src/modules/members/kta-application.upload-proof.spec.ts --runInBand`  
Expected: FAIL because DTO/signature/guard do not exist.

- [ ] **Step 3: Add DTO and update controller**

Create `VerifyPaymentKtaDto` with `@ApiPropertyOptional`, `@IsOptional`, `@IsString`, `@MaxLength(500)`, plus legacy `buktiPath`. Replace inline body type in `verifyPayment` controller and pass the DTO object.

- [ ] **Step 4: Guard and save note in service**

Before the transaction, call `resolveKtaProofFile(app.buktiBayarPath)` and throw `BadRequestException('Bukti pembayaran belum tersedia atau tidak valid')` when null. In the update, use `buktiBayarPath: app.buktiBayarPath`. In history create, add `catatan: dto.catatan`.

- [ ] **Step 5: Update existing callers/tests**

Update old `verifyPayment(id, userId, '')` calls to `verifyPayment(id, userId, { buktiPath: '' })`. Do not change mobile; its existing body remains valid.

- [ ] **Step 6: Run tests**

Run: `NODE_ENV=test DATABASE_URL='postgresql://test:test@localhost:5432/test' JWT_SECRET='test-jwt-secret-0123456789abcdef' JWT_REFRESH_SECRET='test-refresh-secret-0123456789abcdef' pnpm --filter @ths-thm/api exec jest src/modules/members/kta-application.verify-payment.spec.ts src/modules/members/kta-application.upload-proof.spec.ts --runInBand`  
Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add apps/api/src/modules/members/dto/verify-payment-kta.dto.ts apps/api/src/modules/members/kta-application.controller.ts apps/api/src/modules/members/kta-application.service.ts apps/api/src/modules/members/kta-application.verify-payment.spec.ts apps/api/src/modules/members/kta-application.upload-proof.spec.ts
git commit -m "fix(kta): require valid proof and save verification note"
```

---

### Task 4: Web review panel and proof preview

**Files**
- Modify: `apps/web/src/components/kta/types.ts`
- Modify: `apps/web/src/components/bukti-preview-modal.tsx`
- Create: `apps/web/src/components/kta/KtaProofPreview.tsx`
- Create: `apps/web/src/components/kta/KtaReviewPanel.tsx`
- Test: `apps/web/src/components/kta/__tests__/KtaProofPreview.test.tsx`
- Test: `apps/web/src/components/kta/__tests__/KtaReviewPanel.test.tsx`

**Interfaces**
- Produces: `KtaReviewApplication` type in `kta/types.ts`.
- Produces: `KtaProofPreview({ applicationId, buktiBayarPath, anggotaName })`.
- Produces: `KtaReviewPanel({ application, canVerify, catatan, onCatatanChange, onVerify, verifying })`.
- Consumes: `GET /kta-applications/:id/proof` as `responseType: 'blob'`.

- [ ] **Step 1: Add failing panel tests**

`KtaReviewPanel.test.tsx` asserts:
- snapshot fields render; `submittedSnapshot: null` renders “Snapshot tidak tersedia” plus fallback current member data.
- histories are grouped under level labels using `getKtaLevelLabel`, with `catatan` and actor role visible.
- `biaya` string `"50000.00"` renders `Rp 50.000`.
- `onVerify` is called with the current `catatan`.
- verify button is disabled when `canVerify === false`.

`KtaProofPreview.test.tsx` asserts:
- no `buktiBayarPath` renders “Bukti tidak tersedia” and does not fetch.
- image blob renders `BuktiPreviewModal`; object URL is revoked on close.
- PDF blob renders iframe/download and not `<img>`.
- failed fetch renders an error state.

- [ ] **Step 2: Run tests to verify failure**

Run: `pnpm --filter @ths-thm/web exec vitest run src/components/kta/__tests__/KtaProofPreview.test.tsx src/components/kta/__tests__/KtaReviewPanel.test.tsx`  
Expected: FAIL because components do not exist.

- [ ] **Step 3: Add web types**

In `kta/types.ts`, add `KtaSnapshotV1`, `KtaReviewHistory`, and `KtaReviewApplication`. Include `buktiBayarPath`, `submittedSnapshot`, `biaya: number | string | null`, `anggota`, and flat `histories`.

- [ ] **Step 4: Extend proof modal minimally**

Add optional `displayName` and `downloadName` to `BuktiPreviewModal`; use them for the file path label and anchor `download`, falling back to current behavior. Do not change existing callers.

- [ ] **Step 5: Implement proof preview**

Use `apiClient.get('/kta-applications/${applicationId}/proof', { responseType: 'blob' })`, `URL.createObjectURL`, and cleanup with `URL.revokeObjectURL`. Derive filename from `Content-Disposition` or use `buktiBayarPath.split('/').pop()`. Branch on MIME: image → `BuktiPreviewModal`; PDF → iframe/download.

- [ ] **Step 6: Implement review panel**

Render snapshot, proof preview, payment data, and validation notes grouped by `level`. Use existing Tailwind card classes, `KtaStatusBadge`, `formatRupiah`, `formatDateTime`, `getKtaLevelLabel`, and `getKtaActionLabel`.

- [ ] **Step 7: Run tests**

Run: `pnpm --filter @ths-thm/web exec vitest run src/components/kta/__tests__/KtaProofPreview.test.tsx src/components/kta/__tests__/KtaReviewPanel.test.tsx`  
Expected: PASS.

- [ ] **Step 8: Commit**

```bash
git add apps/web/src/components/kta/types.ts apps/web/src/components/bukti-preview-modal.tsx apps/web/src/components/kta/KtaProofPreview.tsx apps/web/src/components/kta/KtaReviewPanel.tsx apps/web/src/components/kta/__tests__/KtaProofPreview.test.tsx apps/web/src/components/kta/__tests__/KtaReviewPanel.test.tsx
git commit -m "feat(kta): add admin validation review panel"
```

---

### Task 5: Wire detail and district verification pages

**Files**
- Modify: `apps/web/app/(dashboard)/kta/[id]/page.tsx:22-185`
- Modify: `apps/web/app/(dashboard)/kta/distrik-process/page.tsx:14-233`
- Modify: `apps/web/e2e/kta-admin.spec.ts`
- Test: `apps/web/src/components/kta/__tests__/kta-detail-review.test.tsx`
- Test: `apps/web/src/components/kta/__tests__/kta-district-verify.test.tsx`

**Interfaces**
- Consumes: `KtaReviewPanel` and `KtaProofPreview` from Task 4.
- Consumes: `POST /kta-applications/:id/verify-payment` with `{ buktiPath: '', catatan }`.

- [ ] **Step 1: Add failing page tests**

Detail test asserts `KtaReviewPanel` renders with detail API response and no verify callback. District test asserts:
- `PAYMENT_PENDING` row shows `Tinjau & Verifikasi`, not direct check icon.
- modal renders proof/panel and textarea.
- confirm posts `{ buktiPath: '', catatan: 'Bukti cocok' }`.
- no valid `buktiBayarPath` disables confirm.

- [ ] **Step 2: Run tests to verify failure**

Run: `pnpm --filter @ths-thm/web exec vitest run src/components/kta/__tests__/kta-detail-review.test.tsx src/components/kta/__tests__/kta-district-verify.test.tsx`  
Expected: FAIL because pages are not wired.

- [ ] **Step 3: Update shared page types**

Replace local duplicate interfaces with `KtaReviewApplication` where practical; at minimum add `buktiBayarPath` and `submittedSnapshot`. Keep `histories` as an array.

- [ ] **Step 4: Wire detail page**

After the existing summary card, render read-only `KtaReviewPanel`. Preserve existing back button and replace the old timeline with the panel if it duplicates the same histories.

- [ ] **Step 5: Wire district page**

Replace the `PAYMENT_PENDING` verify icon with a modal trigger. Modal content: `KtaReviewPanel`, textarea bound to `catatan`, cancel, and confirm. Confirm calls `verify-payment` with `{ buktiPath: '', catatan }`, shows toast, closes modal, and refreshes queue.

- [ ] **Step 6: Add e2e coverage**

Add one Playwright test in `kta-admin.spec.ts` mocking detail/queue/proof/verify routes, opening the review modal, and asserting the verify request body contains `catatan`.

- [ ] **Step 7: Run tests**

Run: `pnpm --filter @ths-thm/web exec vitest run`  
Expected: PASS.

- [ ] **Step 8: Commit**

```bash
git add "apps/web/app/(dashboard)/kta/[id]/page.tsx" "apps/web/app/(dashboard)/kta/distrik-process/page.tsx" apps/web/e2e/kta-admin.spec.ts apps/web/src/components/kta/__tests__/kta-detail-review.test.tsx apps/web/src/components/kta/__tests__/kta-district-verify.test.tsx
git commit -m "feat(kta): wire admin validation review flow"
```

---

### Task 6: Contracts and final verification

**Files**
- Generated: `apps/api/swagger.json`
- Generated: `apps/web/src/types/api.d.ts`
- Generated: `packages/api-client/src/index.ts`

**Interfaces**
- Consumes: all previous tasks.
- Produces: regenerated contract artifacts.

- [ ] **Step 1: Regenerate contracts**

Run: `pnpm --filter @ths-thm/api swagger:export && pnpm --filter @ths-thm/api generate:client && pnpm generate:contracts`  
Expected: three generated artifacts updated; no stale KTA route/DTO.

- [ ] **Step 2: Run full checks**

Run:
```bash
NODE_ENV=test DATABASE_URL='postgresql://test:test@localhost:5432/test' JWT_SECRET='test-jwt-secret-0123456789abcdef' JWT_REFRESH_SECRET='test-refresh-secret-0123456789abcdef' pnpm --filter @ths-thm/api exec jest --runInBand
pnpm --filter @ths-thm/web exec vitest run
pnpm --filter @ths-thm/api exec tsc --noEmit
pnpm --filter @ths-thm/web exec tsc --noEmit
git diff --check
```
Expected: all PASS; only intended files changed.

- [ ] **Step 3: Commit**

```bash
git add apps/api/swagger.json apps/web/src/types/api.d.ts packages/api-client/src/index.ts
git commit -m "chore(kta): regenerate validation review contracts"
```

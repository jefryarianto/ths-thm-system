# KTA Pekerjaan Pelantikan Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Menambahkan field `Pekerjaan` dan `Pelantikan` pada form klaim, membuatnya dapat diedit admin dan anggota login, menyalin nilainya ke data anggota setelah approval, serta auto-regenerate KTA yang sudah ada.

**Architecture:** `Klaim` dan `Anggota` menjadi sumber data awal; approval final klaim menyalin field ke `Anggota`. Anggota mengubah data lewat `PATCH /auth/me` sehingga memicu approval `member_update`; setelah approval final, event bus memicu regenerate KTA berstatus `CARD_GENERATED` tanpa mengubah `submittedSnapshot`.

**Tech Stack:** NestJS, Prisma, React/Next.js, Jest/Vitest, generated OpenAPI client.

**Spec:** `docs/superpowers/specs/2026-11-26-kta-pekerjaan-pelantikan-design.md`

## Global Constraints

- `Pelantikan` berupa satu teks bebas, dipetakan ke `tanggalPelantikan` pada KTA; fallback Dadar tetap dipakai untuk data lama.
- Anggota hanya mengubah data diri melalui `PATCH /auth/me`, bukan `PATCH /members/:id`.
- Perubahan anggota mengikuti approval profil; regenerate KTA hanya terjadi setelah approval `member_update` final.
- Jangan mengubah `submittedSnapshot`, `ktaBatch.totalGenerated`, atau status pembayaran saat auto-regenerate.
- Generate KTA awal tetap manual oleh admin; auto-regenerate hanya memperbarui KTA yang sudah `CARD_GENERATED`.
- Jangan push/merge/PR tanpa permintaan eksplisit.
- Jangan jalankan repo-wide `flutter analyze` atau `dart format`.
- API test env wajib: `NODE_ENV=test DATABASE_URL='postgresql://test:test@localhost:5432/test' JWT_SECRET='test-jwt-secret-0123456789abcdef' JWT_REFRESH_SECRET='test-refresh-secret-0123456789abcdef'`
- Kontrak regenerate: `pnpm --filter @ths-thm/api swagger:export && pnpm --filter @ths-thm/api generate:client && pnpm generate:contracts`

## Review Focus

- Data lama tanpa `pelantikan`: KTA harus fallback ke Dadar, tidak menampilkan `undefined` atau `null`.
- Anggota mencoba `PATCH /members/:id`: harus tetap 403; jalur self-service hanya `/auth/me`.
- Approval `member_update` dengan data incomplete: tidak boleh mengirim approval request, hanya notifikasi `data_incomplete`.
- Auto-regenerate tanpa KTA `CARD_GENERATED`: harus no-op, tidak boleh error atau mengubah snapshot.
- Teks `Pekerjaan`/`Pelantikan` terlalu panjang: preview dan template PDF/PNG harus memotong/membungkus tanpa merusak layout.

---

## File Structure

- `apps/api/prisma/schema.prisma`, migration baru: kolom `pekerjaan`/`pelantikan` di `Klaim`, `pelantikan` di `Anggota`.
- `apps/api/src/modules/claims/`: DTO, controller Swagger body, service create/finalize.
- `apps/api/src/modules/auth/`: `UpdateProfileDto`, `updateProfile`, approval trigger.
- `apps/api/src/modules/members/`: admin member DTO/service, digital card data, snapshot, auto-regenerate hook.
- `apps/api/src/modules/approvals/approval.service.ts`: emit event approved.
- `apps/api/src/modules/documents/pdf-templates/`: template PDF/PNG server.
- `apps/web/app/klaim/page.tsx`, `public-claim-payload.ts`: form klaim publik.
- `apps/web/app/(dashboard)/claims/new/page.tsx`: form klaim admin.
- `apps/web/app/(dashboard)/members/profile/page.tsx`: self-edit anggota.
- `apps/web/src/components/members/EditMemberModal.tsx`, `apps/web/app/(dashboard)/members/[id]/edit/page.tsx`: admin edit anggota.
- `apps/web/src/components/kta/`, `apps/web/src/lib/kta/api.ts`: preview KTA.
- Generated: `apps/api/swagger.json`, `apps/web/src/types/api.d.ts`, `packages/api-client/src/index.ts`.

---

### Task 1: Schema dan migrasi field

**Files:**
- Modify: `apps/api/prisma/schema.prisma`
- Create: `apps/api/prisma/migrations/20261126120000_add_claim_pekerjaan_pelantikan/migration.sql`
- Test: `apps/api/src/modules/members/kta-field-persistence.spec.ts`

**Interfaces:**
- Produces: `Anggota.pekerjaan?: string | null`, `Anggota.pelantikan?: string | null`, `Klaim.pekerjaan?: string | null`, `Klaim.pelantikan?: string | null`.

- [ ] **Step 1: Tulis test persistensi**

Test harus membuat/mengupdate record dengan `pekerjaan: 'Guru'`, `pelantikan: '12 JULI 2020'` lalu membaca kembali kedua nilai dari `Anggota` dan `Klaim`.

- [ ] **Step 2: Jalankan test, pastikan gagal**

Run: API env + `pnpm --filter @ths-thm/api exec jest --runInBand src/modules/members/kta-field-persistence.spec.ts`

Expected: FAIL karena field belum ada di generated Prisma client.

- [ ] **Step 3: Tambah kolom Prisma dan migrasi**

Tambah `pekerjaan String?` dan `pelantikan String?` pada model `Klaim`; tambah `pelantikan String?` pada `Anggota`. Migration hanya `ALTER TABLE ... ADD COLUMN ... TEXT`; jangan backfill otomatis.

- [ ] **Step 4: Regenerate Prisma client**

Run: `pnpm --filter @ths-thm/api prisma:generate`

Expected: sukses, test sebelumnya PASS.

- [ ] **Step 5: Commit**

`git add apps/api/prisma apps/api/src/modules/members/kta-field-persistence.spec.ts && git commit -m "feat(kta): add pekerjaan and pelantikan columns"`

---

### Task 2: API klaim menerima dan menyalin field

**Files:**
- Modify: `apps/api/src/modules/claims/dto/claim.dto.ts:52-156`
- Modify: `apps/api/src/modules/claims/claims.controller.ts:51-95`
- Modify: `apps/api/src/modules/claims/claims.service.ts:469-478`
- Test: `apps/api/src/modules/claims/claims.service.spec.ts`, `claims.approval.spec.ts`

**Interfaces:**
- Consumes: kolom Prisma dari Task 1.
- Produces: `CreateClaimDto.pekerjaan?: string`, `CreateClaimDto.pelantikan?: string`; finalize klaim menulis keduanya ke `Anggota`.

- [ ] **Step 1: Tulis failing test submit klaim**

Test `POST /claims` payload dengan `pekerjaan`/`pelantikan` harus tersimpan di `prisma.klaim.create`.

- [ ] **Step 2: Tulis failing test approval final**

Test finalisasi klaim harus assert `prisma.anggota.create` menerima `pekerjaan: 'Guru'`, `pelantikan: '12 JULI 2020'`.

- [ ] **Step 3: Jalankan tests, pastikan gagal**

Run: API env + `pnpm --filter @ths-thm/api exec jest --runInBand src/modules/claims/claims.service.spec.ts src/modules/claims/claims.approval.spec.ts`

Expected: FAIL karena DTO/service belum menerima field.

- [ ] **Step 4: Implementasi DTO, Swagger body, dan service**

Tambah `@IsOptional() @IsString() @MaxLength(120)` untuk `pekerjaan`, `@MaxLength(160)` untuk `pelantikan`. Tambah keduanya ke `@ApiBody` multipart. Di `create()` simpan keduanya. Di finalize `anggota.create` salin `claim.pekerjaan` dan `claim.pelantikan`.

- [ ] **Step 5: Jalankan tests, pastikan PASS**

Run: perintah Step 3.

Expected: PASS.

- [ ] **Step 6: Commit**

`git commit -m "feat(kta): persist claim pekerjaan and pelantikan"`

---

### Task 3: Form klaim publik dan admin

**Files:**
- Modify: `apps/web/app/klaim/page.tsx:63-64,245-304,358-902`
- Modify: `apps/web/src/components/claims/public-claim-payload.ts:1-48`
- Modify: `apps/web/app/(dashboard)/claims/new/page.tsx:104-158,160-455`
- Test: `apps/web/src/components/claims/__tests__/public-claim-payload.test.ts`, `apps/web/e2e/public-pages.spec.ts`

**Interfaces:**
- Consumes: `CreateClaimDto.pekerjaan?`, `pelantikan?` dari Task 2.
- Produces: `PublicClaimFormValues.pekerjaan: string`, `pelantikan: string`; FormData menyertakan keduanya saat tidak kosong.

- [ ] **Step 1: Tulis failing test payload**

Test `buildPublicClaimFormData` dengan `pekerjaan: 'Guru'`, `pelantikan: '12 JULI 2020'` harus menghasilkan `formData.get('pekerjaan') === 'Guru'` dan `formData.get('pelantikan') === '12 JULI 2020'`.

- [ ] **Step 2: Jalankan test, pastikan gagal**

Run: `pnpm --filter @ths-thm/web exec vitest run src/components/claims/__tests__/public-claim-payload.test.ts`

Expected: FAIL.

- [ ] **Step 3: Tambah input ke form klaim publik**

Tambah state, validasi opsional, dan input teks dengan label `Pekerjaan` dan `Pelantikan` di bagian identitas. Placeholder `Pelantikan`: `contoh: 12 JULI 2020`.

- [ ] **Step 4: Tambah input ke form admin `/claims/new`**

Gunakan pola input yang sama; kirim keduanya dalam payload create.

- [ ] **Step 5: Jalankan test dan typecheck web**

Run: `pnpm --filter @ths-thm/web exec vitest run src/components/claims/__tests__/public-claim-payload.test.ts && pnpm --filter @ths-thm/web exec tsc --noEmit`

Expected: PASS.

- [ ] **Step 6: Commit**

`git commit -m "feat(kta): add claim form fields"`

---

### Task 4: Edit admin dan self-edit anggota

**Files:**
- Modify: `apps/api/src/modules/members/dto/member.dto.ts:18-148`
- Modify: `apps/api/src/modules/auth/dto/auth.dto.ts:83-113`
- Modify: `apps/api/src/modules/auth/auth.service.ts:905-963`
- Modify: `apps/web/src/components/members/EditMemberModal.tsx:59-71,193-214,312-328`
- Modify: `apps/web/app/(dashboard)/members/[id]/edit/page.tsx:52-64,205-206`
- Modify: `apps/web/app/(dashboard)/members/profile/page.tsx:95-117`
- Test: `apps/api/src/modules/auth/auth.service.spec.ts`, `apps/web/src/components/members/__tests__/EditMemberModal.test.tsx`

**Interfaces:**
- Consumes: `Anggota.pekerjaan`, `Anggota.pelantikan`.
- Produces: `UpdateProfileDto.pekerjaan?: string`, `UpdateProfileDto.pelantikan?: string`; admin `UpdateMemberDto` menerima keduanya.

- [ ] **Step 1: Tulis failing test self-update**

Test `updateProfile(userId, { pekerjaan: 'Guru', pelantikan: '12 JULI 2020' })` harus mengupdate Anggota dan memanggil `triggerProfileApproval`.

- [ ] **Step 2: Jalankan test, pastikan gagal**

Run: API env + `pnpm --filter @ths-thm/api exec jest --runInBand src/modules/auth/auth.service.spec.ts`

Expected: FAIL.

- [ ] **Step 3: Implementasi DTO dan service**

Tambah field ke `UpdateProfileDto`, `CreateMemberDto`, `UpdateMemberDto`. Di `auth.service.updateProfile`, masukkan keduanya ke `hasAnggotaFields` dan `anggotaData`.

- [ ] **Step 4: Tambah input UI admin dan anggota**

Tambah dua input di `EditMemberModal`, halaman `[id]/edit`, dan `/members/profile`. Ubah `handleSave` di `/members/profile` dari `PATCH /members/${id}` menjadi `PATCH /auth/me` dengan payload `pekerjaan`/`pelantikan`.

- [ ] **Step 5: Jalankan tests dan typecheck**

Run: API env + `pnpm --filter @ths-thm/api exec jest --runInBand src/modules/auth/auth.service.spec.ts && pnpm --filter @ths-thm/web exec tsc --noEmit`

Expected: PASS.

- [ ] **Step 6: Commit**

`git commit -m "feat(kta): allow admin and member edit"`

---

### Task 5: KTA data, snapshot, dan template PDF/PNG

**Files:**
- Modify: `apps/api/src/common/utils/kta-snapshot.util.ts:25,49,81-110`
- Modify: `apps/api/src/modules/members/members-digital-card.service.ts:784-820,845-903`
- Modify: `apps/api/src/modules/documents/pdf-templates/card-svg.ts:39-54,483-488`
- Modify: `apps/api/src/modules/documents/pdf-templates/member-card.ts:600-615,1042-1052`
- Modify: `apps/web/src/lib/kta/api.ts:82-145`
- Modify: `apps/web/src/components/kta/KtaAdminPreview.tsx:12-131`
- Test: `apps/api/src/modules/members/kta-application.snapshot.spec.ts`, `apps/web/src/lib/kta/__tests__/api.test.ts`, `apps/web/e2e/kta-admin.spec.ts`

**Interfaces:**
- Consumes: `Anggota.pekerjaan`, `Anggota.pelantikan`.
- Produces: `KtaSnapshotV1.anggota.pelantikan?: string`; card data `tanggalPelantikan` memprioritaskan `member.pelantikan`.

- [ ] **Step 1: Tulis failing test snapshot**

Test snapshot submit harus memuat `pelantikan: '12 JULI 2020'`; test lama “snapshot tidak berubah setelah data anggota diubah” harus tetap PASS.

- [ ] **Step 2: Tulis failing test mapping web**

Test `mapMemberToKtaAnggota` harus menghasilkan `pekerjaan: 'Guru'` dan `tanggalPelantikan: '12 JULI 2020'`.

- [ ] **Step 3: Jalankan tests, pastikan gagal**

Run: API env + `pnpm --filter @ths-thm/api exec jest --runInBand src/modules/members/kta-application.snapshot.spec.ts && pnpm --filter @ths-thm/web exec vitest run src/lib/kta/__tests__/api.test.ts`

Expected: FAIL.

- [ ] **Step 4: Implementasi mapping dan template**

Tambah `pelantikan` ke snapshot. Di digital-card service dan `web/src/lib/kta/api.ts`, gunakan `member.pelantikan || fallbackDadar`. Tambah `pekerjaan`/`pelantikan` ke `CardSvgData.member` dan `MemberCardPdfProps.member`, lalu render baris `PEKERJAAN` dan `PELANTIKAN`. Hilangkan hardcode `pekerjaan: ''` di preview admin.

- [ ] **Step 5: Jalankan tests, pastikan PASS**

Run: perintah Step 3.

Expected: PASS.

- [ ] **Step 6: Commit**

`git commit -m "feat(kta): render pekerjaan and pelantikan"`

---

### Task 6: Auto-regenerate KTA setelah approval

**Files:**
- Modify: `apps/api/src/modules/approvals/approval.service.ts:110-140,311-330`
- Modify: `apps/api/src/modules/members/kta-application.service.ts:139-246,879-951`
- Test: `apps/api/src/modules/approvals/approval.service.spec.ts`, `apps/api/src/modules/members/kta-application.regenerate.spec.ts`

**Interfaces:**
- Consumes: event `approval:member_update:approved` dengan payload `{ anggotaId: string; userId: string }`.
- Produces: `KtaApplicationService.regenerateGeneratedKtaForMember(anggotaId: string, actor: { id: string; role: string }): Promise<{ regenerated: number; applicationIds: string[] }>`.

- [ ] **Step 1: Tulis failing test emit event**

Test approval `member_update` final harus memanggil `eventBus.emit('approval:member_update:approved', { anggotaId, userId })` setelah status `approved`.

- [ ] **Step 2: Tulis failing test regenerator**

Test `regenerateGeneratedKtaForMember` harus:
  - hanya memproses `ktaApplication` dengan `status: 'CARD_GENERATED'` milik `anggotaId`;
  - memanggil `digitalCardService.issuePrintedCard` untuk tiap aplikasi;
  - menulis history `CARD_GENERATED` dengan catatan auto-regenerate;
  - tidak mengubah `submittedSnapshot` dan tidak menaikkan `ktaBatch.totalGenerated`;
  - mengembalikan `{ regenerated: 1, applicationIds: [...] }`.

- [ ] **Step 3: Tulis failing test no-op**

Test tanpa aplikasi `CARD_GENERATED` harus mengembalikan `{ regenerated: 0, applicationIds: [] }` dan tidak memanggil `issuePrintedCard`.

- [ ] **Step 4: Jalankan tests, pastikan gagal**

Run: API env + `pnpm --filter @ths-thm/api exec jest --runInBand src/modules/approvals/approval.service.spec.ts src/modules/members/kta-application.regenerate.spec.ts`

Expected: FAIL.

- [ ] **Step 5: Implementasi event hook**

Ubah `finalizeApproval(request, userId)` dan pemanggilannya di baris 140. Inject `EventBusService`. Pada branch `member_update`, setelah update status, emit event.

- [ ] **Step 6: Implementasi listener dan regenerator**

Di `KtaApplicationService`, implement `OnModuleInit`/`OnModuleDestroy`, daftar listener dengan referensi fungsi tetap, dan panggil `void this.regenerateGeneratedKtaForMember(...)` dengan logging error. Gunakan `issuePrintedCard(anggotaId, { reason: 'member_update_approved' }, undefined, { id: actor.id } as any)`. Jangan import `MembersModule` ke `ApprovalModule`.

- [ ] **Step 7: Jalankan tests, pastikan PASS**

Run: perintah Step 4.

Expected: PASS.

- [ ] **Step 8: Commit**

`git commit -m "feat(kta): auto-regenerate card after approval"`

---

### Task 7: Kontrak dan verifikasi akhir

**Files:**
- Modify: `apps/api/swagger.json`
- Modify: `apps/web/src/types/api.d.ts`
- Modify: `packages/api-client/src/index.ts`

**Interfaces:**
- Consumes: semua perubahan DTO dari Task 2 dan Task 4.
- Produces: generated types dengan `pekerjaan?`/`pelantikan?`.

- [ ] **Step 1: Regenerate kontrak**

Run: `pnpm --filter @ths-thm/api swagger:export && pnpm --filter @ths-thm/api generate:client && pnpm generate:contracts`

Expected: sukses, generated types memuat field baru.

- [ ] **Step 2: Jalankan verifikasi API**

Run: API env + `pnpm --filter @ths-thm/api exec jest --runInBand`

Expected: PASS.

- [ ] **Step 3: Jalankan verifikasi web**

Run: `pnpm --filter @ths-thm/web exec vitest run && pnpm --filter @ths-thm/web exec tsc --noEmit`

Expected: PASS.

- [ ] **Step 4: Cek diff**

Run: `git diff --check && git status --short`

Expected: clean whitespace, hanya file yang diubah.

- [ ] **Step 5: Commit**

`git commit -m "chore(kta): regenerate contracts and verify"`

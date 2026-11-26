# KTA Admin Issuance & Mobile Display Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Member tetap mengajukan KTA lewat mobile, tetapi hanya Web Admin yang menerbitkan kartu; mobile menampilkan kartu hanya jika issuance berasal dari admin.

**Architecture:** API menjadi sumber kebenaran lewat field `adminIssued` pada `GET /members/:id/digital-card`. Mobile membaca field itu dan tidak lagi memiliki jalur generate. Kartu/QR lama hasil member dicabut lewat script idempoten, bukan hard delete, dan admin regeneration rotates token agar URL lama tidak muncul kembali.

**Tech Stack:** NestJS, Prisma, Jest, Flutter, BLoC, Dart test.

**Spec:** `docs/superpowers/specs/2026-11-26-kta-admin-issuance-mobile-display-design.md`

## Global Constraints
- Jangan repo-wide `flutter analyze` atau `dart format`; hanya targeted checks pada file berubah.
- Jangan hard-delete `Dokumen`, `QRValidation`, atau `QrScan`; gunakan revoke.
- `adminIssued = latest KtaApplication.status == 'CARD_GENERATED' && diterbitkanOleh != null`.
- Endpoint generate member hanya untuk `superadmin`, `admin_distrik`; `anggota` dan `penguji` dicabut.
- Alur pengajuan, review, pembayaran, dan upload bukti KTA mobile tidak diubah.
- Template, penandatangan, stempel, dan pengaturan kartu Web Admin tidak diubah.
- Commit per task; push hanya jika diminta.

## Review Focus
- Legacy card `CARD_GENERATED` tetapi `diterbitkanOleh: null` → harus `adminIssued:false` dan tidak tampil di mobile.
- Kartu admin dengan `diterbitkanOleh` terisi → harus tampil normal.
- QR lama revoked → verifikasi gagal dan tidak muncul lagi setelah admin generate ulang.
- `biaya` sebagai String Decimal → parser tidak throw.
- `anggota` memanggil endpoint generate lama → 403.
- Pengajuan KTA mobile tetap berfungsi → regression test lama tetap hijau.

---

### Task 1: Tambah `adminIssued` ke response digital card

**Files:**
- Modify: `apps/api/src/modules/members/members-digital-card.service.ts:458-500`
- Test: `apps/api/src/modules/members/members-digital-card.service.spec.ts`

**Interfaces:**
- Consumes: `prisma.ktaApplication` dengan `status`, `diterbitkanOleh`.
- Produces: `GET /members/:id/digital-card` → `data.adminIssued: boolean`.

- [ ] **Step 1: Tulis test gagal**

```ts
it('returns adminIssued=false when latest KTA has no admin issuer', async () => {
  const data = await service.getDigitalCard('member-legacy');
  expect(data.data.adminIssued).toBe(false);
});

it('returns adminIssued=true when latest KTA was issued by admin', async () => {
  const data = await service.getDigitalCard('member-admin-issued');
  expect(data.data.adminIssued).toBe(true);
});
```

- [ ] **Step 2: Jalankan test sampai gagal**

Run: `pnpm --filter @ths-thm/api test -- members-digital-card.service.spec.ts`
Expected: FAIL karena `adminIssued` belum ada.

- [ ] **Step 3: Implementasi resolver**

Tambah `private async resolveAdminIssued(memberId: string): Promise<boolean>` yang mengambil aplikasi terakhir dan mengembalikan `status === 'CARD_GENERATED' && Boolean(diterbitkanOleh)`. Sertakan `adminIssued` pada kedua cabang response `generated:true` dan `generated:false`.

- [ ] **Step 4: Jalankan test sampai lulus**

Run: `pnpm --filter @ths-thm/api test -- members-digital-card.service.spec.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add apps/api/src/modules/members/members-digital-card.service.ts apps/api/src/modules/members/members-digital-card.service.spec.ts
git commit -m "feat(kta): expose admin issuance flag on digital card"
```

### Task 2: Tutup generate member untuk role non-admin

**Files:**
- Modify: `apps/api/src/modules/members/members.controller.ts:298-312`
- Modify: `apps/api/src/common/constants/role-contract.spec.ts:199-231`

**Interfaces:**
- Consumes: `@CrudAuth` decorator.
- Produces: `POST /members/:id/digital-card/generate` hanya untuk `superadmin`, `admin_distrik`.

- [ ] **Step 1: Update test kontrak role**

Hapus `generateDigitalCard` dari kontrak `admin_nasional`/role non-admin yang berlaku; pastikan tetap ada untuk role admin yang diizinkan.

- [ ] **Step 2: Jalankan test sampai gagal**

Run: `pnpm --filter @ths-thm/api test -- role-contract.spec.ts`
Expected: FAIL sebelum decorator diubah.

- [ ] **Step 3: Ubah decorator**

Pada `generateDigitalCard`, hapus `admin_wilayah`, `admin_ranting`, `admin_nasional`, `admin_kegiatan`, `penguji`, `anggota`. Ubah summary menjadi `Generate KTA manual oleh admin`.

- [ ] **Step 4: Jalankan test sampai lulus**

Run: `pnpm --filter @ths-thm/api test -- role-contract.spec.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add apps/api/src/modules/members/members.controller.ts apps/api/src/common/constants/role-contract.spec.ts
git commit -m "fix(kta): restrict member card generation to admins"
```

### Task 3: Revoke kartu/QR lama hasil member

**Files:**
- Create: `apps/api/src/modules/members/kta-card-revocation.ts`
- Create: `apps/api/prisma/revoke-member-kta-cards.ts`
- Modify: `apps/api/package.json:27-32`
- Test: `apps/api/src/modules/members/members-digital-card.service.spec.ts`

**Interfaces:**
- Consumes: `PrismaClient` / `Prisma.TransactionClient`.
- Produces: `revokeLegacyMemberKtaCards(prisma): Promise<{ documentsRevoked: number; digitalQrsRevoked: number; datesCleared: number }>`.

- [ ] **Step 1: Tulis test gagal**

```ts
it('revokes digital-only KTA without deleting audit scans', async () => {
  const result = await revokeLegacyMemberKtaCards(prisma);
  expect(result.digitalQrsRevoked).toBe(1);
  expect(await prisma.dokumen.findUnique({ where: { id: 'doc-digital' } }))
    .toMatchObject({ status: 'revoked' });
  expect(await prisma.qrScan.count({ where: { qrValidationId: 'qr-digital' } })).toBe(1);
});

it('keeps documents that still have a valid printed QR', async () => {
  await revokeLegacyMemberKtaCards(prisma);
  expect(await prisma.dokumen.findUnique({ where: { id: 'doc-printed' } }))
    .toMatchObject({ status: 'generated' });
});
```

- [ ] **Step 2: Jalankan test sampai gagal**

Run: `pnpm --filter @ths-thm/api test -- members-digital-card.service.spec.ts`
Expected: FAIL karena helper belum ada.

- [ ] **Step 3: Implementasi helper**

Gunakan `updateMany`, bukan `delete`:
- invalidasi `QRValidation` `source:'digital'`, `isValid:true` untuk `Dokumen.tipe='kartu_anggota'`;
- revoke `Dokumen` yang tidak punya QR `printed` valid;
- kosongkan `Anggota.tanggalTerbit` dan `tanggalBerlakuSampai` hanya untuk member yang dokumennya di-revoke;
- jangan sentuh `QrScan`;
- jalankan dalam `prisma.$transaction`;
- idempoten saat dijalankan ulang.

- [ ] **Step 4: Tambah runner**

Buat `apps/api/prisma/revoke-member-kta-cards.ts` yang memanggil helper dan log hasil. Tambah script package: `db:revoke:member-kta: ts-node prisma/revoke-member-kta-cards.ts`.

- [ ] **Step 5: Jalankan test sampai lulus**

Run: `pnpm --filter @ths-thm/api test -- members-digital-card.service.spec.ts`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add apps/api/src/modules/members/kta-card-revocation.ts apps/api/prisma/revoke-member-kta-cards.ts apps/api/package.json apps/api/src/modules/members/members-digital-card.service.spec.ts
git commit -m "feat(kta): revoke legacy member-generated cards"
```

### Task 4: Rotasi QR saat admin generate ulang

**Files:**
- Modify: `apps/api/src/modules/members/members-digital-card.service.ts:825-880`
- Test: `apps/api/src/modules/members/members-digital-card.service.spec.ts`

**Interfaces:**
- Consumes: helper `signQrToken`, `uuidv4`, `normalizeVerificationUrl`.
- Produces: `issuePrintedCard()` menghasilkan QR digital baru saat dokumen revoked.

- [ ] **Step 1: Tulis test gagal**

```ts
it('rotates revoked digital QR during admin issuance', async () => {
  const before = await prisma.dokumen.findUnique({ where: { id: 'doc-revoked' } });
  const result = await service.issuePrintedCard('member-revoked', { reason: 'baru' });
  const after = await prisma.dokumen.findUnique({ where: { id: 'doc-revoked' } });
  expect(result.data.issuance.source).toBe('printed');
  expect(after.verificationUrl).not.toBe(before.verificationUrl);
  expect(after.status).toBe('generated');
});
```

- [ ] **Step 2: Jalankan test sampai gagal**

Run: `pnpm --filter @ths-thm/api test -- members-digital-card.service.spec.ts`
Expected: FAIL karena URL lama masih dipakai.

- [ ] **Step 3: Implementasi rotasi**

Ubah `ensureKtaDokumen(member, opts?: { createIfMissing?: boolean })` agar, untuk dokumen revoked atau tanpa QR digital valid, membuat token baru, QR digital baru, update `verificationUrl`, lalu mengembalikan dokumen. `issuePrintedCard()` tetap membuat QR `printed` setelah rotasi.

- [ ] **Step 4: Jalankan test sampai lulus**

Run: `pnpm --filter @ths-thm/api test -- members-digital-card.service.spec.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add apps/api/src/modules/members/members-digital-card.service.ts apps/api/src/modules/members/members-digital-card.service.spec.ts
git commit -m "fix(kta): rotate card token on admin reissue"
```

### Task 5: Sembunyikan riwayat/QR revoked dari member

**Files:**
- Modify: `apps/api/src/modules/members/members-digital-card.service.ts:303-337`
- Modify: `apps/api/src/modules/members/members-digital-card.service.ts:410-456`
- Test: `apps/api/src/modules/members/members-digital-card.service.spec.ts`

**Interfaces:**
- Consumes: `user?.role`, status QR, status dokumen.
- Produces: response kosong/404 untuk `anggota` saat tidak ada issuance admin aktif.

- [ ] **Step 1: Tulis test gagal**

```ts
it('hides revoked card security from member', async () => {
  await expect(service.getCardSecurity('member-revoked', 'self', memberUser))
    .rejects.toMatchObject({ status: 404 });
});

it('returns no issuances to member when all QRs are revoked', async () => {
  const data = await service.getCardIssuances('member-revoked', 'self', memberUser);
  expect(data.data.issuances).toEqual([]);
});
```

- [ ] **Step 2: Jalankan test sampai gagal**

Run: `pnpm --filter @ths-thm/api test -- members-digital-card.service.spec.ts`
Expected: FAIL karena data revoked masih tampil.

- [ ] **Step 3: Implementasi filter**

Jika `user?.role === 'anggota'` dan tidak ada QR `isValid:true`, `getCardSecurity` melempar `NotFoundException`; `getCardIssuances` mengembalikan `issuances: []`. Admin tetap melihat data audit lengkap.

- [ ] **Step 4: Jalankan test sampai lulus**

Run: `pnpm --filter @ths-thm/api test -- members-digital-card.service.spec.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add apps/api/src/modules/members/members-digital-card.service.ts apps/api/src/modules/members/members-digital-card.service.spec.ts
git commit -m "fix(kta): hide revoked card history from members"
```

### Task 6: Perbaiki parser `biaya` String

**Files:**
- Modify: `apps/mobile_flutter/lib/data/models/kta_application.dart:83`
- Test: `apps/mobile_flutter/test/kta_application_upload_test.dart`

**Interfaces:**
- Consumes: JSON `biaya: num | String | null`.
- Produces: `KtaApplication.biaya: double?`.

- [ ] **Step 1: Tulis test gagal**

```dart
test('parses Decimal biaya serialized as string', () {
  final app = KtaApplication.fromJson({
    ...applicationJson,
    'biaya': '250000.00',
  });
  expect(app.biaya, 250000.0);
});
```

- [ ] **Step 2: Jalankan test sampai gagal**

Run: `flutter test test/kta_application_upload_test.dart`
Expected: FAIL dengan cast error.

- [ ] **Step 3: Implementasi parser**

Ganti cast langsung dengan helper `_parseNullableDouble(Object? value)` yang menerima `num`, `String.tryParse`, atau `null`.

- [ ] **Step 4: Jalankan test sampai lulus**

Run: `flutter test test/kta_application_upload_test.dart`
Expected: PASS, termasuk kasus angka dan `null`.

- [ ] **Step 5: Commit**

```bash
git add apps/mobile_flutter/lib/data/models/kta_application.dart apps/mobile_flutter/test/kta_application_upload_test.dart
git commit -m "fix(kta): parse Decimal biaya serialized as string"
```

### Task 7: Hapus generate mobile dan gate tampilan kartu

**Files:**
- Modify: `apps/mobile_flutter/lib/data/models/card_data.dart:23-88`
- Modify: `apps/mobile_flutter/lib/logic/member/member_event.dart:81-89`
- Modify: `apps/mobile_flutter/lib/logic/member/member_bloc.dart:140-160`
- Modify: `apps/mobile_flutter/lib/presentation/screens/kta_screen.dart:28-32,84-85,153-169,322-361`
- Modify: `apps/mobile_flutter/lib/presentation/screens/home_screen.dart:273-297`
- Modify: `apps/mobile_flutter/lib/presentation/screens/kta_viewer_screen.dart`
- Test: `apps/mobile_flutter/test/card_data_test.dart`, `apps/mobile_flutter/test/kta_generate_task4_test.dart`, `apps/mobile_flutter/test/member_kta_test.dart`, `apps/mobile_flutter/test/home_kta_apply_test.dart`

**Interfaces:**
- Consumes: `CardData.adminIssued` dari Task 1.
- Produces: kartu tampil hanya jika `generated && adminIssued`.

- [ ] **Step 1: Tulis test gagal**

```dart
test('falls closed when adminIssued is missing', () {
  final data = CardData.fromJson({'generated': true});
  expect(data.adminIssued, isFalse);
});

test('member KTA screen never posts to digital-card/generate', () async {
  expect(dio.requestCalls, isNot(contains('/digital-card/generate')));
});
```

Tambah widget assertion: `adminIssued:false` → tidak ada `KtaFlipCard`; `adminIssued:true` → `KtaFlipCard` tampil.

- [ ] **Step 2: Jalankan test sampai gagal**

Run: `flutter test test/card_data_test.dart test/kta_generate_task4_test.dart test/member_kta_test.dart test/home_kta_apply_test.dart`
Expected: FAIL karena field dan gate belum ada.

- [ ] **Step 3: Implementasi model dan UI**

Tambah `final bool adminIssued` dengan default `false`; parse `json['adminIssued'] as bool? ?? false`. Hapus `MemberCardGenerateRequested`, handler `_onMemberCardGenerateRequested`, dan `_GenerateKtaCard`. Ubah status menjadi `Menunggu penerbitan admin`. Gate `KtaFlipCard` di KTA screen, home, dan viewer dengan `generated && adminIssued`.

- [ ] **Step 4: Jalankan test sampai lulus**

Run: `flutter test test/card_data_test.dart test/kta_generate_task4_test.dart test/member_kta_test.dart test/home_kta_apply_test.dart`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add apps/mobile_flutter/lib apps/mobile_flutter/test/card_data_test.dart apps/mobile_flutter/test/kta_generate_task4_test.dart apps/mobile_flutter/test/member_kta_test.dart apps/mobile_flutter/test/home_kta_apply_test.dart
git commit -m "feat(kta): remove mobile generation and gate card display"
```

### Task 8: Regenerate kontrak dan verifikasi akhir

**Files:**
- Modify: `apps/api/swagger.json`
- Modify: `apps/web/src/types/api.d.ts`
- Modify: `packages/api-client/src/index.ts`

**Interfaces:**
- Consumes: perubahan role dan summary dari Task 2.
- Produces: kontrak client yang tidak lagi menawarkan generate member.

- [ ] **Step 1: Regenerate Swagger dan client**

Run:
```bash
pnpm --filter @ths-thm/api swagger:export
pnpm --filter @ths-thm/api generate:client
```

Expected: endpoint generate member tidak lagi mengizinkan `anggota`/`penguji`.

- [ ] **Step 2: Jalankan verifikasi API**

Run: `pnpm --filter @ths-thm/api test -- members-digital-card kta-application role-contract`
Expected: PASS.

- [ ] **Step 3: Jalankan verifikasi mobile**

Run: `flutter test test/card_data_test.dart test/kta_application_upload_test.dart test/kta_generate_task4_test.dart test/member_kta_test.dart test/home_kta_apply_test.dart test/kta_layout_test.dart test/kta_status_banner_test.dart test/kta_payment_status_test.dart`
Expected: PASS.

- [ ] **Step 4: Targeted analyze**

Run: `dart analyze apps/mobile_flutter/lib/data/models/card_data.dart apps/mobile_flutter/lib/data/models/kta_application.dart apps/mobile_flutter/lib/logic/member/member_event.dart apps/mobile_flutter/lib/logic/member/member_bloc.dart apps/mobile_flutter/lib/presentation/screens/kta_screen.dart apps/mobile_flutter/lib/presentation/screens/home_screen.dart apps/mobile_flutter/lib/presentation/screens/kta_viewer_screen.dart`
Expected: `No issues found!`.

- [ ] **Step 5: Diff check dan commit**

Run: `git diff --check` → hanya warning LF/CRLF yang sudah dikenal.

```bash
git add apps/api/swagger.json apps/web/src/types/api.d.ts packages/api-client/src/index.ts
git commit -m "chore(kta): regenerate API contracts"
```

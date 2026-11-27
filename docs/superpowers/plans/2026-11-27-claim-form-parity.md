# Claim Form Parity Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make web admin and mobile claim forms mirror the public claim form design, including proof-mode cards and parity fields.

**Architecture:** Extract the public validator into a shared web helper and reuse the existing public payload builder through a thin admin adapter. Keep UI local to each surface. Mobile adds the same fields/order/error copy and switches radio tiles to horizontal cards while preserving existing submission branches.

**Tech Stack:** Next.js/React + TypeScript, Vitest, Flutter/Dart, flutter_bloc, flutter_test.

**Spec:** `docs/superpowers/specs/2026-11-27-claim-form-parity-design.md`

## Global Constraints

- Tidak ada perubahan API/DTO/Prisma/generated contract.
- UI publik tidak diubah selain mengimpor validator hasil ekstraksi.
- Error message web/mobile harus persis memakai teks form publik.
- Admin tetap toast-first menggunakan error pertama dari validator.
- Mobile tetap memakai batas 3 berkas bukti dan jalur submit multipart untuk `unggah`, JSON untuk `cerita`.
- Jangan menjalankan repo-wide `flutter analyze` atau `dart format`.
- Jalankan test mobil hanya focused: `test/claim_account_form_test.dart` dan `test/claim_payload_test.dart`.

## Review Focus

- `modeBukti=cerita` dengan file lama: harus mengirim `ceritaHistori` sekali dan tidak mengirim `buktiFiles` — Task 1 dan Task 2.
- `modeBukti=unggah` tanpa file: harus diblokir dengan `Unggah minimal satu berkas bukti` — Task 1, Task 2, Task 4.
- `pekerjaan`/`pelantikan` kosong atau spasi: harus dihilangkan dari payload — Task 1 dan Task 3.
- Ranting/Wilayah/Distrik belum dipilih: harus diblokir dengan `Pilih distrik`, `Pilih wilayah`, `Pilih ranting` — Task 1 dan Task 4.
- Cerita <20 atau >1000 karakter serta email/No HP invalid: harus diblokir dengan pesan publik — Task 1 dan Task 4.

---

### Task 1: Extract shared web validator

**Files:**
- Create: `apps/web/src/components/claims/claim-form-validation.ts`
- Modify: `apps/web/app/klaim/page.tsx:247-272`
- Test: `apps/web/src/components/claims/__tests__/claim-form-validation.test.ts`

**Interfaces:**
- Consumes: `PublicClaimFormValues` from `apps/web/src/components/claims/public-claim-payload.ts`.
- Produces: `validateClaimForm(form, org, buktiFileCount): Record<string, string>`.

- [ ] **Step 1: Write the failing test**

Create `claim-form-validation.test.ts` with exact assertions:

```ts
expect(validateClaimForm(validForm, validOrg, 1)).toEqual({});
expect(validateClaimForm({ ...validForm, namaLengkap: 'Ab' }, validOrg, 1).namaLengkap)
  .toBe('Nama lengkap minimal 3 karakter');
expect(validateClaimForm({ ...validForm, modeBukti: 'unggah' }, validOrg, 0).buktiFiles)
  .toBe('Unggah minimal satu berkas bukti');
expect(validateClaimForm({ ...validForm, modeBukti: 'cerita', ceritaHistori: 'pendek' }, validOrg, 0).ceritaHistori)
  .toBe('Cerita histori harus antara 20 sampai 1000 karakter');
expect(validateClaimForm({ ...validForm, email: 'bukan-email' }, validOrg, 1).email)
  .toBe('Format email tidak valid');
expect(validateClaimForm({ ...validForm, noHp: '123' }, validOrg, 1).noHp)
  .toBe('Format No. HP tidak valid (mulai 0 atau +62, 9-14 digit)');
expect(validateClaimForm(validForm, { distrikId: '', wilayahId: '', rantingId: '' }, 0)).toMatchObject({
  distrikId: 'Pilih distrik',
  wilayahId: 'Pilih wilayah',
  rantingId: 'Pilih ranting',
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm --filter @ths-thm/web exec vitest run src/components/claims/__tests__/claim-form-validation.test.ts`
Expected: FAIL because `claim-form-validation.ts` does not exist.

- [ ] **Step 3: Implement the helper**

In `claim-form-validation.ts`, export:

```ts
interface ClaimFormOrg {
  distrikId: string;
  wilayahId: string;
  rantingId: string;
}

export function validateClaimForm(
  form: PublicClaimFormValues,
  org: ClaimFormOrg,
  buktiFileCount: number,
): Record<string, string>
```

Copy the validation rules and exact error strings from `apps/web/app/klaim/page.tsx:247-272`, returning the error map instead of calling `setFieldErrors`. Preserve insertion order so `Object.values(errors)[0]` is meaningful.

- [ ] **Step 4: Rewire public form**

In `apps/web/app/klaim/page.tsx`, import `validateClaimForm` and replace the body of `validate` with:

```ts
const errs = validateClaimForm(form, { distrikId: selectedDistrikId, wilayahId: selectedWilayahId, rantingId }, buktiFiles.length);
setFieldErrors(errs);
return Object.keys(errs).length === 0;
```

Do not change any public JSX or state names.

- [ ] **Step 5: Run tests**

Run: `pnpm --filter @ths-thm/web exec vitest run && pnpm --filter @ths-thm/web exec tsc --noEmit`
Expected: all web tests and typecheck PASS.

- [ ] **Step 6: Commit**

```bash
git add apps/web/src/components/claims/claim-form-validation.ts apps/web/src/components/claims/__tests__/claim-form-validation.test.ts apps/web/app/klaim/page.tsx
git commit -m "refactor(claims): extract shared claim form validator"
```

---

### Task 2: Align web admin claim form with public

**Files:**
- Create: `apps/web/src/components/claims/admin-claim-form-data.ts`
- Modify: `apps/web/app/(dashboard)/claims/new/page.tsx`
- Test: `apps/web/src/components/claims/__tests__/admin-claim-form-data.test.ts`

**Interfaces:**
- Consumes: `validateClaimForm` from Task 1 and `buildPublicClaimFormData` from existing `public-claim-payload.ts`.
- Produces: `buildAdminClaimFormData(form, rantingId, files): FormData` used by admin submit.

- [ ] **Step 1: Write the failing test**

Create `admin-claim-form-data.test.ts`:

```ts
import { buildAdminClaimFormData } from '../admin-claim-form-data';

it('builds admin-shaped cerita mode with no files', () => {
  const data = buildAdminClaimFormData(
    { ...baseForm, modeBukti: 'cerita', ceritaHistori: 'Cerita histori anggota yang cukup panjang.' },
    'ranting-admin',
    [],
  );
  expect(data.getAll('modeBukti')).toEqual(['cerita']);
  expect(data.has('buktiFiles')).toBe(false);
  expect(data.get('ceritaHistori')).toContain('Cerita histori anggota');
});

it('builds admin-shaped unggah mode with files', () => {
  const data = buildAdminClaimFormData(
    { ...baseForm, modeBukti: 'unggah', buktiFiles: [fileFixture] },
    'ranting-admin',
    [{ file: fileFixture }],
  );
  expect(data.getAll('buktiFiles')).toHaveLength(1);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm --filter @ths-thm/web exec vitest run src/components/claims/__tests__/admin-claim-form-data.test.ts`
Expected: FAIL because `admin-claim-form-data.ts` does not exist.

- [ ] **Step 3: Implement the admin payload adapter**

Create `apps/web/src/components/claims/admin-claim-form-data.ts` exporting:

```ts
export function buildAdminClaimFormData(
  form: PublicClaimFormValues,
  rantingId: string,
  files: PublicClaimFile[],
): FormData
```

The body must return `buildPublicClaimFormData(form, rantingId, files)` unchanged.

- [ ] **Step 4: Run tests**

Run: `pnpm --filter @ths-thm/web exec vitest run src/components/claims/__tests__/admin-claim-form-data.test.ts`
Expected: PASS.

- [ ] **Step 5: Update admin state and submit**

In `claims/new/page.tsx`:

- Add `modeBukti` state default `'unggah'` and `ceritaHistori` state.
- Build a `PublicClaimFormValues` object from existing state fields.
- Replace inline validation checks with `validateClaimForm(form, { distrikId, wilayahId, rantingId }, buktiFiles.length)`.
- On errors: `toast('error', Object.values(errors)[0])` and return.
- Replace manual `FormData` construction with `buildAdminClaimFormData(form, rantingId, buktiFiles.map((file) => ({ file })))`.
- Keep `apiClient.post('/claims', formData, ...)`, success toast, and `router.push('/claims')`.

- [ ] **Step 6: Update admin UI structure**

In the same file:

- Rename Dadar labels to `Tempat Pendadaran (Dadar) *` and `Tahun Pendadaran (Dadar) *`.
- Keep `pekerjaan`/`pelantikan` with `maxLength={120}` / `maxLength={160}` and public placeholders.
- Reorder fields to: Nama/Jenis Kelamin, Tempat/Tanggal Lahir, Dadar, Pekerjaan/Pelantikan, No HP/Email, Alamat, Distrik/Wilayah/Ranting, proof mode, upload/cerita, Catatan, submit.
- Add the same two proof-mode cards as public with labels/helper text `Unggah bukti`, `Ceritakan histori`, `Sertifikat, kartu anggota, KTP, atau surat keterangan`, and `Tulis riwayat keanggotaan Anda (20–1000 karakter)`.
- When `modeBukti === 'unggah'`, show `FileUploadZone` with public label and `maxFiles={6}`; when `'cerita'`, show textarea `Cerita Histori Keanggotaan *`, `maxLength={1000}`, helper `Minimal 20 karakter, maksimal 1000 karakter`, and `{ceritaHistori.length}/1000`.
- Clear mode-specific errors when mode changes, mirroring public behavior.

- [ ] **Step 7: Run tests**

Run: `pnpm --filter @ths-thm/web exec vitest run && pnpm --filter @ths-thm/web exec tsc --noEmit`
Expected: all web tests and typecheck PASS.

- [ ] **Step 8: Commit**

```bash
git add apps/web/src/components/claims/admin-claim-form-data.ts apps/web/src/components/claims/__tests__/admin-claim-form-data.test.ts "apps/web/app/(dashboard)/claims/new/page.tsx"
git commit -m "feat(claims): align admin claim form with public form"
```

---

### Task 3: Add pekerjaan/pelantikan to mobile event and payload

**Files:**
- Modify: `apps/mobile_flutter/lib/logic/claim/claim_event.dart`
- Modify: `apps/mobile_flutter/lib/logic/claim/claim_payload.dart`
- Test: `apps/mobile_flutter/test/claim_payload_test.dart`

**Interfaces:**
- Consumes: `ClaimCreateRequested` from `claim_event.dart`.
- Produces: `pekerjaan`/`pelantikan` fields in both JSON and multipart payloads.

- [ ] **Step 1: Write failing payload tests**

Append to `claim_payload_test.dart`:

```dart
test('buildClaimFields sends trimmed pekerjaan and pelantikan', () {
  final event = ClaimCreateRequested(
    tipe: 'keanggotaan',
    modeBukti: 'cerita',
    ceritaHistori: story,
    pekerjaan: ' Guru ',
    pelantikan: ' 12 JULI 2020 ',
  );
  final fields = buildClaimFields(event);
  expect(fields['pekerjaan'], 'Guru');
  expect(fields['pelantikan'], '12 JULI 2020');
});

test('buildClaimFormData sends pekerjaan and pelantikan in unggah mode', () async {
  final event = ClaimCreateRequested(
    tipe: 'keanggotaan',
    modeBukti: 'unggah',
    buktiFilePaths: paths,
    pekerjaan: 'Guru',
    pelantikan: '12 JULI 2020',
  );
  final formData = await buildClaimFormData(event);
  expect(formData.fields.any((e) => e.key == 'pekerjaan' && e.value == 'Guru'), isTrue);
  expect(formData.fields.any((e) => e.key == 'pelantikan' && e.value == '12 JULI 2020'), isTrue);
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run from `apps/mobile_flutter`: `flutter test test/claim_payload_test.dart`
Expected: FAIL because the event has no `pekerjaan`/`pelantikan`.

- [ ] **Step 3: Extend event**

In `claim_event.dart`, add optional `String? pekerjaan` and `String? pelantikan` to `ClaimCreateRequested`, its constructor, and `props`.

- [ ] **Step 4: Extend payload**

In `claim_payload.dart`, inside the `if (event.tipe == 'keanggotaan')` block of `buildClaimFields`, append trimmed non-empty `pekerjaan` and `pelantikan` keys. Do not change the cerita/unggah branching in `buildClaimFormData`.

- [ ] **Step 5: Run tests**

Run from `apps/mobile_flutter`: `flutter test test/claim_payload_test.dart`
Expected: all tests PASS.

- [ ] **Step 6: Commit**

```bash
git add apps/mobile_flutter/lib/logic/claim/claim_event.dart apps/mobile_flutter/lib/logic/claim/claim_payload.dart apps/mobile_flutter/test/claim_payload_test.dart
git commit -m "feat(mobile): send pekerjaan and pelantikan in claim payload"
```

---

### Task 4: Mirror public claim form design on mobile

**Files:**
- Modify: `apps/mobile_flutter/lib/presentation/screens/claim_account_form_screen.dart`
- Test: `apps/mobile_flutter/test/claim_account_form_test.dart`

**Interfaces:**
- Consumes: `ClaimCreateRequested.pekerjaan/pelantikan` from Task 3.
- Produces: mobile form UI and validation matching public copy.

- [ ] **Step 1: Update failing widget tests**

In `claim_account_form_test.dart`:

- Replace `RadioListTile` finders with finders for text `Unggah bukti` and `Ceritakan histori`.
- Keep the `RadioGroup<String>` default assertion for `'unggah'`.
- Update the no-file snackbar assertion to `expect(find.text('Unggah minimal satu berkas bukti'), findsOneWidget);`.
- Update the cerita field finder to `find.widgetWithText(InputDecorator, 'Cerita Histori Keanggotaan *')`.
- Add assertion `expect(find.byType(RadioListTile<String>), findsNothing);`.
- Add assertion that a captured `ClaimCreateRequested` includes `pekerjaan`, `pelantikan`, and `catatan` for keanggotaan.

- [ ] **Step 2: Run tests to verify they fail**

Run from `apps/mobile_flutter`: `flutter test test/claim_account_form_test.dart`
Expected: FAIL because the screen still uses `RadioListTile` and old labels.

- [ ] **Step 3: Add state and validation**

In `claim_account_form_screen.dart`:

- Add `_pekerjaanCtrl` and `_pelantikanCtrl`; dispose them.
- Reuse `_catatanCtrl` for keanggotaan.
- Replace validation messages with exact public strings, including `Nama lengkap minimal 3 karakter`, `Pilih ranting`, `Tempat pendadaran wajib diisi`, `Tahun pendadaran wajib diisi`, `Unggah minimal satu berkas bukti`, and `Cerita histori harus antara 20 sampai 1000 karakter`.
- Add required checks for tempat lahir, tanggal lahir, alamat, email format, No HP format, and `_selectedRantingId`.
- Pass `pekerjaan`, `pelantikan`, and `catatan` into `ClaimCreateRequested`.

- [ ] **Step 4: Reorder fields and replace radio widget**

In `_keanggotaanFields()`:

- Order: Nama, Jenis Kelamin, Tempat Lahir, Tanggal Lahir, Tempat/Tahun Dadar, Pekerjaan, Pelantikan, No HP, Email, Alamat, `OrgStructureFields`, radio cards, upload/cerita, Catatan.
- Move `OrgStructureFields` out of its current position before Tempat Lahir.
- Replace the two `RadioListTile`s with a `RadioGroup<String>` whose child is a `Row` with two `Expanded` cards. Each card contains a `Radio<String>` with only `value` set, plus title and helper text from public. Selected state changes border/background.
- Keep upload/cerita conditional bodies inside the same radio section.
- Set cerita field label to `Cerita Histori Keanggotaan *`, `maxLength: 1000`, and show helper/counter text.
- Add `Catatan` text field after proof section with public placeholder text.

- [ ] **Step 5: Run tests**

Run from `apps/mobile_flutter`: `flutter test test/claim_account_form_test.dart test/claim_payload_test.dart`
Expected: all focused mobile tests PASS.

- [ ] **Step 6: Commit**

```bash
git add apps/mobile_flutter/lib/presentation/screens/claim_account_form_screen.dart apps/mobile_flutter/test/claim_account_form_test.dart
git commit -m "feat(mobile): mirror public claim form design"
```

---

### Task 5: Final verification

**Files:** None.

**Interfaces:** None.

- [ ] **Step 1: Web verification**

Run: `pnpm --filter @ths-thm/web exec vitest run && pnpm --filter @ths-thm/web exec tsc --noEmit`
Expected: all web tests and typecheck PASS.

- [ ] **Step 2: Mobile verification**

Run from `apps/mobile_flutter`: `flutter test test/claim_account_form_test.dart test/claim_payload_test.dart`
Expected: all focused mobile tests PASS.

- [ ] **Step 3: Workspace cleanliness**

Run: `git status --short --branch && git diff --check`
Expected: clean branch, no whitespace errors, only intended commits.

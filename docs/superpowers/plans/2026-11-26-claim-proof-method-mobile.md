# Metode Pembuktian Klaim Anggota Mobile Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Tambahkan metode pembuktian `Unggah bukti` dan `Ceritakan histori` ke klaim anggota Flutter agar payload lolos validasi API.

**Architecture:** Form Flutter menambah state mode, path berkas, dan cerita. Event `ClaimCreateRequested` membawa field tersebut. Builder payload menghasilkan JSON untuk mode `cerita` atau `FormData` multipart untuk mode `unggah`; `ClaimBloc` memilih cabang dan memposting lewat `ApiClient.dio`.

**Tech Stack:** Flutter, flutter_bloc, dio, image picker existing, `file_picker` baru, mocktail, bloc_test.

**Spec:** `docs/superpowers/specs/2026-11-26-claim-proof-method-mobile-design.md`

## Global Constraints
- JANGAN ubah API, Prisma, Swagger, api-client, atau web.
- Field multipart: `buktiFiles`, maksimal 3 berkas, 5MB per berkas.
- Ekstensi diizinkan: `.jpg`, `.jpeg`, `.png`, `.webp`, `.pdf`.
- Cerita: 20–1000 karakter setelah trim.
- Pesan validasi lokal persis: `Mode unggah memerlukan minimal satu berkas bukti`, `Cerita histori harus antara 20 sampai 1000 karakter`, `Maksimal 3 berkas bukti`.
- Pola multipart: `apps/mobile_flutter/lib/logic/dues/dues_bloc.dart:147-161`.
- Commit pesan mengikuti Conventional Commits, tanpa "Generated with" attribution.

## Review Focus
- Submit tanpa menyentuh radio → default `unggah`, tidak menghasilkan toast API.
- Mode `unggah` tanpa berkas → diblokir lokal sebelum request.
- 4 berkas dipilih → diblokir dengan `Maksimal 3 berkas bukti`.
- PDF dan JPEG keduanya masuk ke `buktiFiles`.
- Cerita 19 atau 1001 karakter → diblokir lokal; 20–1000 karakter lolos.

---

### Task 1: Payload dan event klaim

**Files:**
- Modify: `apps/mobile_flutter/lib/logic/claim/claim_event.dart:17-51`
- Create: `apps/mobile_flutter/lib/logic/claim/claim_payload.dart`
- Create: `apps/mobile_flutter/test/claim_payload_test.dart`
- Modify: `apps/mobile_flutter/lib/logic/claim/claim_bloc.dart:71-102`

**Interfaces:**
- Consumes: field JSON existing di `claim_bloc.dart:77-94`.
- Produces:
  - `ClaimCreateRequested.modeBukti` (`'unggah' | 'cerita'`, default `'unggah'`)
  - `ClaimCreateRequested.ceritaHistori` (`String?`)
  - `ClaimCreateRequested.buktiFilePaths` (`List<String>`, default `const []`)
  - `Map<String, dynamic> buildClaimFields(ClaimCreateRequested event)`
  - `Future<FormData> buildClaimFormData(ClaimCreateRequested event)`

- [ ] **Step 1: Write the failing test**

Buat `test/claim_payload_test.dart` dengan tiga test:
- `buildClaimFields` untuk mode `cerita` menghasilkan `modeBukti == 'cerita'` dan `ceritaHistori == 'Saya menjadi anggota sejak 2019 dan aktif hingga sekarang.'`.
- `buildClaimFormData` untuk 3 path menghasilkan field `modeBukti == 'unggah'` dan 3 field `buktiFiles`.
- `buildClaimFormData` untuk 4 path melempar `ArgumentError` dengan pesan `Maksimal 3 berkas bukti`.

- [ ] **Step 2: Run test to verify it fails**

Run: `flutter test test/claim_payload_test.dart` dari `apps/mobile_flutter`
Expected: FAIL karena `modeBukti`, `ceritaHistori`, `buktiFilePaths`, dan builder belum ada.

- [ ] **Step 3: Implement the minimal code**

Tambahkan field baru ke `ClaimCreateRequested` dan `props`. Buat `claim_payload.dart` dengan `buildClaimFields` (mempertahankan semua key existing) dan `buildClaimFormData` (field `buktiFiles` + `MultipartFile.fromFile`). Ubah `claim_bloc.dart`: mode `cerita` POST JSON dari `buildClaimFields`; mode `unggah` POST `FormData` dengan `Options(headers: {'Content-Type': 'multipart/form-data'})`.

- [ ] **Step 4: Run test to verify it passes**

Run: `flutter test test/claim_payload_test.dart`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add apps/mobile_flutter/lib/logic/claim/claim_event.dart apps/mobile_flutter/lib/logic/claim/claim_payload.dart apps/mobile_flutter/lib/logic/claim/claim_bloc.dart apps/mobile_flutter/test/claim_payload_test.dart
git commit -m "feat(mobile): add claim proof payload fields"
```

### Task 2: UI metode pembuktian

**Files:**
- Modify: `apps/mobile_flutter/pubspec.yaml` + `apps/mobile_flutter/pubspec.lock`
- Modify: `apps/mobile_flutter/lib/presentation/screens/claim_account_form_screen.dart:19-31,63-108,158-251`
- Create: `apps/mobile_flutter/test/claim_account_form_test.dart`

**Interfaces:**
- Consumes: `ClaimCreateRequested` dari Task 1.
- Produces: state form `_modeBukti`, `_ceritaController`, `_buktiPaths`, dan event yang dikirim dari `_submit()`.

- [ ] **Step 1: Write the failing test**

Buat `test/claim_account_form_test.dart` dengan `MockClaimBloc` pola `test/home_kta_apply_test.dart:19-94`. Assert:
- radio `Unggah bukti` dan `Ceritakan histori` tampil;
- `Unggah bukti` terpilih secara default;
- setelah pilih `Ceritakan histori` dan isi cerita valid, submit meng-add `ClaimCreateRequested` dengan `modeBukti == 'cerita'` dan cerita tersebut;
- submit mode `unggah` tanpa berkas menampilkan `Mode unggah memerlukan minimal satu berkas bukti` dan tidak meng-add event.

- [ ] **Step 2: Run test to verify it fails**

Run: `flutter test test/claim_account_form_test.dart`
Expected: FAIL karena radio dan field belum ada.

- [ ] **Step 3: Implement the minimal code**

Jalankan `flutter pub add file_picker`. Tambah radio, helper text persis web, `FilePicker.platform.pickFiles(type: FileType.custom, allowedExtensions: ['jpg','jpeg','png','webp','pdf'], allowMultiple: true)`, pembatasan 3 path, textarea cerita, validasi lokal, dan event fields di `_submit()`.

- [ ] **Step 4: Run test to verify it passes**

Run: `flutter test test/claim_account_form_test.dart`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add apps/mobile_flutter/pubspec.yaml apps/mobile_flutter/pubspec.lock apps/mobile_flutter/lib/presentation/screens/claim_account_form_screen.dart apps/mobile_flutter/test/claim_account_form_test.dart
git commit -m "feat(mobile): add claim proof method selector"
```

### Task 3: Verifikasi penuh

- [ ] Run `flutter pub get` dari `apps/mobile_flutter`.
- [ ] Run `flutter analyze lib/logic/claim lib/presentation/screens/claim_account_form_screen.dart` → `No issues found!`.
- [ ] Run `flutter test test/claim_payload_test.dart test/claim_account_form_test.dart` → PASS.
- [ ] Run `flutter test` → seluruh suite PASS.
- [ ] Run `dart format --output=none --set-exit-if-changed lib/logic/claim lib/presentation/screens/claim_account_form_screen.dart test/claim_payload_test.dart test/claim_account_form_test.dart` → tanpa perubahan.
- [ ] Run `git diff --check` → clean.
- [ ] Push `master` setelah semua verifikasi hijau.

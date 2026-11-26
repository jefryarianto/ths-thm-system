# KTA Proof Mobile Implementation Plan

## Context

KTA anggota saat ini menampilkan tombol Generate yang gagal karena gate API, dan status `PAYMENT_SETUP` tidak menampilkan instruksi transfer atau upload bukti. Rencana ini menambahkan upload bukti KTA, status `PAYMENT_PENDING`, gating Generate, dan regenerasi kontrak API. Tidak ada payment link, migrasi Prisma, atau perubahan workstream lain.

## Global Constraints

- Tidak ada commit/push sebelum hasil verifikasi disetujui.
- Jangan jalankan repo-wide `flutter analyze` atau `dart format`; gunakan targeted checks pada file yang berubah.
- Setiap perubahan perilaku dimulai dari test yang gagal.
- API dan mobile tetap mempertahankan validasi di trust boundary.

## Task 1: API upload bukti KTA

### Interfaces

- Produces: `POST /kta-applications/me/upload-proof`, service `KtaApplicationService.uploadProof`, helper `buildKtaProofUploadOptions`, preserved proof path in `verifyPayment`.
- Consumes: existing `KtaApplication` fields, `JwtAuthGuard`, `Roles`, transform interceptor, upload util patterns.

### Steps

1. RED: buat `apps/api/src/modules/members/kta-application.upload-proof.spec.ts` dengan test:
   - `uploadProof` menolak status selain `PAYMENT_SETUP`/`PAYMENT_PENDING`.
   - `uploadProof` sukses men-set `status=PAYMENT_PENDING`, `statusPembayaran=MENUNGGU_VERIFIKASI`, `buktiBayarPath`.
   - `verifyPayment` tanpa `buktiPath` mempertahankan `buktiBayarPath` lama.
2. Run `pnpm --filter @ths-thm/api test -- kta-application.upload-proof` and confirm RED.
3. GREEN: implement helper upload KTA, controller route, service method, dan fallback `verifyPayment`.
4. Run `pnpm --filter @ths-thm/api test -- kta-application.upload-proof` and confirm GREEN.

### Expected

- RED: test gagal karena method/route belum ada.
- GREEN: semua test upload proof lulus.

## Task 2: Regenerate API contracts

### Interfaces

- Consumes: perubahan controller Task 1.
- Produces: `apps/api/swagger.json`, `packages/api-client/src/index.ts`, `apps/web/src/types/api.d.ts`.

### Steps

1. Run `pnpm --filter @ths-thm/api run swagger:export`.
2. Run `pnpm generate:contracts`.
3. Run `pnpm --filter @ths-thm/api run generate:client`.
4. Verify generated files contain `/kta-applications/me/upload-proof`.

### Expected

- Semua generator selesai tanpa error.
- Path upload muncul di tiga file generated.

## Task 3: Mobile status pembayaran dan upload bukti

### Interfaces

- Consumes: model `KtaApplication` yang sudah punya field pembayaran, endpoint Task 1, pola multipart `claim`/`dues`, `showCenteredSnackBar`.
- Produces: event/state baru di KTA bloc, UI kartu pembayaran, validasi FilePicker.

### Steps

1. RED: update `test/helpers/kta_apply_fixtures.dart`, `test/kta_status_banner_test.dart`, dan tambah test bloc upload KTA untuk:
   - `PAYMENT_SETUP` menampilkan biaya/rekening/catatan dan tombol upload.
   - `PAYMENT_PENDING` menampilkan status menunggu dan tombol unggah ulang.
   - handler upload mengirim field `bukti` dan me-reload aplikasi.
2. Run `flutter test test/kta_status_banner_test.dart test/kta_application_upload_test.dart` and confirm RED.
3. GREEN: implement UI dan bloc upload.
4. Run targeted test and confirm GREEN.

### Expected

- RED: widget tidak menampilkan CTA/field pembayaran, event upload belum ada.
- GREEN: test widget dan bloc lulus.

## Task 4: Gating dan error Generate KTA

### Interfaces

- Consumes: `KtaApplicationBloc` state dari Task 3, `MemberBloc` generate handler, `kta_screen.dart`.
- Produces: gating tombol Generate, error snackbar dari API.

### Steps

1. RED: tambah test yang membuktikan:
   - Generate hanya muncul untuk status issuable.
   - Kegagalan generate menghasilkan `MemberError` dengan pesan API.
2. Run targeted member/KTA tests and confirm RED.
3. GREEN: implement gating di `kta_screen.dart` dan error handling di `member_bloc.dart`.
4. Run targeted tests and confirm GREEN.

### Expected

- RED: tombol masih muncul untuk status non-issuable dan error masih ditelan.
- GREEN: gating dan pesan error terverifikasi.

## Task 5: Final verification and review

### Steps

1. Run API targeted suite: `pnpm --filter @ths-thm/api test -- kta-application`.
2. Run mobile affected tests: `flutter test test/kta_status_banner_test.dart test/kta_application_upload_test.dart test/kta_layout_test.dart test/member_kta_test.dart`.
3. Run targeted analyze/format/diff check.
4. Review whole diff against this plan and ledger.
5. Report results; wait for approval before commit/push.

### Expected

- Semua test dan check lulus.
- Review findings dicatat atau diperbaiki dengan TDD.
- Tidak ada commit/push tanpa approval.

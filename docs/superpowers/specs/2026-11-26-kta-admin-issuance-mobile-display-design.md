# KTA Admin Issuance & Mobile Display Design

**Date:** 2026-11-26

## Intent
Member tetap bisa mengajukan KTA dan mengupload bukti dari aplikasi mobile. Penerbitan kartu hanya dilakukan Web Admin. Mobile hanya menampilkan kartu yang benar-benar diterbitkan admin. Kartu hasil generate member dihapus secara fungsional: tidak ditampilkan, tidak terverifikasi, dan akan diganti saat admin generate ulang. Audit tetap disimpan.

## Goals
- Menghapus jalur generate KTA dari mobile.
- Menutup akses `anggota` ke `POST /members/:id/digital-card/generate`.
- Menampilkan kartu hanya jika `KtaApplication.status == CARD_GENERATED` dan `diterbitkanOleh != null`.
- Mencabut kartu/QR member lama sampai admin generate ulang.
- Memperbaiki error `biaya` Decimal yang dikirim API sebagai String.

## Non-Goals
- Tidak mengubah alur pengajuan, review, pembayaran, atau upload bukti KTA.
- Tidak mengubah template, penandatangan, stempel, atau pengaturan kartu Web Admin.
- Tidak hard-delete `Dokumen`, `QRValidation`, atau `QrScan`.

## Anti-Goals
- Mobile masih bisa generate kartu.
- QR lama tetap terverifikasi setelah kartu disembunyikan.
- Kartu admin yang sudah valid ikut tercabut.

## Constraints
- Role tidak dapat membedakan browser Web Admin dengan mobile admin; penegakan dilakukan lewat role admin.
- Hard delete tidak aman: middleware `apps/api/src/prisma/prisma-middleware.ts:94-144` mengubah `delete` menjadi `deletedAt`, tetapi `Dokumen`/`QRValidation` tidak memiliki field tersebut (`apps/api/prisma/schema.prisma:879-914`), dan cascade akan menghilangkan log `QrScan`.
- Pola yang ada adalah revoke: `apps/api/src/modules/documents/documents.service.ts:615-642`.
- `apps/api/prisma/migrate-existing-kta.ts:35-52` membuat aplikasi lama berstatus `CARD_GENERATED` dengan `diterbitkanOleh: null`; kartu tersebut ikut disembunyikan sampai admin generate ulang.
- Jangan menjalankan repo-wide `flutter analyze` atau `dart format`.

## Approaches
1. **UI saja.** Cepat, tetapi endpoint lama masih bisa dipakai mobile lama. Ditolak.
2. **Hapus endpoint member sepenuhnya.** Paling bersih, tetapi berisiko untuk peran bukan KTA dan kontrak lama. Ditolak untuk saat ini.
3. **UI + pembatasan role + revoke fungsional.** Dipilih. Aturan ditegakkan di server, mobile disederhanakan, dan data lama tidak hilang.

## Decisions
- `apps/api/src/modules/members/members.controller.ts:298-312`: cabut `anggota` dan `penguji` dari endpoint generate member; izinkan `superadmin` dan `admin_distrik`. Jalur utama tetap `POST /kta-applications/:id/generate-card`.
- Perbarui kontrak peran dan regenerate Swagger/client.
- Hapus `MemberCardGenerateRequested`, handler `_onMemberCardGenerateRequested`, tombol `_GenerateKtaCard`, dan test generate member di mobile.
- Tambahkan `adminIssued` pada `GET /members/:id/digital-card`, dihitung dari aplikasi KTA terakhir.
- Mobile menampilkan `KtaFlipCard` hanya jika `generated && adminIssued`, termasuk di `kta_screen.dart`, `home_screen.dart`, dan `kta_viewer_screen.dart`.
- Script cleanup idempoten mengikuti pola `apps/api/prisma/migrate-existing-kta.ts`: invalidasi QR digital aktif, revoke dokumen KTA yang tidak punya QR printed valid, kosongkan tanggal terbit/berlaku yang terkait, dan jangan hapus `QrScan`.
- Saat admin generate ulang, `ensureKtaDokumen()`/`issuePrintedCard()` membuat QR digital baru dan memperbarui `verificationUrl` sebelum membuat QR printed.
- `apps/mobile_flutter/lib/data/models/kta_application.dart:83`: parser `biaya` menerima `num` atau String; tambah test regresi.

## Verification
- API: `pnpm --filter @ths-thm/api test -- members-digital-card kta-application role-contract`.
- Mobile: targeted `flutter test` pada file terdampak.
- `dart analyze` hanya pada file yang diubah.
- `git diff --check`.

## Left to Builder
- Nama script cleanup dan nama test file mengikuti konvensi repo. Tidak ada keputusan produk besar yang tersisa.

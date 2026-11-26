# Desain Metode Pembuktian Klaim Anggota Mobile

## Intent
Hilangkan toast `Pilih mode pembuktian: unggah atau cerita` di Flutter `/claim-account` dengan menyediakan metode pembuktian yang benar-benar bisa dipilih dan dikirim ke API.

## Goals
- Pengguna mobile dapat memilih `Unggah bukti` atau `Ceritakan histori` pada klaim anggota.
- Payload mobile memenuhi validasi `claims.service.ts:126-150`.
- Tidak ada perubahan kontrak API atau web.

## Non-goals
- Tidak mengubah API, Prisma, Swagger, api-client, atau halaman klaim web.
- Tidak membebaskan klaim lama dengan `anggotaId` dari kewajiban bukti.
- Tidak mengganti pesan error API.

## Constraints
- Permukaan: Flutter `/claim-account`.
- Default mode: `unggah`.
- Upload: JPG, JPEG, PNG, WebP, PDF; maksimal 3 berkas; 5MB per berkas.
- Cerita: 20–1000 karakter.
- Field multipart harus `buktiFiles` sesuai `claims.controller.ts:43-46`.
- Gunakan pola `FormData` dari `dues_bloc.dart:147-161`.
- Dependency baru hanya `file_picker`, ditambahkan via `flutter pub add file_picker`.

## Approaches
1. **Samakan mobile dengan web (dipilih).** Menambah radio, picker, textarea, dan payload. Konsisten dengan API; biaya: dependency `file_picker` baru.
2. **Longgarkan validasi API.** Ditolak karena user memilih tetap wajib bukti; akan mengubah aturan dan test API.
3. **Perketat DTO saja.** Ditolak karena tidak memperbaiki mobile dan memaksa regen kontrak.

## Decisions
- Dua mode didukung penuh, bukan salah satu saja.
- `anggotaId` tanpa bukti tetap ditolak.
- String UI disamakan dengan web: `Cara Pembuktian Keanggotaan *`, `Unggah bukti`, `Ceritakan histori`, `Sertifikat, kartu anggota, KTP, atau surat keterangan`, `Tulis riwayat keanggotaan Anda (20–1000 karakter)`.
- Validasi lokal memakai pesan API persis agar perilaku tidak diverges.

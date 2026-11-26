# KTA Pekerjaan & Pelantikan Design

## Goal

Menjadikan `Pekerjaan` dan `Pelantikan` sebagai field isian pada klaim anggota, dapat diedit oleh admin dan anggota login yang sudah approved, serta tercermin pada KTA yang sudah digenerate.

## Decisions

- `Pelantikan` adalah satu teks bebas, bukan pasangan tanggal/tahun.
- Anggota mengubah field melalui `PATCH /auth/me`, mengikuti alur approval profil yang sudah ada.
- Admin mengubah field melalui `PATCH /members/:id`.
- Data awal dikumpulkan saat klaim dan disalin ke `Anggota` saat approval final klaim.
- Fallback Dadar tetap dipakai bila `pelantikan` kosong, untuk data lama.
- Setelah approval `member_update` final, KTA berstatus `CARD_GENERATED` otomatis di-regenerate.
- Generate KTA awal tetap manual oleh admin; auto-regenerate tidak mengubah `submittedSnapshot` dan tidak menaikkan `ktaBatch.totalGenerated`.

## Requirements

- Form klaim publik `/klaim` dan form admin `/claims/new` memiliki input `Pekerjaan` dan `Pelantikan`.
- `CreateClaimDto`, Swagger body, dan finalisasi klaim mendukung kedua field.
- `Anggota` memiliki `pekerjaan` dan `pelantikan`; `Klaim` memiliki keduanya.
- `UpdateMemberDto`, `CreateMemberDto`, dan `UpdateProfileDto` menerima kedua field.
- Halaman `/members/profile` memakai `PATCH /auth/me`, bukan `PATCH /members/:id`.
- Snapshot KTA, digital card API, preview admin, dan template PDF/PNG server menampilkan/menyimpan field baru.
- Event `approval:member_update:approved` memicu `KtaApplicationService.regenerateGeneratedKtaForMember`.
- Regenerator hanya memproses aplikasi KTA dengan status `CARD_GENERATED`.

## Non-goals

- Tidak mengubah status pembayaran KTA.
- Tidak membuat aplikasi KTA baru saat klaim disetujui.
- Tidak mengubah file KTA lama yang sudah diunduh secara retroaktif; regenerate menghasilkan artefak baru.
- Tidak mengubah alur approval klaim selain penyalinan field.

## Success Criteria

- Klaim baru dengan kedua field menghasilkan Anggota dengan nilai yang sama setelah approval.
- Admin dan anggota dapat mengubah kedua field dan perubahan anggota memicu approval.
- Setelah approval perubahan anggota, KTA `CARD_GENERATED` diperbarui otomatis.
- KTA lama tanpa data baru tetap menampilkan fallback Dadar dan tidak error.
- Semua perubahan API dan web lolos test serta typecheck.

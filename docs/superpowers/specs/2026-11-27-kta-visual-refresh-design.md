# KTA Visual Refresh Design Spec

## Goal
Perbarui tampilan KTA lintas web, API PDF/PNG, dan Flutter agar konsisten, lebih menarik, dan siap dipakai untuk kartu cetak maupun digital.

## Approved Decisions
- Scope: web KTA live/PNG/print popup, API PDF individual + batch + image, dan Flutter app utama. Prototipe `kta_mobile/` tidak diubah.
- QR: gaya QRmonkey penuh—eye frame/eye ball custom, modul membulat bila aman, logo tengah bercincin putih, palet navy; error correction tetap `H`.
- API menjadi source of truth QR image; fallback web memakai renderer bersama yang sama.
- Tanda tangan dan stempel berada dalam satu blok kanan-bawah di sisi belakang.
- Jabatan penandatangan memakai `signerTitle` dari API; fallback `KOORDINATOR DISTRIK`.
- Stempel memakai `stampImage` dari resolver distrik/global; bila kosong, area stempel disembunyikan.
- Font KTA: `Plus Jakarta Sans`, weights 400/600/700, konsisten di web, PDF/PNG, dan mobile.
- Tidak ada perubahan font lain atau perubahan ke `kta_mobile/`.

## Non-Goals
- Tidak menambah aset stempel default.
- Tidak mengubah kontrak endpoint secara publik selain menambah field yang sudah tersedia di response API ke adapter web.
- Tidak commit kecuali diminta.

## Verification Expectations
- QR hasil API harus bisa di-decode dengan `jsQR`.
- Web, PDF/PNG, dan mobile harus menunjukkan QR, jabatan, tanda tangan, dan stempel opsional secara konsisten.
- Golden Flutter sisi belakang harus menampilkan blok kiri-bawah.
- Semua test suite yang relevan harus hijau.

## Typography and Preview Alignment Addendum
- Font KTA tetap `Plus Jakarta Sans` di web, API PNG/PDF, dan Flutter.
- Font UI website kembali ke stack sebelum `96ade8bd`: sans = `Inter`, `Open Sans`, `Roboto`, `system-ui`, `sans-serif`; serif = `Georgia`, `Cambria`, `Times New Roman`, `Times`, `serif`.
- `@font-face` Plus Jakarta di `apps/web/app/globals.css` tetap ada hanya untuk KTA.
- Blok signer sisi belakang memakai anchor kiri-bawah: judul dan nama rata kiri, nama sejajar dengan `TANGGAL TERBIT...`, serta underline nama dimulai dari tepi kiri.
- `BACK.signer` menjadi satu-satunya sumber koordinat signer: `title.left=0`, `title.top=0`, `title.fontSize=18`, `name.left=0`, `name.bottom=35`, `name.fontSize=18`, `underline=true`.
- Tanda tangan dan stempel tetap relatif terhadap blok signer; stempel hanya dirender bila datanya ada.
- `previewKTA` tidak membangun HTML KTA sendiri; preview dan cetak memakai PNG endpoint `/api/members/{id}/digital-card/image` tanpa watermark.
- Tombol `Unduh & Cetak Kartu` harus menghasilkan kartu yang sama dengan renderer API.
- Prototipe `kta_mobile/` dan perilaku unduh PDF/`?watermark=1` tidak diubah.

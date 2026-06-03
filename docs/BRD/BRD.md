# Business Requirements Document (BRD) - THS-THM System Manajemen

## Tujuan Bisnis
- Menyediakan sistem manajemen terpusat untuk seluruh keuskupan THS-THM
- Meningkatkan akurasi data anggota dan dokumen resmi
- Mempermudah administrasi kegiatan, latihan, dan pendadaran
- Menyediakan role-based access sesuai struktur organisasi

## Stakeholder
- Superadmin
- Admin distrik, wilayah, ranting
- Admin kegiatan
- Penguji / Pelatih
- Anggota / Calon anggota

## KPI
- Semua anggota terdata lengkap
- Dokumen resmi tersedia dan tervalidasi dengan QR
- Semua kegiatan, latihan, pendadaran terdokumentasi
- Data anggota lama bisa diimpor dan dilengkapi
- Notifikasi FCM tersampaikan tepat waktu

## Alur Bisnis
1. Import data CSV anggota lama → status incomplete → notifikasi ke anggota
2. Anggota melengkapi data → status pending
3. Admin approve/reject data → status complete → nomor anggota diterbitkan
4. Kegiatan & latihan → absensi anggota → input hasil latihan
5. Pendadaran → penguji input nilai → admin validasi → sertifikat/piagam diterbitkan
6. Dokumen resmi & organisasi → role-based akses → unduh/preview
7. Iuran → input pembayaran → validasi admin
8. Surat masuk & keluar → simpan dokumen → akses sesuai role

## Modul & Kebutuhan Bisnis
- **Anggota / Calon Anggota:** CRUD, update, validasi admin
- **Klaim / Pendaftaran Baru:** pengelolaan anggota hilang data / anggota baru
- **Kegiatan / Latihan:** jadwal, materi, hasil, rekomendasi
- **Pendadaran / Ujian Praktek:** input nilai, validasi, sertifikat/piagam
- **Dokumen Resmi & Template:** kartu anggota, sertifikat, piagam, QR, stempel/cap
- **Dokumen Organisasi:** statuta, kurikulum, struktur organisasi, role-based akses
- **Iuran:** input pembayaran, status
- **Surat Masuk & Keluar:** simpan, akses sesuai role
- **Notifikasi FCM:** data anggota incomplete, validasi, kegiatan

## Prioritas Bisnis
- Must have:
  - CRUD anggota dan validasi
  - Import CSV & template dokumen
  - Generate dokumen PDF / kartu digital
  - Role-based access
  - Notifikasi FCM
- Should have:
  - Multi-keuskupan
  - Dashboard statistik
- Could have:
  - Gamifikasi, forum komunitas
- Won’t have:
  - AI automation (tidak diperlukan)
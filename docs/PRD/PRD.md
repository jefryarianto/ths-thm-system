# Product Requirements Document (PRD) - THS-THM System Manajemen

## Latar Belakang
Organisasi THS-THM memerlukan sistem manajemen terpusat untuk:
- Data anggota dan calon anggota
- Kegiatan, latihan, dan pendadaran
- Dokumen resmi, sertifikat, piagam, kartu anggota
- Surat masuk/keluar
- Iuran anggota
- Notifikasi dan workflow validasi

## Tujuan Produk
- Mengelola data anggota secara akurat
- Mempermudah administrasi kegiatan dan dokumen
- Menyediakan akses role-based untuk admin, penguji, anggota
- Memberikan notifikasi FCM untuk data tidak lengkap dan validasi
- Mendukung import CSV dan template dokumen `.jsx`

## Modul Utama
1. **Anggota & Calon Anggota**
   - CRUD, update request, validasi admin
2. **Klaim & Pendaftaran Baru**
   - Klaim anggota lama, pendaftaran anggota baru
3. **Kegiatan**
   - Absensi QR, jadwal, lokasi
4. **Latihan Rutin**
   - Absensi, materi, hasil latihan, rekomendasi
5. **Pendadaran & Ujian Praktek**
   - Input nilai, pengujian, sertifikat/piagam
6. **Dokumen Resmi & Template**
   - Sertifikat, piagam, kartu anggota, tanda tangan, cap/stempel, QR
7. **Dokumen Organisasi**
   - Statuta, kurikulum, struktur organisasi
8. **Surat Masuk & Keluar**
9. **Iuran**
10. **Notifikasi**
    - FCM untuk anggota dan admin
11. **Role & Akses**
    - Superadmin, admin distrik/wilayah/ranting, admin kegiatan, penguji, anggota

## Fitur Prioritas
- Must have:
  - CRUD anggota
  - Import CSV
  - Generate dokumen PDF/kartu
  - Validasi data anggota
  - Role-based access
  - Notifikasi FCM
- Should have:
  - Multi-keuskupan
  - Dashboard statistik
- Could have:
  - Gamifikasi, forum komunitas
- Won’t have:
  - AI automation (tidak perlu)

## Alur Data
1. Import CSV anggota lama
2. Anggota dengan data incomplete mendapat notifikasi
3. Anggota update data → status pending
4. Admin validasi → approved/rejected
5. Nomor anggota & dokumen diterbitkan

## Alur Pendadaran & Ujian
1. Admin buat kegiatan pendadaran
2. Penguji input nilai untuk calon anggota
3. Admin validasi nilai
4. Sertifikat/piagam diterbitkan, anggota mendapatkan nomor anggota

## Template Dokumen & CSV
- Template dokumen `.jsx` untuk kartu anggota, sertifikat, piagam
- Template CSV untuk import anggota, calon anggota, aspek & item penilaian

## Deployment
- Lokal: pnpm install, prisma migrate, run backend/web/mobile
- Production: Render Web Service / Static Site
- PostgreSQL production
- Environment variables: DATABASE_URL, JWT_SECRET, FCM_SERVICE_ACCOUNT_PATH
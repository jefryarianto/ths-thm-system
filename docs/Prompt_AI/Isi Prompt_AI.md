Prompt AI - THS-THM System Manajemen

Tugas AI:
1. Backend:
   - Node.js + NestJS + Prisma
   - Generate CRUD modul untuk anggota, calon anggota, klaim, pendaftaran baru, latihan, pendadaran, penguji
   - Endpoint validasi data anggota, approval admin
   - Endpoint untuk generate dokumen (sertifikat, piagam, kartu anggota)
   - Endpoint surat masuk/keluar, dokumen organisasi, iuran, notifikasi FCM
2. Frontend Web:
   - Next.js + Tailwind CSS
   - Dashboard admin, menu role-based
   - Form import CSV dan validasi data
   - Modul latihan, pendadaran, kegiatan
   - Preview dokumen & kartu anggota
3. Mobile App:
   - React Native
   - Kartu digital, sertifikat, piagam
   - QR code validation
   - Notifikasi FCM
4. Template Dokumen:
   - JSX templates untuk kartu anggota, sertifikat, piagam
   - Integrasi tanda tangan dan cap/stempel
   - QR validation untuk dokumen fisik
5. Template CSV:
   - Import anggota, calon anggota, aspek penilaian, item penilaian
   - Support data tidak lengkap → notifikasi ke anggota
6. Role / Akses:
   - Superadmin, admin distrik, wilayah, ranting, admin kegiatan, penguji, anggota
   - Role menentukan menu dan endpoint
7. Deployment:
   - Lokal: pnpm install, prisma migrate dev, run backend/web/mobile
   - Production: Render Web Service / Static Site, PostgreSQL, environment variables, FCM
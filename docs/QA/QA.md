# Quality Assurance Document (QA) - THS-THM System Manajemen

## 1. Test Plan
- Test login untuk semua role: superadmin, admin distrik/wilayah/ranting, admin kegiatan, penguji, anggota
- Test CRUD anggota dan calon anggota
- Test import CSV anggota, calon anggota, aspek, item penilaian
- Test update data anggota tidak lengkap → status_data / status_validasi
- Test approval admin untuk anggota yang melengkapi data
- Test kegiatan, latihan rutin, pendadaran, ujian praktek
- Test input nilai penguji dan validasi admin
- Test generate dokumen (sertifikat, piagam, kartu anggota)
- Test QR validasi dokumen fisik
- Test role-based menu & akses
- Test surat masuk / keluar & dokumen organisasi
- Test iuran anggota dan validasi
- Test notifikasi FCM

## 2. Test Cases
| Modul | Test Case | Expected Result |
|-------|-----------|----------------|
| Login | Login dengan setiap role | Login berhasil sesuai role, menu sesuai role muncul |
| Anggota | Create anggota | Anggota berhasil ditambahkan di database |
| CSV Import | Import CSV dengan data lengkap | Data masuk ke database, status_data=complete |
| CSV Import | Import CSV dengan data tidak lengkap | Data masuk ke database, status_data=incomplete, notifikasi dikirim ke anggota |
| Update Data | Anggota update data | status_data=complete, status_validasi=pending |
| Validasi | Admin approve data | status_validasi=approved, anggota aktif |
| Pendadaran | Input nilai oleh penguji | Nilai tersimpan, laporan tersedia untuk admin |
| Dokumen | Generate sertifikat / kartu / piagam | PDF/kartu digital berhasil dibuat dengan QR valid |
| Notifikasi | FCM push | Notifikasi diterima anggota/admin sesuai event |

## 3. Test Reports
- Log hasil test
- Bug report dengan severity
- Status Pass/Fail untuk setiap test case
- Dokumentasi screenshot / video jika perlu

## 4. Tools & Environment
- Backend: Node.js + NestJS + Prisma + PostgreSQL
- Frontend: Next.js + Tailwind
- Mobile: React Native
- Notifikasi: Firebase Cloud Messaging (FCM)
- Testing: Postman / Insomnia untuk API, Cypress / Jest untuk UI
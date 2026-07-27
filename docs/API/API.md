# API Documentation — THS-THM System Manajemen

> **Swagger UI**: Dokumentasi interaktif tersedia di `/api/docs` (development mode).
> **Base URL**: `http://localhost:3001/api` (dev) · `https://ths-thm.cloud/api` (production)

---

## Autentikasi

Semua endpoint (kecuali yang ditandai **Public**) memerlukan header:

```
Authorization: Bearer <access_token>
```

---

## Auth

| Method | Endpoint | Deskripsi | Akses |
|--------|----------|-----------|-------|
| POST | `/auth/login` | Login email & password | **Public** |
| POST | `/auth/register` | Registrasi user baru | **Public** |
| POST | `/auth/refresh` | Refresh access token | **Public** |
| POST | `/auth/forgot` | Kirim link reset password | **Public** |
| POST | `/auth/reset` | Reset password dengan token | **Public** |
| POST | `/auth/magic-link` | Kirim magic link login | **Public** |
| POST | `/auth/magic-link/verify` | Verifikasi magic link token | **Public** |
| GET | `/auth/google` | Redirect ke Google OAuth | **Public** |
| GET | `/auth/google/callback` | Google OAuth callback | **Public** |
| GET | `/auth/me` | Profil user yang login | Auth |
| PATCH | `/auth/me` | Update profil (nama, email) | Auth |
| PATCH | `/auth/change-password` | Ganti password | Auth |

---

## Users

| Method | Endpoint | Deskripsi | Akses |
|--------|----------|-----------|-------|
| GET | `/users` | Daftar user (filter by role, ranting) | Superadmin |
| GET | `/users/:id` | Detail user | Superadmin |
| POST | `/users` | Tambah user baru | Superadmin |
| PATCH | `/users/:id` | Update user (email, nama, role, password) | Superadmin |
| PATCH | `/users/:id/suspend` | Nonaktifkan/suspend user | Superadmin |
| PATCH | `/users/:id/activate` | Aktifkan user kembali | Superadmin |

---

## Members

| Method | Endpoint | Deskripsi | Akses |
|--------|----------|-----------|-------|
| GET | `/members` | Daftar anggota (filter, search, pagination) | Admin |
| GET | `/members/export` | Export CSV anggota | Admin |
| GET | `/members/incomplete` | Anggota dengan data belum lengkap | Admin |
| GET | `/members/stats` | Statistik anggota (dashboard) | Admin |
| GET | `/members/:id` | Detail anggota (dokumen, iuran, ranting) | Admin |
| POST | `/members` | Tambah anggota baru (NRA auto-generate) | Admin |
| POST | `/members/import` | Import CSV anggota (duplicate detection) | Admin |
| PATCH | `/members/:id` | Update data anggota | Admin |
| PATCH | `/members/:id/validate` | Validasi kelengkapan data | Admin |
| PATCH | `/members/:id/approve` | Setujui anggota pending | Admin |
| PATCH | `/members/:id/suspend` | Suspend keanggotaan | Admin |
| PATCH | `/members/:id/reactivate` | Aktifkan kembali anggota | Admin |
| DELETE | `/members/:id` | Hapus anggota (soft delete) | Admin |
| GET | `/members/:id/digital-card` | Data kartu digital anggota | Admin/Anggota |
| GET | `/members/:id/documents` | Dokumen milik anggota | Admin/Anggota |
| GET | `/members/:id/dues` | Iuran milik anggota | Admin/Anggota |
| GET | `/members/:id/trainings` | Riwayat latihan anggota | Admin/Anggota |
| GET | `/members/:id/activity` | Timeline aktivitas anggota | Admin |

---

## Candidates

| Method | Endpoint | Deskripsi | Akses |
|--------|----------|-----------|-------|
| GET | `/candidates` | Daftar calon anggota | Admin/Penguji |
| GET | `/candidates/:id` | Detail calon | Admin/Penguji |
| GET | `/candidates/export/csv` | Export CSV calon | Admin |
| POST | `/candidates` | Tambah calon anggota | Admin |
| POST | `/candidates/import` | Import CSV calon | Admin |
| POST | `/candidates/:id/validate` | Validasi data calon | Admin |
| POST | `/candidates/:id/approve` | Setujui calon → jadi anggota | Admin |
| POST | `/candidates/:id/reject` | Tolak calon | Admin |
| PATCH | `/candidates/:id` | Update calon | Admin |
| DELETE | `/candidates/:id` | Hapus calon | Admin |

---

## Registrations

| Method | Endpoint | Deskripsi | Akses |
|--------|----------|-----------|-------|
| GET | `/registrations` | Daftar pendaftaran | Admin |
| GET | `/registrations/:id` | Detail pendaftaran | Admin |
| POST | `/registrations` | Daftar anggota baru | **Public** |
| POST | `/registrations/bulk-import` | Import pendaftaran massal | Admin |
| POST | `/registrations/:id/approve` | Setujui pendaftaran | Admin |
| POST | `/registrations/:id/reject` | Tolak pendaftaran | Admin |
| POST | `/registrations/:id/verify` | Verifikasi data pendaftaran | Admin |
| PATCH | `/registrations/:id` | Update pendaftaran | Admin |
| DELETE | `/registrations/:id` | Hapus pendaftaran | Admin |

---

## Claims

| Method | Endpoint | Deskripsi | Akses |
|--------|----------|-----------|-------|
| GET | `/claims` | Daftar klaim | Admin |
| GET | `/claims/:id` | Detail klaim | Admin |
| POST | `/claims` | Ajukan klaim | **Public** |
| POST | `/claims/:id/approve` | Setujui klaim | Admin |
| POST | `/claims/:id/reject` | Tolak klaim | Admin |
| POST | `/claims/:id/process` | Proses klaim | Admin |
| PATCH | `/claims/:id` | Update klaim | Admin |
| DELETE | `/claims/:id` | Hapus klaim | Admin |

---

## Trainings

| Method | Endpoint | Deskripsi | Akses |
|--------|----------|-----------|-------|
| GET | `/trainings` | Daftar latihan (filter, pagination) | Admin/Penguji |
| GET | `/trainings/:id` | Detail latihan (absensi + evaluasi) | Admin/Penguji |
| POST | `/trainings` | Tambah latihan | Admin |
| PATCH | `/trainings/:id` | Update latihan | Admin |
| DELETE | `/trainings/:id` | Hapus latihan | Admin |
| GET | `/trainings/:id/attendances` | Absensi latihan | Admin/Penguji |
| POST | `/trainings/:id/attendances` | Catat absensi | Admin/Penguji |
| PATCH | `/trainings/:id/attendances/:memberId` | Update absensi individual | Admin/Penguji |
| POST | `/trainings/:id/attendances/import` | Import absensi CSV | Admin |
| GET | `/trainings/:id/evaluations` | Nilai evaluasi latihan | Admin/Penguji |
| POST | `/trainings/:id/evaluations` | Input nilai evaluasi | Admin/Penguji |
| DELETE | `/trainings/:id/evaluations/:evaluationId` | Hapus nilai evaluasi | Admin |

---

## Graduations

| Method | Endpoint | Deskripsi | Akses |
|--------|----------|-----------|-------|
| GET | `/graduations` | Daftar pendadaran | Admin/Penguji |
| GET | `/graduations/:id` | Detail pendadaran | Admin/Penguji |
| POST | `/graduations` | Tambah pendadaran baru | Admin |
| POST | `/graduations/:id/register` | Daftarkan peserta pendadaran | Admin |
| POST | `/graduations/:id/unregister` | Hapus peserta dari pendadaran | Admin |
| POST | `/graduations/:id/import` | Import peserta dari CSV | Admin |
| POST | `/graduations/:id/graduate` | Proses kelulusan (generate nilai) | Admin/Penguji |
| POST | `/graduations/:id/generate-documents` | Generate sertifikat batch | Admin |
| DELETE | `/graduations/:id` | Hapus pendadaran | Admin |
| GET | `/graduations/:id/participants` | Peserta pendadaran | Admin/Penguji |
| GET | `/graduations/:id/evaluations` | Nilai evaluasi pendadaran | Admin/Penguji |

## Ujian Praktek

| Method | Endpoint | Deskripsi | Akses |
|--------|----------|-----------|-------|
| GET | `/graduations/:kegiatanId/ujian-praktek` | Daftar ujian praktek dalam pendadaran | Admin/Penguji |
| GET | `/graduations/:kegiatanId/ujian-praktek/:id` | Detail ujian praktek | Admin/Penguji |
| POST | `/graduations/:kegiatanId/ujian-praktek` | Buat ujian praktek baru | Admin |
| PATCH | `/graduations/:kegiatanId/ujian-praktek/:id` | Perbarui ujian praktek | Admin |
| DELETE | `/graduations/:kegiatanId/ujian-praktek/:id` | Hapus ujian praktek | Admin |
| POST | `/graduations/:kegiatanId/ujian-praktek/:id/examiners` | Tugaskan penguji ke ujian praktek | Admin |
| DELETE | `/graduations/:kegiatanId/ujian-praktek/:id/examiners` | Hapus penguji dari ujian praktek | Admin |
| POST | `/graduations/:kegiatanId/ujian-praktek/:id/items` | Tambah item penilaian ke ujian praktek | Admin |
| DELETE | `/graduations/:kegiatanId/ujian-praktek/:id/items/:itemPenilaianId` | Hapus item penilaian dari ujian praktek | Admin |
| GET | `/graduations/:kegiatanId/ujian-praktek/:id/scores` | Ambil nilai ujian praktek | Admin/Penguji |
| POST | `/graduations/:kegiatanId/ujian-praktek/:id/score` | Input nilai ujian praktek (bulk per penguji) | Admin/Penguji |
| GET | `/graduations/:kegiatanId/ujian-praktek/available-items` | Ambil item penilaian yang tersedia | Admin |
| GET | `/graduations/:kegiatanId/ujian-praktek/available-examiners` | Ambil penguji yang tersedia | Admin |

---

## Activities

| Method | Endpoint | Deskripsi | Akses |
|--------|----------|-----------|-------|
| GET | `/activities` | Daftar kegiatan (filter, search) | Admin |
| GET | `/activities/:id` | Detail kegiatan | Admin |
| POST | `/activities` | Tambah kegiatan baru | Admin |
| PATCH | `/activities/:id` | Update kegiatan | Admin |
| DELETE | `/activities/:id` | Hapus kegiatan | Admin |
| GET | `/activities/:id/participants` | Peserta kegiatan | Admin |
| POST | `/activities/:id/participants` | Tambah peserta | Admin |
| POST | `/activities/:id/participants/import` | Import peserta CSV | Admin |
| DELETE | `/activities/:id/participants/:pid` | Hapus peserta | Admin |
| GET | `/activities/:id/presence` | Presensi kegiatan | Admin |
| POST | `/activities/:id/presence` | Catat presensi | Admin |
| GET | `/activities/:id/documents` | Dokumen kegiatan | Admin |
| POST | `/activities/:id/documents` | Upload dokumen kegiatan | Admin |

---

## Examiners

| Method | Endpoint | Deskripsi | Akses |
|--------|----------|-----------|-------|
| GET | `/examiners` | Daftar penguji | Admin |
| GET | `/examiners/:id` | Detail penguji | Admin |
| POST | `/examiners` | Daftarkan penguji | Admin |
| POST | `/examiners/import` | Import CSV penguji | Admin |
| POST | `/examiners/:id/assign` | Tugaskan penguji ke kegiatan | Admin |
| PATCH | `/examiners/:id` | Update data penguji | Admin |
| DELETE | `/examiners/:id` | Hapus penguji | Admin |
| GET | `/examiners/:id/assignments` | Penugasan penguji | Admin |
| GET | `/examiners/:id/schedules` | Jadwal penguji | Admin |

---

## Assessments

| Method | Endpoint | Deskripsi | Akses |
|--------|----------|-----------|-------|
| GET | `/assessments/aspects` | Daftar aspek penilaian | Admin/Penguji |
| GET | `/assessments/aspects/:id` | Detail aspek + item | Admin/Penguji |
| POST | `/assessments/aspects` | Tambah aspek penilaian | Admin |
| PATCH | `/assessments/aspects/:id` | Update aspek | Admin |
| DELETE | `/assessments/aspects/:id` | Hapus aspek | Admin |
| GET | `/assessments/items` | Daftar item penilaian | Admin/Penguji |
| POST | `/assessments/items` | Tambah item penilaian | Admin |
| PATCH | `/assessments/items/:id` | Update item | Admin |
| DELETE | `/assessments/items/:id` | Hapus item | Admin |
| GET | `/assessments/scores` | Daftar nilai | Admin/Penguji |
| POST | `/assessments/scores` | Input nilai | Penguji |
| PATCH | `/assessments/scores/:id` | Update nilai | Penguji |
| POST | `/assessments/import-from-list` | Import aspek dari list | Admin |
| POST | `/assessments/upload-csv` | Upload CSV item penilaian | Admin |
| POST | `/assessments/import` | Import nilai massal | Admin |

---

## Documents

| Method | Endpoint | Deskripsi | Akses |
|--------|----------|-----------|-------|
| GET | `/documents` | Daftar dokumen | Admin/Anggota |
| GET | `/documents/:id` | Detail dokumen + QR validation | Admin/Anggota |
| POST | `/documents/generate` | Generate dokumen (kartu/sertifikat/piagam) | Admin |
| DELETE | `/documents/:id` | Hapus dokumen | Admin |
| GET | `/documents/verify/:token` | Verifikasi QR code dokumen | **Public** |
| GET | `/documents/:id/verify-qr` | Verifikasi QR spesifik | Admin/Anggota |
| GET | `/documents/batch/estimate` | Estimasi batch generation | Admin |
| GET | `/documents/batch/list` | Riwayat batch jobs | Admin |
| POST | `/documents/batch` | Batch generate dokumen (via queue) | Admin |
| GET | `/documents/batch/:batchId` | Detail batch job | Admin |
| GET | `/documents/batch/:batchId/export` | Export hasil batch (CSV) | Admin |
| POST | `/documents/batch/:batchId/retry` | Retry job gagal di batch | Admin |
| PUT | `/documents/batch/:batchId/cancel` | Batalkan batch | Admin |
| GET | `/documents/types/list` | Daftar tipe dokumen | Admin |
| POST | `/documents/certificate` | Generate sertifikat | Admin |
| POST | `/documents/certificate/pdf` | Download PDF sertifikat | Admin |
| POST | `/documents/certificate/image` | Download image sertifikat | Admin |
| POST | `/documents/award` | Generate piagam prestasi | Admin |

---

## Org-Documents

| Method | Endpoint | Deskripsi | Akses |
|--------|----------|-----------|-------|
| GET | `/org-documents` | Daftar dokumen organisasi | Admin/Anggota |
| GET | `/org-documents/:id` | Detail dokumen | Admin/Anggota |
| POST | `/org-documents` | Upload dokumen organisasi | Admin |
| PATCH | `/org-documents/:id` | Update dokumen | Admin |
| DELETE | `/org-documents/:id` | Hapus dokumen | Admin |
| GET | `/org-documents/categories` | Daftar kategori dokumen | Admin/Anggota |
| POST | `/org-documents/categories` | Tambah kategori | Admin |
| PATCH | `/org-documents/categories/:id` | Update kategori | Admin |
| DELETE | `/org-documents/categories/:id` | Hapus kategori | Admin |

---

## Letters

| Method | Endpoint | Deskripsi | Akses |
|--------|----------|-----------|-------|
| GET | `/letters` | Daftar surat gabungan (masuk + keluar) | Admin |
| GET | `/letters/incoming` | Daftar surat masuk | Admin |
| GET | `/letters/incoming/:id` | Detail surat masuk + disposisi | Admin |
| POST | `/letters/incoming` | Tambah surat masuk | Admin |
| PATCH | `/letters/incoming/:id` | Update surat masuk | Admin |
| DELETE | `/letters/incoming/:id` | Hapus surat masuk | Admin |
| POST | `/letters/incoming/:id/disposition` | Tambah disposisi | Admin |
| GET | `/letters/incoming/export/csv` | Export CSV surat masuk | Admin |
| GET | `/letters/outgoing` | Daftar surat keluar | Admin |
| GET | `/letters/outgoing/:id` | Detail surat keluar | Admin |
| POST | `/letters/outgoing` | Tambah surat keluar | Admin |
| PATCH | `/letters/outgoing/:id` | Update surat keluar | Admin |
| DELETE | `/letters/outgoing/:id` | Hapus surat keluar | Admin |
| POST | `/letters/outgoing/:id/send` | Kirim surat keluar | Admin |
| GET | `/letters/outgoing/export/csv` | Export CSV surat keluar | Admin |

---

## Dues

| Method | Endpoint | Deskripsi | Akses |
|--------|----------|-----------|-------|
| GET | `/dues` | Daftar iuran (filter, pagination) | Admin/Anggota |
| GET | `/dues/:id` | Detail iuran | Admin/Anggota |
| POST | `/dues` | Tambah iuran | Admin |
| PATCH | `/dues/:id` | Update iuran | Admin |
| PATCH | `/dues/batch` | Batch update pembayaran massal | Admin |
| DELETE | `/dues/:id` | Hapus iuran | Admin |
| GET | `/dues/members/:memberId` | Iuran per anggota | Admin/Anggota |
| GET | `/dues/arrears` | Daftar tunggakan | Admin |
| GET | `/dues/report` | Laporan iuran (by status) | Admin |
| GET | `/dues/report/export` | Export laporan iuran | Admin |
| GET | `/dues/dashboard/stats` | Statistik dashboard iuran | Admin |
| POST | `/dues/import` | Import CSV iuran | Admin |
| POST | `/dues/:id/payments` | Konfirmasi pembayaran manual (upload bukti) | Admin/Anggota |

---

## Payments

| Method | Endpoint | Deskripsi | Akses |
|--------|----------|-----------|-------|
| GET | `/payments/bank-info` | Info rekening bank & QRIS | Admin/Anggota |
| POST | `/payments/bank-info` | Tambah info bank | Admin |
| PATCH | `/payments/bank-info/:id` | Update info bank | Admin |
| DELETE | `/payments/bank-info/:id` | Hapus info bank | Admin |
| POST | `/payments/:id/upload-proof` | Upload/konfirmasi bukti bayar | Admin/Anggota |
| PATCH | `/payments/:id/verify` | Verifikasi pembayaran → lunas | Admin |
| PATCH | `/payments/:id/reject` | Tolak pembayaran | Admin |

---

## Notifications

| Method | Endpoint | Deskripsi | Akses |
|--------|----------|-----------|-------|
| GET | `/notifications` | Daftar notifikasi user (filter, pagination) | Auth |
| GET | `/notifications/:id` | Detail notifikasi | Auth |
| PATCH | `/notifications/:id/read` | Tandai sudah dibaca | Auth |
| PATCH | `/notifications/read-all` | Tandai semua sudah dibaca | Auth |
| DELETE | `/notifications/:id` | Hapus notifikasi | Auth |
| POST | `/notifications/send` | Kirim notifikasi ke user | Admin |
| POST | `/notifications/broadcast` | Siarkan notifikasi ke semua user | Superadmin |
| POST | `/notifications/role` | Kirim ke role tertentu | Superadmin |
| POST | `/notifications/send-incomplete` | Kirim notif ke anggota data kurang | Admin |
| GET | `/notifications/count` | Jumlah notifikasi belum dibaca | Auth |
| GET | `/notifications/stats` | Statistik notifikasi (per tipe) | Auth |
| GET | `/notifications/ws-stats` | Statistik koneksi WebSocket real-time | Admin |
| GET | `/notifications/preferences` | Preferensi notifikasi user | Auth |
| PATCH | `/notifications/preferences` | Update preferensi (inApp/email per tipe) | Auth |
| POST | `/notifications/fcm-token` | Daftarkan device token FCM | Auth |
| DELETE | `/notifications/fcm-token/:id` | Hapus device token | Auth |

---

## Reports

| Method | Endpoint | Deskripsi | Akses |
|--------|----------|-----------|-------|
| GET | `/reports/dashboard` | Statistik dashboard utama | Admin |
| GET | `/reports/scan-stats` | Statistik scan QR dokumen | Admin |
| GET | `/reports/chart/members-over-time` | Grafik pertumbuhan anggota | Admin |
| GET | `/reports/chart/training-attendance` | Grafik absensi latihan | Admin |

---

## Gamification

### GamificationController

| Method | Endpoint | Deskripsi | Akses |
|--------|----------|-----------|-------|
| GET | `/gamification/me` | Poin & badge user sendiri | Auth |
| GET | `/gamification/:anggotaId` | Profil gamifikasi anggota | Admin |
| GET | `/gamification/leaderboard` | Peringkat anggota | Auth |
| GET | `/gamification/badges` | Semua badge yang tersedia | Auth |
| GET | `/gamification/manage` | Daftar manajemen poin | Admin |
| POST | `/gamification/manage` | Tambah/kurangi poin manual | Admin |
| GET | `/gamification/admin` | Dashboard admin gamifikasi | Admin |
| GET | `/gamification/config` | Konfigurasi gamifikasi | Superadmin |
| PUT | `/gamification/config` | Update konfigurasi | Superadmin |
| POST | `/gamification/weekly-summary` | Generate ringkasan mingguan | Admin |
| POST | `/gamification/training` | Catat event training | Cron/Auto |
| POST | `/gamification/dues` | Catat event pembayaran iuran | Cron/Auto |
| GET | `/gamification/report` | Laporan gamifikasi | Admin |
| GET | `/gamification/report/scoreboard` | Papan skor lengkap | Admin |
| GET | `/gamification/report/export` | Export laporan gamifikasi | Admin |

### RewardsController

| Method | Endpoint | Deskripsi | Akses |
|--------|----------|-----------|-------|
| GET | `/gamification/rewards` | Daftar reward | Admin |
| POST | `/gamification/rewards` | Tambah reward | Admin |
| PATCH | `/gamification/rewards/:id` | Update reward | Admin |
| DELETE | `/gamification/rewards/:id` | Hapus reward | Admin |
| GET | `/gamification/rewards/redemptions` | Daftar penukaran reward | Admin |
| POST | `/gamification/rewards/:id/redeem` | Tukarkan poin dengan reward | Auth |
| PATCH | `/gamification/rewards/redemptions/:id/status` | Update status penukaran | Admin |

---

## Forum

| Method | Endpoint | Deskripsi | Akses |
|--------|----------|-----------|-------|
| GET | `/forum/categories` | Daftar kategori forum | Auth |
| GET | `/forum/categories/:id` | Detail kategori forum | Auth |
| POST | `/forum/categories` | Buat kategori forum | Admin |
| PATCH | `/forum/categories/:id` | Perbarui kategori forum | Admin |
| DELETE | `/forum/categories/:id` | Hapus kategori forum | Admin |
| GET | `/forum/categories/:categoryId/threads` | Thread dalam kategori (search, filter) | Auth |
| GET | `/forum/threads/:id` | Detail thread + posts (public) | **Public** |
| POST | `/forum/threads` | Buat thread baru | Auth |
| PATCH | `/forum/threads/:id` | Perbarui thread | Auth |
| PATCH | `/forum/threads/:id/pin` | Pin/unpin thread (admin) | Admin |
| PATCH | `/forum/threads/:id/lock` | Lock/unlock thread (admin) | Admin |
| DELETE | `/forum/threads/:id` | Hapus thread | Auth |
| POST | `/forum/threads/:id/posts` | Balas thread (kirim notifikasi ke author) | Auth |
| PATCH | `/posts/:id` | Perbarui balasan (milik sendiri) | Auth |
| PATCH | `/posts/:id/solution` | Tandai balasan sebagai solusi | Auth |
| DELETE | `/posts/:id` | Hapus post | Auth |

---

## Chat


| Method | Endpoint | Deskripsi | Akses |
|--------|----------|-----------|-------|
| GET | `/chat/rooms` | Daftar ruang chat user | Auth |
| POST | `/chat/rooms/:roomId/messages` | Kirim pesan | Auth |
| GET | `/chat/rooms/:roomId/messages` | Ambil pesan (limit, before cursor) | Auth |
| DELETE | `/chat/messages/:id` | Hapus pesan sendiri | Auth |
| POST | `/chat/rooms/:roomId/read` | Tandai pesan terbaca | Auth |

---

## Calendar

| Method | Endpoint | Deskripsi | Akses |
|--------|----------|-----------|-------|
| GET | `/calendar` | Semua event (latihan, kegiatan, pendadaran) | Admin |
| GET | `/calendar/upcoming` | Event 30 hari ke depan | Admin |

---

## Approvals

| Method | Endpoint | Deskripsi | Akses |
|--------|----------|-----------|-------|
| GET | `/approvals/pending` | Daftar item pending approval | Admin |
| POST | `/approvals/submit` | Submit item untuk approval | Admin |
| POST | `/approvals/:id/approve` | Setujui item | Admin |
| POST | `/approvals/:id/reject` | Tolak item | Admin |

---

## Org-Structure

| Method | Endpoint | Deskripsi | Akses |
|--------|----------|-----------|-------|
| GET | `/org-structure/distrik` | Daftar semua distrik | Admin |
| GET | `/org-structure/distrik/:id` | Detail distrik + wilayah | Admin |
| POST | `/org-structure/distrik` | Tambah distrik | Superadmin |
| PATCH | `/org-structure/distrik/:id` | Update distrik | Superadmin |
| DELETE | `/org-structure/distrik/:id` | Hapus distrik | Superadmin |
| GET | `/org-structure/wilayah` | Daftar wilayah | Admin |
| POST | `/org-structure/wilayah` | Tambah wilayah | Superadmin |
| PATCH | `/org-structure/wilayah/:id` | Update wilayah | Superadmin |
| DELETE | `/org-structure/wilayah/:id` | Hapus wilayah | Superadmin |
| GET | `/org-structure/ranting` | Daftar ranting | Admin |
| POST | `/org-structure/ranting` | Tambah ranting | Superadmin |
| PATCH | `/org-structure/ranting/:id` | Update ranting | Superadmin |
| DELETE | `/org-structure/ranting/:id` | Hapus ranting | Superadmin |
| GET | `/org-structure/tree` | Pohon organisasi lengkap | Admin |

---

## Org-Chart

| Method | Endpoint | Deskripsi | Akses |
|--------|----------|-----------|-------|
| GET | `/org-chart` | Peta organisasi lengkap | Admin |

---

## Upload

| Method | Endpoint | Deskripsi | Akses |
|--------|----------|-----------|-------|
| POST | `/upload/member-photo/:memberId` | Upload foto anggota (multipart/form-data) | Admin |

---

## Settings

| Method | Endpoint | Deskripsi | Akses |
|--------|----------|-----------|-------|
| GET | `/settings` | Semua pengaturan | Admin |
| GET | `/settings/:key` | Satu pengaturan by key | Admin |
| POST | `/settings/:key` | Buat/update pengaturan | Superadmin |
| PATCH | `/settings/:key` | Update pengaturan (partial) | Superadmin |
| DELETE | `/settings/:key` | Hapus pengaturan | Superadmin |
| GET | `/settings/periods` | Daftar periode sistem | Admin |
| POST | `/settings/periods` | Tambah periode | Superadmin |
| PATCH | `/settings/periods/:id` | Update periode | Superadmin |
| DELETE | `/settings/periods/:id` | Hapus periode | Superadmin |
| GET | `/settings/signatures` | Tanda tangan digital | Superadmin |
| POST | `/settings/signatures` | Upload tanda tangan | Superadmin |
| DELETE | `/settings/signatures/:id` | Hapus tanda tangan | Superadmin |
| GET | `/settings/stamps` | Stempel digital | Superadmin |
| POST | `/settings/stamps` | Upload stempel | Superadmin |
| DELETE | `/settings/stamps/:id` | Hapus stempel | Superadmin |
| GET | `/settings/branding/colors` | Warna branding organisasi | Admin |
| POST | `/settings/branding/colors` | Update warna branding | Superadmin |
| GET | `/settings/export/audit` | Export log audit (CSV) | Superadmin |

---

## Targets

| Method | Endpoint | Deskripsi | Akses |
|--------|----------|-----------|-------|
| GET | `/targets` | Target organisasi | Admin |

---

## Mail (Email Management)

| Method | Endpoint | Deskripsi | Akses |
|--------|----------|-----------|-------|
| GET | `/mail/status` | Status konfigurasi email (provider, rate limit) | Superadmin |
| POST | `/mail/test` | Kirim email test | Superadmin |
| GET | `/mail/logs` | Log pengiriman email (filter, pagination) | Superadmin |
| GET | `/mail/logs/stats` | Statistik pengiriman email | Superadmin |
| GET | `/mail/logs/export` | Export CSV log email | Superadmin |
| GET | `/mail/logs/engagement` | Event engagement (delivered, opened, clicked) | Superadmin |
| POST | `/mail/retry` | Retry kirim email yang gagal | Superadmin |
| POST | `/mail/webhook` | Webhook dari email provider (Resend/SMTP) | **Public** |
| GET | `/mail/templates` | Daftar template email | Superadmin |
| GET | `/mail/templates/:name` | Detail template email | Superadmin |
| PUT | `/mail/templates/:name` | Buat/update custom template | Superadmin |
| DELETE | `/mail/templates/:name` | Hapus custom template | Superadmin |
| POST | `/mail/templates/test-send` | Kirim test template | Superadmin |
| GET | `/mail/suppressions` | Daftar email yang disuppress (bounce/complaint) | Superadmin |
| POST | `/mail/suppressions` | Tambah manual suppression | Superadmin |
| DELETE | `/mail/suppressions/:id` | Hapus suppression | Superadmin |
| POST | `/mail/suppressions/clear` | Hapus semua suppression | Superadmin |
| GET | `/mail/modules` | Modul yang menggunakan email | Superadmin |

---

## Health

| Method | Endpoint | Deskripsi | Akses |
|--------|----------|-----------|-------|
| GET | `/health` | Status sistem (uptime, DB, memory, cache) | **Public** |
| GET | `/health/admin/queue-uptime` | Riwayat uptime antrean (24h) | Admin |
| GET | `/health/admin/queue-uptime/events` | Persistent outage events antrean | Admin |

---

## API Key Management

| Method | Endpoint | Deskripsi | Akses |
|--------|----------|-----------|-------|
| GET | `/api-keys` | Daftar API key | Superadmin |
| POST | `/api-keys` | Generate API key baru | Superadmin |
| POST | `/api-keys/:id/revoke` | Revoke API key | Superadmin |

---

## Audit Logs

| Method | Endpoint | Deskripsi | Akses |
|--------|----------|-----------|-------|
| GET | `/audit-logs` | Daftar audit log (filter, pagination) | Superadmin |
| GET | `/audit-logs/stats` | Statistik audit log | Superadmin |
| GET | `/audit-logs/export` | Export CSV audit log | Superadmin |

---

## Cache Management

| Method | Endpoint | Deskripsi | Akses |
|--------|----------|-----------|-------|
| GET | `/cache/stats` | Statistik in-memory cache | Superadmin |
| POST | `/cache/invalidate` | Invalidasi cache (by prefix) | Superadmin |

---

## Queue Dashboard

| Method | Endpoint | Deskripsi | Akses |
|--------|----------|-----------|-------|
| GET | `/admin/queue-stats` | Statistik antrean (BullMQ + In-process) | Admin |

---

## Format Response

Semua endpoint mengembalikan format JSON standar:

```json
{
  "success": true,
  "data": { ... },
  "message": "Deskripsi opsional"
}
```

List dengan pagination:

```json
{
  "success": true,
  "data": [...],
  "meta": {
    "total": 100,
    "page": 1,
    "limit": 15,
    "totalPages": 7
  }
}
```

Error:

```json
{
  "success": false,
  "message": "Deskripsi error",
  "statusCode": 400
}
```

---

## WebSocket Events

Koneksi real-time via Socket.IO (`/socket.io/`, EIO=4):

| Event | Arah | Deskripsi |
|-------|------|-----------|
| `notification:new` | Server → Client | Notifikasi baru tiba |
| `notification:count` | Server → Client | Update jumlah unread |
| `batch:progress` | Server → Client | Progress batch dokumen |
| `batch:complete` | Server → Client | Batch selesai |
| `queue:updated` | Server → Client | Antrean berubah |
| `queue:health-changed` | Server → Client | Status koneksi Redis/antrean |

---

## Hierarchical Scope System

Data difilter otomatis berdasarkan hierarki organisasi user:

| Scope | Role | Cakupan Data |
|-------|------|--------------|
| `national` | superadmin | Semua data tanpa filter |
| `district` | admin_distrik | Data dalam 1 distrik |
| `region` | admin_wilayah | Data dalam 1 wilayah |
| `branch` | admin_ranting, admin_kegiatan, penguji | Data dalam 1 ranting |
| `self` | anggota | Data pribadi sendiri |

---

## Role Permissions

| Role | Keterangan |
|------|------------|
| `superadmin` | Full access ke semua data dan pengaturan |
| `admin_distrik` | Kelola data dalam distrik (1+ wilayah) |
| `admin_wilayah` | Kelola data dalam wilayah (1+ ranting) |
| `admin_ranting` | Kelola data dalam 1 ranting |
| `admin_kegiatan` | Kelola kegiatan dan latihan |
| `penguji` | Input penilaian dan evaluasi |
| `anggota` | Akses data pribadi, dokumen, iuran |

---

## Sentry Error Tracking

Error tracking is provided by **Sentry** (@sentry/node for API, @sentry/nextjs for Web).

### Setup

1. Create a Sentry account and project: https://sentry.io
2. Copy the DSN from Project Settings → Client Keys (DSN)
3. Set these environment variables on the VPS (or in `.env`):

```bash
SENTRY_DSN=https://xxxxx@xxxxx.ingest.sentry.io/1234567
SENTRY_ORG=your-org-slug
SENTRY_PROJECT=ths-thm-system
```

For the Web frontend (client-side errors), use the **same DSN** as `NEXT_PUBLIC_SENTRY_DSN`.

### Without Sentry

If `SENTRY_DSN` is not set:
- **API**: Sentry no-ops silently — `Sentry.init()` is skipped, no overhead
- **Web**: Both `sentry.client.config.ts` and `sentry.server.config.ts` check for the env var before calling `Sentry.init()`
- **next.config.js**: The `withSentryConfig` wrapper is skipped entirely — the raw Next.js config is used

### What is captured

| Layer | Captured Events | Traces Sample Rate |
|-------|----------------|-------------------|
| **API** (NestJS) | Unhandled 5xx exceptions, Prisma errors | 10% (prod), 100% (dev) |
| **Web** (server) | API route errors, server component errors | 10% |
| **Web** (client) | React render errors, unhandled promise rejections | 20% |

### Viewing errors

- **Sentry Dashboard**: https://your-org.sentry.io
- **GitHub Integration**: Sentry can auto-create issues in the repo
- **Slack Integration**: Sentry can send alerts to #ci-cd channel

---

## Cron Jobs (Scheduled Tasks)

| Waktu | Tugas | Deskripsi |
|-------|-------|-----------|
| Setiap 1 Jan 01:00 | Auto-generate iuran | Generate iuran dari recurring config |
| Setiap 06:00 | Pengingat latihan (H-1) | Notifikasi latihan besok |
| Setiap 07:00 | Pengingat iuran (H-7/H-1/H+7) | Notifikasi bertahap iuran |
| Setiap 08:00 | Ucapan ulang tahun | Selamat ulang tahun anggota |
| Setiap Senin 09:00 | Data incomplete reminder | Pengingat anggota data kurang |
| Setiap 00:00 | Mark overdue iuran | Tandai iuran ≥30 hari menunggak |

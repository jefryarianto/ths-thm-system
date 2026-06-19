# API Documentation — THS-THM System Manajemen

> **Swagger UI**: Dokumentasi interaktif tersedia di `/api/docs` (development mode).
> **Base URL**: `http://localhost:3001/api` (dev) · `https://ths-thm-api.onrender.com/api` (production)

---

## Autentikasi

Semua endpoint (kecuali yang ditandai **Public**) memerlukan header:

```
Authorization: Bearer <access_token>
```

| Method | Endpoint | Deskripsi | Akses |
|--------|----------|-----------|-------|
| POST | /auth/login | Login email & password | Public |
| POST | /auth/register | Registrasi user baru | Public |
| POST | /auth/refresh | Refresh access token | Public |
| POST | /auth/forgot-password | Kirim link reset password | Public |
| POST | /auth/reset-password | Reset password dengan token | Public |
| GET | /auth/google | Redirect ke Google OAuth | Public |
| GET | /auth/google/callback | Google OAuth callback | Public |
| GET | /auth/me | Profil user yang login | Auth |
| PATCH | /auth/me | Update profil | Auth |
| POST | /auth/me/photo | Upload foto profil | Auth |
| PATCH | /auth/change-password | Ganti password | Auth |

---

## Members (Anggota)

| Method | Endpoint | Deskripsi | Akses |
|--------|----------|-----------|-------|
| GET | /members | Daftar anggota (filter, search, pagination) | Admin |
| GET | /members/me | Profil anggota sendiri | Anggota |
| GET | /members/:id | Detail anggota | Admin |
| POST | /members | Tambah anggota baru | Admin |
| PATCH | /members/:id | Update data anggota | Admin |
| DELETE | /members/:id | Hapus anggota (soft delete) | Admin |
| POST | /members/import | Import CSV anggota | Admin |
| GET | /members/export | Export CSV anggota | Admin |
| POST | /members/:id/validate | Validasi kelengkapan data | Admin |
| POST | /members/:id/approve | Setujui anggota pending | Admin |
| PATCH | /members/:id/suspend | Suspend keanggotaan | Admin |
| PATCH | /members/:id/reactivate | Aktifkan kembali anggota | Admin |
| GET | /members/:id/documents | Dokumen milik anggota | Admin/Anggota |
| GET | /members/:id/dues | Iuran milik anggota | Admin/Anggota |
| GET | /members/:id/trainings | Riwayat latihan anggota | Admin/Anggota |
| GET | /members/:id/activity | Timeline aktivitas anggota | Admin |
| GET | /members/:id/digital-card | Data kartu digital anggota | Admin/Anggota |
| GET | /members/incomplete | Anggota dengan data belum lengkap | Admin |

---

## Candidates (Calon Anggota)

| Method | Endpoint | Deskripsi | Akses |
|--------|----------|-----------|-------|
| GET | /candidates | Daftar calon anggota | Admin/Penguji |
| GET | /candidates/:id | Detail calon | Admin/Penguji |
| POST | /candidates | Tambah calon anggota | Admin |
| PATCH | /candidates/:id | Update calon | Admin |
| DELETE | /candidates/:id | Hapus calon | Admin |
| POST | /candidates/:id/approve | Setujui calon → jadi anggota | Admin |
| POST | /candidates/:id/reject | Tolak calon | Admin |
| POST | /candidates/import | Import CSV calon | Admin |
| GET | /candidates/export | Export CSV calon | Admin |

---

## Trainings (Latihan)

| Method | Endpoint | Deskripsi | Akses |
|--------|----------|-----------|-------|
| GET | /trainings | Daftar latihan (filter, search) | Admin/Penguji |
| GET | /trainings/:id | Detail latihan | Admin/Penguji |
| POST | /trainings | Tambah latihan | Admin |
| PATCH | /trainings/:id | Update latihan | Admin |
| DELETE | /trainings/:id | Hapus latihan | Admin |
| GET | /trainings/:id/attendances | Absensi latihan | Admin/Penguji |
| POST | /trainings/:id/attendances | Catat absensi | Admin/Penguji |
| PATCH | /trainings/:id/attendances/:memberId | Update absensi individual | Admin/Penguji |
| POST | /trainings/:id/attendances/import | Import absensi CSV | Admin |
| GET | /trainings/:id/evaluations | Nilai evaluasi latihan | Admin/Penguji |
| POST | /trainings/:id/evaluations | Input nilai evaluasi | Admin/Penguji |
| GET | /trainings/export | Export CSV latihan | Admin |

---

## Activities (Kegiatan)

| Method | Endpoint | Deskripsi | Akses |
|--------|----------|-----------|-------|
| GET | /activities | Daftar kegiatan (filter, search) | Admin/Penguji |
| GET | /activities/:id | Detail kegiatan | Admin/Penguji |
| POST | /activities | Tambah kegiatan baru | Admin |
| PATCH | /activities/:id | Update kegiatan | Admin |
| DELETE | /activities/:id | Hapus kegiatan | Admin |
| GET | /activities/:id/participants | Peserta kegiatan | Admin |
| POST | /activities/:id/participants | Tambah peserta | Admin |
| GET | /activities/export | Export CSV kegiatan | Admin |

---

## Graduations (Pendadaran)

| Method | Endpoint | Deskripsi | Akses |
|--------|----------|-----------|-------|
| GET | /graduations | Daftar pendadaran | Admin/Penguji |
| GET | /graduations/:id | Detail pendadaran | Admin/Penguji |
| POST | /graduations | Tambah pendadaran | Admin |
| PATCH | /graduations/:id | Update pendadaran | Admin |
| DELETE | /graduations/:id | Hapus pendadaran | Admin |
| GET | /graduations/:id/participants | Peserta pendadaran | Admin/Penguji |
| POST | /graduations/:id/participants | Tambah peserta | Admin |
| PATCH | /graduations/:id/participants/:id | Update status kelulusan peserta | Admin/Penguji |
| GET | /graduations/:id/evaluations | Nilai evaluasi pendadaran | Admin/Penguji |
| POST | /graduations/:id/evaluations | Input nilai evaluasi | Penguji |
| GET | /graduations/export | Export CSV pendadaran | Admin |

---

## Assessments (Aspek Penilaian)

| Method | Endpoint | Deskripsi | Akses |
|--------|----------|-----------|-------|
| GET | /assessments/aspects | Daftar aspek penilaian | Admin/Penguji |
| GET | /assessments/aspects/:id | Detail aspek | Admin/Penguji |
| POST | /assessments/aspects | Tambah aspek | Admin |
| PATCH | /assessments/aspects/:id | Update aspek | Admin |
| DELETE | /assessments/aspects/:id | Hapus aspek | Admin |
| GET | /assessments/items | Daftar item penilaian | Admin/Penguji |
| POST | /assessments/items | Tambah item penilaian | Admin |
| PATCH | /assessments/items/:id | Update item | Admin |
| DELETE | /assessments/items/:id | Hapus item | Admin |
| GET | /assessments/scores | Daftar nilai | Admin/Penguji |
| POST | /assessments/scores | Input nilai | Penguji |
| PATCH | /assessments/scores/:id | Update nilai | Penguji |

---

## Dues (Iuran)

| Method | Endpoint | Deskripsi | Akses |
|--------|----------|-----------|-------|
| GET | /dues | Daftar iuran (filter, pagination) | Admin/Anggota |
| GET | /dues/:id | Detail iuran | Admin/Anggota |
| POST | /dues | Tambah iuran | Admin |
| PATCH | /dues/:id | Update iuran | Admin |
| DELETE | /dues/:id | Hapus iuran | Admin |
| GET | /dues/arrears | Daftar tunggakan | Admin |
| GET | /dues/report | Laporan iuran | Admin |
| GET | /dues/report/export | Export laporan iuran | Admin |
| POST | /dues/import | Import CSV iuran | Admin |
| PATCH | /dues/batch | Batch update pembayaran | Admin |
| GET | /dues/dashboard/stats | Statistik dashboard iuran | Admin |
| POST | /dues/:id/payments | Konfirmasi pembayaran manual | Admin/Anggota |

---

## Payments (Pembayaran)

| Method | Endpoint | Deskripsi | Akses |
|--------|----------|-----------|-------|
| GET | /payments/bank-info | Info rekening bank & QRIS | Admin/Anggota |
| POST | /payments/:id/upload-proof | Upload/konfirmasi bukti bayar | Admin/Anggota |
| PATCH | /payments/:id/verify | Verifikasi pembayaran → lunas | Admin |
| PATCH | /payments/:id/reject | Tolak pembayaran | Admin |

---

## Documents (Dokumen Anggota)

| Method | Endpoint | Deskripsi | Akses |
|--------|----------|-----------|-------|
| GET | /documents | Daftar dokumen | Admin/Anggota |
| GET | /documents/:id | Detail dokumen | Admin/Anggota |
| POST | /documents | Generate dokumen | Admin |
| DELETE | /documents/:id | Hapus dokumen | Admin |
| POST | /documents/batch | Batch generate dokumen | Admin |
| GET | /documents/verify/:qrToken | Verifikasi QR code dokumen | **Public** |

---

## Org-Documents (Dokumen Organisasi)

| Method | Endpoint | Deskripsi | Akses |
|--------|----------|-----------|-------|
| GET | /org-documents | Daftar dokumen organisasi | Admin/Anggota |
| GET | /org-documents/:id | Detail dokumen | Admin/Anggota |
| POST | /org-documents | Upload dokumen organisasi | Admin |
| PATCH | /org-documents/:id | Update dokumen | Admin |
| DELETE | /org-documents/:id | Hapus dokumen | Admin |

---

## Letters (Surat Masuk & Keluar)

| Method | Endpoint | Deskripsi | Akses |
|--------|----------|-----------|-------|
| GET | /letters | Daftar surat gabungan | Admin |
| GET | /letters/incoming | Daftar surat masuk | Admin |
| GET | /letters/incoming/:id | Detail surat masuk | Admin |
| POST | /letters/incoming | Tambah surat masuk | Admin |
| PATCH | /letters/incoming/:id | Update surat masuk | Admin |
| DELETE | /letters/incoming/:id | Hapus surat masuk | Admin |
| POST | /letters/incoming/:id/disposition | Tambah disposisi | Admin |
| GET | /letters/outgoing | Daftar surat keluar | Admin |
| GET | /letters/outgoing/:id | Detail surat keluar | Admin |
| POST | /letters/outgoing | Tambah surat keluar | Admin |
| PATCH | /letters/outgoing/:id | Update surat keluar | Admin |
| DELETE | /letters/outgoing/:id | Hapus surat keluar | Admin |
| POST | /letters/outgoing/:id/send | Kirim surat keluar | Admin |
| GET | /letters/incoming/export/csv | Export surat masuk | Admin |
| GET | /letters/outgoing/export/csv | Export surat keluar | Admin |

---

## Claims (Klaim Anggota)

| Method | Endpoint | Deskripsi | Akses |
|--------|----------|-----------|-------|
| GET | /claims | Daftar klaim | Admin |
| GET | /claims/:id | Detail klaim | Admin |
| POST | /claims | Ajukan klaim | **Public** |
| PATCH | /claims/:id | Update klaim | Admin |
| DELETE | /claims/:id | Hapus klaim | Admin |

---

## Registrations (Pendaftaran Baru)

| Method | Endpoint | Deskripsi | Akses |
|--------|----------|-----------|-------|
| GET | /registrations | Daftar pendaftaran | Admin |
| GET | /registrations/:id | Detail pendaftaran | Admin |
| POST | /registrations | Daftar anggota baru | **Public** |
| POST | /registrations/:id/approve | Setujui pendaftaran | Admin |
| POST | /registrations/:id/reject | Tolak pendaftaran | Admin |
| DELETE | /registrations/:id | Hapus pendaftaran | Admin |

---

## Notifications (Notifikasi)

| Method | Endpoint | Deskripsi | Akses |
|--------|----------|-----------|-------|
| GET | /notifications | Daftar notifikasi user | Auth |
| PATCH | /notifications/:id/read | Tandai sudah dibaca | Auth |
| PATCH | /notifications/read-all | Tandai semua sudah dibaca | Auth |
| POST | /notifications/send | Kirim notifikasi ke user | Admin |
| POST | /notifications/fcm-token | Daftarkan device token FCM | Auth |
| POST | /notifications/send-incomplete | Kirim notif ke anggota data kurang | Admin |
| GET | /notifications/report | Laporan pengiriman notifikasi | Admin |
| GET | /notifications/preferences | Preferensi notifikasi user | Auth |
| PATCH | /notifications/preferences | Update preferensi | Auth |

---

## Reports (Laporan & Dashboard)

| Method | Endpoint | Deskripsi | Akses |
|--------|----------|-----------|-------|
| GET | /reports/dashboard | Statistik dashboard utama | Admin |
| GET | /reports/scan-stats | Statistik scan QR dokumen | Admin |
| GET | /reports/chart/members-over-time | Grafik pertumbuhan anggota | Admin |
| GET | /reports/chart/training-attendance | Grafik kehadiran latihan | Admin |
| GET | /reports/export/audit-log | Export log audit (CSV) | Superadmin |

---

## Settings (Pengaturan Sistem)

| Method | Endpoint | Deskripsi | Akses |
|--------|----------|-----------|-------|
| GET | /settings | Semua pengaturan | Admin |
| GET | /settings/:key | Satu pengaturan by key | Admin |
| POST | /settings/:key | Buat/update pengaturan | Superadmin |
| GET | /settings/branding/colors | Warna branding organisasi | Admin |
| POST | /settings/branding/colors | Update warna branding | Superadmin |
| GET | /settings/export/audit | Export log audit (CSV) | Superadmin |

---

## Users (Manajemen User)

| Method | Endpoint | Deskripsi | Akses |
|--------|----------|-----------|-------|
| GET | /users | Daftar user (filter by role, status) | Superadmin |
| GET | /users/:id | Detail user | Superadmin |
| POST | /users | Tambah user baru | Superadmin |
| PATCH | /users/:id | Update user (email, nama, role, password) | Superadmin |
| DELETE | /users/:id | Nonaktifkan user | Superadmin |

---

## Examiners (Penguji)

| Method | Endpoint | Deskripsi | Akses |
|--------|----------|-----------|-------|
| GET | /examiners | Daftar penguji | Admin |
| GET | /examiners/:id | Detail penguji | Admin |
| POST | /examiners | Daftarkan penguji | Admin |
| PATCH | /examiners/:id | Update data penguji | Admin |
| DELETE | /examiners/:id | Hapus penguji | Admin |

---

## Gamification

| Method | Endpoint | Deskripsi | Akses |
|--------|----------|-----------|-------|
| GET | /gamification/me | Poin & badge user sendiri | Auth |
| GET | /gamification/:anggotaId | Profil gamifikasi anggota | Admin |
| GET | /gamification/leaderboard | Peringkat anggota | Auth |
| GET | /gamification/scoreboard | Papan skor lengkap | Admin |
| GET | /gamification/badges | Semua badge yang tersedia | Auth |
| GET | /gamification/admin | Dashboard admin gamifikasi | Admin |
| GET | /gamification/rewards | Daftar reward | Admin |
| POST | /gamification/rewards | Tambah reward | Admin |
| PATCH | /gamification/rewards/:id | Update reward | Admin |
| DELETE | /gamification/rewards/:id | Hapus reward | Admin |
| GET | /gamification/manage | Kelola poin manual | Admin |
| POST | /gamification/manage | Tambah/kurangi poin manual | Admin |
| GET | /gamification/report | Laporan gamifikasi | Admin |
| GET | /gamification/settings | Konfigurasi gamifikasi | Superadmin |
| PATCH | /gamification/settings | Update konfigurasi | Superadmin |

---

## Forum Komunitas

| Method | Endpoint | Deskripsi | Akses |
|--------|----------|-----------|-------|
| GET | /forum/categories | Daftar kategori | Auth |
| GET | /forum/threads | Daftar thread | Auth |
| GET | /forum/threads/:id | Detail thread + posts | Auth |
| POST | /forum/threads | Buat thread baru | Auth |
| POST | /forum/threads/:id/posts | Balas thread | Auth |
| PATCH | /forum/threads/:id | Update thread | Auth/Admin |
| DELETE | /forum/threads/:id | Hapus thread | Admin |

---

## Chat

| Method | Endpoint | Deskripsi | Akses |
|--------|----------|-----------|-------|
| GET | /chat/rooms | Daftar ruang chat | Auth |
| POST | /chat/rooms/:roomId/messages | Kirim pesan | Auth |
| GET | /chat/rooms/:roomId/messages | Ambil pesan (limit, before cursor) | Auth |
| POST | /chat/rooms/:roomId/read | Tandai pesan terbaca | Auth |

---

## Org-Structure (Struktur Organisasi)

| Method | Endpoint | Deskripsi | Akses |
|--------|----------|-----------|-------|
| GET | /org-structure/distrik | Daftar distrik | Admin |
| GET | /org-structure/distrik/:id | Detail distrik | Admin |
| POST | /org-structure/distrik | Tambah distrik | Superadmin |
| PATCH | /org-structure/distrik/:id | Update distrik | Superadmin |
| DELETE | /org-structure/distrik/:id | Hapus distrik | Superadmin |
| GET | /org-structure/wilayah | Daftar wilayah | Admin |
| POST | /org-structure/wilayah | Tambah wilayah | Superadmin |
| PATCH | /org-structure/wilayah/:id | Update wilayah | Superadmin |
| DELETE | /org-structure/wilayah/:id | Hapus wilayah | Superadmin |
| GET | /org-structure/ranting | Daftar ranting | Admin |
| POST | /org-structure/ranting | Tambah ranting | Superadmin |
| PATCH | /org-structure/ranting/:id | Update ranting | Superadmin |
| DELETE | /org-structure/ranting/:id | Hapus ranting | Superadmin |

---

## Upload

| Method | Endpoint | Deskripsi | Akses |
|--------|----------|-----------|-------|
| POST | /upload/member-photo/:memberId | Upload foto anggota (multipart/form-data) | Admin |

---

## Calendar

| Method | Endpoint | Deskripsi | Akses |
|--------|----------|-----------|-------|
| GET | /calendar | Semua event kalender (latihan, kegiatan, pendadaran) | Admin |
| GET | /calendar/:year/:month | Event dalam bulan tertentu | Admin |

---

## Approvals (Persetujuan)

| Method | Endpoint | Deskripsi | Akses |
|--------|----------|-----------|-------|
| GET | /approvals | Daftar item pending approval | Admin |
| POST | /approvals/:id/approve | Setujui item | Admin |
| POST | /approvals/:id/reject | Tolak item | Admin |

---

## Health Check

| Method | Endpoint | Deskripsi | Akses |
|--------|----------|-----------|-------|
| GET | /health | Status sistem (DB, memory, cache) | Public |

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
| `admin_distrik` | Kelola data dalam distrik |
| `admin_wilayah` | Kelola data dalam wilayah |
| `admin_ranting` | Kelola data dalam 1 ranting |
| `admin_kegiatan` | Kelola kegiatan dan latihan |
| `penguji` | Input penilaian dan evaluasi |
| `anggota` | Akses data pribadi, dokumen, iuran |

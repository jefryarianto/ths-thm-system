# API Documentation - THS-THM System Manajemen

> **Swagger UI**: Dokumentasi interaktif tersedia di `/api/docs` (development mode).
> **Base URL**: `http://localhost:3001/api` (dev) / `https://ths-thm-api.onrender.com/api` (production)

## Authentication

Semua endpoint (kecuali yang ditandai Public) memerlukan header `Authorization: Bearer <token>`.

| Method | Endpoint                | Deskripsi                        | Akses  |
| ------ | ----------------------- | -------------------------------- | ------ |
| POST   | /auth/login             | Login dengan email & password    | Public |
| POST   | /auth/register          | Registrasi anggota baru          | Public |
| POST   | /auth/refresh           | Refresh access token             | Public |
| POST   | /auth/forgot            | Lupa password — kirim link reset | Public |
| POST   | /auth/reset             | Reset password dengan token      | Public |
| POST   | /auth/magic-link        | Kirim magic link login           | Public |
| POST   | /auth/magic-link/verify | Verifikasi magic link            | Public |
| GET    | /auth/me                | Profil user saat ini             | Auth   |
| PATCH  | /auth/me                | Update profil                    | Auth   |
| PATCH  | /auth/change-password   | Ganti password                   | Auth   |
| GET    | /auth/google            | Login dengan Google OAuth        | Public |
| GET    | /auth/google/callback   | Google OAuth callback            | Public |
| GET    | /auth/linkedin          | Login dengan LinkedIn OAuth      | Public |
| GET    | /auth/linkedin/callback | LinkedIn OAuth callback          | Public |

## Members (Anggota)

| Method | Endpoint                | Deskripsi                                   | Akses         |
| ------ | ----------------------- | ------------------------------------------- | ------------- |
| GET    | /members                | Daftar anggota (filter, search, pagination) | Admin         |
| GET    | /members/:id            | Detail anggota                              | Admin         |
| POST   | /members                | Tambah anggota baru                         | Admin         |
| PATCH  | /members/:id            | Update data anggota                         | Admin         |
| DELETE | /members/:id            | Hapus anggota                               | Admin         |
| POST   | /members/import         | Import CSV anggota                          | Admin         |
| GET    | /members/export/csv     | Export CSV anggota                          | Admin         |
| POST   | /members/:id/validate   | Validasi data anggota                       | Admin         |
| POST   | /members/:id/approve    | Setujui anggota                             | Admin         |
| PATCH  | /members/:id/suspend    | Suspend anggota                             | Admin         |
| PATCH  | /members/:id/reactivate | Aktifkan kembali anggota                    | Admin         |
| GET    | /members/:id/documents  | Dokumen anggota                             | Admin/Anggota |
| GET    | /members/:id/dues       | Iuran anggota                               | Admin/Anggota |
| GET    | /members/:id/trainings  | Riwayat latihan anggota                     | Admin/Anggota |

## Candidates (Calon Anggota)

| Method | Endpoint                | Deskripsi                             | Akses         |
| ------ | ----------------------- | ------------------------------------- | ------------- |
| GET    | /candidates             | Daftar calon anggota (filter, search) | Admin/Penguji |
| GET    | /candidates/:id         | Detail calon                          | Admin/Penguji |
| POST   | /candidates             | Tambah calon anggota                  | Admin         |
| PATCH  | /candidates/:id         | Update calon                          | Admin         |
| DELETE | /candidates/:id         | Hapus calon                           | Admin         |
| POST   | /candidates/:id/approve | Setujui calon menjadi anggota         | Admin         |
| POST   | /candidates/:id/reject  | Tolak calon                           | Admin         |
| POST   | /candidates/import      | Import CSV calon                      | Admin         |
| GET    | /candidates/export/csv  | Export CSV calon                      | Admin         |

## Trainings (Latihan)

| Method | Endpoint                             | Deskripsi                       | Akses         |
| ------ | ------------------------------------ | ------------------------------- | ------------- |
| GET    | /trainings                           | Daftar latihan (filter, search) | Admin/Penguji |
| GET    | /trainings/:id                       | Detail latihan                  | Admin/Penguji |
| POST   | /trainings                           | Tambah latihan                  | Admin         |
| PATCH  | /trainings/:id                       | Update latihan                  | Admin         |
| DELETE | /trainings/:id                       | Hapus latihan                   | Admin         |
| GET    | /trainings/:id/attendances           | Absensi latihan                 | Admin/Penguji |
| POST   | /trainings/:id/attendances           | Catat absensi                   | Admin/Penguji |
| PATCH  | /trainings/:id/attendances/:memberId | Update absensi                  | Admin/Penguji |
| POST   | /trainings/:id/attendances/import    | Import absensi CSV              | Admin         |
| GET    | /trainings/export/csv                | Export CSV latihan              | Admin         |

## Activities (Kegiatan)

| Method | Endpoint                     | Deskripsi                        | Akses         |
| ------ | ---------------------------- | -------------------------------- | ------------- |
| GET    | /activities                  | Daftar kegiatan (filter, search) | Admin/Penguji |
| GET    | /activities/:id              | Detail kegiatan                  | Admin/Penguji |
| POST   | /activities                  | Tambah kegiatan                  | Admin         |
| PATCH  | /activities/:id              | Update kegiatan                  | Admin         |
| DELETE | /activities/:id              | Hapus kegiatan                   | Admin         |
| GET    | /activities/:id/participants | Peserta kegiatan                 | Admin         |
| GET    | /activities/export/csv       | Export CSV kegiatan              | Admin         |

## Graduations (Pendadaran)

| Method | Endpoint                      | Deskripsi             | Akses         |
| ------ | ----------------------------- | --------------------- | ------------- |
| GET    | /graduations                  | Daftar pendadaran     | Admin/Penguji |
| GET    | /graduations/:id              | Detail pendadaran     | Admin/Penguji |
| POST   | /graduations                  | Tambah pendadaran     | Admin         |
| PATCH  | /graduations/:id              | Update pendadaran     | Admin         |
| DELETE | /graduations/:id              | Hapus pendadaran      | Admin         |
| GET    | /graduations/:id/participants | Peserta pendadaran    | Admin/Penguji |
| POST   | /graduations/:id/evaluations  | Input nilai evaluasi  | Penguji       |
| GET    | /graduations/export/csv       | Export CSV pendadaran | Admin         |

## Assessments (Aspek Penilaian)

| Method | Endpoint                 | Deskripsi              | Akses         |
| ------ | ------------------------ | ---------------------- | ------------- |
| GET    | /assessments/aspects     | Daftar aspek penilaian | Admin/Penguji |
| GET    | /assessments/aspects/:id | Detail aspek           | Admin/Penguji |
| POST   | /assessments/aspects     | Tambah aspek           | Admin         |
| PATCH  | /assessments/aspects/:id | Update aspek           | Admin         |
| DELETE | /assessments/aspects/:id | Hapus aspek            | Admin         |
| GET    | /assessments/items       | Daftar item penilaian  | Admin/Penguji |
| POST   | /assessments/items       | Tambah item            | Admin         |
| PATCH  | /assessments/items/:id   | Update item            | Admin         |
| DELETE | /assessments/items/:id   | Hapus item             | Admin         |
| GET    | /assessments/scores      | Daftar nilai           | Admin/Penguji |
| POST   | /assessments/scores      | Input nilai            | Penguji       |

## Dues (Iuran)

| Method | Endpoint                | Deskripsi                         | Akses         |
| ------ | ----------------------- | --------------------------------- | ------------- |
| GET    | /dues                   | Daftar iuran (filter, pagination) | Admin         |
| GET    | /dues/:id               | Detail iuran                      | Admin/Anggota |
| POST   | /dues                   | Tambah iuran                      | Admin         |
| PATCH  | /dues/:id               | Update iuran                      | Admin         |
| DELETE | /dues/:id               | Hapus iuran                       | Admin         |
| GET    | /dues/members/:memberId | Iuran per anggota                 | Admin/Anggota |
| GET    | /dues/arrears           | Daftar tunggakan                  | Admin         |
| GET    | /dues/report            | Laporan iuran                     | Admin         |
| GET    | /dues/report/export     | Export laporan                    | Admin         |
| POST   | /dues/import            | Import CSV iuran                  | Admin         |
| PATCH  | /dues/batch             | Batch payment massal              | Admin         |
| GET    | /dues/dashboard/stats   | Statistik dashboard               | Admin         |
| POST   | /dues/:id/payments      | Konfirmasi pembayaran manual      | Admin/Anggota |

## Payments (Pembayaran)

| Method | Endpoint                   | Deskripsi                        | Akses         |
| ------ | -------------------------- | -------------------------------- | ------------- |
| GET    | /payments/bank-info        | Info rekening bank & QRIS        | Admin/Anggota |
| POST   | /payments/:id/upload-proof | Upload bukti pembayaran          | Admin/Anggota |
| PATCH  | /payments/:id/verify       | Verifikasi pembayaran → lunas    | Admin         |
| PATCH  | /payments/:id/reject       | Tolak pembayaran → belum dibayar | Admin         |

## Documents (Dokumen)

| Method | Endpoint                   | Deskripsi                  | Akses         |
| ------ | -------------------------- | -------------------------- | ------------- |
| GET    | /documents                 | Daftar dokumen             | Admin/Anggota |
| GET    | /documents/:id             | Detail dokumen             | Admin/Anggota |
| POST   | /documents                 | Generate dokumen           | Admin         |
| DELETE | /documents/:id             | Hapus dokumen              | Admin         |
| POST   | /documents/batch           | Batch generate dokumen     | Admin         |
| GET    | /documents/verify/:qrToken | Verifikasi QR code dokumen | **Public**    |

## Org-Documents (Dokumen Organisasi)

| Method | Endpoint           | Deskripsi                 | Akses |
| ------ | ------------------ | ------------------------- | ----- |
| GET    | /org-documents     | Daftar dokumen organisasi | Admin |
| GET    | /org-documents/:id | Detail dokumen            | Admin |
| POST   | /org-documents     | Upload dokumen            | Admin |
| PATCH  | /org-documents/:id | Update dokumen            | Admin |
| DELETE | /org-documents/:id | Hapus dokumen             | Admin |

## Letters (Surat)

| Method | Endpoint     | Deskripsi                   | Akses |
| ------ | ------------ | --------------------------- | ----- |
| GET    | /letters     | Daftar surat (masuk/keluar) | Admin |
| GET    | /letters/:id | Detail surat                | Admin |
| POST   | /letters     | Tambah surat                | Admin |
| PATCH  | /letters/:id | Update surat                | Admin |
| DELETE | /letters/:id | Hapus surat                 | Admin |

## Claims (Klaim)

| Method | Endpoint    | Deskripsi    | Akses      |
| ------ | ----------- | ------------ | ---------- |
| GET    | /claims     | Daftar klaim | Admin      |
| GET    | /claims/:id | Detail klaim | Admin      |
| POST   | /claims     | Ajukan klaim | **Public** |
| PATCH  | /claims/:id | Update klaim | Admin      |
| DELETE | /claims/:id | Hapus klaim  | Admin      |

## Registrations (Pendaftaran)

| Method | Endpoint           | Deskripsi           | Akses      |
| ------ | ------------------ | ------------------- | ---------- |
| GET    | /registrations     | Daftar pendaftaran  | Admin      |
| GET    | /registrations/:id | Detail pendaftaran  | Admin      |
| POST   | /registrations     | Daftar anggota baru | **Public** |
| PATCH  | /registrations/:id | Update pendaftaran  | Admin      |
| DELETE | /registrations/:id | Hapus pendaftaran   | Admin      |

## Notifications (Notifikasi)

| Method | Endpoint                   | Deskripsi                 | Akses |
| ------ | -------------------------- | ------------------------- | ----- |
| GET    | /notifications             | Daftar notifikasi user    | Auth  |
| PATCH  | /notifications/:id/read    | Tandai sudah dibaca       | Auth  |
| PATCH  | /notifications/read-all    | Tandai semua dibaca       | Auth  |
| POST   | /notifications/send        | Kirim notifikasi ke user  | Admin |
| POST   | /notifications/fcm-token   | Register device token FCM | Auth  |
| GET    | /notifications/preferences | Preferensi notifikasi     | Auth  |
| PATCH  | /notifications/preferences | Update preferensi         | Auth  |

## Reports (Laporan)

| Method | Endpoint            | Deskripsi           | Akses |
| ------ | ------------------- | ------------------- | ----- |
| GET    | /reports/dashboard  | Statistik dashboard | Admin |
| GET    | /reports/scan-stats | Statistik scan QR   | Admin |

## Settings (Pengaturan)

| Method | Endpoint  | Deskripsi         | Akses |
| ------ | --------- | ----------------- | ----- |
| GET    | /settings | Semua pengaturan  | Admin |
| PATCH  | /settings | Update pengaturan | Admin |

## Users (Manajemen User)

| Method | Endpoint   | Deskripsi   | Akses      |
| ------ | ---------- | ----------- | ---------- |
| GET    | /users     | Daftar user | Superadmin |
| GET    | /users/:id | Detail user | Superadmin |
| POST   | /users     | Tambah user | Superadmin |
| PATCH  | /users/:id | Update user | Superadmin |
| DELETE | /users/:id | Hapus user  | Superadmin |

## Gamification

| Method | Endpoint                  | Deskripsi                  | Akses |
| ------ | ------------------------- | -------------------------- | ----- |
| GET    | /gamification/me          | Poin & badge user          | Auth  |
| GET    | /gamification/leaderboard | Peringkat anggota          | Auth  |
| GET    | /gamification/badges      | Daftar badge               | Auth  |
| GET    | /gamification/admin       | Dashboard admin gamifikasi | Admin |
| GET    | /gamification/manage      | Manajemen rewards          | Admin |
| POST   | /gamification/rewards     | Tambah reward              | Admin |
| PATCH  | /gamification/rewards/:id | Update reward              | Admin |
| DELETE | /gamification/rewards/:id | Hapus reward               | Admin |

## Response Format

Semua endpoint mengembalikan format standar:

```json
{
  "success": true,
  "data": { ... },
  "message": "Deskripsi opsional"
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

## Role-Based Access

| Role           | Deskripsi              | Akses                                          |
| -------------- | ---------------------- | ---------------------------------------------- |
| superadmin     | Administrator nasional | Semua endpoint                                 |
| admin_distrik  | Admin tingkat distrik  | Scope distrik                                  |
| admin_wilayah  | Admin tingkat wilayah  | Scope wilayah                                  |
| admin_ranting  | Admin tingkat ranting  | Scope ranting                                  |
| admin_kegiatan | Admin kegiatan         | Kegiatan, latihan                              |
| penguji        | Penguji pendadaran     | Penilaian, pendadaran                          |
| anggota        | Anggota biasa          | Profil sendiri, iuran sendiri, dokumen sendiri |

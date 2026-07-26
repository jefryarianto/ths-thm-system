# API Documentation

Dokumentasi REST API endpoint THS-THM System.

## Base URL

```
Development: http://localhost:3001/api
Staging:     https://staging.ths-thm.cloud/api
Production:  https://ths-thm.cloud/api
```

## Swagger UI

Dokumentasi interaktif tersedia di **`/api/docs`** (development mode).

## Authentication

Semua endpoint (kecuali login/register/public webhook) memerlukan header:

```
Authorization: Bearer <access_token>
```

Token:

- Access Token: 15 menit (JWT)
- Refresh Token: 7 hari (HTTP-only cookie / secure storage)
- API Key: Untuk integrasi eksternal / internal service

## Response Format

```json
{
  "success": true,
  "data": { ... },
  "message": "OK",
  "meta": {
    "page": 1,
    "limit": 10,
    "total": 100
  }
}
```

## Error Format

```json
{
  "success": false,
  "message": "Error description",
  "statusCode": 400,
  "errors": []
}
```

## Modules

| Modul | Controller | Deskripsi |
|-------|-----------|-----------|
| Health | `HealthController` | Status sistem (DB, memory, cache, uptime) |
| Auth | `AuthController` | Login, register, refresh token, Google OAuth, magic-link |
| Users | `UsersController` | CRUD user/admin sistem |
| Members | `MembersController` | CRUD anggota, validasi, approval, import/export CSV, digital card |
| Candidates | `CandidatesController` | CRUD calon, validasi, approve/reject, import CSV |
| Registrations | `RegistrationsController` | Pendaftaran baru, verifikasi, approval |
| Claims | `ClaimsController` | Klaim anggota (sertifikat, dokumen) |
| Trainings | `TrainingsController` | Latihan, absensi, evaluasi, import |
| Graduations | `GraduationsController` | Pendadaran, peserta, kelulusan, generate dokumen |
| Activities | `ActivitiesController` | Kegiatan/event, peserta, presensi, dokumen kegiatan |
| Examiners | `ExaminersController` | Data penguji, penugasan, jadwal |
| Assessments | `AssessmentsController` | Aspek & item penilaian, input skor, CSV import |
| Documents | `DocumentsController` | Generate dokumen (kartu, sertifikat, piagam), batch, QR |
| Org-Documents | `OrgDocumentsController` | Dokumen organisasi (AD/ART, SK, proposal) + kategori |
| Letters | `LettersController` | Surat masuk & keluar, disposisi, export CSV |
| Dues | `DuesController` | Iuran anggota, pembayaran, konfirmasi, report, import |
| Payments | `PaymentsController` | Info bank/QRIS, upload bukti, verifikasi |
| Notifications | `NotificationsController` | Push notification FCM, preferences, WebSocket stats |
| Reports | `ReportsController` | Laporan, dashboard stats, chart data, audit |
| Settings | `SettingsController` | Konfigurasi sistem, branding, periode, tanda tangan, stempel |
| Gamification | `GamificationController`, `RewardsController` | Points, badges, leaderboard, rewards, redemptions |
| Forum | `ForumController` | Forum komunitas — threads, posts, categories |
| Chat | `ChatController` | Pesan real-time via WebSocket, rooms |
| Calendar | `CalendarController` | Kalender event latihan + kegiatan |
| Approvals | `ApprovalController` | Workflow persetujuan multi-level |
| Org-Structure | `OrgStructureController` | Distrik, Wilayah, Ranting — CRUD + tree |
| Org-Chart | `OrgChartController` | Peta organisasi |
| Upload | `UploadController` | Upload foto anggota (multipart) |
| Targets | `TargetsController` | Target organisasi |
| Mail | `MailController` | Manajemen email — templates, logs, webhook, suppressions |
| Queue Dashboard | `QueueStatsController` | Admin antrean — stats, uptime, health |
| API Key Management | `ApiKeyManagementController` | Manajemen API key (superadmin) |
| Audit Logs | `AuditLogController` | Log audit, compliance, export CSV |
| Cache Management | `CacheManagementController` | In-memory cache stats + invalidasi |

## WebSocket Events

Koneksi real-time via Socket.IO (Redis adapter):

| Event | Direction | Deskripsi |
|-------|-----------|-----------|
| `notification:new` | Server → Client | Notifikasi baru |
| `notification:count` | Server → Client | Update jumlah notifikasi belum dibaca |
| `batch:progress` | Server → Client | Progress batch generate dokumen |
| `batch:complete` | Server → Client | Batch selesai |
| `queue:updated` | Server → Client | Antrean job berubah |
| `queue:health-changed` | Server → Client | Status koneksi antrean berubah |

## Hierarchical Scope System

Data difilter otomatis berdasarkan hierarki organisasi user:

| Scope | Role | Cakupan Data |
|-------|------|--------------|
| `national` | superadmin | Semua data tanpa filter |
| `district` | admin_distrik | Data dalam 1 distrik |
| `region` | admin_wilayah | Data dalam 1 wilayah |
| `branch` | admin_ranting, admin_kegiatan, penguji | Data dalam 1 ranting |
| `self` | anggota | Data pribadi sendiri |

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

# API Documentation

Dokumentasi REST API endpoint THS-THM System.

## Base URL

```
Development: http://localhost:3001/api
Staging:     https://staging.ths-thm.cloud/api
Production:  https://ths-thm.cloud/api
```

## Authentication

Semua endpoint (kecuali login/register) memerlukan header:

```
Authorization: Bearer <access_token>
```

Token:

- Access Token: 15 menit (JWT)
- Refresh Token: 7 hari (HTTP-only cookie / secure storage)

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

| Modul | Deskripsi |
|-------|-----------|
| Auth | Login, register, refresh token, Google OAuth |
| Users | CRUD user/admin sistem |
| Members | CRUD anggota, validasi, approval, import/export CSV |
| Candidates | CRUD calon, validasi, approve/reject, import CSV |
| Registrations | Pendaftaran baru, verifikasi, approval |
| Claims | Klaim anggota (sertifikat, dokumen) |
| Trainings | Latihan, absensi, evaluasi |
| Graduations | Pendadaran, peserta, kelulusan |
| Activities | Kegiatan/event, peserta, kehadiran |
| Examiners | Data penguji, penugasan, jadwal |
| Assessments | Aspek & item penilaian, input skor |
| Documents | Generate dokumen (kartu, sertifikat, piagam) + QR |
| Org-Documents | Dokumen organisasi (AD/ART, SK, proposal, dll) |
| Letters | Surat masuk & keluar, disposisi |
| Dues | Iuran anggota, pembayaran manual, konfirmasi |
| Payments | Info bank/QRIS, upload bukti, verifikasi |
| Notifications | Push notification FCM, preferences |
| Reports | Laporan, dashboard stats, chart data |
| Settings | Konfigurasi sistem, branding, audit log |
| Gamification | Points, badges, leaderboard, rewards |
| Forum | Forum komunitas — threads, posts, categories |
| Chat | Pesan real-time via WebSocket |
| Org-Structure | Distrik, Wilayah, Ranting management |
| Upload | Upload foto anggota (multipart) |
| Calendar | Kalender event gabungan |
| Approvals | Workflow persetujuan |
| Health | Status sistem |

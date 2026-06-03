# API Documentation

Dokumentasi REST API endpoint THS-THM System.

## Base URL
```
Development: http://localhost:3001/api
Production:  https://api.ths-thm.example.com/api
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

| Modul           | Deskripsi                                            |
| --------------- | ---------------------------------------------------- |
| Auth            | Login, register, refresh token, role management      |
| Users           | CRUD user/admin sistem                               |
| Members         | CRUD anggota, validasi, approval, import/export CSV  |
| Candidates      | CRUD calon, validasi, approve/reject, import CSV      |
| Registrations   | Pendaftaran baru, verifikasi, approval               |
| Claims          | Klaim anggota (sertifikat, dokumen)                  |
| Trainings       | Latihan, absensi, evaluasi                           |
| Graduations     | Pendadaran, peserta, kelulusan, generate sertifikat   |
| Activities      | Kegiatan/event, peserta, kehadiran                   |
| Examiners       | Data penguji, penugasan, jadwal                      |
| Assessments     | Aspek & item penilaian, input skor                   |
| Documents       | Generate dokumen (kartu, sertifikat, piagam) + QR    |
| Org-Documents   | Dokumen organisasi (AD/ART, SK, proposal, dll)      |
| Letters         | Surat masuk & keluar, disposisi                      |
| Dues            | Iuran anggota, pembayaran, tunggakan                 |
| Notifications   | Push notification FCM, scheduling                    |
| Reports         | Laporan & statistik                                  |
| Settings        | Konfigurasi, roles, signature, stamp                 |
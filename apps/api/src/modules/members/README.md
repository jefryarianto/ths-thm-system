# Modul Members — Manajemen Anggota

CRUD anggota THS-THM. Data utama anggota meliputi biodata, status keanggotaan, riwayat penilaian, dan dokumen terkait.

## Endpoint

| Method | Path                        | Deskripsi                     |
| ------ | --------------------------- | ----------------------------- |
| GET    | /api/members                | List & filter anggota         |
| GET    | /api/members/:id            | Detail anggota                |
| POST   | /api/members                | Tambah anggota                |
| PATCH  | /api/members/:id            | Update anggota                |
| DELETE | /api/members/:id            | Hapus anggota                  |
| POST   | /api/members/import         | Import CSV anggota            |
| GET    | /api/members/export         | Export CSV anggota            |
| POST   | /api/members/:id/validate   | Validasi data anggota          |
| POST   | /api/members/:id/approve    | Approval admin → aktifkan     |
| PATCH  | /api/members/:id/suspend    | Suspend anggota               |
| PATCH  | /api/members/:id/reactivate | Aktifkan kembali anggota      |
| GET    | /api/members/:id/documents   | Dokumen terkait anggota       |
| GET    | /api/members/:id/dues        | Riwayat iuran anggota         |

## Status Anggota
- `pending` — Menunggu validasi/approval admin
- `active` — Anggota aktif
- `suspended` — Ditangguhkan
- `inactive` — Non-aktif
- `graduated` — Lulus pendadaran
# Modul Candidates — Manajemen Calon Anggota

CRUD calon anggota. Data calon meliputi biodata, status pendaftaran, dan hasil seleksi.

## Endpoint

| Method | Path                         | Deskripsi                     |
| ------ | ---------------------------- | ----------------------------- |
| GET    | /api/candidates              | List & filter calon           |
| GET    | /api/candidates/:id          | Detail calon                  |
| POST   | /api/candidates              | Tambah calon                  |
| PATCH  | /api/candidates/:id          | Update calon                  |
| DELETE | /api/candidates/:id          | Hapus calon                   |
| POST   | /api/candidates/import       | Import CSV calon              |
| POST   | /api/candidates/:id/validate | Validasi data calon            |
| POST   | /api/candidates/:id/approve  | Approve → jadi anggota        |
| POST   | /api/candidates/:id/reject   | Tolak calon + alasan          |
| GET    | /api/candidates/export       | Export CSV calon              |

## Status Calon
- `pending` — Menunggu validasi
- `validated` — Data sudah divalidasi
- `approved` — Disetujui (auto jadi anggota)
- `rejected` — Ditolak
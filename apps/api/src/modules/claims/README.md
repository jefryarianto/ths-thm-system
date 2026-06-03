# Modul Claims — Klaim Anggota

Manajemen klaim yang diajukan anggota (klaim keanggotaan, klaim sertifikat, klaim dokumen).

## Endpoint

| Method | Path                       | Deskripsi                  |
| ------ | -------------------------- | -------------------------- |
| GET    | /api/claims                | List & filter klaim        |
| GET    | /api/claims/:id            | Detail klaim               |
| POST   | /api/claims                | Ajukan klaim baru          |
| PATCH  | /api/claims/:id            | Update klaim               |
| DELETE | /api/claims/:id            | Hapus klaim                |
| POST   | /api/claims/:id/approve    | Setujui klaim              |
| POST   | /api/claims/:id/reject     | Tolak klaim + alasan       |
| POST   | /api/claims/:id/process    | Proses klaim (generate dokumen) |
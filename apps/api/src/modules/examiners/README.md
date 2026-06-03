# Modul Examiners — Penguji

Manajemen data penguji. Meliputi registrasi penguji, penugasan ke pendadaran, dan riwayat menguji.

## Endpoint

| Method | Path                               | Deskripsi                      |
| ------ | ---------------------------------- | ------------------------------ |
| GET    | /api/examiners                     | List & filter penguji          |
| GET    | /api/examiners/:id                 | Detail penguji                 |
| POST   | /api/examiners                     | Tambah penguji                 |
| PATCH  | /api/examiners/:id                 | Update penguji                 |
| DELETE | /api/examiners/:id                 | Hapus penguji                  |
| POST   | /api/examiners/import              | Import CSV penguji             |
| POST   | /api/examiners/:id/assign          | Tugaskan ke pendadaran         |
| GET    | /api/examiners/:id/assignments     | Riwayat penugasan              |
| GET    | /api/examiners/:id/schedules       | Jadwal menguji                 |
# Modul Trainings — Latihan

Manajemen latihan/pelatihan anggota THS-THM. Meliputi jadwal, materi, absensi, dan evaluasi latihan.

## Endpoint

| Method | Path                               | Deskripsi                    |
| ------ | ---------------------------------- | ---------------------------- |
| GET    | /api/trainings                     | List & filter latihan        |
| GET    | /api/trainings/:id                 | Detail latihan               |
| POST   | /api/trainings                     | Buat latihan baru            |
| PATCH  | /api/trainings/:id                 | Update latihan               |
| DELETE | /api/trainings/:id                 | Hapus latihan                |
| GET    | /api/trainings/:id/attendances     | List absensi                 |
| POST   | /api/trainings/:id/attendances     | Catat absensi                |
| POST   | /api/trainings/:id/attendances/import | Import CSV absensi        |
| GET    | /api/trainings/:id/evaluations     | Evaluasi latihan             |
| POST   | /api/trainings/:id/evaluations     | Input evaluasi               |
| PATCH  | /api/trainings/:id/evaluations/:eid| Update evaluasi              |
| DELETE | /api/trainings/:id/evaluations/:eid| Hapus evaluasi               |
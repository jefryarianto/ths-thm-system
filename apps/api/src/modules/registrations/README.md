# Modul Registrations — Pendaftaran Baru

Pendaftaran anggota baru oleh admin atau self-registration oleh calon anggota.

## Endpoint

| Method | Path                              | Deskripsi                     |
| ------ | --------------------------------- | ----------------------------- |
| GET    | /api/registrations                | List & filter pendaftaran     |
| GET    | /api/registrations/:id            | Detail pendaftaran            |
| POST   | /api/registrations                | Buat pendaftaran baru         |
| PATCH  | /api/registrations/:id            | Update pendaftaran            |
| DELETE | /api/registrations/:id            | Hapus pendaftaran             |
| POST   | /api/registrations/:id/verify     | Verifikasi data pendaftar      |
| POST   | /api/registrations/:id/approve    | Setujui → jadi calon anggota  |
| POST   | /api/registrations/:id/reject     | Tolak pendaftaran             |
| POST   | /api/registrations/import         | Import CSV pendaftaran        |
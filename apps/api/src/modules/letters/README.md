# Modul Letters — Surat Masuk & Keluar

Manajemen surat menyurat organisasi THS-THM. Meliputi pencatatan surat masuk, pembuatan surat keluar, dan disposisi.

## Endpoint

| Method | Path                            | Deskripsi                      |
| ------ | ------------------------------- | ------------------------------ |
| GET    | /api/letters/incoming           | List surat masuk               |
| GET    | /api/letters/incoming/:id       | Detail surat masuk             |
| POST   | /api/letters/incoming           | Catat surat masuk              |
| PATCH  | /api/letters/incoming/:id       | Update surat masuk             |
| DELETE | /api/letters/incoming/:id       | Hapus surat masuk              |
| POST   | /api/letters/incoming/:id/disposition | Catat disposisi         |
| GET    | /api/letters/outgoing           | List surat keluar              |
| GET    | /api/letters/outgoing/:id       | Detail surat keluar            |
| POST   | /api/letters/outgoing           | Buat surat keluar              |
| PATCH  | /api/letters/outgoing/:id       | Update surat keluar            |
| DELETE | /api/letters/outgoing/:id       | Hapus surat keluar             |
| POST   | /api/letters/outgoing/:id/send  | Kirim surat (generate PDF)     |
| GET    | /api/letters/outgoing/:id/print | Download PDF surat             |
| GET    | /api/letters/incoming/export    | Export CSV surat masuk         |
| GET    | /api/letters/outgoing/export    | Export CSV surat keluar        |
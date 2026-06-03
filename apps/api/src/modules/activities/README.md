# Modul Activities — Kegiatan

Manajemen kegiatan/event organisasi THS-THM. Meliputi perencanaan, peserta, dan dokumentasi kegiatan.

## Endpoint

| Method | Path                              | Deskripsi                      |
| ------ | --------------------------------- | ------------------------------ |
| GET    | /api/activities                   | List & filter kegiatan         |
| GET    | /api/activities/:id               | Detail kegiatan                |
| POST   | /api/activities                   | Buat kegiatan baru             |
| PATCH  | /api/activities/:id               | Update kegiatan                |
| DELETE | /api/activities/:id               | Hapus kegiatan                 |
| POST   | /api/activities/:id/participants   | Tambah peserta                 |
| DELETE | /api/activities/:id/participants/:pid | Hapus peserta              |
| POST   | /api/activities/:id/participants/import | Import CSV peserta        |
| GET    | /api/activities/:id/presence       | Daftar hadir                   |
| POST   | /api/activities/:id/presence       | Catat kehadiran                |
| GET    | /api/activities/:id/documents      | Dokumen kegiatan               |
| POST   | /api/activities/:id/documents      | Upload dokumen kegiatan        |
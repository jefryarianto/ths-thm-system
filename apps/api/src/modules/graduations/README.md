# Modul Graduations — Pendadaran

Manajemen pendadaran (wisuda/kelulusan) anggota THS-THM. Meliputi registrasi pendadaran, penilaian akhir, dan kelulusan.

## Endpoint

| Method | Path                                  | Deskripsi                     |
| ------ | ------------------------------------- | ----------------------------- |
| GET    | /api/graduations                      | List & filter pendadaran      |
| GET    | /api/graduations/:id                  | Detail pendadaran             |
| POST   | /api/graduations                      | Buat pendadaran baru          |
| PATCH  | /api/graduations/:id                  | Update pendadaran             |
| DELETE | /api/graduations/:id                  | Hapus pendadaran              |
| POST   | /api/graduations/:id/register         | Daftarkan anggota ke pendadaran|
| POST   | /api/graduations/:id/unregister       | Batalkan pendaftaran          |
| GET    | /api/graduations/:id/participants     | List peserta                  |
| POST   | /api/graduations/:id/participants/import | Import CSV peserta         |
| POST   | /api/graduations/:id/graduate         | Tetapkan kelulusan            |
| POST   | /api/graduations/:id/generate-docs    | Generate sertifikat kelulusan |
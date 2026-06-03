# Modul Settings — Konfigurasi Sistem

Pengaturan global sistem: profil organisasi, periode aktif, konfigurasi penilaian.

## Endpoint

| Method | Path                    | Deskripsi                      |
| ------ | ----------------------- | ------------------------------ |
| GET    | /api/settings           | Lihat konfigurasi              |
| PATCH  | /api/settings           | Update konfigurasi             |
| GET    | /api/settings/periods   | List periode THS-THM           |
| POST   | /api/settings/periods   | Tambah periode                 |
| PATCH  | /api/settings/periods/:id | Update/close/activate periode |
| DELETE | /api/settings/periods/:id | Hapus periode               |
| GET    | /api/settings/roles     | List role & permission         |
| POST   | /api/settings/signatures| Upload tanda tangan pejabat    |
| GET    | /api/settings/signatures| List tanda tangan              |
| DELETE | /api/settings/signatures/:id | Hapus tanda tangan       |
| POST   | /api/settings/stamp     | Upload cap/stempel             |
| GET    | /api/settings/stamp     | Lihat cap/stempel aktif        |

## Roles & Permissions
| Role              | Akses                                            |
| ----------------- | ------------------------------------------------ |
| superadmin        | Semua akses penuh                                |
| admin_distrik     | Kelola anggota, calon, latihan, pendadaran (distrik) |
| admin_wilayah     | Kelola anggota, calon, latihan (wilayah)         |
| admin_ranting     | Kelola anggota, calon (ranting)                  |
| admin_kegiatan    | Kelola kegiatan, latihan, pendadaran             |
| penguji           | Input penilaian, akses jadwal menguji            |
| anggota           | Lihat profil, dokumen, klaim, notifikasi         |
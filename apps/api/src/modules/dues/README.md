# Modul Dues — Iuran Anggota

Manajemen iuran anggota THS-THM. Meliputi pencatatan pembayaran, tunggakan, dan laporan keuangan iuran.

## Endpoint

| Method | Path                           | Deskripsi                       |
| ------ | ------------------------------ | ------------------------------- |
| GET    | /api/dues                      | List & filter iuran             |
| GET    | /api/dues/:id                  | Detail iuran                    |
| POST   | /api/dues                      | Catat pembayaran iuran          |
| PATCH  | /api/dues/:id                  | Update pembayaran               |
| DELETE | /api/dues/:id                  | Hapus pembayaran                |
| GET    | /api/dues/members/:memberId    | Riwayat iuran anggota           |
| GET    | /api/dues/arrears              | List tunggakan                  |
| GET    | /api/dues/report               | Laporan keuangan iuran          |
| GET    | /api/dues/report/export        | Export laporan (PDF/XLS)        |
| POST   | /api/dues/import               | Import CSV pembayaran           |
| PATCH  | /api/dues/batch                 | Pembayaran massal               |
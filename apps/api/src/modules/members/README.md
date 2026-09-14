# Modul Members — Manajemen Anggota

CRUD anggota THS-THM. Data utama anggota meliputi biodata, status keanggotaan, riwayat penilaian, dan dokumen terkait.

## Endpoint

| Method | Path                        | Deskripsi                 |
| ------ | --------------------------- | ------------------------- |
| GET    | /api/members                | List & filter anggota     |
| GET    | /api/members/:id            | Detail anggota            |
| POST   | /api/members                | Tambah anggota            |
| PATCH  | /api/members/:id            | Update anggota            |
| DELETE | /api/members/:id            | Hapus anggota             |
| POST   | /api/members/import         | Import CSV anggota        |
| GET    | /api/members/export         | Export CSV anggota        |
| POST   | /api/members/:id/validate   | Validasi data anggota     |
| POST   | /api/members/:id/approve    | Approval admin → aktifkan |
| PATCH  | /api/members/:id/suspend    | Suspend anggota           |
| PATCH  | /api/members/:id/reactivate | Aktifkan kembali anggota  |
| GET    | /api/members/:id/documents  | Dokumen terkait anggota   |
| GET    | /api/members/:id/dues       | Riwayat iuran anggota     |

## Kartu Digital & Fisik (KTA)

| Method | Path                                        | Deskripsi                                           |
| ------ | ------------------------------------------- | --------------------------------------------------- |
| GET    | /api/members/:id/digital-card               | Data kartu digital (JSON) + URL verifikasi           |
| GET    | /api/members/:id/digital-card/image         | Gambar kartu PNG (pakai `?watermark=1` utk download) |
| GET    | /api/members/:id/digital-card/pdf           | PDF kartu digital (2 sisi)                           |
| GET    | /api/members/:id/digital-card/security      | Status QR + statistik & riwayat pemindaian           |
| PATCH  | /api/members/:id/digital-card/activate      | Aktifkan kembali kartu (QR)                          |
| PATCH  | /api/members/:id/digital-card/revoke        | Cabut kartu (semua QR dinonaktifkan)                 |
| POST   | /api/members/:id/digital-card/printed       | Terbitkan kartu fisik (QR statis per-penerbitan)     |
| GET    | /api/members/:id/digital-card/printed/pdf   | PDF cetak kartu fisik (856×1080, `?issuanceId=`)     |
| GET    | /api/members/:id/digital-card/issuances     | Riwayat penerbitan (edisi, source, alasan, scan)     |
| POST   | /api/members/print-batch                    | Terbitkan kartu fisik massal (`{ memberIds, reason }`) |
| GET    | /api/members/printed/batch/pdf              | PDF gabungan batch (`?issuanceIds=a,b,c`)            |
| GET    | /api/documents/verify/:token                | Validasi QR publik (digital maupun printed)          |

### Alur penerbitan kartu fisik

1. `POST /api/members/:id/digital-card/printed` dengan body `{ reason: 'baru' | 'hilang' | 'rusak' }`.
2. Alasan `hilang`/`rusak`/`replacement` otomatis **mencabut kartu fisik lama** yang masih aktif; dokumen yang statusnya `revoked` ikut diaktifkan kembali.
3. Response berisi `issuance.id` + `pdfUrl` untuk unduh PDF per keberangkatan.
4. Cetak banyak sekaligus: `POST /api/members/print-batch` → lalu `GET /api/members/printed/batch/pdf?issuanceIds=…` (satu halaman 856×1080 per kartu).

### Keamanan QR

- QR bertoken JWS (`src: digital` atau `printed`), diverifikasi via `GET /api/documents/verify/:token` (publik, tanpa login).
- Batas scan `QR_SCAN_LIMIT` (default 25) — setiap pemindaian tercatat di tabel `qr_scan`; saat mencapai batas kartu otomatis dinonaktifkan (anti fotokopi/digandakan).
- Download PNG kartu selalu memakai watermark; preview di layar bersih.

## Status Anggota

- `pending` — Menunggu validasi/approval admin
- `active` — Anggota aktif
- `suspended` — Ditangguhkan
- `inactive` — Non-aktif
- `graduated` — Lulus pendadaran

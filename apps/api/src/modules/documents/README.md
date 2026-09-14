# Modul Documents — Generate Dokumen

Generate dokumen berbasis JSX template: kartu anggota, sertifikat, piagam penghargaan.
Mendukung integrasi tanda tangan digital, cap/stempel, dan QR code untuk validasi fisik.

## Endpoint

| Method | Path                         | Deskripsi                       |
| ------ | ---------------------------- | ------------------------------- |
| GET    | /api/documents               | List dokumen (filter, paginasi) |
| GET    | /api/documents/:id           | Detail dokumen                  |
| POST   | /api/documents/generate      | Generate dokumen                |
| GET    | /api/documents/:id/download  | Download PDF dokumen            |
| DELETE | /api/documents/:id           | Hapus dokumen                   |
| GET    | /api/documents/types         | List jenis template             |
| GET    | /api/documents/:id/verify-qr | Validasi QR code dokumen        |
| GET    | /api/documents/verify/:token | Validasi QR publik (tanpa login) — dipakai web/Mobile `/verify/<token>` |
| POST   | /api/documents/batch         | Generate massal                 |

> `GET /api/documents/verify/:token` menerima token QR `digital` maupun kartu fisik `printed`.
> Setiap pemindaian dicatat di `qr_scan` (`ipAddress` disamarkan, `userAgent`); abus melampaui `QR_SCAN_LIMIT` (default 25) membuat QR tidak berlaku lagi. Anggota/admin dapat melihat `GET /api/members/:id/digital-card/security` (statistik + 10 log terbaru).

## Template Konfigurasi

- Tanda tangan digital (signature image per role)
- Cap/stempel organisasi
- QR code untuk validasi keaslian dokumen fisik
- Layout responsif (A4 landscape/portrait + kartu ID)
- Placeholder foto anggota

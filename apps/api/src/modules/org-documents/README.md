# Modul Org-Documents — Dokumen Organisasi

Manajemen dokumen organisasi THS-THM (AD/ART, SK, proposal, laporan, notulen, dll).

## Endpoint

| Method | Path                              | Deskripsi                     |
| ------ | --------------------------------- | ----------------------------- |
| GET    | /api/org-documents                | List & filter dokumen         |
| GET    | /api/org-documents/:id            | Detail dokumen                |
| POST   | /api/org-documents                | Upload dokumen baru           |
| PATCH  | /api/org-documents/:id            | Update metadata dokumen       |
| DELETE | /api/org-documents/:id            | Hapus dokumen                 |
| GET    | /api/org-documents/:id/download   | Download file dokumen         |
| GET    | /api/org-documents/categories     | List kategori dokumen         |
| POST   | /api/org-documents/categories     | Tambah kategori               |
| PATCH  | /api/org-documents/categories/:id | Update kategori               |
| DELETE | /api/org-documents/categories/:id | Hapus kategori                |
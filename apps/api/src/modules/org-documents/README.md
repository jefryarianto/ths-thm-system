# Modul Org-Documents — Dokumen Organisasi

Manajemen dokumen organisasi THS-THM (AD/ART, SK, proposal, laporan, notulen, dll).

## Endpoint

| Method | Path                              | Deskripsi               |
| ------ | --------------------------------- | ----------------------- |
| GET    | /api/org-documents                | List & filter dokumen   |
| GET    | /api/org-documents/:id            | Detail dokumen          |
| POST   | /api/org-documents                | Upload dokumen baru     |
| POST   | /api/org-documents/upload         | Upload file (multipart) |
| PATCH  | /api/org-documents/:id            | Update metadata dokumen |
| DELETE | /api/org-documents/:id            | Hapus dokumen           |
| GET    | /api/org-documents/:id/download   | Download file dokumen   |
| GET    | /api/org-documents/categories     | List kategori dokumen   |
| GET    | /api/org-documents/categories/:id | Detail kategori         |
| POST   | /api/org-documents/categories     | Tambah kategori         |
| PATCH  | /api/org-documents/categories/:id | Update kategori         |
| DELETE | /api/org-documents/categories/:id | Hapus kategori          |

## Upload File

File disimpan ke `UPLOAD_DIR/org-documents` (default `./uploads/org-documents`)
lewat `POST /upload`, yang mengembalikan `filePath` relatif. `filePath` inilah
yang dikirim saat `POST /org-documents`.

- Ekstensi diizinkan: `.pdf .doc .docx .xls .xlsx .ppt .pptx .txt .rtf .zip`
- Maksimal 25MB (env `MAX_DOCUMENT_UPLOAD_MB`)
- `uploadedBy` selalu diisi dari user terautentikasi, bukan input client


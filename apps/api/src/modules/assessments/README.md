# Modul Assessments — Penilaian

Manajemen aspek penilaian, item penilaian, dan hasil penilaian anggota/calon.

## Sub-modul
- **aspects** — Kategori/aspek penilaian (contoh: kedisiplinan, keaktifan, akademik)
- **items** — Item penilaian per aspek
- **scores** — Nilai anggota per item penilaian

## Endpoint

| Method | Path                       | Deskripsi            |
| ------ | -------------------------- | -------------------- |
| GET    | /api/assessments/aspects   | List aspek penilaian |
| POST   | /api/assessments/aspects   | Tambah aspek         |
| GET    | /api/assessments/items     | List item penilaian  |
| POST   | /api/assessments/items     | Tambah item          |
| POST   | /api/assessments/scores    | Input nilai          |
| GET    | /api/assessments/scores    | Lihat nilai          |
| POST   | /api/assessments/import    | Import CSV penilaian |
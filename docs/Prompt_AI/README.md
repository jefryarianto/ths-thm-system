# Prompt AI — AI-Assisted Development

Kumpulan prompt untuk membantu pengembangan dengan AI (Claude, GPT, GitHub Copilot).

## Isi Folder

| File               | Deskripsi                                                                  |
| ------------------ | -------------------------------------------------------------------------- |
| `Isi Prompt_AI.md` | Prompt induk: backend, web, mobile, template dokumen/CSV, role, deployment |
| `README.md`        | Panduan folder ini                                                         |

Catatan:

- Folder ini hanya berisi satu prompt induk. Prompt per-kategori
  (`nestjs-module.md`, `nextjs-page.md`, `prisma-schema.md`, dsb.) pernah
  direncanakan tetapi tidak pernah dibuat, jadi rujukannya dihapus dari tabel.
  Bila butuh prompt khusus, buat file barunya lalu daftarkan di tabel di atas.
- Aplikasi mobile kini **Flutter** (`apps/mobile_flutter/`) dan deploy produksi
  memakai VPS + Docker Compose (lihat `docs/DEPLOY-ths-thm.md`). `Isi
Prompt_AI.md` sudah disesuaikan dengan kenyataan tersebut.

## Format Prompt (konvensi bila menambah file baru)

Setiap prompt mengikuti format:

```
## Context
[Deskripsi singkat fitur/modul]

## Requirements
- [Daftar requirement]

## Tech Stack
- [Stack yang digunakan]

## Expected Output
- [Output yang diharapkan]

## Constraints
- [Batasan/aturan]
```

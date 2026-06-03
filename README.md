# THS-THM System Manajemen

Monorepo untuk Sistem Manajemen THS-THM (Taman Harapan Siswa / Taman Harapan Murid).

## Struktur Monorepo

```
ths-thm-system/
├─ apps/
│   ├─ api/                # Backend NestJS + Prisma (19 modul REST API)
│   ├─ web/                # Frontend Next.js + Tailwind (Dashboard Admin role-based)
│   └─ mobile/             # React Native Expo (Kartu digital, QR scan, FCM)
├─ packages/
│   ├─ templates/          # JSX template dokumen (kartu, sertifikat, piagam, QR, signature, stamp)
│   └─ csv_templates/      # CSV template import (anggota, calon, aspek, penilaian)
├─ docs/                   # Dokumentasi (SPEC, PRD, BRD, ERD, DFD, API, QA, Roadmap, Roles, Prompt_AI)
├─ .env.example            # Template environment variables (DB, JWT, SMTP, FCM)
└─ setup.ps1               # Script setup otomatis (pnpm, Prisma, dependencies)
```

## Tech Stack

| Layer    | Teknologi                                  |
| -------- | ------------------------------------------ |
| Backend  | NestJS, Prisma ORM, PostgreSQL, JWT, FCM   |
| Frontend | Next.js 14+, Tailwind CSS, shadcn/ui       |
| Mobile   | React Native (Expo), NativeWind, FCM, QR   |
| Package  | @react-pdf/renderer, PapaParse, SheetJS    |
| Manager  | pnpm (monorepo)                            |

## Module List (19 Backend Modules)

| # | Modul           | Deskripsi                                   |
|---|-----------------|---------------------------------------------|
| 1 | Auth            | Login, register, JWT, RBAC (7 roles)        |
| 2 | Users           | CRUD user/admin                             |
| 3 | Members         | CRUD anggota, validasi, approval, CSV       |
| 4 | Candidates      | CRUD calon, validasi, approve/reject        |
| 5 | Registrations   | Pendaftaran baru, verifikasi               |
| 6 | Claims          | Klaim anggota (sertifikat, dokumen)         |
| 7 | Trainings       | Latihan, absensi, evaluasi                  |
| 8 | Graduations     | Pendadaran, peserta, kelulusan               |
| 9 | Activities      | Kegiatan/event, peserta, kehadiran           |
| 10 | Examiners       | Data penguji, penugasan, jadwal             |
| 11 | Assessments     | Aspek & item penilaian, input skor          |
| 12 | Documents       | Generate dokumen + QR + signature + stamp   |
| 13 | Org-Documents   | Dokumen organisasi (AD/ART, SK, dll)       |
| 14 | Letters         | Surat masuk & keluar, disposisi             |
| 15 | Dues            | Iuran anggota, pembayaran, tunggakan        |
| 16 | Notifications   | Push notification FCM + scheduling          |
| 17 | Reports         | Laporan & statistik (PDF/XLS)               |
| 18 | Settings        | Konfigurasi, roles, signature, stamp        |
| 19 | Common          | Shared guards, filters, pipes, DTOs, QR     |

## Roles & Permissions

| Role             | Scope                                    |
| ---------------- | ---------------------------------------- |
| superadmin       | Akses penuh semua data                   |
| admin_distrik    | Kelola data level distrik                |
| admin_wilayah    | Kelola data level wilayah                |
| admin_ranting    | Kelola data level ranting                |
| admin_kegiatan   | Kelola latihan, pendadaran, kegiatan     |
| penguji          | Input penilaian pendadaran               |
| anggota          | Profil sendiri, dokumen, klaim (mobile)  |

> Detail permission matrix → `docs/Roles/README.md`

## Quick Start

```bash
# Setup otomatis (Windows PowerShell)
.\setup.ps1

# Manual
pnpm install
cd apps/api   && npx prisma generate && npx prisma migrate dev && pnpm run start:dev
cd apps/web   && pnpm run dev
cd apps/mobile && npx expo start
```

## Deployment (Render)

| Service          | Type               | Directory    |
| ---------------- | ------------------ | ------------ |
| Backend API      | Web Service        | `apps/api`   |
| Frontend Web     | Static Site        | `apps/web`   |
| Database         | PostgreSQL         | Managed      |

**Production Commands:**
```bash
# Build: pnpm install && npx prisma generate && npx prisma migrate deploy
# Start: node dist/main.js
```

## Environment Variables

Salin `.env.example` ke `.env` dan sesuaikan:
- `DATABASE_URL` — PostgreSQL connection string
- `JWT_SECRET` / `JWT_REFRESH_SECRET` — Gunakan string random 64 karakter
- `FCM_*` — Firebase Cloud Messaging credentials
- `SMTP_*` — Email server untuk reset password

## Dokumentasi

| Folder      | Deskripsi                                                  |
| ----------- | ---------------------------------------------------------- |
| `SPEC/`     | Spesifikasi teknis & arsitektur                            |
| `PRD/`      | Product Requirement Document                               |
| `BRD/`      | Business Requirement Document                              |
| `ERD/`      | Entity Relationship Diagram                                |
| `DFD/`      | Data Flow Diagram                                          |
| `API/`      | Dokumentasi REST API endpoint                              |
| `QA/`       | Test plan & quality assurance                              |
| `Roadmap/`  | Timeline pengembangan                                      |
| `Roles/`    | Role definitions & permission matrix                       |
| `Prompt_AI/`| Prompt untuk AI-assisted development                       |
# THS-THM System Manajemen

Monorepo untuk Sistem Manajemen THS-THM (Tunggal Hati Seminari - Tunggal Hati Maria).

## Struktur Monorepo

```
ths-thm-system/
├─ apps/
│   ├─ api/                # Backend NestJS + Prisma (47+ modul REST API)
│   ├─ web/                # Frontend Next.js 16 + Tailwind (Dashboard Admin role-based)
│   └─ mobile_flutter/     # Flutter App (Kartu digital, QR scan, FCM)
├─ packages/
│   ├─ shared-types/       # Shared TypeScript types
│   ├─ templates/          # JSX template dokumen (kartu, sertifikat, piagam, QR, signature, stamp)
│   ├─ csv_templates/      # CSV template import (anggota, calon, aspek, penilaian)
│   ├─ card-design/        # Desain kartu anggota
│   └─ api-client/         # API client shared
├─ docs/                   # Dokumentasi (SPEC, PRD, BRD, ERD, DFD, API, QA, Roadmap, Roles, Prompt_AI)
├─ .env.example            # Template environment variables (DB, JWT, SMTP, FCM)
└─ setup.ps1               # Script setup otomatis (pnpm, Prisma, dependencies)
```

## Tech Stack

| Layer    | Teknologi                                            |
| -------- | ---------------------------------------------------- |
| Backend  | NestJS 10, Prisma 5, PostgreSQL 16, JWT, FCM, BullMQ |
| Frontend | Next.js 16, React 19, Tailwind CSS, shadcn/ui        |
| Mobile   | Flutter 3.44.0, Firebase, GoRouter, Mobile Scanner, BLoC |
| Package  | @react-pdf/renderer, PapaParse, SheetJS              |
| Manager  | pnpm 11 (monorepo workspace)                         |

## Module List (47 Modul Backend)

| #   | Modul                 | Deskripsi                                 |
| --- | --------------------- | ----------------------------------------- |
| 1   | Auth                  | Login, register, JWT, RBAC (7 roles)      |
| 2   | Users                 | CRUD user/admin                           |
| 3   | Members               | CRUD anggota, validasi, approval, CSV     |
| 4   | Candidates            | CRUD calon, validasi, approve/reject      |
| 5   | Registrations         | Pendaftaran baru, verifikasi              |
| 6   | Claims                | Klaim anggota (sertifikat, dokumen)       |
| 7   | Trainings             | Latihan, absensi, evaluasi                |
| 8   | Graduations           | Pendadaran, peserta, kelulusan            |
| 9   | Activities            | Kegiatan/event, peserta, kehadiran        |
| 10  | Examiners             | Data penguji, penugasan, jadwal           |
| 11  | Assessments           | Aspek & item penilaian, input skor        |
| 12  | Documents             | Generate dokumen + QR + signature + stamp |
| 13  | Org-Documents         | Dokumen organisasi (AD/ART, SK, dll)      |
| 14  | Letters               | Surat masuk & keluar, disposisi           |
| 15  | Dues                  | Iuran anggota, pembayaran, tunggakan      |
| 16  | Notifications         | Push notification FCM + scheduling        |
| 17  | Reports               | Laporan & statistik (PDF/XLS)             |
| 18  | Settings              | Konfigurasi, roles, signature, stamp      |
| 19  | Common                | Shared guards, filters, pipes, DTOs, QR   |
| 20  | Chat                  | Real-time chat (Socket.IO)                |
| 21  | Forum                 | Forum komunitas                           |
| 22  | Gamification          | Poin, leaderboard, rewards                |
| 23  | Payments              | Manajemen pembayaran                      |
| 24  | Calendar              | Kalender event                            |
| 25  | Cron Tasks            | Task scheduled (BullMQ)                   |
| 26  | Search                | Pencarian global                          |
| 27  | Imports               | Import data massal (CSV)                  |
| 28  | Monitoring            | Monitoring sistem & queue                 |
| 29  | Feature Flags         | Feature toggle                            |
| 30  | Queue Dashboard       | Dashboard queue BullMQ                    |
| 31  | Ujian Praktek         | Ujian praktik pendadaran                  |
| 32  | Penandatangan         | Manajemen penandatangan dokumen           |
| 33  | Tingkatan             | Tingkatan keanggotaan                     |
| 34  | Public                | Endpoint publik                           |
| 35  | Jabatan               | Data jabatan                              |
| 36  | Periode               | Periode kegiatan/pendadaran               |
| 37  | Kepengurusan          | Data kepengurusan                         |
| 38  | Content               | Konten publik (berita, galeri, sejarah)   |
| 39  | Mutations             | Riwayat perubahan data                    |
| 40  | Mail                  | Email service (Resend/SMTP)               |
| 41  | Card Templates        | Template kartu anggota                    |
| 42  | Org Chart             | Struktur organisasi                       |
| 43  | Org Structure         | Struktur organisasi detail                |
| 44  | Upload                | Manajemen file upload                     |
| 45  | Targets               | Target & capaian                          |
| 46  | Role Menu Permissions | Manajemen menu & permission per role      |
| 47  | Log                   | Audit log & logging                       |

## Roles & Permissions

| Role           | Scope                                   |
| -------------- | --------------------------------------- |
| superadmin     | Akses penuh semua data                  |
| admin_distrik  | Kelola data level distrik               |
| admin_wilayah  | Kelola data level wilayah               |
| admin_ranting  | Kelola data level ranting               |
| admin_kegiatan | Kelola latihan, pendadaran, kegiatan    |
| penguji        | Input penilaian pendadaran              |
| anggota        | Profil sendiri, dokumen, klaim (mobile) |

> Detail permission matrix → `docs/Roles/README.md`

## Quick Start

<!-- Deploy trigger: 2026-06-12 12:47 -->

```bash
# Setup otomatis (Windows PowerShell)
.\setup.ps1

# Manual
pnpm install
cd apps/api   && npx prisma generate && npx prisma migrate dev && pnpm run start:dev
cd apps/web   && pnpm run dev
cd apps/mobile_flutter && flutter run
```

### Mobile Development

Aplikasi mobile dikembangkan dengan Flutter (3.44.0):

- Development aktif dengan fitur parity
- Keamanan KTA dengan FLAG_SECURE
- Build & release via CI (GitHub Actions)
- Jalankan: `cd apps/mobile_flutter && flutter run`

Teknologi:

- Flutter 3.44.0, Firebase, GoRouter, Mobile Scanner, BLoC

### Development Workflow

```bash
# Setup otomatis (Windows PowerShell)
.\setup.ps1

# Manual - Backend & Web
pnpm install
cd apps/api   && npx prisma generate && npx prisma migrate dev && pnpm run start:dev
cd apps/web   && pnpm run dev

# Manual - Mobile
cd apps/mobile_flutter && flutter run
```

## Deployment

### VPS Deployment

Menggunakan GitHub Actions workflow (`.github/workflows/production.yml`):

- Build & push image ke GHCR
- Deploy ke VPS via Docker Compose
- Scan image dengan Trivy

## Environment Variables

Salin `.env.example` ke `.env` dan sesuaikan:

- `DATABASE_URL` — PostgreSQL connection string
- `JWT_SECRET` / `JWT_REFRESH_SECRET` — Gunakan string random 64 karakter
- `FCM_*` — Firebase Cloud Messaging credentials
- `SMTP_*` — Email server untuk reset password

## Dokumentasi

| Folder       | Deskripsi                            |
| ------------ | ------------------------------------ |
| `SPEC/`      | Spesifikasi teknis & arsitektur      |
| `PRD/`       | Product Requirement Document         |
| `BRD/`       | Business Requirement Document        |
| `ERD/`       | Entity Relationship Diagram          |
| `DFD/`       | Data Flow Diagram                    |
| `API/`       | Dokumentasi REST API endpoint        |
| `QA/`        | Test plan & quality assurance        |
| `Roadmap/`   | Timeline pengembangan                |
| `Roles/`     | Role definitions & permission matrix |
| `Prompt_AI/` | Prompt untuk AI-assisted development |

Panduan operasional: [docs/QUICK_START.md](docs/QUICK_START.md), [docs/DOCKER_DEV_SETUP.md](docs/DOCKER_DEV_SETUP.md), [docs/DEPLOY-ths-thm.md](docs/DEPLOY-ths-thm.md), [docs/EMAIL_TEMPLATES.md](docs/EMAIL_TEMPLATES.md).

Catatan perubahan dicatat di [CHANGELOG.md](CHANGELOG.md).

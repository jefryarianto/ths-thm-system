# SPEC — Spesifikasi Teknis

## Tech Stack
- **Backend**: NestJS 10+, Prisma ORM, PostgreSQL 15+
- **Frontend**: Next.js 14+ (App Router), Tailwind CSS 3+, shadcn/ui
- **Mobile**: React Native 0.74+, Expo SDK 50+
- **Auth**: JWT + Refresh Token Rotation
- **Push**: Firebase Cloud Messaging (FCM)
- **Package Manager**: pnpm (monorepo)
- **File Storage**: Local / S3-compatible
- **PDF**: @react-pdf/renderer

## Arsitektur
- Monorepo dengan shared packages (`templates`, `csv_templates`)
- REST API dengan modular NestJS (19 modul)
- Role-based access control (7 roles)
- Multi-level data scoping (superadmin → distrik → wilayah → ranting)
- PDF generation via @react-pdf/renderer dengan tanda tangan & stempel
- QR code validation untuk verifikasi keaslian dokumen fisik
- FCM push notification dengan scheduling

## Deployment
| Environment | Backend                     | Frontend                  | Database         |
| ----------- | --------------------------- | ------------------------- | ---------------- |
| Development | localhost:3001              | localhost:3000            | localhost:5432   |
| Production  | Render Web Service          | Render Static Site        | Render PostgreSQL |

## Module List (19)
1. Auth — Autentikasi & RBAC
2. Users — Manajemen user
3. Members — Anggota
4. Candidates — Calon anggota
5. Registrations — Pendaftaran baru
6. Claims — Klaim
7. Trainings — Latihan
8. Graduations — Pendadaran
9. Activities — Kegiatan
10. Examiners — Penguji
11. Assessments — Penilaian
12. Documents — Generate dokumen
13. Org-Documents — Dokumen organisasi
14. Letters — Surat masuk/keluar
15. Dues — Iuran
16. Notifications — FCM
17. Reports — Laporan
18. Settings — Konfigurasi
19. Common — Shared utilities
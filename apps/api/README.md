# Backend API — NestJS + Prisma

API server untuk THS-THM System Manajemen.

## Stack
- **Framework**: NestJS 10+ (Node.js)
- **ORM**: Prisma
- **Database**: PostgreSQL 15+
- **Auth**: JWT + Refresh Token Rotation
- **Push**: Firebase Cloud Messaging (FCM)
- **Package Manager**: pnpm
- **File Storage**: Local / S3

## Struktur Modular (19 Modul)

```
src/
├─ modules/
│   ├─ auth/          # Autentikasi & RBAC (7 roles)
│   ├─ users/         # Manajemen user/admin
│   ├─ members/       # Anggota — CRUD, validasi, approval, CSV
│   ├─ candidates/    # Calon anggota — CRUD, approve/reject
│   ├─ registrations/ # Pendaftaran baru — verifikasi, approval
│   ├─ claims/        # Klaim anggota
│   ├─ trainings/     # Latihan — absensi, evaluasi
│   ├─ graduations/   # Pendadaran — peserta, kelulusan
│   ├─ activities/    # Kegiatan/event
│   ├─ examiners/     # Penguji — penugasan, jadwal
│   ├─ assessments/   # Penilaian (aspek & item)
│   ├─ documents/     # Generate dokumen — QR, signature, stamp
│   ├─ org-documents/ # Dokumen organisasi
│   ├─ letters/       # Surat masuk/keluar
│   ├─ dues/          # Iuran anggota
│   ├─ notifications/ # Push FCM + scheduling
│   ├─ reports/       # Laporan & statistik
│   └─ settings/      # Konfigurasi, roles, signature, stamp
├─ common/            # Shared utilities (guards, filters, interceptors, pipes, DTOs, QR)
└─ config/            # Konfigurasi aplikasi
```

## Quick Start

```bash
pnpm install
npx prisma generate
npx prisma migrate dev
pnpm run start:dev
```

## Testing

```bash
pnpm run test        # unit test (Jest)
pnpm run test:e2e    # e2e test (Supertest)
```

## Production

```bash
pnpm install --prod
npx prisma generate
npx prisma migrate deploy
node dist/main.js
```
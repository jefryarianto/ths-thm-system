# Frontend Dashboard — Next.js + Tailwind

Dashboard admin THS-THM System Manajemen dengan role-based access control.

## Stack
- **Framework**: Next.js 14+ (App Router)
- **Styling**: Tailwind CSS
- **Components**: shadcn/ui
- **State**: React Query (TanStack Query)
- **Forms**: React Hook Form + Zod
- **Charts**: Recharts / Chart.js
- **CSV**: PapaParse (import), SheetJS (export)
- **PDF**: @react-pdf/renderer (preview)

## Struktur

```
src/
├─ app/
│   ├─ (auth)/             # Login & register page
│   │   ├─ login/          #
│   │   └─ register/       #
│   └─ (dashboard)/        # Protected pages (role-gated)
│       ├─ members/        # CRUD anggota, import CSV, validasi data
│       ├─ candidates/     # CRUD calon, approve/reject
│       ├─ registrations/  # Pendaftaran baru, verifikasi
│       ├─ assessments/    # Penilaian (aspek, item, skor)
│       ├─ trainings/      # Latihan, absensi, evaluasi
│       ├─ graduations/    # Pendadaran, peserta, kelulusan
│       ├─ activities/     # Kegiatan, peserta, kehadiran
│       ├─ claims/         # Klaim anggota
│       ├─ documents/      # Generate & preview dokumen
│       ├─ org-documents/  # Dokumen organisasi (AD/ART, SK, dll)
│       ├─ letters/        # Surat masuk & keluar
│       ├─ dues/           # Iuran, pembayaran, tunggakan
│       ├─ notifications/  # Kirim notifikasi FCM
│       ├─ reports/        # Laporan & statistik
│       └─ settings/       # Konfigurasi sistem, roles, signature
├─ components/
│   ├─ ui/                 # shadcn/ui primitives
│   ├─ forms/              # Form components (TextInput, Select, DatePicker, FileUpload)
│   ├─ layout/             # Sidebar, Header, Breadcrumb (role-aware)
│   ├─ tables/             # DataTable (sort, filter, pagination, export)
│   ├─ charts/             # Dashboard charts
│   ├─ modals/             # Confirm, Approve, Reject, Detail modals
│   └─ cards/              # MemberCard preview, DocumentCard
├─ hooks/                  # useAuth, usePagination, useDebounce, useExport
├─ lib/                    # api-client (Axios), auth-helpers, csv-parsers, role-utils
└─ types/                  # TypeScript types & Zod schemas
```

## Role-Based Menu

| Role              | Menu yang Tampil                                              |
| ----------------- | ------------------------------------------------------------- |
| superadmin        | Semua menu                                                    |
| admin_distrik     | Members, Candidates, Trainings, Graduations, Activities, Reports |
| admin_wilayah     | Members, Candidates, Trainings, Reports                       |
| admin_ranting     | Members, Candidates                                           |
| admin_kegiatan    | Trainings, Graduations, Activities                            |
| penguji           | Graduations (penilaian)                                       |
| anggota           | Tidak ada akses dashboard web                                 |

## Quick Start

```bash
pnpm install
pnpm run dev
```
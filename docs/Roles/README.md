# Roles & Permissions — THS-THM System

## Role Hierarchy

```
superadmin
├── admin_distrik
│   ├── admin_wilayah
│   │   └── admin_ranting
│   └── admin_kegiatan
├── penguji
└── anggota
```

## Role Definitions

| Role             | Deskripsi                                              |
| ---------------- | ------------------------------------------------------ |
| **superadmin**   | Akses penuh semua modul dan data                       |
| **admin_distrik**| Kelola data di level distrik (beberapa wilayah)        |
| **admin_wilayah**| Kelola data di level wilayah (beberapa ranting)        |
| **admin_ranting**| Kelola data di level ranting (unit terkecil)           |
| **admin_kegiatan**| Kelola latihan, pendadaran, kegiatan                  |
| **penguji**      | Input penilaian pendadaran, akses jadwal menguji       |
| **anggota**      | Akses profil sendiri, dokumen, klaim (mobile app)      |

## Permission Matrix

| Modul              | superadmin | distrik | wilayah | ranting | kegiatan | penguji | anggota |
| ------------------ |:----------:|:-------:|:-------:|:-------:|:--------:|:-------:|:-------:|
| Members            | CRUD       | CRUD*   | CRUD*   | CRUD*   | R        | R       | R (self)|
| Candidates         | CRUD       | CRUD*   | CRUD*   | CRUD*   | -        | -       | -       |
| Registrations      | CRUD       | CRUD    | CRUD    | CRUD    | -        | -       | C (self)|
| Claims             | CRUD+A     | CRUD+A* | CRUD+A* | CRUD+A* | -        | -       | CR (self)|
| Trainings          | CRUD       | CRUD    | CRUD    | R       | CRUD     | R       | R       |
| Graduations        | CRUD       | CRUD    | R       | R       | CRUD     | U (nilai)| R      |
| Activities         | CRUD       | CRUD    | CRUD    | CRUD    | CRUD     | R       | R       |
| Examiners          | CRUD       | CRUD    | R       | -       | R        | -       | -       |
| Assessments        | CRUD       | CRUD    | CRUD    | CRUD    | CRUD     | CRUD    | R (self)|
| Documents          | CRUD       | CR      | CR      | CR      | CR       | R       | R (self)|
| Org-Documents      | CRUD       | CRUD    | CR      | CR      | CR       | R       | R       |
| Letters            | CRUD       | CRUD    | CRUD    | CR      | R        | -       | -       |
| Dues               | CRUD       | CRUD    | CRUD    | CRUD    | R        | -       | R (self)|
| Notifications      | CRUD       | C       | -       | -       | C        | -       | R       |
| Reports            | R          | R*      | R*      | R*      | R        | -       | -       |
| Settings           | CRUD       | R       | -       | -       | -        | -       | -       |

**Keterangan:**
- `*` = dibatasi scope level (distrik hanya lihat data di distriknya, dst.)
- `A` = Approval
- `C` = Create, `R` = Read, `U` = Update, `D` = Delete

## Implementasi

- NestJS Guard: `RolesGuard`, `DistrictGuard`, `RegionGuard`, `BranchGuard`
- Frontend: conditional rendering berdasarkan role dari JWT payload
- API: `@Roles('superadmin', 'admin_distrik')` decorator
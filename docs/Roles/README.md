# Roles & Permissions — THS-THM System

> Dokumen ini **diturunkan dari implementasi**, bukan sebaliknya: matriks di bawah
> mencerminkan decorator `@Roles()` pada controller di `apps/api/src/modules/**`.
> Kontrak `admin_nasional` per-endpoint dijaga otomatis oleh
> `apps/api/src/common/constants/role-contract.spec.ts` — menambah/menghapus role
> pada satu endpoint tanpa memperbarui kontrak akan menggagalkan tes.

## Role Hierarchy

```
superadmin              national
└── admin_nasional      national
    └── admin_distrik   district
        ├── admin_wilayah    region
        │   └── admin_ranting   branch
        └── admin_kegiatan      branch (setara ranting, khusus kegiatan)

penguji                 self  (di atas anggota, di bawah admin_ranting)
anggota                 self
```

Urutan hierarki (rendah → tinggi) di `ROLE_HIERARCHY`
(`apps/api/src/common/constants/roles.constant.ts`):

`anggota` → `penguji` → `admin_ranting` → `admin_kegiatan` → `admin_wilayah`
→ `admin_distrik` → `admin_nasional` → `superadmin`

`admin_ranting` dan `admin_kegiatan` berada di tingkat yang sama (branch);
keduanya hanya berbeda pada modul yang boleh dikelola.

## Role Definitions

| Role               | Cakupan  | Deskripsi                                                      |
| ------------------ | -------- | -------------------------------------------------------------- |
| **superadmin**     | nasional | Akses penuh semua modul, termasuk operasional sistem           |
| **admin_nasional** | nasional | Kelola seluruh data organisasi & konten; tanpa modul sistem    |
| **admin_distrik**  | distrik  | Kelola data & pengguna di level distrik (beberapa wilayah)     |
| **admin_wilayah**  | wilayah  | Kelola data & pengguna di level wilayah (beberapa ranting)     |
| **admin_ranting**  | ranting  | Kelola data & pengguna di level ranting (unit terkecil)        |
| **admin_kegiatan** | ranting  | Kelola latihan, pendadaran, kegiatan, dan penilaian            |
| **penguji**        | self     | Input penilaian pendadaran/ujian praktek, akses jadwal menguji |
| **anggota**        | self     | Profil sendiri, dokumen, iuran, klaim, forum (mobile app)      |

Pemetaan scope ada di `ROLE_SCOPE`; level organisasi minimum saat membuat user ada
di `ROLE_ORG_LEVEL` (superadmin & admin_nasional tidak terikat organisasi).

## Permission Matrix

Kolom: **SA** = superadmin, **NAS** = admin_nasional, **DIS** = admin_distrik,
**WIL** = admin_wilayah, **RAN** = admin_ranting, **KEG** = admin_kegiatan,
**PUJ** = penguji, **ANG** = anggota.

### Keanggotaan & seleksi

| Modul       |  SA   |  NAS  |   DIS   |   WIL   |   RAN   | KEG | PUJ |   ANG    |
| ----------- | :---: | :---: | :-----: | :-----: | :-----: | :-: | :-: | :------: |
| Anggota     | CRUDA | CRUDA | CRUDA\* | CRUDA\* | CRUDA\* |  R  |  R  | R (self) |
| Mutasi      |  CRA  |  CRA  |  CRA\*  |  CRA\*  |  CRA\*  |  -  |  -  |    -     |
| Calon       | CRUDA | CRUDA | CRUDA\* | CRUDA\* | CRUDA\* | CR  |  -  |    -     |
| Pendaftaran | CRUDA | CRUDA | CRUDA\* | CRUDA\* | CRUDA\* |  -  |  -  |    -     |
| Klaim       | RUDA  | RUDA  | RUDA\*  | RUDA\*  |  RUA\*  |  -  |  -  |    -     |
| Pengguna    | CRUD  | CRUD  | CRUD\*  | CRUD\*  |  CRU\*  |  -  |  -  |    -     |

### Kegiatan, latihan & penilaian

| Modul         |  SA   |  NAS  |   DIS   |   WIL   |   RAN   |  KEG   | PUJ |   ANG    |
| ------------- | :---: | :---: | :-----: | :-----: | :-----: | :----: | :-: | :------: |
| Kegiatan      | CRUD  | CRUD  | CRUD\*  | CRUD\*  | CRUD\*  | CU\*¹  |  R  |    R     |
| Latihan       | CRUD  | CRUD  | CRUD\*  | CRUD\*  | CRUD\*  | CRU\*  | CRU |    R     |
| Pendadaran    | CRUDA | CRUDA | CRUDA\* | CRUA\*² | CRUA\*² | CRU\*  | RU  | R (self) |
| Penguji       | CRUD  | CRUD  | CRUD\*  | CRUD\*  |  CRU\*  |   RU   |  -  |    -     |
| Penilaian     | CRUD  | CRUD  | CRUD\*  | CRUD\*  | CRUD\*  | CRUD\* | CR  |    -     |
| Ujian Praktek | CRUD  | CRUD  | CRUD\*  | CRUD\*  |   R\*   |  CRUD  | RU  |    -     |
| Tingkatan     | CRUD  | CRUD  |  CRUD   |  CRUD   |    R    |   R    |  R  |    R     |

### Dokumen & administrasi

| Modul               |  SA   |  NAS  |   DIS   |   WIL   |   RAN   | KEG | PUJ | ANG |
| ------------------- | :---: | :---: | :-----: | :-----: | :-----: | :-: | :-: | :-: |
| Dokumen             | CRUD  | CRUD  |  CRUD   |  CR\*   |  CR\*   |  R  |  R  |  R  |
| Dokumen Organisasi  | CRUD  | CRUD  |  CRUD   | CRUD\*  | CRUD\*  |  R  |  R  |  R  |
| Surat               | CRUD  | CRUD  |  CRUD   | CRUD\*³ | CRUD\*³ |  -  |  -  |  -  |
| Penandatangan       | CRUD  |  CRU  |  CRU\*  |  CRU\*  |   R\*   |  -  |  -  |  -  |
| Jabatan             | CRUD  | CRUD  |  CRUD   |    R    |    R    |  R  |  R  |  R  |
| Kepengurusan        | CRUDA | CRUDA | CRUDA\* | CRUDA\* | CRUDA\* |  -  |  -  |  -  |
| Struktur Organisasi | CRUD  | CRUD  |   R\*   |   R\*   |   R\*   |  R  |  R  |  -  |

### Konten & komunikasi

| Modul             |  SA   |  NAS  |   DIS   |  WIL  |  RAN  | KEG  | PUJ  | ANG  |
| ----------------- | :---: | :---: | :-----: | :---: | :---: | :--: | :--: | :--: |
| Berita            | CRUD  | CRUD  |  CRUD   | CRUD  |  C⁴   |  C⁴  |  C⁴  |  C⁴  |
| Galeri (moderasi) |  RA   |  RA   |   RA    |  RA   |  RA   |  RA  |  -   |  -   |
| Forum             | CRUDM | CRUDM |  CRUDM  | CRUDM | CRUDM | CRUD | CRUD | CRUD |
| Kalender          |   R   |   R   |    R    |   R   |   R   |  R   |  R   |  R   |
| Chat              | CRUD  | CRUD  |  CRUD   | CRUD  | CRUD  | CRUD |  -   | CRUD |
| Notifikasi        | CRUD  |   R   | R+kirim |   R   |   R   |  R   |  R   |  R   |

### Keuangan

| Modul            |    SA    |   NAS    |   DIS    |   WIL    |   RAN    | KEG | PUJ |    ANG     |
| ---------------- | :------: | :------: | :------: | :------: | :------: | :-: | :-: | :--------: |
| Iuran            |   CRUD   |   CRUD   |  CRUD\*  |  CRUD\*  |  CRUD\*  |  R  |  R  | R (self)⁵  |
| Pembayaran       |  CRUDA   |  CRUDA   | CRUDA\*  | CRUDA\*  | CRUDA\*  |  -  |  -  | CR (bukti) |
| Gamifikasi       | R+kelola | R+kelola | R+kelola | R+kelola | R+kelola |  R  |  R  |     R      |
| Hadiah (rewards) |   CRUD   |    R     |   CRUD   |    R⁶    |    R⁶    |  R  |  R  |     R      |

### Laporan & sistem

| Modul               |       SA       |   NAS    |    DIS     |    WIL     |    RAN     | KEG | PUJ | ANG |
| ------------------- | :------------: | :------: | :--------: | :--------: | :--------: | :-: | :-: | :-: |
| Laporan             |    R+ekspor    | R+ekspor | R+ekspor\* | R+ekspor\* | R+ekspor\* |  R  |  -  |  -  |
| Pengaturan          |      CRUD      |  CRUD⁸   |    CRD⁸    |    CRD⁸    |     R      |  -  |  -  |  -  |
| Periode             |      CRUD      |    R     |     R      |     R      |     R      |  -  |  -  |  -  |
| Hak Akses Menu      | CRUD (matriks) |    R     |     R      |     R      |     R      |  R  |  R  |  R  |
| Target              |       R        |    R     |    R\*     |    R\*     |    R\*     |  -  |  -  |  -  |
| Impor massal        |      CRUD      |   CRUD   |   CRUD\*   |   CRUD\*   |   CRUD\*   |  -  |  -  |  -  |
| Unggah foto anggota |       C        |    C     |    C\*     |    C\*     |    C\*     |  -  |  -  |  -  |
| Pencarian           |       R        |    R     |     R      |     R      |     R      |  R  |  R  |  R  |
| Audit log           |       R        |    -     |     -      |     -      |     -      |  -  |  -  |  -  |
| Operasional sistem⁷ |      CRUD      |    -     |     R      |     -      |     -      |  -  |  -  |  -  |

**Keterangan simbol**

- `C` = Create, `R` = Read, `U` = Update, `D` = Delete, `A` = Approve/verifikasi,
  `M` = Moderasi (kategori, pin, lock)
- `-` = tidak punya akses sama sekali (endpoint mengembalikan `403`)
- `*` = dibatasi **scope** — distrik hanya data di distriknya, wilayah di
  wilayahnya, ranting di rantingnya (lihat `ScopeGuard`)
- `(self)` = hanya baris milik sendiri; pembatasan dilakukan di service
- `C` pada modul tanpa endpoint `create` tunggal berarti lewat impor CSV
  (`importCsv`) atau endpoint khusus (mis. `submitBerita`, `uploadProof`)

**Catatan kaki**

1. `admin_kegiatan` hanya bisa mengubah kegiatan yang ditugaskan kepadanya
   (`@Scope('branch')` + pengecekan assignment di service).
2. `POST /graduations` hanya superadmin, admin_nasional, dan admin_distrik.
   Wilayah ke bawah tetap bisa mengelola peserta/penguji/nilai pendadaran.
3. Disposisi surat (`POST /letters/incoming/:id/disposition`) hanya superadmin
   s.d. admin_wilayah; `POST /notifications/send` hanya superadmin &
   admin_distrik.
4. `C` di sini adalah **pengajuan** berita (`POST /content/berita/submit`) yang
   butuh persetujuan; publikasi langsung hanya superadmin s.d. admin_wilayah.
5. Anggota bisa melihat iurannya sendiri dan mengirim konfirmasi pembayaran.
6. Wilayah/ranting hanya melihat riwayat penukaran poin, tidak mengubah hadiah.
7. Monitoring, cache, DB backup, API key, feature flag, revisi data, audit log
   (+ audit SSE), sesi login, dan manajemen antrean: **superadmin** saja.
   `admin_distrik` hanya bisa membaca snapshot metrik (`GET /admin/metrics`) dan
   statistik antrean (`GET /admin/queue-stats`); `GET /metrics` (format
   Prometheus) bersifat publik untuk scraper.
8. Pengaturan: `admin_nasional` mengelola konten & periode (organisasi, sejarah,
   branding, periode, template dokumen); `admin_distrik`/`admin_wilayah` hanya
   mengunggah & menghapus tanda tangan/stempel. Semuanya boleh membaca
   pengaturan, sedangkan `admin_ranting` hanya baca.

## Celah yang diketahui

Perbedaan berikut masih ada di implementasi (bukan salah tulis dokumen):

- **Ujian Praktek**: `admin_ranting` hanya bisa membaca, sedangkan
  `admin_kegiatan` penuh — padahal keduanya berada di scope `branch`.
- **Chat**: `penguji` tidak terdaftar, sedangkan `anggota` terdaftar.
- **Target**: `admin_kegiatan` tidak terdaftar, sedangkan `admin_ranting`
  terdaftar.
- **Detail vs daftar organisasi**: `GET /org-structure/{distrik,wilayah,ranting}/:id`
  hanya superadmin & admin_nasional, sedangkan daftarnya terbuka sampai
  `penguji`. Badge scope di layout dashboard karena itu membaca daftar
  (`SCOPE_BADGE_SOURCES`) lalu mencocokkan `distrikId`/`wilayahId`/`rantingId`
  milik user — bukan endpoint detail yang selalu 403 untuk admin daerah.
- **Periode**: menu hanya superadmin (`settingsPeriode`), sementara
  `GET /settings/periods` terbuka sampai `admin_ranting`.

## Visibilitas Menu (UI)

Menu sidebar disaring oleh `filterVisibleGroups()` di
`apps/web/src/components/layout/navigation.ts` dengan empat gerbang berlapis
(semua harus lolos):

1. `item.adminOnly` → setara `admin_ranting` ke atas
2. `item.minRole` → cek hierarki role
3. `MODULE_PERMISSIONS[moduleKey].view` → `apps/web/src/components/auth/can.tsx`
4. `RoleMenuPermission` dari `GET /role-menu-permissions/my-menus` → **hanya bisa
   menyembunyikan**, tidak pernah memberi akses di atas aturan kode

`menuKey` stabil per menu didaftarkan di
`packages/shared-types/src/menu-registry.ts`; setiap item navigasi wajib punya
entry dengan `href` yang menunjuk `page.tsx` yang benar-benar ada (dijaga
`menu-registry.test.ts` & `navigation.test.ts`).

Untuk tombol/aksi di dalam halaman, gunakan `<Can module="..." action="...">`
atau `PermissionGuard` (`minRole`/`module`/`action`); keduanya baru merender
setelah mount agar tidak berkedip ketika role belum terbaca.

## Implementasi

Global guard di `apps/api/src/app.module.ts` (urutan eksekusi):

```
ApiKeyGuard → JwtAuthGuard → RoleBasedThrottlerGuard → RolesGuard → ScopeGuard
```

- `@Roles('superadmin', 'admin_distrik')` — `apps/api/src/common/decorators/roles.decorator.ts`;
  endpoint tanpa `@Roles` hanya mewajibkan login (batasan tambahan, mis. pemilik
  data, ditegakkan di service).
- `@Scope('national' | 'district' | 'region' | 'branch' | 'self')` +
  `ScopeGuard` — memeriksa organisasi user terhadap parameter rute/body.
  Catatan penting: scope `self` (anggota & penguji) **selalu lolos** gerbang
  scope, sehingga pembatasan baris wajib dilakukan di service.
- `@CrudAuth(...)` — pembungkus `@Roles` + `@Scope` untuk CRUD standar.
- Frontend: `Can`/`CanCreate`/`CanEdit`/`CanDelete`/`CanExport`/`CanAdmin`
  dari `apps/web/src/components/auth/can.tsx` dan `PermissionGuard`
  (`apps/web/src/components/auth/permission-guard.tsx`), dengan tabel
  `MODULE_PERMISSIONS` sebagai sumber role minimum per modul.

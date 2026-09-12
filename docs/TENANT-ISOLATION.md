# Arsitektur: Model Isolasi Tenant (Multi-Distrik)

> **Versi:** 1.0 — 13 September 2026
> **Dokumen terkait:** [`COOKBOOK-BaseCrudService.md`](./COOKBOOK-BaseCrudService.md) (scope strategies), [`TESTING.md`](./TESTING.md)
> **Test referensi:** `apps/api/test/scope-filtering.e2e-spec.ts` (59 kasus), `apps/api/test/admin-distrik-tenant.e2e-spec.ts` (33 kasus)

Dokumen ini merangkum bagaimana data diisolasi per tenant (distrik/wilayah/ranting) di API:
dari mana scope pengguna berasal, guard apa yang menegakkannya, dan aturan yang wajib
diikuti saat menambah modul baru.

---

## Daftar Isi

1. [Hierarki Organisasi & Peran](#1-hierarki-organisasi--peran)
2. [Dari Mana `req.scope` Berasal (ScopeGuard)](#2-dari-mana-reqscope-berasal-scopeguard)
3. [Dua Model Akses admin_distrik: Ranting-Anchored vs District-Wide](#3-dua-model-akses-admin_distrik-ranting-anchored-vs-district-wide)
4. [Lapisan Penegakan (Guards & Helpers)](#4-lapisan-penegakan-guards--helpers)
5. [Aturan #1: Cache Key Harus Memuat Scope Penuh](#5-aturan-1-cache-key-harus-memuat-scope-penuh)
6. [Aturan #2: Scope Adalah Batas Atas, Filter Klien Hanya Mempersempit](#6-aturan-2-scope-adalah-batas-atas-filter-klien-hanya-mempersempit)
7. [Aturan #3: Eskalasi Role & Penempatan User](#7-aturan-3-eskalasi-role--penempatan-user)
8. [Referensi Uji & Cara Menjalankan](#8-referensi-uji--cara-menjalankan)
9. [Checklist Modul Baru](#9-checklist-modul-baru)
10. [Batasan yang Diketahui](#10-batasan-yang-diketahui)

---

## 1. Hierarki Organisasi & Peran

```
Nasional
└── Distrik          ← tenant utama
    └── Wilayah
        └── Ranting   ← unit operasional terkecil
            └── Unit Latihan (scope kegiatan, scopeId = ranting induk)
```

Peran (dari `apps/api/src/common/constants/roles.constant.ts`):

| Role             | Level scope minimum | Keterangan |
|:-----------------|:--------------------|:-----------|
| `superadmin`     | `national`          | Tidak terikat tenant, bebas lintas distrik |
| `admin_distrik`  | `district`          | Admin satu distrik |
| `admin_wilayah`  | `region`            | Admin satu wilayah |
| `admin_ranting`  | `branch`            | Admin satu ranting |
| `admin_kegiatan` | `branch`            | Pengelola kegiatan (level ranting) |
| `penguji`        | `branch`            | Penguji pendadaran (level ranting) |
| `anggota`        | `self`              | Hanya data sendiri |

Urutan level: `national > district > region > branch > self`. `ScopeGuard` memakai
urutan ini untuk keputusan otorisasi; **isolasi data** ditegakkan di lapisan service
(guard hanya memberi level minimum, bukan filter data).

---

## 2. Dari Mana `req.scope` Berasal (ScopeGuard)

`ScopeGuard` (`src/common/guards/scope.guard.ts`) adalah guard global. Endpoint yang
diberi `@RequireScope(level)` (atau `@CrudAuth(...)`, yang menyematkan level `branch`
secara default) akan melewati dua langkah:

1. **Otorisasi** — role pengguna harus punya level ≥ level yang diminta endpoint.
2. **Resolusi scope** — `req.scope` diisi dari akun pengguna (bukan dari klien):

| Kondisi akun | `req.scope` yang dihasilkan |
|:-------------|:----------------------------|
| `superadmin` | `{}` (kosong = nasional) |
| `admin_distrik` dengan `rantingId` | `{ rantingId, wilayahId, distrikId }` — ranting di-resolve ke atas via DB |
| `admin_wilayah` dengan `rantingId` | `{ rantingId, wilayahId }` |
| Peran lain dengan `rantingId` | `{ rantingId }` |
| **Peran apa pun tanpa `rantingId`** | `{}` (kosong = nasional) ⚠️ |

> ⚠️ **Konsekuensi penting:** `req.scope` selalu berakar pada `rantingId`. Akun admin
> **tanpa `rantingId` mendapat scope kosong** = visibilitas nasional pada modul
> operasional. Panduan konfigurasi: **selamatkan (anchor) setiap akun admin ke satu
> ranting**, kecuali superadmin. Lihat [Batasan yang Diketahui](#10-batasan-yang-diketahui).

Endpoint `GET /api/auth/scope` (dengan `@RequireScope('self')`) mengembalikan scope
tersebut; dipakai web untuk mengunci pilihan distrik pada halaman settings
(`JabatanSelect`, halaman penandatangan, dsb.).

---

## 3. Dua Model Akses admin_distrik: Ranting-Anchored vs District-Wide

Ada **dua keluarga modul** dengan pola isolasi berbeda untuk `admin_distrik`:

### a. Modul operasional — ranting-anchored

Anggota, user, kegiatan, latihan, kandidat, iuran, klaim, dokumen, dsb.
Data berakar pada `rantingId`. Untuk admin yang terikat ranting, filter efektifnya
adalah **ranting persis** — lebih ketat dari district-wide, sehingga akses lintas
distrik mustahil secara konstruksi. `admin_distrik` di sini berperilaku seperti
`admin_ranting` untuk operasional sehari-hari (keputusan desain yang dikunci oleh
test e2e — jangan diubah tanpa diskusi).

### b. Modul settings — district-wide (data per distrik)

Tanda tangan, stempel, penandatangan, template kartu, preset jabatan.
Tabel-tabel ini punya kolom `distrikId` (`NULL` = global/nasional) dengan unique index
per scope (pola: partial unique index `(kode, COALESCE(distrik_id,'GLOBAL'))`), sehingga
Distrik A dan B boleh punya preset dengan kode yang sama. `admin_distrik` mengelola
**seluruh distriknya** di modul ini (bukan hanya rantingnya), dan membaca gabungan
miliknya + global.

| Modul | Endpoint | Helper |
|:------|:---------|:-------|
| Penandatangan / TTD / Stempel | `settings.controller.ts`, `penandatangan.controller.ts` | `resolveWriteDistrikId`, `resolveReadDistrikId` |
| Template kartu | `card-templates.*` | `resolveWriteDistrikId` + `assertCanManage` (service) |
| Preset jabatan | `jabatan.*` | `resolveWriteDistrikId` + `assertCanManage`; read terbuka untuk semua admin (dipakai `JabatanSelect` di form mana pun) |

### c. Kegiatan & pendadaran — model `scopeType`/`scopeId`

Tabel `kegiatan` tidak berakar pada kolom ranting, melainkan `scopeType`
(`ranting | wilayah | distrik | unit_latihan | nasional`) + `scopeId`. Lihat §4c.

---

## 4. Lapisan Penegakan (Guards & Helpers)

### a. `ScopeHelper` — `src/common/utils/scope-helpers.ts`

| Method | Fungsi |
|:-------|:-------|
| `buildScopeFilter(scope, basePath)` | Prisma `where` per scope. Precedensi: `rantingId` → `wilayahId` → `distrikId` (**yang terkecil/terketat selalu menang**). |
| `buildIndirectScopeFilter(scope, relPath)` | Sama, untuk model yang berakar ke anggota (iuran → anggota → ranting). |
| `hasAccessToResourceAsync(prisma, scope, rantingId)` | Cek kepemilikan ranting: exact-match di level branch; lookup hierarki ranting → wilayah → distrik untuk wilayah/distrik. **Resource tanpa ranting (level nasional) TIDAK dianggap bisa diakses** admin ter-scope. |
| `verifyKegiatanScope(prisma, scope, scopeType, scopeId)` | Verifikasi akses kegiatan yang sudah ada — exact-match untuk level yang dimiliki scope + **pemeriksaan hierarkis** untuk arm `wilayah`/`ranting` (lookup DB), sehingga admin ter-scope penuh tidak bisa menyentuh kegiatan distrik lain. Async. |
| `verifyResourceAccess(...)` | Pola umum "find or 404 + verify ranting" untuk resource ber-rantingId. |

### b. `BaseCrudService` — `src/common/utils/base-crud.service.ts`

Opsi `scopeStrategy` menentukan cara verify + filter:

| Strategy | Dipakai oleh | Mekanisme |
|:---------|:-------------|:----------|
| `'ranting'` (default) | members, users, trainings, candidates, aspect, forum-category | `buildScopeFilter` untuk list; `verifyScope` → `hasAccessToResourceAsync` untuk read/update/delete per ID. |
| `'anggota_indirect'` | dues, claims | `buildIndirectScopeFilter` (filter via relasi anggota). |
| `'kegiatan'` | activities, graduations | Model `scopeType`/`scopeId`; lihat di bawah. |

Untuk strategy `'kegiatan'`:

- **Visibility (list)** — `buildKegiatanScopeFilter(scope)` (async): admin distrik melihat
  kegiatan `distrik` miliknya + arm `wilayah`/`ranting` yang dibatasi
  `scopeId: { in: [ids dalam distrik] }` (bukan `scopeType: 'ranting'` polos tanpa
  `scopeId` = seluruh nasional — itu bug historis, jangan dikembalikan).
- **Create** — `assertKegiatanCreateScope(scope, scopeType, scopeId)`: guard hierarkis
  untuk scope yang *dikirim klien* (kebalikan verify: ranting admin → hanya ranting itu;
  admin wilayah → wilayahnya + ranting di dalamnya; admin distrik → distriknya + semua
  wilayah/ranting di dalamnya; `nasional` dan klien tanpa scope eksplisit lolos).
- **Read/Update/Delete per ID** — `verifyKegiatanScope` (§4a).

### c. `distrik-scope.ts` — modul settings district-wide

- `resolveWriteDistrikId(req, requested)`: superadmin bebas menentukan scope (`null` =
  global); peran lain **terkunci** ke `req.scope.distrikId` — mengirim distrik lain → 403;
  peran tanpa scope distrik → 403.
- `resolveReadDistrikId(req, requested)`: non-superadmin mengikuti scope-nya sendiri.
- `assertCanManage(existing, { role, distrikId })` di service: baris global hanya boleh
  dikelola superadmin; baris distrik hanya oleh distrik yang sama.

### d. Eskalasi user — `src/modules/users/users.service.ts`

- `resolveAssignableRole`: non-superadmin hanya boleh menetapkan role **pada atau di
  bawah levelnya sendiri** (tabel `ASSIGNABLE_BY_LEVEL`: district → maks `admin_distrik`,
  region → maks `admin_wilayah`, branch → maks `admin_ranting`). Membuat/mengubah user
  jadi `superadmin` → 403.
- `resolveRantingId`: `rantingId` dari klien divalidasi dengan
  `hasAccessToResourceAsync` (create + update) — menempatkan user di ranting distrik
  lain → 403.
- Level dievaluasi di `update()` sebelum `baseUpdate` (hook base tidak menerima scope).
- Register publik (`auth.service.register`) **memaksa** `role: 'anggota'` — role klien
  tidak pernah dipercaya.

---

## 5. Aturan #1: Cache Key Harus Memuat Scope Penuh

`baseFindAll` meng-cache respons. **Cache key wajib membedakan semua level scope:**

```ts
// ✅ BENAR — ranting/wilayah/distrik/all adalah bucket berbeda
const scopeBucket = scope?.rantingId || scope?.wilayahId || scope?.distrikId || 'all';
const cacheKey = `${prefix}list:${scopeBucket}:${...filter}`;
```

```ts
// ❌ SALAH — admin_distrik district-wide dan superadmin sama-sama punya
// rantingId undefined → berbagi bucket 'all' → kebocoran lintas tenant
const cacheKey = `${prefix}list:${scope?.rantingId || 'all'}:${...filter}`;
```

❌ Juga salah: cache key yang **tidak memuat scope sama sekali** (mis. hanya
`JSON.stringify(query)`) — respons "semua data" milik superadmin akan tersaji ke admin
ter-scope. Contoh historis yang sudah diperbaiki: `claims.findAll`.

Layanan yang sudah benar: members (2 key), candidates, dues, documents, claims,
activities, trainings, reports. Kalau menambah cache key baru, ikuti pola ✅ dan uji
dengan dua akun beda scope.

---

## 6. Aturan #2: Scope Adalah Batas Atas, Filter Klien Hanya Mempersempit

Filter hierarkis dari query string (`?distrikId=`, `?wilayahId=`, `?rantingId=`)
**tidak boleh menimpa atau melampaui** scope pengguna:

- Scope `rantingId` terisi → filter klien diabaikan (irisan dengan ranting yang sama).
- Scope hanya `wilayahId`/`distrikId` → filter klien boleh mempersempit ke ranting/wilayah
  **di dalam** cakupan, tidak boleh melewati batas distrik/wilayah.
- Tanpa scope (superadmin) → filter klien berlaku penuh.

```ts
// members.findAll — pola referensi
if (scope?.rantingId) {
  // terikat ranting persis; filter distrik/wilayah klien diabaikan
} else if (scope?.wilayahId) {
  if (filter.rantingId) where.rantingId = filter.rantingId;
} else if (scope?.distrikId) {
  if (filter.rantingId) where.rantingId = filter.rantingId;
  if (filter.wilayahId) where.ranting = { ...where.ranting, wilayahId: filter.wilayahId };
} else {
  // superadmin: filter klien penuh
}
```

Bug historis yang dicegah aturan ini: `?distrikId=<distrik-lain>` yang dulu
**menimpa** filter scope (anggota distrik lain bisa terlihat).

---

## 7. Aturan #3: Eskalasi Role & Penempatan User

Ringkasan matriks (detail §4d):

| Aksi | admin_distrik/wilayah/ranting | superadmin |
|:-----|:------------------------------|:-----------|
| Assign role ≤ levelnya sendiri | ✅ | ✅ (bebas) |
| Assign `superadmin` (create/PATCH) | ❌ 403 | ✅ |
| `rantingId` milik distrik lain | ❌ 403 | ✅ |
| Modifikasi akun tanpa ranting (nasional) | ❌ 403 | ✅ |

Yang terakhir ditangani oleh hardening `hasAccessToResourceAsync`: resource tanpa
`rantingId` **tidak** lagi dianggap bisa diakses admin ter-scope (dulu `return true`
untuk `rantingId == null` — jalur eskalasi vertikal).

---

## 8. Referensi Uji & Cara Menjalankan

| Suite | Cakupan |
|:------|:--------|
| `test/admin-distrik-tenant.e2e-spec.ts` (33) | Dua distrik nyata: login, resolusi scope, isolasi list anggota/user/kegiatan, matriks 403 lintas distrik (GET/PATCH/DELETE/POST), guard eskalasi role & penempatan, superadmin bebas. |
| `test/scope-filtering.e2e-spec.ts` (59) | Matriks peran × modul (members, candidates, trainings, dues, activities, claims, documents, users, reports). |
| `src/modules/users/users.service.spec.ts`, `members.service.spec.ts`, `common/utils/base-crud.service.spec.ts` | Regresi unit guard eskalasi, precedensi filter, arm per-distrik, `assertKegiatanCreateScope`. |

Prasyarat: Postgres terisolasi + migrasi terpasang. Lokal, DB test dapat dibuat di
dalam container Postgres dev (port 5433) tanpa menyentuh DB dev:

```bash
docker exec ths-thm-system-db psql -U ths_thm -d ths_thm_db \
  -c "CREATE DATABASE ths_thm_test OWNER ths_thm"
cd apps/api
DATABASE_URL='postgresql://ths_thm:ths_thm_password@localhost:5433/ths_thm_test' \
  npx prisma migrate deploy

DATABASE_URL='postgresql://ths_thm:ths_thm_password@localhost:5433/ths_thm_test' \
JWT_SECRET='e2e-jwt-secret-0123456789abcdef0123456789abcdef' \
JWT_REFRESH_SECRET='e2e-jwt-refresh-secret-0123456789abcdef0123456789' \
  npx jest --config ./test/jest-e2e.json admin-distrik-tenant scope-filtering --runInBand --forceExit
```

> JWT secret harus ≥ 32 karakter (divalidasi Zod). Spec `app.e2e-spec` butuh DB ter-seed
> (bootstrap-nya bergantung pada register publik yang dipaksa `anggota`) — lihat §10.

---

## 9. Checklist Modul Baru

Saat menambah modul/service baru yang punya data per tenant:

- [ ] Tambahkan `@CrudAuth(...)` / `@RequireScope(level)` di controller (jangan andalkan role saja).
- [ ] Pilih `scopeStrategy` yang tepat di `BaseCrudService` (`ranting` / `anggota_indirect` / `kegiatan`).
- [ ] List: sertakan bucket scope penuh di cache key (§5).
- [ ] List: filter hierarkis klien hanya mempersempit (§6) — jangan timpa scope.
- [ ] Create: validasi `rantingId`/`scopeId` dari klien dengan `hasAccessToResourceAsync`
      atau `assertKegiatanCreateScope` — jangan pass-through mentah.
- [ ] Jika data district-wide (settings): kolom `distrikId` + partial unique index per
      scope + `resolveWriteDistrikId`/`resolveReadDistrikId` + `assertCanManage` (§3b).
- [ ] Cache key tidak boleh hanya `JSON.stringify(query)` tanpa scope (§5).
- [ ] Tambah kasus e2e lintas-distrik: **403** untuk read/update/delete/create lintas
      tenant, dan **list tidak bocor** (lihat pola `admin-distrik-tenant.e2e-spec.ts`).
- [ ] Jalankan `npx jest` (unit) + kedua e2e scope sebelum merge.

---

## 10. Batasan yang Diketahui

1. **Akun admin tanpa `rantingId` mendapat scope kosong** pada modul operasional =
   visibilitas nasional (perilaku `ScopeGuard` saat ini). Modul settings district-wide
   tetap mengunci ke `scope.distrikId` → 403, tapi list operasional tidak terfilter.
   Mitigasi: prosedur pembuatan akun harus selalu mengisi `rantingId` untuk semua
   admin; pertimbangkan penegakan di DB (`rantingId NOT NULL` untuk role admin) di
   masa depan.
2. **Modul `registrations` tidak ter-scope** (global): cache key tanpa scope dan
   `findAll`/`findOne` tanpa parameter scope. Sifat datanya memang lintas distrik
   (pendaftaran publik), tapi perlu dievaluasi bila datanya berkembang.
3. **`app.e2e-spec.ts` butuh DB ter-seed** — bootstrap memakai `POST /auth/register`
   yang dipaksa `role: 'anggota'`, sehingga di DB bersih token yang dihasilkan tidak
   lolos endpoint ber-role. Kegagalan tersebut pre-existing dan bukan indikasi bug
   isolasi; dua suite scope (§8) berjalan mandiri di DB bersih.
4. **Level operasional admin_distrik = ranting** (lebih ketat dari nama role-nya).
   Jika suatu saat dibutuhkan admin distrik yang bisa melihat gabungan seluruh
   rantingnya pada modul operasional, itu perubahan desain sadar: ubah
   `buildScopeFilter`/precedensi filter (§6) **dan** perbarui kedua e2e scope —
   jangan setengah-setengah.

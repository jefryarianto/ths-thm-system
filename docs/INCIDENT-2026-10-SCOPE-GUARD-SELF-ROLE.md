# Insiden: Anggota & Penguji Tidak Bisa Login / Akses Endpoint — Oktober 2026

> Status: **SELESAI** — 13 Okt 2026. Diagnosis via tes langsung (unit + e2e HTTP) dan
> verifikasi manual terhadap API berjalan. Semua tes lulus (1270 tes API, 518 tes web).

## 1. Ringkasan Eksekutif

Dua bug saling berhubungan menyebabkan **role `anggota` dan `penguji` tidak bisa memakai
aplikasi sama sekali**, sekaligus membuka celah kebocoran data antar-anggota:

1. **`ScopeGuard`** membandingkan scope level dengan `!scope.rantingId && ...`. Karena anggota
   selalu punya `rantingId`, kondisi `!scope.rantingId` **selalu false** → guard menolak semua
   request anggota dengan 403 `Akses ditolak: diluar cakupan wilayah Anda`.
2. Fungsi helper `hasAccessToResource()` dan beberapa tempat lain memakai pola yang sama
   (`!scope.rantingId` → dianggap "nasional"), sehingga **seandainya guard lolos**, seorang

## 3. Root Cause & Fix

### 3.1 `ScopeGuard` — gate scope yang salah

```ts
// apps/api/src/common/guards/scope.guard.ts (SEBELUM)
if (!userScope.rantingId && !userScope.wilayahId && !userScope.distrikId) return true;
```

`!rantingId` dimaksudkan untuk mendeteksi admin nasional. Tetapi **setiap** role non-superadmin
membawa id organisasinya, termasuk `anggota` (level `self`). Kondisi ini hanya true untuk
superadmin, dan superadmin sudah di-shortcircuit di atasnya — baris ini menjadi **dead code**
yang salah mengklasifikasi anggota.

**Fix:** anggap scope selalu valid bila sudah lolos autentikasi; validasi hierarki tetap
dilakukan oleh `ScopeHelper` + `assertWithinActorScope` di service layer.

### 3.2 `isSelfScope()` — pembeda "self" vs "nasional"

Ditambahkan helper eksplisit karena `!scope` / `!scope.rantingId` ambigu:

```ts
// apps/api/src/common/interfaces/user-scope.interface.ts (BARU)
export function isSelfScope(scope?: UserScope): boolean {
  return !!scope && !!scope.selfMemberId;
}
```

`selfMemberId` hanya diisi oleh JWT strategy untuk `anggota`/`penguji`. Scope kosong `{}`
tanpa `selfMemberId` = superadmin, **bukan** anggota.

### 3.3 Filter "milik sendiri" di setiap service

`ScopeHelper` mendapat tiga method baru: `buildSelfScopeFilter()`, `isOwnMemberRow()`,
`selfCacheSegment()`. Semua dipakai untuk membatasi query dan memisahkan bucket cache:

| Modul                              | Perubahan                                                   |
| ---------------------------------- | ----------------------------------------------------------- |
| `documents.service`                | filter `anggotaId = selfMemberId` pada list + generate      |
| `members.service`                  | `selfScopeField: 'id'` + filter `id = selfMemberId`         |
| `members` (BaseCrud `verifyScope`) | cek `anggotaId`/`id` = `selfMemberId` sebelum cek hierarki  |
| `search.service`                   | self-filter pada grup `members` & `documents`               |
| `assessments` / `graduations`      | cabang `penguji` didahulukan sebelum filter hierarki        |

### 3.4 Bug laten `calendar.service` — terungkap oleh fix

`getCalendarEvents()` memakai `buildScopeFilter()` (menghasilkan `{ ranting: { id } }`) untuk
**kedua** model `latihan` dan `kegiatan`. Model `kegiatan` tidak punya relasi `ranting` —
Prisma melempar error validasi. Bug ini tidak pernah terlihat karena anggota selalu ditolak
guard. Fix: filter kegiatan memakai `buildKegiatanScopeFilter()` (berbasis `scopeType`/`scopeId`),
yang kini dipindahkan ke `ScopeHelper` agar bisa dipakai service non-BaseCrud.

### 3.5 `ROLE_SCOPE` & `hasRequiredScope` — konsistensi

`ROLE_SCOPE[PENGUJI]` sebelumnya `'branch'` padahal penguji memerlukan pengecualian
penugasan, dan `hasRequiredScope()` (salinan logika guard) mempunyai bug `self`-tidak-pernah-
lulus yang sama. Keduanya disamakan: `PENGUJI` = `'self'`, dan `self` selalu lolos gate level.

## 4. Pengecualian yang disengaja (data branch-wide)

Berdasarkan keputusan desain, resource berikut **tetap terlihat** oleh anggota di rantingnya
(informasional, bukan data pribadi):

- `org-documents` (dokumen organisasi publik)
- `activities`, `trainings`, `forum categories`, `calendar events`
- `assessments` aspek/item penilaian (master data)

Resource berikut dibatasi ke penugasan, bukan ranting:

- `penguji`: `graduations`, `assessments/scores`, `ujian-praktek` — hanya kegiatan tempat
  mereka ditugaskan (`PenugasanPenguji.status = 'approved'`).

## 5. Verifikasi

- **Unit (API):** 85 suite / 1270 tes lulus, termasuk 17 tes baru:
  `scope-helpers.spec.ts` (14), self-scope isolation di `members` (3) + `search` (2).
- **e2e HTTP** terhadap API berjalan (token JWT asli, role `anggota`):
  `documents`, `members`, `search`, `org-documents`, `calendar`, `activities`, `trainings`,
  `forum/categories`, `members/me`, `members/:self/documents` → semua 200 dengan data terisolasi;
  `superadmin` tetap melihat seluruh data.
- **Web:** 41 file / 518 tes lulus. **Lint:** 0 error. **`tsc --noEmit`:** bersih.

## 6. Pencegahan Kekambuhan

1. Jangan pernah deteksi "admin nasional" dengan `!scope.rantingId` — pakai `isSelfScope()`.
2. Setiap modul yang mengekspos data pribadi anggota **wajib** memanggil
   `buildSelfScopeFilter()` / `isOwnMemberRow()` selain filter hierarki.
3. Bucket cache untuk scope `self` harus memakai `selfCacheSegment()` agar tidak berbagi
   entri dengan anggota lain atau admin.
4. Model `kegiatan`/pendadaran hanya boleh difilter via `buildKegiatanScopeFilter()`.

   anggota akan diperlakukan sebagai admin nasional.

Akibatnya, saat guard diperbaiki agar anggota lolos, **data pribadi anggota lain menjadi
terlihat** (members, documents, search) karena banyak service hanya memakai filter hierarki
ranting, bukan filter "milik sendiri".

## 2. Dampak

| Yang terpengaruh                          | Sebelum                      | Sesudah                              |
| ----------------------------------------- | ---------------------------- | ------------------------------------ |
| Login & semua endpoint `anggota`/`penguji`| 403 di seluruh modul         | 200, berfungsi normal                |
| `GET /members`, `GET /documents` (anggota)| (403 — tidak bisa diuji)     | hanya record milik sendiri           |
| `GET /search?q=...` (anggota)             | (403)                        | tidak mengekspos anggota lain        |
| `GET /calendar/events` (anggota)          | (403)                        | 200 — bug Prisma laten ikut terlihat |
| `GET /members/:otherId` (anggota)         | (403)                        | 403 Forbidden — akses antar-anggota  |

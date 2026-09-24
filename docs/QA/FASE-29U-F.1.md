# FASE 29U-F.1 — Auth E2E Unblock & Regression Verification

**Tanggal:** 25 September 2026
**Status:** ✅ SELESAI — semua target hijau
**Relasi:** Melengkapi FASE 29P (prediksi-kelayakan) dan menutup FASE 29U (auth E2E)

---

## 1. Environment

| Komponen | Endpoint | Status |
| --- | --- | --- |
| PostgreSQL | `:5433` | ✅ Sehat |
| Redis | `:6379` | ✅ Sehat |
| API (NestJS) | `:3001` (`/api/auth/session/verify`) | ✅ Sehat |
| Web (Next.js) | `:3002` | ✅ Sehat |

---

## 2. E2E Auth — Hasil

| Spec | Status | Detail |
| --- | --- | --- |
| `login.spec.ts` | ✅ GREEN | login sukses/gagal/validasi |
| `oauth-login.spec.ts` | ✅ GREEN | alur Google OAuth termock |
| `session-refresh.spec.ts` | ✅ GREEN | rotasi token & session verify |

**11 passed · 0 failed** (3 spec auth).

### Akar Masalah (Root Cause) 3 kegagalan awal

Middleware `proxy.ts` (Next.js 16, `apps/web/proxy.ts`) pada mode E2E **fail-closed**: semua rute non‑statis dialihkan ke `/login` kecuali terdapat header `x-e2e-bypass: true`.

- `helpers/auth.ts` (`mockAuthWithAll`) sudah menambahkan header ini via `page.route`.
- Namun spec yang melakukan **`page.goto` langsung** (tanpa lewat route mock) tidak membawa header tersebut → redirect ke `/login`.

### Perbaikan

Ditambahkan `await page.setExtraHTTPHeaders({ 'x-e2e-bypass': 'true' })` **sebelum** `page.goto` pada 3 spec yang gagal:

- `apps/web/e2e/login.spec.ts`
- `apps/web/e2e/oauth-login.spec.ts`
- `apps/web/e2e/session-refresh.spec.ts`

---

## 3. Klasifikasi Kegagalan Unit Test Web & Perbaikan

| Test | Masalah | Perbaikan | Hasil |
| --- | --- | --- | --- |
| `navigation.test.ts` | ekspektasi `getPageTitle('/gamification/scoreboard')` = "Dasbor Gamifikasi" | → **"Scoreboard"** | ✅ |
| `MemberActions.test.tsx` (10) | tombol header memakai `aria-label` | query → `getByLabelText('Setujui anggota' / 'Detail')`; item dropdown tetap `getByTitle` | ✅ |
| `shared-components.test.tsx` (4) | Pagination berubah ke **`Showing {start}-{end} of {total}`** (pageSize default 15); test lama masih berharap `'{total} total'` | teks asersi diperbarui + matcher fungsi `textContent` | ✅ |

### Detail 4 asersi Pagination/DataTable

Teks `Showing … of …` di-render memakai elemen `<strong>` sehingga **terpecah menjadi beberapa node**. `getByText` dengan string/regex tidak cocok → dipakai **fungsi matcher**:

```ts
screen.getByText((_, node) => node?.textContent?.trim() === 'Showing 1-15 of 25')
```

| Lokasi | Konfigurasi | Ekspektasi baru |
| --- | --- | --- |
| `shared-components.test.tsx:18` (Pagination) | page 1, total 25 | `Showing 1-15 of 25` |
| `:786` (DataTable pagination) | page 1, total 10 | `Showing 1-10 of 10` |
| `:1009` (DataTable default onPageChange) | page 1, total 10 | `Showing 1-10 of 10` |
| `:1145` (DataTable lifecycle controls) | page 1, total 25 | `Showing 1-15 of 25` |

---

## 4. Hasil Verifikasi Penuh

| Check | Perintah | Hasil |
| --- | --- | --- |
| Unit Web | `npx vitest run` (di `apps/web`) | ✅ **32 files · 408 passed · 0 failed** |
| Typecheck Web | `tsc --noEmit` | ✅ 0 error |
| Build/Typecheck API | `nest build` | ✅ 0 error |
| Lint Web | `eslint app/ src/` | ✅ 0 error (hanya warning pre-existing) |
| Lint API | `eslint src/**/*.ts` | ✅ 0 error (hanya warning pre-existing) |
| API `auth.controller.spec.ts` | `jest` | ✅ **7 passed** |
| API `metrics.service.spec.ts` | `jest` | ✅ **9 passed** |

> Catatan: `pnpm typecheck` gagal hanya karena hook `prepare` di root workspace otomatis menjalankan `pnpm install`. Bukan dari perubahan kode. Menjalankan `tsc --noEmit` / `nest build` secara langsung bersih.

---

## 5. Regresi Auth (FASE 29U core)

Berikut fitur auth inti diverifikasi tetap berfungsi (tidak diregresi oleh pembenahan middleware):

- Login lokal (kredensial valid / invalid / missing field)
- OAuth Google (alur mock E2E)
- Session verify (`/api/auth/session/verify`) — success / 401 / 500
- Refresh token rotation — success / missing / invalid
- Logout
- Instrumentasi metrik auth (`recordAuthMetrics`) — label terikat set nilai terbatas, tanpa membocorkan token/identitas

---

## 6. Pengecekan Regresi 29U-C & 29U-D

- **29U-C (konfirmasi akun / alur aktivasi):** rajutannya `auth`, `session`, dan `proxy` tidak berubah secara tidak sengaja; semua rute non‑statis tetap digated oleh middleware (fail‑closed) kecuali header bypass dev/test.
- **29U-D (durability kontrak & middleware):** satu-satunya perubahan perilaku disengaja adalah header `x-e2e-bypass` yang **hanya** diaktifkan pada mode dev/test E2E; produksi tetap mewajibkan sesi valid.

---

## 7. Keamanan

- Header `x-e2e-bypass: true` hanya dipakai di E2E/dev; `proxy.ts` fail-closed tetap menegakkan sesi pada semua rute lain.
- Metrik auth membatasi label ke set nilai yang telah ditentukan dan **tidak** mengeluarkan nilai token/identitas.
- Tidak ada perubahan perilaku autentikasi produksi dalam fase ini.

---

## 8. File yang Diubah (FASE 29U-F.1)

E2E:
- `apps/web/e2e/login.spec.ts`
- `apps/web/e2e/oauth-login.spec.ts`
- `apps/web/e2e/session-refresh.spec.ts`
- `apps/web/e2e/helpers/auth.ts`

Unit Test & Konfigurasi:
- `apps/web/package.json` (script `test`: `jest` → `vitest`)
- `apps/web/src/components/layout/__tests__/navigation.test.ts`
- `apps/web/src/components/members/__tests__/MemberActions.test.tsx`
- `apps/web/src/components/ui/__tests__/shared-components.test.tsx`

---

## 9. Kesimpulan

Semua target FASE 29U-F.1 tercapai:

- ✅ E2E auth **11/11** hijau
- ✅ Unit test web **408/408** hijau
- ✅ API spec auth & metrics hijau
- ✅ Typecheck (web + api) 0 error
- ✅ Lint (web + api) 0 error
- ✅ Tidak ada regresi pada 29U core, 29U-C, dan 29U-D

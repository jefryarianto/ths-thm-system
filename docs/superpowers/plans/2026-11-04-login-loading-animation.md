# Login Loading Animation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Mengganti spinner logo berputar (inline + overlay fullscreen) di halaman login dengan tombol morph → shimmer → centang sukses plus daftar 3 langkah progres di dalam kartu login.

**Architecture:** Satu komponen presentasional baru (`LoginSteps` + `SuccessCheck`) di `src/components/login/`, keyframes CSS kustom di `globals.css` (tanpa dependency baru), dan state machine tambahan `success` di `page.tsx`. Overlay fullscreen dihapus total.

**Tech Stack:** Next.js 16 (App Router), React 19, Tailwind CSS 3.4, Vitest + Testing Library (jsdom), Playwright.

**Spec:** desain A+B yang disetujui di sesi brainstorming 2026-11-04 — state: `idle → loading (shimmer + steps) → success (check draw) → redirect`, error kembali `idle`.

## Global Constraints

- Tanpa dependency baru (larang menambah framer-motion/motion/dll).
- `data-testid="login-submit"` pada tombol submit wajib dipertahankan (dipakai E2E).
- Hanya halaman login yang diubah; `LogoSpinner`/`SmallLogoSpinner` di file lain (~70 pemakaian) tidak disentuh.
- Teks langkah (persis): `Memverifikasi kredensial`, `Membuat sesi aman`, `Mengalihkan ke dashboard`.
- Delay navigasi sukses: `300ms → 600ms`.
- Semua animasi wajib punya fallback `@media (prefers-reduced-motion: reduce)` → state statis.
- Bahasa teks UI: Indonesia; komponen di bawah `src/components/<fitur>/` dengan test di `__tests__/`.

## Review Focus

1. **E2E `getByRole('button', { name: /masuk/i })`** — label tombol berubah saat loading/sukses; pastikan tombol idle tetap "Masuk" dan test `e2e/login.spec.ts` tetap lolos → Task 3 jalankan Playwright penuh.
2. **Cabang `mustChangePassword`** — `setSuccess(true)` harus dieksekusi sebelum `router.push`, kalau tidak tombol terlihat idle saat redirect → langkah eksplisit di Task 2.
3. **`prefers-reduced-motion`** — user sensitif gerak harus melihat state statis, bukan shimmer/check beranimasi → Task 1, verifikasi inspeksi CSS.
4. **`?session_invalid=1` / login ulang** — state `success` harus di-reset di awal `handleSubmit` agar tidak nyangkut → Task 2.
5. **Hydration** — daftar langkah hanya muncul setelah `loading/success` jadi true (interaksi client), tidak boleh muncul di HTML SSR → Task 2 (tidak ada render kondisional baru saat initial render).

---

### Task 1: Komponen `LoginSteps` + `SuccessCheck` + keyframes CSS

**Files:**
- Create: `apps/web/src/components/login/login-progress.tsx`
- Create: `apps/web/src/components/login/__tests__/login-progress.test.tsx`
- Modify: `apps/web/app/globals.css` (blok keyframes baru setelah `@keyframes logo-spinner-rotation`, ± baris 371)

**Interfaces:**
- Produces:
  - `export function LoginSteps({ doneCount, activeIndex }: { doneCount: number; activeIndex: number })` → `<ol data-testid="login-steps">` berisi 3 item berlabel persis: `Memverifikasi kredensial`, `Membuat sesi aman`, `Mengalihkan ke dashboard`; tiap `<li>` membawa `data-state="done" | "active" | "pending"` (i < doneCount → done; i === activeIndex → active; sisanya pending).
  - `export function SuccessCheck({ className }: { className?: string })` → `<svg class="success-check">` dengan `<path>` checkmark (tanpa teks).
  - CSS classes: `.btn-shimmer` (sapuan gradient via `@keyframes shimmer-sweep`), `.success-check path` (`@keyframes check-draw`), `.login-step-active`, plus override `prefers-reduced-motion`.

- [ ] **Step 1: Tulis test yang gagal**

```tsx
// apps/web/src/components/login/__tests__/login-progress.test.tsx
import { render, screen } from '@testing-library/react';
import { LoginSteps, SuccessCheck } from '../login-progress';

it('merender 3 langkah dengan label persis', () => {
  render(<LoginSteps doneCount={0} activeIndex={0} />);
  expect(screen.getByText('Memverifikasi kredensial')).toBeInTheDocument();
  expect(screen.getByText('Membuat sesi aman')).toBeInTheDocument();
  expect(screen.getByText('Mengalihkan ke dashboard')).toBeInTheDocument();
  const items = screen.getAllByRole('listitem');
  expect(items[0]).toHaveAttribute('data-state', 'active');
  expect(items[1]).toHaveAttribute('data-state', 'pending');
  expect(items[2]).toHaveAttribute('data-state', 'pending');
});

it('menandai langkah selesai saat doneCount bertambah', () => {
  render(<LoginSteps doneCount={2} activeIndex={2} />);
  const items = screen.getAllByRole('listitem');
  expect(items[0]).toHaveAttribute('data-state', 'done');
  expect(items[1]).toHaveAttribute('data-state', 'done');
  expect(items[2]).toHaveAttribute('data-state', 'active');
});

it('SuccessCheck merender svg checkmark', () => {
  const { container } = render(<SuccessCheck />);
  expect(container.querySelector('svg.success-check')).toBeInTheDocument();
  expect(container.querySelector('path')).toBeInTheDocument();
});
```

- [ ] **Step 2: Jalankan test, pastikan FAIL**

Run: `pnpm --filter @ths-thm/web exec vitest run src/components/login`
Expected: FAIL — module `../login-progress` tidak ditemukan.

- [ ] **Step 3: Implement komponen di `login-progress.tsx`**

`LoginSteps` meng-iterasi `STEPS` (3 label di atas), menentukan `data-state` per aturan, ikon per state memakai `Check`/`Circle` dari `lucide-react`. `SuccessCheck` SVG `viewBox="0 0 24 24"`, path check `M5 13l4 4L19 7`, class `success-check`.

- [ ] **Step 4: Tambah keyframes di `globals.css`**

`@keyframes shimmer-sweep`, `@keyframes check-draw`, `.btn-shimmer`, `.success-check path`, `.login-step-active`, dan `@media (prefers-reduced-motion: reduce)` yang mematikan animasi.

- [ ] **Step 5: Jalankan test, pastikan PASS + lint**

Run: `pnpm --filter @ths-thm/web exec vitest run src/components/login` → PASS (3 test).
Run: `pnpm --filter @ths-thm/web lint` → tanpa error baru.

- [ ] **Step 6: Commit**

```bash
git add apps/web/src/components/login apps/web/app/globals.css
git commit -m "feat(web): komponen LoginSteps & SuccessCheck dengan animasi shimmer/check"
```

---

### Task 2: Wiring state machine di halaman login

**Files:**
- Modify: `apps/web/app/login/page.tsx` (state 114-123, handleSubmit 218-269, tombol 565-582, banner 451-457, overlay 701-706, import 27)

**Interfaces:**
- Consumes: `LoginSteps`, `SuccessCheck` dari Task 1.

- [ ] **Step 1: Hapus `successMessage` (duplikatif dengan state success)**

Hapus: deklarasi `successMessage` (baris 120), reset `setSuccessMessage('')` (222), `setSuccessMessage('Login berhasil! Mengalihkan...')` (251), dan blok banner `{successMessage && (...)}` (451-457).

- [ ] **Step 2: Tambah state `success` + reset + set**

Tambah `const [success, setSuccess] = useState(false);` dekat `loading`. Di awal `handleSubmit`: `setSuccess(false)`. Setelah `setTokens(...)` & penyimpanan user: `setSuccess(true)` — **sebelum** kedua cabang redirect (`mustChangePassword` → `router.push('/force-change-password')` dan jalur normal).

- [ ] **Step 3: Ubah delay & disabled**

`setTimeout(..., 300)` → `600`. Tombol: `disabled={loading || success}`, `aria-busy={loading}`.

- [ ] **Step 4: Ganti isi tombol jadi 4 varian**

- idle: `Masuk`
- loading: `<span className="btn-shimmer">Memverifikasi...</span>` (tanpa `SmallLogoSpinner`)
- success: `<SuccessCheck className="h-5 w-5" /> Berhasil, mengalihkan...` dengan latar `bg-success`
Pertahankan `data-testid="login-submit"`, `type="submit"`, kelas tinggi `h-[54px]`/`rounded-xl`.

- [ ] **Step 5: Render langkah + hapus overlay**

Setelah tombol: `{(loading || success) && <LoginSteps doneCount={success ? 2 : 0} activeIndex={success ? 2 : 0} />}`. Hapus blok overlay fullscreen (701-706). Hapus `SmallLogoSpinner` dari import (baris 27) — `LogoSpinner` tetap dipakai layar "Anda sudah masuk".

- [ ] **Step 6: Verifikasi statis**

Run: `pnpm --filter @ths-thm/web typecheck` → EXIT 0.
Run: `pnpm --filter @ths-thm/web lint` → tanpa error baru.
Run: `pnpm --filter @ths-thm/web exec vitest run` → seluruh suite PASS.

- [ ] **Step 7: Commit**

```bash
git add apps/web/app/login/page.tsx
git commit -m "feat(web): animasi login modern - tombol morph shimmer + langkah progres"
```

---

### Task 3: Verifikasi E2E & manual

**Files:** tanpa perubahan kode (hanya verifikasi).

- [ ] **Step 1: Jalankan E2E login**

Jalankan API dev (`pnpm --filter @ths-thm/api dev`) lalu dari `apps/web`: `npx playwright test e2e/login.spec.ts e2e/oauth-login.spec.ts`.
Expected: test `login.spec.ts` PASS.

- [ ] **Step 2: Checklist manual di browser (`pnpm --filter @ths-thm/web dev`)**

1. Login benar → shimmer + 3 langkah → centang hijau "Berhasil, mengalihkan..." → dashboard.
2. Login salah → banner merah, tombol kembali "Masuk", langkah hilang.
3. Akses `/login` saat sudah login → layar "Anda sudah masuk" (tidak berubah).
4. DevTools → Rendering → *prefers-reduced-motion* → animasi statis.

- [ ] **Step 3: Push & tunggu CI hijau**

```bash
git push origin master
```
Expected: `CI/CD Pipeline` + `🧪 E2E Tests` success.

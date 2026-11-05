# Login Animation Pacing Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Memberi ritme pada alur login: langkah progres berjalan bertahap (600ms/1100ms), loading minimal 1400ms, dwell sukses 900ms sebelum redirect.

**Architecture:** State `step` (0–2) + konstanta durasi di `apps/web/app/login/page.tsx`; timer langkah dibersihkan saat submit ulang/unmount; sukses dijadwalkan `Math.max(0, MIN_LOADING_MS - elapsed)` setelah respons API. E2E deterministik dengan `page.clock`.

**Tech Stack:** Next.js 16, React 19, Vitest, Playwright (`page.clock`).

**Spec:** `docs/superpowers/specs/2026-11-04-login-animation-pacing-design.md`

## Global Constraints

- Nilai waktu persis: `STEP_2_AT_MS=600`, `STEP_3_AT_MS=1100`, `MIN_LOADING_MS=1400`, `SUCCESS_DWELL_MS=900`.
- Error API tampil segera (tidak menunggu `MIN_LOADING_MS`); timer dibatalkan.
- API lebih lambat dari 1400ms: langkah 3 tetap aktif, tanpa delay tambahan.
- Tidak ada perubahan CSS, API, atau dependency baru.
- `data-testid="login-submit"` dan `data-testid="login-steps"` dipertahankan.
- Timer tidak boleh bocor: dibersihkan saat submit ulang dan unmount.

## Review Focus

1. **Submit ganda** — tombol `disabled` selama loading/sukses; timer lama dibersihkan agar langkah tidak melompat.
2. **Error cepat** — respons error saat t<1400ms harus langsung menampilkan banner dan menghapus langkah.
3. **Unmount saat timer hidup** — berpindah halaman di tengah animasi tidak boleh memicu `setState` setelah unmount.
4. **API lambat** — tiba >1400ms tidak menambah delay kedua.
5. **Reduced motion** — timeline baru tetap menghormati `prefers-reduced-motion` (tanpa animasi CSS, progres tetap terlihat).

---

### Task 1: Progres bertahap + durasi minimum + dwell sukses

**Files:**
- Modify: `apps/web/app/login/page.tsx` (state ~121, `handleSubmit` ~218-262)
- Modify: `apps/web/e2e/login-animation.spec.ts`

**Interfaces:**
- Produces: perilaku timeline di atas; `LoginSteps` tetap dipakai dengan `doneCount=step, activeIndex=step` saat loading dan `doneCount=2, activeIndex=2` saat sukses.

- [ ] **Step 1: Perbarui test E2E agar gagal (RED)**

Ganti isi `apps/web/e2e/login-animation.spec.ts` dengan dua test berikut (mock login **tanpa delay**, `page.clock` mengendalikan waktu):

```ts
import { test, expect, Page } from '@playwright/test';
import { mockLoginSuccess } from './helpers';

async function mockDashboard(page: Page) {
  await page.route(/\/api\/reports\/dashboard/, (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ success: true, data: { stats: [], recentActivities: [], notifications: [] } }),
    }),
  );
  await page.route(/\/api\/notifications\/count/, (route) =>
    route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ success: true, data: { count: 0 } }) }),
  );
}

async function submitValidLogin(page: Page) {
  await page.setExtraHTTPHeaders({ 'x-e2e-bypass': 'true' });
  await page.goto('/login');
  await page.locator('#identifier').fill('superadmin@ths.thm.org');
  await page.fill('input[type="password"]', 'password123');
  await page.getByTestId('login-submit').click();
}

test.describe('Login loading animation', () => {
  test('langkah berjalan bertahap lalu sukses setelah durasi minimum', async ({ page }) => {
    await page.clock.install();
    await mockLoginSuccess(page);
    await mockDashboard(page);
    await submitValidLogin(page);

    const submit = page.getByTestId('login-submit');
    const steps = page.getByTestId('login-steps');
    const items = steps.getByRole('listitem');

    await expect(items.nth(0)).toHaveAttribute('data-state', 'active');

    await page.clock.runFor(650);
    await expect(items.nth(0)).toHaveAttribute('data-state', 'done');
    await expect(items.nth(1)).toHaveAttribute('data-state', 'active');

    await page.clock.runFor(500);
    await expect(items.nth(1)).toHaveAttribute('data-state', 'done');
    await expect(items.nth(2)).toHaveAttribute('data-state', 'active');

    await expect(submit).toContainText('Memverifikasi');
    await page.clock.runFor(300);

    await expect(submit).toContainText('Berhasil, mengalihkan');
    await expect(submit).not.toHaveClass(/btn-shimmer/);
    await expect(submit).not.toHaveAttribute('aria-busy', 'true');
    await expect(submit).toHaveCSS('background-color', 'rgb(27, 127, 75)');

    await page.clock.runFor(850);
    await expect(page).toHaveURL(/\/login/);
    await page.clock.runFor(100);
    await expect(page).toHaveURL(/\/dashboard/, { timeout: 15000 });
  });

  test('menghormati prefers-reduced-motion pada langkah dan centang', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.clock.install();
    await mockLoginSuccess(page);
    await mockDashboard(page);
    await submitValidLogin(page);

    const submit = page.getByTestId('login-submit');
    const steps = page.getByTestId('login-steps');
    await expect(steps).toBeVisible();
    expect(await steps.evaluate((el) => getComputedStyle(el).animationName)).toBe('none');

    await page.clock.runFor(1450);
    await expect(submit).toContainText('Berhasil, mengalihkan');
    expect(
      await page.locator('svg.success-check path').evaluate((el) => getComputedStyle(el).animationName),
    ).toBe('none');

    await page.clock.runFor(950);
    await expect(page).toHaveURL(/\/dashboard/, { timeout: 15000 });
  });
});
```

- [ ] **Step 2: Jalankan test, pastikan FAIL**

Run: `npx playwright test e2e/login-animation.spec.ts --reporter=line` (dari `apps/web`).
Expected: FAIL — setelah `runFor(650)`, langkah 1 belum `done`; sukses muncul terlalu cepat/terlambat.

- [ ] **Step 3: Implementasi state machine di `page.tsx`**

Tambah konstanta modul di dekat `FORCE_CHANGE_TOKEN_KEY`:

```ts
const STEP_2_AT_MS = 600;
const STEP_3_AT_MS = 1100;
const MIN_LOADING_MS = 1400;
const SUCCESS_DWELL_MS = 900;
```

Tambah state `const [step, setStep] = useState(0);` dan ref timer `const timersRef = useRef<ReturnType<typeof setTimeout>[]>([]);` beserta helper `clearTimers()` dan efek cleanup unmount.

Di `handleSubmit`: reset `step=0`, bersihkan timer lama, catat `const startedAt = Date.now()`, jadwalkan `setStep(1)` @600ms dan `setStep(2)` @1100ms. Pada respons sukses: hitung `wait = Math.max(0, MIN_LOADING_MS - (Date.now() - startedAt))`, lalu `setTimeout(() => { bersihkan timer langkah; setSuccess(true); setLoading(false); ... }, wait)`; di dalamnya jadwalkan redirect `SUCCESS_DWELL_MS`. Pada catch: bersihkan timer, `setLoading(false)`, `setStep(0)`, tampilkan error segera.

Render: `LoginSteps` saat `loading || success` dengan `doneCount={success ? 2 : step}` dan `activeIndex={success ? 2 : step}`.

- [ ] **Step 4: Jalankan test, pastikan PASS**

Run: `npx playwright test e2e/login-animation.spec.ts --reporter=line`
Expected: `2 passed`.

- [ ] **Step 5: Verifikasi suite + typecheck + lint**

Run: `pnpm --filter @ths-thm/web exec vitest run` → semua PASS.
Run: `pnpm --filter @ths-thm/web typecheck` → EXIT 0.
Run: `pnpm --filter @ths-thm/web lint` → 0 error baru.
Run: `npx playwright test e2e/login.spec.ts e2e/oauth-login.spec.ts --reporter=line` → PASS.

- [ ] **Step 6: Commit**

```bash
git add apps/web/app/login/page.tsx apps/web/e2e/login-animation.spec.ts
git commit -m "feat(web): ritme animasi login bertahap (1400ms loading, 900ms sukses)"
```

---

### Task 2: Dwell sukses pada cabang `mustChangePassword`

**Files:**
- Modify: `apps/web/app/login/page.tsx` (cabang `mustChangePassword` di `handleSubmit`)
- Modify: `apps/web/e2e/login-animation.spec.ts` (tambah test)

**Interfaces:**
- Consumes: konstanta dan mekanisme dwell dari Task 1.

- [ ] **Step 1: Tambah test gagal (RED)**

Tambah test berikut ke `login-animation.spec.ts`; override route login dengan pengguna `mustChangePassword` sebelum navigasi:

```ts
test('cabang mustChangePassword menampilkan sukses sebelum pindah', async ({ page }) => {
  await page.clock.install();
  await mockLoginSuccess(page);
  await page.route(/\/api\/auth\/login/, (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        success: true,
        data: {
          accessToken: 'e2e-access',
          refreshToken: 'e2e-refresh',
          user: { id: 'u1', email: 'superadmin@ths.thm.org', role: 'superadmin', mustChangePassword: true },
          resetToken: 'reset-e2e',
        },
      }),
    }),
  );
  await mockDashboard(page);
  await submitValidLogin(page);

  const submit = page.getByTestId('login-submit');
  await page.clock.runFor(1450);
  await expect(submit).toContainText('Berhasil, mengalihkan');
  await expect(page).toHaveURL(/\/login/);

  await page.clock.runFor(950);
  await expect(page).toHaveURL(/\/force-change-password/, { timeout: 15000 });
});
```

Catatan: override route didaftarkan setelah `mockLoginSuccess` sehingga handler terbaru menang.

- [ ] **Step 2: Jalankan test, pastikan FAIL**

Run: `npx playwright test e2e/login-animation.spec.ts --reporter=line --grep "mustChangePassword"`
Expected: FAIL — URL langsung `/force-change-password` tanpa dwell.

- [ ] **Step 3: Implementasi dwell**

Di cabang `mustChangePassword`, setelah penyimpanan `FORCE_CHANGE_TOKEN_KEY`, jadwalkan `router.push('/force-change-password')` dengan `SUCCESS_DWELL_MS` (state sukses sudah diset sebelumnya oleh Task 1).

- [ ] **Step 4: Jalankan test, pastikan PASS**

Run: `npx playwright test e2e/login-animation.spec.ts --reporter=line`
Expected: `3 passed`.

- [ ] **Step 5: Verifikasi suite + commit**

Run: `pnpm --filter @ths-thm/web exec vitest run` → PASS; `pnpm --filter @ths-thm/web typecheck` → EXIT 0; `pnpm --filter @ths-thm/web lint` → 0 error baru.

```bash
git add apps/web/app/login/page.tsx apps/web/e2e/login-animation.spec.ts
git commit -m "fix(web): dwell sukses pada login mustChangePassword"
```

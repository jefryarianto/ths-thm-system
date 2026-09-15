import { test, expect } from '@playwright/test';
import fs from 'fs';
import path from 'path';

/**
 * Regression guard untuk middleware auth (src/middleware.ts).
 *
 * Setiap halaman publik HARUS bisa diakses tanpa sesi. Bug nyata yang sudah
 * terjadi dua kali: halaman publik baru dilupakan di allowlist middleware
 * (publicPaths), sehingga pengunjung anonim dialihkan 307 ke /login —
 * pertama pada /struktur-organisasi (16 test E2E merah berhari-hari),
 * kedua pada landing page root "/" (CI Smoke Test gagal karena health check
 * GET / mengharapkan 200/302).
 *
 * Spesifikasi ini mencegah kambuhnya dengan tiga lapis:
 *   1. Kunjungi SETIAP halaman publik tanpa cookie, lalu pastikan halaman
 *      dirender (marker h1 khas masing-masing) dan tidak ada redirect ke /login.
 *   2. Deteksi redirect via event response (menangkap kasus marker h1 yang
 *      sama dengan halaman login, mis. "THS-THM").
 *   3. Bandingkan daftar route level-atas dari build Next.js (routes-manifest)
 *      dengan klasifikasi publik/terproteksi — route publik baru yang belum
 *      masuk allowlist middleware akan langsung memicu kegagalan di sini.
 */

const BASE = process.env.E2E_BASE_URL || 'http://localhost:3002';

interface PublicPage {
  path: string;
  /** Regex yang HARUS dicocokkan oleh heading h1 halaman (bukan halaman login). */
  heading: RegExp;
}

/**
 * Halaman publik. Marker heading diambil dari teks yang dirender SSR
 * (sebagian dari i18n translations.ts), sehingga tidak bergantung pada
 * data API yang dimuat sisi klien.
 */
const PUBLIC_PAGES: PublicPage[] = [
  { path: '/landing', heading: /TUNGGAL HATI/i },
  { path: '/sejarah', heading: /Sejarah THS-THM/i },
  { path: '/organisasi', heading: /Struktur Organisasi/i },
  { path: '/kepengurusan', heading: /Kepengurusan/i },
  { path: '/struktur-organisasi', heading: /Struktur Organisasi/i },
  { path: '/berita', heading: /Berita & Artikel/i },
  { path: '/galeri', heading: /Galeri/i },
  { path: '/donasi', heading: /Donasi/i },
  { path: '/login', heading: /^THS-THM$/ },
  { path: '/daftar', heading: /Pendaftaran Anggota Baru/i },
  { path: '/forgot-password', heading: /^THS-THM$/ },
  { path: '/reset-password', heading: /^THS-THM$/ },
  { path: '/public/leaderboard', heading: /Leaderboard/i },
];

/**
 * Route publik exact-match via publicExactPaths middleware (bukan startsWith).
 * Root "/" adalah halaman router sisi klien (app/page.tsx): merender null lalu
 * mengalihkan — user terautentikasi ke home per-role, anonim ke /login. Karena
 * itu tidak punya h1 dan tidak ikut uji render PUBLIC_PAGES; yang diuji adalah
 * respons HTTP 200 dari middleware (bukan 307) dan alur pengalihannya.
 */
const PUBLIC_EXACT_ROUTES = ['/'];

/**
 * Halaman dashboard yang dilindungi middleware. Ketika route baru ditambahkan
 * dan sengaja diproteksi, tambahkan di sini supaya lapisan cross-check (uji
 * terakhir) tidak gagal. Route yang HILANG dari build juga akan terdeteksi.
 */
const PROTECTED_ROUTES = [
  '/dashboard',
  '/members',
  '/users',
  '/candidates',
  '/activities',
  '/trainings',
  '/graduations',
  '/assessments',
  '/examiners',
  '/dues',
  '/payments',
  '/documents',
  '/org-documents',
  '/org-chart',
  '/letters',
  '/claims',
  '/forum',
  '/chat',
  '/notifications',
  '/approvals',
  '/registrations',
  '/calendar',
  '/reports',
  '/scan-stats',
  '/profile',
  '/settings',
  '/admin',
  '/audit-logs',
  '/monitoring',
  '/ws-monitor',
  '/storybook',
  '/style-guide',
  '/test-batch-progress',
  '/force-change-password',
  '/gamification',
];

/** Route internal Next.js yang muncul di manifest tapi bukan halaman aplikasi. */
const NEXT_INTERNAL_ROUTES = ['/_global-error', '/_not-found', '/_app', '/_document', '/_error'];

/**
 * Mock minimal untuk endpoint publik yang dipanggil saat halaman dimuat.
 * Tanpa ini halaman tetap dirender (ada error state), tapi spinner/loading
 * bisa memperlambat test — cukup balas sukses dengan data kosong.
 */
async function mockPublicApis(page: import('@playwright/test').Page) {
  const emptyOk =
    (data: unknown = []) =>
    (route: import('@playwright/test').Route) =>
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ success: true, data }),
      });

  await page.route('**/api/public/berita*', emptyOk([]));
  await page.route('**/api/public/bank-info', emptyOk([]));
  await page.route('**/api/public/donasi-program', emptyOk([]));
  await page.route('**/api/public/kepengurusan*', emptyOk([]));
  await page.route('**/api/public/organisasi', emptyOk(null));
  await page.route('**/api/public/sejarah', emptyOk(null));
  await page.route('**/api/public/beranda', emptyOk(null));
  await page.route('**/api/gamification/public/leaderboard*', emptyOk([]));
  await page.route('**/api/public/struktur/**', emptyOk([]));
}

test.describe('Public Pages — middleware allowlist regression guard', () => {
  test.beforeEach(async ({ page }) => {
    await mockPublicApis(page);
  });

  for (const pub of PUBLIC_PAGES) {
    test(`halaman publik ${pub.path} dirender tanpa dialihkan ke /login`, async ({ page }) => {
      // Deteksi redirect berbasis event response — menangkap kasus ketika
      // middleware mengalihkan ke /login sebelum halaman sempat dirender.
      const loginRedirects: string[] = [];
      page.on('response', (response) => {
        const isNav = response.request().isNavigationRequest();
        const isRedirect = [301, 302, 303, 307, 308].includes(response.status());
        if (isNav && isRedirect && response.url().includes('/login')) {
          loginRedirects.push(`${response.status()} ${response.url()}`);
        }
      });

      await page.goto(`${BASE}${pub.path}`);

      // Halaman harus dirender — bukan spinner Suspense tanpa konten.
      const heading = page.getByRole('heading', { level: 1 }).first();
      await expect(heading).toBeVisible({ timeout: 10000 });
      const h1Text = (await heading.textContent()) ?? '';
      expect(h1Text).toMatch(pub.heading);

      // Tidak boleh ada redirect navigasi ke /login sama sekali.
      expect(loginRedirects).toEqual([]);
    });
  }

  test('root / menjawab HTTP 200 lalu mengalihkan anonim ke /login (router sisi klien)', async ({
    page,
  }) => {
    // Middleware TIDAK boleh mengalihkan root — halaman router-lah yang
    // menentukan tujuan berdasarkan sesi di localStorage.
    const rootStatuses: number[] = [];
    page.on('response', (response) => {
      if (response.request().isNavigationRequest() && new URL(response.url()).pathname === '/') {
        rootStatuses.push(response.status());
      }
    });

    await page.goto(`${BASE}/`);

    expect(rootStatuses, 'Root harus dilayani langsung (200), bukan dialihkan middleware').toEqual([
      200,
    ]);
    await expect(page).toHaveURL(/\/login/, { timeout: 10000 });
  });

  test('halaman dashboard terproteksi tetap mengarahkan pengunjung anonim ke /login', async ({
    page,
  }) => {
    for (const route of ['/dashboard', '/members', '/settings', '/org-chart']) {
      await page.goto(`${BASE}${route}`);
      await expect(page).toHaveURL(/\/login/, { timeout: 10000 });
    }
  });

  test('setiap route level-atas terklasifikasi publik atau terproteksi (anti-lupa allowlist)', async () => {
    const manifestPath = path.join(process.cwd(), '.next', 'routes-manifest.json');
    test.skip(
      !fs.existsSync(manifestPath),
      'routes-manifest.json tersedia hanya pada build production',
    );

    const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf-8'));
    const topLevelRoutes = (manifest.staticRoutes ?? [])
      .map((r: { page: string }) => r.page)
      .filter(
        (route: string) =>
          route.split('/').filter(Boolean).length <= 1 &&
          !NEXT_INTERNAL_ROUTES.includes(route) &&
          !route.includes('('),
      );

    const publicRouteSet = new Set([...PUBLIC_PAGES.map((p) => p.path), ...PUBLIC_EXACT_ROUTES]);

    // 1. Semua route yang tidak dikenal harus sudah diklasifikasikan —
    //    route publik baru yang belum masuk allowlist middleware akan
    //    gagal di sini sebelum sempat merusak test lain.
    const unclassified = topLevelRoutes.filter(
      (route: string) => !publicRouteSet.has(route) && !PROTECTED_ROUTES.includes(route),
    );
    expect(
      unclassified,
      `Route baru terdeteksi tanpa klasifikasi publik/terproteksi: ${unclassified.join(', ')}. ` +
        `Jika publik, tambahkan ke allowlist middleware (src/middleware.ts) dan ke PUBLIC_PAGES; ` +
        `jika terproteksi, tambahkan ke PROTECTED_ROUTES.`,
    ).toEqual([]);

    // 2. Semua route terklasifikasi level-atas harus benar-benar ada di build —
    //    menangkap halaman yang dihapus/di-rename tapi masih terdaftar di sini.
    //    (Route bersarang seperti /public/leaderboard tidak ada di daftar
    //    level-atas; kehilangannya sudah terdeteksi oleh uji render.)
    const topLevelSet = new Set(topLevelRoutes);
    const declaredDepth1 = [...publicRouteSet, ...PROTECTED_ROUTES].filter(
      (route) => route.split('/').filter(Boolean).length === 1,
    );
    const stale = declaredDepth1.filter((route) => !topLevelSet.has(route));
    expect(
      stale,
      `Route terdaftar di spesifikasi ini tapi tidak ada di build: ${stale.join(', ')}`,
    ).toEqual([]);
  });
});

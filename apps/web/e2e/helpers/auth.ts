import { Page } from '@playwright/test';
import { registerMembersMocks } from './members';
import { registerTrainingsMocks } from './trainings';
import { registerGamificationMocks } from './gamification';
import { registerImportMocks } from './import';
import { registerCandidatesMocks } from './candidates';
import { registerDashboardPageMocks } from './dashboard-pages';

/**
 * Mock user returned by /auth/me
 */
export const MOCK_USER = {
  id: 'mock-user-1',
  email: 'superadmin@ths-thm.org',
  namaLengkap: 'Super Admin',
  role: 'superadmin',
  isActive: true,
  rantingId: 'ranting-1',
  createdAt: '2024-01-01T00:00:00Z',
};

const MOCK_ACCESS_TOKEN = 'mock-access-token-for-e2e-tests';
const MOCK_REFRESH_TOKEN = 'mock-refresh-token-for-e2e-tests';

/**
 * Derive the web app base URL from environment (settable via E2E_BASE_URL).
 * This ensures the navigation bypass works regardless of which host the
 * test runner uses (local=3002, Docker/CI=web-e2e:3000 via E2E_BASE_URL).
 *
 * E2E_PORT mengikuti override port webServer di playwright.config.ts —
 * tanpa ini, catch-all mock terdaftar di port yang salah dan endpoint
 * yang tidak ter-mock spesifik mengenai API mati (artefak run terisolasi).
 */
const E2E_BASE_URL =
  process.env.E2E_BASE_URL || `http://localhost:${process.env.E2E_PORT || '3002'}`;

/**
 * Set up auth mocking for an authenticated test.
 *
 * IMPORTANT: In Playwright 1.60+, the LAST registered route handler wins
 * when multiple handlers match the same URL. This means:
 *   - Catch-all routes must be registered FIRST (they act as defaults)
 *   - Specific mock routes must be registered LAST (they override catch-alls)
 *
 * Registration order:
 * 1. Set up localStorage via addInitScript + cookies
 * 2. Register catch-all interceptors (navigation bypass + API fallback)
 * 3. Register auth API interceptors (override catch-all for auth endpoints)
 * 4. Register domain-specific API mocks (override catch-all for specific endpoints)
 */
export async function mockAuth(
  page: Page,
  options?: {
    mockMembers?: boolean;
    mockTrainings?: boolean;
    mockGamification?: boolean;
    mockImport?: boolean;
    mockCandidates?: boolean;
    mockDashboardPages?: boolean;
  },
) {
  // ── 1. Set auth cookies + localStorage (runs before any page JS) ──
await page.addInitScript(
     (params: { accessToken: string; refreshToken: string; user: string }) => {
       localStorage.setItem('accessToken', params.accessToken);
       localStorage.setItem('refreshToken', params.refreshToken);
       localStorage.setItem('user', params.user);
       // NOTE: accessToken cookie intentionally removed per FASE 29P
       // Only refreshToken cookie is used for session verification
       //
       // Cookie refreshToken TIDAK bisa ditulis via document.cookie karena
       // HttpOnly (verifikasi sesi Next.js membacanya lewat request cookie).
       // Kita minta server mock menyetelkannya ke cookie jar sungguhan:
       // request ini dicegat route di bawah dan dibalas dengan header
       // Set-Cookie — persis seperti yang dilakukan backend pada /auth/login.
       fetch('/api/auth/set-session-cookie', { method: 'POST' }).catch(() => {});
     },
     {
       accessToken: MOCK_ACCESS_TOKEN,
       refreshToken: MOCK_REFRESH_TOKEN,
       user: JSON.stringify(MOCK_USER),
     },
   );

  // Set-Cookie refreshToken ke cookie jar context (HttpOnly tersimpan rill).
  // Dipanggil juga sebagai fallback langsung di sini (di luar init script).
  await page.route(/\/api\/auth\/set-session-cookie/, async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      headers: {
        'set-cookie': `refreshToken=${MOCK_REFRESH_TOKEN}; Path=/; SameSite=Lax`,
      },
      body: JSON.stringify({ success: true, data: null }),
    });
  });
  await page.request.post(`${E2E_BASE_URL}/api/auth/set-session-cookie`).catch(() => {});

const cookieDomain = new URL(E2E_BASE_URL).hostname;
   await page.context().addCookies([
     // NOTE: accessToken cookie intentionally removed per FASE 29P
     // Only refreshToken cookie is used for session verification
     { name: 'refreshToken', value: MOCK_REFRESH_TOKEN, domain: cookieDomain, path: '/' },
   ]);

  // ── 2. Catch-all interceptors (registered FIRST — act as defaults) ──
  // These match broad URL patterns. Specific mocks registered later
  // will override them for matching URLs (last-registered wins).
  //
  // We must NOT intercept /_next/** or other asset requests — doing so
  // would replace the actual JavaScript chunks with our JSON stub, causing
  // "Unexpected token ':'" parse errors that prevent client-side hydration.

  // Navigation catch-all: add bypass header for server-side middleware auth check
  await page.route(`${E2E_BASE_URL}/**`, async (route, request) => {
    if (request.isNavigationRequest()) {
      await route.continue({
        headers: { 'x-e2e-bypass': 'true' },
      });
    } else {
      // Non-navigation, non-API request (e.g. /_next/static/chunks/*.js)
      // — let it through so assets load correctly.
      await route.continue();
    }
  });

  // API catch-all: unmocked API calls get an empty success response
  await page.route(`${E2E_BASE_URL}/api/**`, async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        success: true,
        data: [],
        meta: { total: 0, totalPages: 0, page: 1, limit: 10 },
      }),
    });
  });

  // ── 3. Auth API interceptors (override catch-all for auth endpoints) ──
  await page.route(/\/api\/auth\/me/, async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ success: true, data: MOCK_USER }),
    });
  });

  await page.route(/\/api\/auth\/refresh/, async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      // Samakan dengan backend sungguhan: cookie refreshToken HttpOnly ikut
      // diset pada response refresh (proxy Next.js memverifikasi cookie ini
      // di setiap navigasi halaman — tanpa cookie, user terjebak loop
      // /login?session_invalid=1).
      headers: {
        'set-cookie': `refreshToken=${MOCK_REFRESH_TOKEN}; Path=/; SameSite=Lax`,
      },
      body: JSON.stringify({
        success: true,
        data: { accessToken: MOCK_ACCESS_TOKEN, refreshToken: MOCK_REFRESH_TOKEN },
      }),
    });
  });

  await page.route(/\/api\/auth\/login/, async (route) => {
    if (route.request().method() === 'POST') {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        // Backend produksi menyetel cookie refreshToken pada response login —
        // proxy verifikasi sesi membaca cookie ini (BUKAN localStorage),
        // sehingga mock tanpa Set-Cookie memicu loop kick setelah login.
        headers: {
          'set-cookie': `refreshToken=${MOCK_REFRESH_TOKEN}; Path=/; SameSite=Lax`,
        },
        body: JSON.stringify({
          success: true,
          data: {
            accessToken: MOCK_ACCESS_TOKEN,
            refreshToken: MOCK_REFRESH_TOKEN,
            user: MOCK_USER,
          },
        }),
      });
    } else {
      await route.continue();
    }
  });

  // ── 4. Domain-specific API mocks (registered LAST — override catch-all) ──
  if (options?.mockMembers) await registerMembersMocks(page);
  if (options?.mockTrainings) await registerTrainingsMocks(page);
  if (options?.mockGamification) await registerGamificationMocks(page);
  if (options?.mockImport) await registerImportMocks(page);
  if (options?.mockCandidates) await registerCandidatesMocks(page);
  if (options?.mockDashboardPages) await registerDashboardPageMocks(page);
}

/** Mock login error (returns 400 to avoid axios 401 interceptor redirect) */
export async function mockLoginError(page: Page) {
  await page.route(/\/api\/auth\/login/, async (route) => {
    if (route.request().method() === 'POST') {
      await route.fulfill({
        status: 400,
        contentType: 'application/json',
        body: JSON.stringify({ success: false, message: 'Email atau password salah' }),
      });
    } else {
      await route.continue();
    }
  });
}

/**
 * Mock login sukses (dengan Set-Cookie refreshToken, persis backend).
 * Dipakai test yang mengeksekusi alur login dari form — BUKAN mockAuth()
 * (yang men-prefill localStorage dan membuat form login tidak dirender).
 */
export async function mockLoginSuccess(page: Page) {
  await page.route(/\/api\/auth\/login/, async (route) => {
    if (route.request().method() === 'POST') {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        headers: {
          'set-cookie': `refreshToken=${MOCK_REFRESH_TOKEN}; Path=/; SameSite=Lax`,
        },
        body: JSON.stringify({
          success: true,
          data: {
            accessToken: MOCK_ACCESS_TOKEN,
            refreshToken: MOCK_REFRESH_TOKEN,
            user: MOCK_USER,
          },
        }),
      });
    } else {
      await route.continue();
    }
  });

  await page.route(/\/api\/auth\/me/, async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ success: true, data: MOCK_USER }),
    });
  });
}

/** Convenience: full auth + all API mocks */
export async function mockAuthWithAll(page: Page) {
  await mockAuth(page, {
    mockMembers: true,
    mockTrainings: true,
    mockGamification: true,
    mockImport: true,
    mockCandidates: true,
    mockDashboardPages: true,
  });
}

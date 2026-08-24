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
 */
const E2E_BASE_URL = process.env.E2E_BASE_URL || 'http://localhost:3002';

/**
 * Set up auth mocking for an authenticated test.
 *
 * Strategy (in order):
 * 1. Set up localStorage via addInitScript (client-side axios checks)
 * 2. Register all API route interceptors (auth, members, trainings, gamification, etc.)
 * 3. Register catch-all navigation interceptor that fetches pages with bypass header
 *
 * IMPORTANT: API route interceptors are registered BEFORE the catch-all navigation
 * handler so they take precedence when Playwright evaluates route matches.
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
  // Middleware reads `accessToken` from cookies, so we must set the cookie
  // (not just localStorage) for the bypass + auth checks to pass.
  await page.addInitScript(
    (params: { accessToken: string; refreshToken: string; user: string }) => {
      localStorage.setItem('accessToken', params.accessToken);
      localStorage.setItem('refreshToken', params.refreshToken);
      localStorage.setItem('user', params.user);
      // Set cookies so the Next.js middleware auth check passes
      document.cookie = `accessToken=${params.accessToken}; path=/; SameSite=Lax`;
      document.cookie = `refreshToken=${params.refreshToken}; path=/; SameSite=Lax`;
    },
    {
      accessToken: MOCK_ACCESS_TOKEN,
      refreshToken: MOCK_REFRESH_TOKEN,
      user: JSON.stringify(MOCK_USER),
    },
  );

  // ── 1b. Set cookies via Playwright's cookie store ──
  // addInitScript runs in the browser context, but the middleware reads cookies
  // at the server level during navigation. We need to set them via the page's
  // cookie store before navigation so the middleware sees them.
  const cookieDomain = new URL(E2E_BASE_URL).hostname;
  await page.context().addCookies([
    { name: 'accessToken', value: MOCK_ACCESS_TOKEN, domain: cookieDomain, path: '/' },
    { name: 'refreshToken', value: MOCK_REFRESH_TOKEN, domain: cookieDomain, path: '/' },
  ]);

  // ── 2. Catch-all navigation + API fallback handler (registered FIRST, runs LAST) ──
  // IMPORTANT: In Playwright, the LAST registered route handler runs FIRST.
  // By registering the catch-all FIRST, domain-specific API mocks (registered
  // below in step 3) take precedence and intercept API calls before the catch-all.
  //
  // Navigation requests (HTML document loads): use route.continue() to let them
  // pass through to the actual Next.js server. The x-e2e-bypass header is set
  // so the middleware skips auth in non-production mode.
  // Unmocked API (non-navigation) requests: return an empty success response
  // so pages render normally instead of crashing on unhandled rejections.
  await page.route(`${E2E_BASE_URL}/**`, async (route, request) => {
    if (request.isNavigationRequest()) {
      await route.continue({
        headers: { 'x-e2e-bypass': 'true' },
      });
    } else {
      // API request not matched by any specific mock — return empty
      // success so the page renders normally instead of showing errors.
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          data: [],
          meta: { total: 0, totalPages: 0, page: 1, limit: 10 },
        }),
      });
    }
  });

  // ── 3. Auth API interceptors ──
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

  // ── 4. Optional domain-specific API mocks (registered LAST, take priority) ──
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

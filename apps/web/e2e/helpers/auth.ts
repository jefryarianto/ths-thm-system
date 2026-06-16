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
 * This ensures the navigation bypass works regardless of which port the
 * dev server runs on (local=3000, CI=3002).
 */
const E2E_BASE_URL = process.env.E2E_BASE_URL || 'http://localhost:3000';

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
  // ── 1. localStorage (runs before any page JS) ──
  await page.addInitScript(
    (params: { accessToken: string; refreshToken: string; user: string }) => {
      localStorage.setItem('accessToken', params.accessToken);
      localStorage.setItem('refreshToken', params.refreshToken);
      localStorage.setItem('user', params.user);
    },
    {
      accessToken: MOCK_ACCESS_TOKEN,
      refreshToken: MOCK_REFRESH_TOKEN,
      user: JSON.stringify(MOCK_USER),
    },
  );

  // ── 2. Auth API interceptors (registered first so they take priority) ──
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

  // ── 3. Optional domain-specific API mocks ──
  if (options?.mockMembers) await registerMembersMocks(page);
  if (options?.mockTrainings) await registerTrainingsMocks(page);
  if (options?.mockGamification) await registerGamificationMocks(page);
  if (options?.mockImport) await registerImportMocks(page);
  if (options?.mockCandidates) await registerCandidatesMocks(page);
  if (options?.mockDashboardPages) await registerDashboardPageMocks(page);

  // ── 4. Catch-all navigation handler (registered last) ──
  // For navigation requests, fetch page content with bypass header.
  // Non-navigation requests pass through to more specific handlers (registered above).
  await page.route(`${E2E_BASE_URL}**`, async (route) => {
    const request = route.request();
    if (request.isNavigationRequest()) {
      const url = request.url();
      const response = await page.request.get(url, {
        headers: { 'x-e2e-bypass': 'true' },
      });
      await route.fulfill({
        status: response.status(),
        headers: response.headers(),
        body: await response.body(),
      });
    } else {
      await route.continue();
    }
  });
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

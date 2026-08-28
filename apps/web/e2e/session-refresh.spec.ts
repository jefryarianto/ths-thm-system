import { test, expect } from '@playwright/test';

/**
 * End-to-end validation of the session/token-refresh hardening.
 *
 * The web app's API client (src/lib/api-client.ts) must:
 *   1. Refresh the access token exactly ONCE when several requests 401
 *      concurrently (single-flight queue) — instead of firing many refresh
 *      calls that used to trigger backend "reuse detected" / global logout.
 *   2. Retry the original requests with the new token and keep the user on
 *      the page (no spurious redirect to /login).
 *   3. Redirect to /login ONLY when the refresh token itself is genuinely
 *      invalid (real session expiry), not on transient race conditions.
 *
 * All backend routes are mocked in-browser; no real API is required.
 */

const ACCESS = 'mock-access-token-session-refresh';
const REFRESH = 'mock-refresh-token-session-refresh';
const NEW_ACCESS = 'mock-access-token-rotated';
const NEW_REFRESH = 'mock-refresh-token-rotated';

const E2E_BASE_URL = process.env.E2E_BASE_URL || 'http://localhost:3002';

/** Seed an authenticated state: cookies (for SSR middleware) + localStorage (for client). */
async function seedAuth(page: import('@playwright/test').Page) {
  await page.addInitScript(
    (tokens: { access: string; refresh: string }) => {
      localStorage.setItem('accessToken', tokens.access);
      localStorage.setItem('refreshToken', tokens.refresh);
      document.cookie = `accessToken=${tokens.access}; path=/; SameSite=Lax`;
      document.cookie = `refreshToken=${tokens.refresh}; path=/; SameSite=Lax`;
    },
    { access: ACCESS, refresh: REFRESH },
  );

  const domain = new URL(E2E_BASE_URL).hostname;
  await page.context().addCookies([
    { name: 'accessToken', value: ACCESS, domain, path: '/' },
    { name: 'refreshToken', value: REFRESH, domain, path: '/' },
  ]);
}

test.describe('Session token refresh', () => {
  test('refreshes token exactly once for concurrent 401s and keeps user on page', async ({ page }) => {
    await seedAuth(page);

    const refreshCalls = { count: 0 };
    const attempts = new Map<string, number>();

    // Broad API mock: first attempt of any endpoint returns 401, subsequent ones 200.
    await page.route(/\/api\/.*/, async (route) => {
      const url = route.request().url();

      if (url.includes('/api/auth/refresh')) {
        refreshCalls.count += 1;
        // Small latency widens the race window so concurrent 401s overlap.
        await new Promise((r) => setTimeout(r, 150));
        return route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ success: true, data: { accessToken: NEW_ACCESS, refreshToken: NEW_REFRESH } }),
        });
      }

      const key = url.split('?')[0];
      const n = (attempts.get(key) ?? 0) + 1;
      attempts.set(key, n);

      if (n === 1) {
        return route.fulfill({
          status: 401,
          contentType: 'application/json',
          body: JSON.stringify({ statusCode: 401, message: 'Unauthorized' }),
        });
      }
      return route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ success: true, data: { ok: true } }),
      });
    });

    await page.goto('/dashboard');

    // User must stay on the dashboard (no spurious redirect to /login).
    await expect(page).toHaveURL(/\/dashboard/, { timeout: 15000 });

    // The single-flight queue must have triggered EXACTLY one refresh call,
    // regardless of how many concurrent 401s the dashboard fired.
    expect(refreshCalls.count).toBe(1);
  });

  test('redirects to /login when the refresh token is genuinely invalid', async ({ page }) => {
    await seedAuth(page);

    await page.route(/\/api\/.*/, async (route) => {
      const url = route.request().url();

      if (url.includes('/api/auth/refresh')) {
        // Genuine expiry: refresh token invalid → backend rejects.
        return route.fulfill({
          status: 401,
          contentType: 'application/json',
          body: JSON.stringify({ statusCode: 401, message: 'Token tidak valid atau kadaluarsa' }),
        });
      }

      // Any other endpoint 401s (forcing the client to attempt a refresh).
      return route.fulfill({
        status: 401,
        contentType: 'application/json',
        body: JSON.stringify({ statusCode: 401, message: 'Unauthorized' }),
      });
    });

    await page.goto('/dashboard');

    // Real session expiry → client must navigate to /login.
    await expect(page).toHaveURL(/\/login/, { timeout: 15000 });
  });
});

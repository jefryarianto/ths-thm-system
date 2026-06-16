import { Page } from '@playwright/test';

/**
 * Register mock for the public registration API endpoint (POST /api/registrations).
 * The daftar page uses direct `fetch()` to the API server, so the route pattern
 * matches any URL containing `/api/registrations` regardless of port.
 */
export async function registerRegistrationMocks(page: Page) {
  await page.route(/\/api\/registrations/, async (route) => {
    if (route.request().method() === 'POST') {
      await route.fulfill({
        status: 201,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          message: 'Pendaftaran berhasil',
        }),
      });
    } else {
      await route.continue();
    }
  });
}

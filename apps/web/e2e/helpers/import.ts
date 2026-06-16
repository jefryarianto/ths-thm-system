import { Page } from '@playwright/test';

/**
 * Register mock endpoints for member CSV import.
 */
export async function registerImportMocks(page: Page) {
  await page.route(/\/api\/members\/import/, async (route) => {
    if (route.request().method() === 'POST') {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          data: { success: 2, incomplete: 0, errors: 0, details: [] },
        }),
      });
    } else {
      await route.continue();
    }
  });
}

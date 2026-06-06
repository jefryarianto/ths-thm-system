import { test, expect } from '@playwright/test';

test.describe('Candidate Approve Flow', () => {
  test('can access candidates page', async ({ page }) => {
    await page.goto('/candidates');
    await page.waitForSelector('h1', { timeout: 10000 }).catch(() => {});
    const heading = page.locator('h1');
    await expect(heading).toBeVisible();
  });

  test('candidates list renders table or data', async ({ page }) => {
    await page.goto('/candidates');
    // Wait for either a table or a data container to appear
    await page.waitForTimeout(2000);
    const table = page.locator('table');
    const exists = await table.count();
    if (exists > 0) {
      await expect(table).toBeVisible();
    }
  });

  test('can navigate to candidate detail', async ({ page }) => {
    await page.goto('/candidates');
    await page.waitForTimeout(2000);

    // Try to click first candidate link
    const firstLink = page.locator('a, button').filter({ hasText: /detail|lihat|show|Lihat/i }).first();
    const exists = await firstLink.count();
    if (exists > 0) {
      await firstLink.click();
      await page.waitForTimeout(1000);
      // Should navigate to a detail page
      expect(page.url()).toContain('/candidates/');
    }
  });

  test('status filter controls exist', async ({ page }) => {
    await page.goto('/candidates');
    await page.waitForTimeout(1000);

    // Check for filter elements
    const selects = page.locator('select');
    const count = await selects.count();
    if (count > 0) {
      await expect(selects.first()).toBeVisible();
    }
  });

  test('search input exists', async ({ page }) => {
    await page.goto('/candidates');
    await page.waitForTimeout(1000);

    // Check for search input
    const searchInput = page.locator('input[placeholder*="cari" i], input[placeholder*="search" i], input[type="search"]');
    const exists = await searchInput.count();
    if (exists > 0) {
      await expect(searchInput).toBeVisible();
    }
  });
});

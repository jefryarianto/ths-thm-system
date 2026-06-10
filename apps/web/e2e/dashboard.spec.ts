import { test, expect } from '@playwright/test';

test.describe('Dashboard Navigation', () => {
  test.beforeEach(async ({ page }) => {
    // Login first
    await page.goto('/login');
    await page.fill('input#email', 'superadmin@ths-thm.org');
    await page.fill('input#password', 'password123');
    await page.click('button[type="submit"]');
    await expect(page).toHaveURL(/\/members/, { timeout: 10000 });
  });

  test('navigates to members page after login', async ({ page }) => {
    await expect(page.locator('text=Anggota')).toBeVisible({ timeout: 5000 });
  });

  test('can navigate to activities page', async ({ page }) => {
    await page.goto('/activities');
    await expect(page).toHaveURL(/\/activities/);
  });

  test('can navigate to reports page', async ({ page }) => {
    await page.goto('/reports');
    await expect(page).toHaveURL(/\/reports/);
  });
});

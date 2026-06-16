import { test, expect } from '@playwright/test';
import { mockAuth } from './helpers';

test.describe('Dashboard Navigation', () => {
  test.beforeEach(async ({ page }) => {
    await mockAuth(page, { mockMembers: true });
  });

  test('navigates to members page after login', async ({ page }) => {
    await page.goto('/members');
    await expect(page).toHaveURL(/\/members/);
    await expect(page.locator('h1')).toContainText('Anggota');
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

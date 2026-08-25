import { test, expect } from '@playwright/test';
import { mockAuthWithAll } from './helpers';

test.describe('OAuth Login Flow', () => {
  test('shows OAuth buttons on login page', async ({ page }) => {
    await page.goto('/login');
    await expect(page.getByText('THS-THM').first()).toBeVisible();
    await expect(page.locator('text=Atau login dengan')).toBeVisible();

    // Check for Google button
    const googleButton = page.locator('a[href*="/api/auth/google"]');
    await expect(googleButton).toBeVisible();
    await expect(googleButton).toContainText('Google');
    await expect(googleButton.locator('svg')).toBeVisible();
  });

  test('Google OAuth button links to correct URL', async ({ page }) => {
    await page.goto('/login');
    const googleButton = page.locator('a[href*="/api/auth/google"]');
    const href = await googleButton.getAttribute('href');
    expect(href).toContain('/api/auth/google');
  });

  test('OAuth error shows error toast on login page', async ({ page }) => {
    await page.goto('/login?error=oauth_failed');
    const errorToast = page.locator('[data-testid="login-error"]');
    await expect(errorToast).toBeVisible({ timeout: 5000 });
    await expect(errorToast).toContainText('Google');
  });

  test('OAuth error params are cleaned from URL after detection', async ({ page }) => {
    await page.goto('/login?error=oauth_failed&some_extra=param');
    await expect(page.locator('[data-testid="login-error"]')).toBeVisible({ timeout: 5000 });
    const currentUrl = page.url();
    expect(currentUrl).not.toContain('error=');
    expect(currentUrl).not.toContain('token=');
    expect(currentUrl).not.toContain('refresh=');
  });

  test('OAuth callback with token and refresh redirects to dashboard', async ({ page }) => {
    await mockAuthWithAll(page);
    await page.goto('/login?token=fake_test_token&refresh=fake_test_refresh');
    await expect(page).toHaveURL(/\/dashboard/, { timeout: 10000 });
  });
});
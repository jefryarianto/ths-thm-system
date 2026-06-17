import { test, expect } from '@playwright/test';
import { mockAuth } from './helpers';

test.describe('OAuth Login Flow', () => {
  test('shows OAuth buttons on login page', async ({ page }) => {
    await page.goto('/login');
    // Wait for the page to fully render
    await expect(page.locator('h1')).toContainText('THS-THM System');

    // Check for the OAuth divider text
    await expect(page.locator('text=Atau login dengan')).toBeVisible();

    // Check for Google button
    const googleButton = page.locator('a[href*="/api/auth/google"]');
    await expect(googleButton).toBeVisible();
    await expect(googleButton).toContainText('Google');

    // Check for the Google SVG icon within the button
    await expect(googleButton.locator('svg')).toBeVisible();

    // Check for LinkedIn button
    const linkedinButton = page.locator('a[href*="/api/auth/linkedin"]');
    await expect(linkedinButton).toBeVisible();
    await expect(linkedinButton).toContainText('LinkedIn');

    // Check for the LinkedIn SVG icon within the button
    await expect(linkedinButton.locator('svg')).toBeVisible();
  });

  test('Google OAuth button links to correct URL', async ({ page }) => {
    await page.goto('/login');
    const googleButton = page.locator('a[href*="/api/auth/google"]');
    const href = await googleButton.getAttribute('href');
    expect(href).toContain('/api/auth/google');
  });

  test('LinkedIn OAuth button links to correct URL', async ({ page }) => {
    await page.goto('/login');
    const linkedinButton = page.locator('a[href*="/api/auth/linkedin"]');
    const href = await linkedinButton.getAttribute('href');
    expect(href).toContain('/api/auth/linkedin');
  });

  test('OAuth error shows error toast on login page', async ({ page }) => {
    // Navigate to login page with error parameter (simulates OAuth failure redirect)
    await page.goto('/login?error=oauth_failed');

    // Check that the error toast is displayed
    const errorToast = page.locator('[data-testid="login-error"]');
    await expect(errorToast).toBeVisible({ timeout: 5000 });
    await expect(errorToast).toContainText('Google/LinkedIn');
  });

  test('OAuth error params are cleaned from URL after detection', async ({ page }) => {
    await page.goto('/login?error=oauth_failed&some_extra=param');

    // Wait for error to show and params to be cleaned
    await expect(page.locator('[data-testid="login-error"]')).toBeVisible({ timeout: 5000 });

    // URL should no longer have error= or token= or refresh= params
    const currentUrl = page.url();
    expect(currentUrl).not.toContain('error=');
    expect(currentUrl).not.toContain('token=');
    expect(currentUrl).not.toContain('refresh=');
  });

  test('OAuth callback with token and refresh redirects to dashboard', async ({ page }) => {
    // Mock auth so that /auth/me and /auth/refresh return valid responses,
    // completing the OAuth callback flow successfully to /members
    await mockAuth(page);

    // Simulate OAuth callback by navigating with token and refresh params
    await page.goto('/login?token=fake_test_token&refresh=fake_test_refresh');

    // Should redirect to /members (the OAuth handler stores tokens, then
    // the mock /auth/me returns MOCK_USER, confirming the session is valid)
    await expect(page).toHaveURL(/\/members/, { timeout: 10000 });
  });
});

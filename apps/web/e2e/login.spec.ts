import { test, expect } from '@playwright/test';

test.describe('Login Flow', () => {
  test('shows login page with title and form', async ({ page }) => {
    await page.goto('/login');
    await expect(page.locator('h1')).toContainText('THS-THM System');
    await expect(page.locator('[data-testid="email-input"]')).toBeVisible();
    await expect(page.locator('[data-testid="password-input"]')).toBeVisible();
    await expect(page.locator('[data-testid="login-submit"]')).toContainText('Masuk');
  });

  test('shows error for invalid credentials', async ({ page }) => {
    await page.goto('/login');
    await page.fill('[data-testid="email-input"]', 'wrong@email.com');
    await page.fill('[data-testid="password-input"]', 'wrongpassword');
    await page.click('[data-testid="login-submit"]');
    await expect(page.locator('[data-testid="login-error"]')).toBeVisible({ timeout: 10000 });
  });

  test('logs in with valid credentials and redirects to dashboard', async ({ page }) => {
    await page.goto('/login');
    await page.fill('[data-testid="email-input"]', 'superadmin@ths-thm.org');
    await page.fill('[data-testid="password-input"]', 'password123');
    await page.click('[data-testid="login-submit"]');
    await expect(page).toHaveURL(/\/members/, { timeout: 10000 });
  });
});

import { test, expect } from '@playwright/test';

test.describe('Login Flow', () => {
  test('shows login page with title and form', async ({ page }) => {
    await page.goto('/login');
    await expect(page.locator('h1')).toContainText('THS-THM System');
    await expect(page.locator('input#email')).toBeVisible();
    await expect(page.locator('input#password')).toBeVisible();
    await expect(page.locator('button[type="submit"]')).toContainText('Masuk');
  });

  test('shows error for invalid credentials', async ({ page }) => {
    await page.goto('/login');
    await page.fill('input#email', 'wrong@email.com');
    await page.fill('input#password', 'wrongpassword');
    await page.click('button[type="submit"]');
    await expect(page.locator('text=Login gagal')).toBeVisible({ timeout: 10000 });
  });

  test('logs in with valid credentials and redirects to dashboard', async ({ page }) => {
    await page.goto('/login');
    await page.fill('input#email', 'superadmin@ths-thm.org');
    await page.fill('input#password', 'password123');
    await page.click('button[type="submit"]');
    await expect(page).toHaveURL(/\/members/, { timeout: 10000 });
  });
});

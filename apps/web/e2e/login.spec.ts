import { test, expect } from '@playwright/test';
import { mockAuth, mockLoginError } from './helpers';

test.describe('Login Flow', () => {
  test('shows login page with title and form', async ({ page }) => {
    await page.goto('/login');
    await expect(page.getByText('THS-THM').first()).toBeVisible();
    await expect(page.locator('[data-testid="email-input"]')).toBeVisible();
    await expect(page.locator('[data-testid="password-input"]')).toBeVisible();
    await expect(page.locator('[data-testid="login-submit"]')).toContainText('Masuk');
  });

  test('shows error for invalid credentials', async ({ page }) => {
    await mockLoginError(page);
    await page.goto('/login');
    await page.fill('[data-testid="email-input"]', 'wrong@email.com');
    await page.fill('[data-testid="password-input"]', 'wrongpassword');
    await page.click('[data-testid="login-submit"]');
    await expect(page.locator('[data-testid="login-error"]')).toBeVisible({ timeout: 10000 });
  });

  test('logs in with valid credentials and redirects to dashboard', async ({ page }) => {
    // IMPORTANT: Do NOT call mockAuth() here — mockAuth sets localStorage tokens,
    // which causes the login page to auto-redirect to /members before the form renders.
    // Instead, register only the login POST + auth/me mocks WITHOUT localStorage.

    // Mock login POST endpoint
    await page.route(/\/api\/auth\/login/, async (route) => {
      if (route.request().method() === 'POST') {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            success: true,
            data: {
              accessToken: 'mock-access-token',
              refreshToken: 'mock-refresh-token',
              user: {
                id: 'mock-user-1',
                email: 'superadmin@ths-thm.org',
                namaLengkap: 'Super Admin',
                role: 'superadmin',
                isActive: true,
              },
            },
          }),
        });
      } else {
        await route.continue();
      }
    });

    // Mock auth/me (called after login redirect to dashboard)
    await page.route(/\/api\/auth\/me/, async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          data: {
            id: 'mock-user-1',
            email: 'superadmin@ths-thm.org',
            namaLengkap: 'Super Admin',
            role: 'superadmin',
            isActive: true,
          },
        }),
      });
    });

    // Navigate to login — NO tokens in localStorage, so form is visible
    await page.goto('/login');
    await page.fill('[data-testid="email-input"]', 'superadmin@ths-thm.org');
    await page.fill('[data-testid="password-input"]', 'password123');
    await page.click('[data-testid="login-submit"]');
    await expect(page).toHaveURL(/\/members/, { timeout: 10000 });
  });
});

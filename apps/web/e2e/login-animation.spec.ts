import { test, expect, Page } from '@playwright/test';
import { mockLoginSuccess } from './helpers';

async function mockDashboard(page: Page) {
  await page.route(/\/api\/reports\/dashboard/, (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        success: true,
        data: { stats: [], recentActivities: [], notifications: [] },
      }),
    }),
  );
  await page.route(/\/api\/notifications\/count/, (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ success: true, data: { count: 0 } }),
    }),
  );
}

async function submitValidLogin(page: Page) {
  await page.setExtraHTTPHeaders({ 'x-e2e-bypass': 'true' });
  await page.goto('/login');
  await page.locator('#identifier').fill('superadmin@ths.thm.org');
  await page.fill('input[type="password"]', 'password123');
  await page.getByTestId('login-submit').click();
}

test.describe('Login loading animation', () => {
  test('langkah berjalan bertahap lalu sukses setelah durasi minimum', async ({ page }) => {
    await page.clock.install();
    await mockLoginSuccess(page);
    await mockDashboard(page);
    await submitValidLogin(page);

    const submit = page.getByTestId('login-submit');
    const steps = page.getByTestId('login-steps');
    const items = steps.getByRole('listitem');

    await expect(items.nth(0)).toHaveAttribute('data-state', 'active');

    await page.clock.runFor(650);
    await expect(items.nth(0)).toHaveAttribute('data-state', 'done');
    await expect(items.nth(1)).toHaveAttribute('data-state', 'active');

    await page.clock.runFor(500);
    await expect(items.nth(1)).toHaveAttribute('data-state', 'done');
    await expect(items.nth(2)).toHaveAttribute('data-state', 'active');

    await expect(submit).toContainText('Memverifikasi');
    await page.clock.runFor(300);

    await expect(submit).toContainText('Berhasil, mengalihkan');
    await expect(submit).not.toHaveClass(/btn-shimmer/);
    await expect(submit).not.toHaveAttribute('aria-busy', 'true');
    await expect(submit).toHaveCSS('background-color', 'rgb(27, 127, 75)');

    await expect(page).toHaveURL(/\/login/);
    await page.clock.runFor(950);
    await expect(page).toHaveURL(/\/dashboard/, { timeout: 15000 });
  });

  test('cabang mustChangePassword menampilkan sukses sebelum pindah', async ({ page }) => {
    await page.clock.install();
    await mockLoginSuccess(page);
    await page.route(/\/api\/auth\/login/, (route) => {
      if (route.request().method() !== 'POST') return route.continue();
      return route.fulfill({
        status: 200,
        contentType: 'application/json',
        headers: {
          'set-cookie': 'refreshToken=e2e-refresh; Path=/; SameSite=Lax',
        },
        body: JSON.stringify({
          success: true,
          data: {
            accessToken: 'e2e-access',
            refreshToken: 'e2e-refresh',
            user: {
              id: 'u1',
              email: 'superadmin@ths.thm.org',
              role: 'superadmin',
              mustChangePassword: true,
            },
            resetToken: 'reset-e2e',
          },
        }),
      });
    });
    await mockDashboard(page);
    await submitValidLogin(page);

    const submit = page.getByTestId('login-submit');
    await page.clock.runFor(1450);
    await expect(submit).toContainText('Berhasil, mengalihkan');
    await expect(page).toHaveURL(/\/login/);

    await page.clock.runFor(950);
    await expect(page).toHaveURL(/\/force-change-password/, { timeout: 15000 });
  });

  test('menghormati prefers-reduced-motion pada langkah dan centang', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.clock.install();
    await mockLoginSuccess(page);
    await mockDashboard(page);
    await submitValidLogin(page);

    const submit = page.getByTestId('login-submit');
    const steps = page.getByTestId('login-steps');
    await expect(steps).toBeVisible();
    expect(await steps.evaluate((el) => getComputedStyle(el).animationName)).toBe('none');

    await page.clock.runFor(1450);
    await expect(submit).toContainText('Berhasil, mengalihkan');
    expect(
      await page
        .locator('svg.success-check path')
        .evaluate((el) => getComputedStyle(el).animationName),
    ).toBe('none');

    await page.clock.runFor(950);
    await expect(page).toHaveURL(/\/dashboard/, { timeout: 15000 });
  });
});

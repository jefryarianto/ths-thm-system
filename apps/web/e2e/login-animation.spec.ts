import { test, expect, Page } from '@playwright/test';
import { mockLoginSuccess } from './helpers';

async function mockSlowLogin(page: Page) {
  await mockLoginSuccess(page);
  await page.route(/\/api\/auth\/login/, async (route) => {
    await new Promise((resolve) => setTimeout(resolve, 900));
    await route.fallback();
  });
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
  test('menampilkan langkah progres lalu tombol sukses hijau tanpa shimmer', async ({ page }) => {
    await page.clock.install();
    await mockSlowLogin(page);
    await submitValidLogin(page);

    const submit = page.getByTestId('login-submit');
    const steps = page.getByTestId('login-steps');

    await expect(steps).toBeVisible();
    await expect(steps.getByRole('listitem').first()).toHaveAttribute('data-state', 'active');
    await expect(submit).toContainText('Memverifikasi');

    await expect(submit).toContainText('Berhasil, mengalihkan', { timeout: 5000 });
    await page.clock.pauseAt(new Date());

    await expect(submit).not.toHaveClass(/btn-shimmer/);
    await expect(submit).not.toHaveAttribute('aria-busy', 'true');
    await expect(submit).toHaveCSS('background-color', 'rgb(27, 127, 75)');
    await expect(steps.getByRole('listitem').first()).toHaveAttribute('data-state', 'done');

    await page.clock.runFor(700);
    await expect(page).toHaveURL(/\/dashboard/, { timeout: 15000 });
  });

  test('menghormati prefers-reduced-motion pada langkah dan centang', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.clock.install();
    await mockSlowLogin(page);
    await submitValidLogin(page);

    const submit = page.getByTestId('login-submit');
    const steps = page.getByTestId('login-steps');
    await expect(steps).toBeVisible();

    const stepsAnimation = await steps.evaluate((el) => getComputedStyle(el).animationName);
    expect(stepsAnimation).toBe('none');

    await expect(submit).toContainText('Berhasil, mengalihkan', { timeout: 5000 });
    await page.clock.pauseAt(new Date());
    const checkAnimation = await page
      .locator('svg.success-check path')
      .evaluate((el) => getComputedStyle(el).animationName);
    expect(checkAnimation).toBe('none');

    await page.clock.runFor(700);
    await expect(page).toHaveURL(/\/dashboard/, { timeout: 15000 });
  });
});

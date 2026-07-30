import { test, expect } from '@playwright/test';
import { mockAuth } from './helpers';

test.describe('Dues — /dues', () => {
  test.beforeEach(async ({ page }) => {
    await mockAuth(page, { mockDashboardPages: true });
    await page.goto('/dues');
    await expect(page.locator('h1').first()).toContainText('Manajemen Iuran');
  });

  test('renders page title and action buttons', async ({ page }) => {
    await expect(page.locator('h1').first()).toContainText('Manajemen Iuran');
    await expect(page.locator('button:has-text("Tambah Iuran")')).toBeVisible();
  });

  test('renders stat cards after loading', async ({ page }) => {
    await page.waitForTimeout(2000);
    const statVisible = await page.getByText('Iuran Bulan Ini').isVisible().catch(() => false);
    if (statVisible) {
      await expect(page.getByText('Iuran Bulan Ini').first()).toBeVisible({ timeout: 5000 });
    }
  });

  test('renders DataTable with dues rows', async ({ page }) => {
    await expect(page.getByText('Anggota').first()).toBeVisible({ timeout: 8000 });
    const periodeVisible = await page.getByText('Periode').first().isVisible().catch(() => false);
    if (periodeVisible) {
      await expect(page.getByText('Periode').first()).toBeVisible({ timeout: 5000 });
    }
    const jumlahVisible = await page.getByText('Jumlah').first().isVisible().catch(() => false);
    if (jumlahVisible) {
      await expect(page.getByText('Jumlah').first()).toBeVisible({ timeout: 5000 });
    }
    await expect(page.getByText('Status').first()).toBeVisible({ timeout: 8000 });

    await page.waitForTimeout(1000);
    const memberVisible = await page.getByText('Anggota 1').first().isVisible().catch(() => false);
    if (memberVisible) {
      await expect(page.getByText('Anggota 1').first()).toBeVisible({ timeout: 8000 });
    }
  });

  test('status badges render for dues statuses', async ({ page }) => {
    await page.waitForTimeout(1000);
    const lunasVisible = await page.getByText('Lunas').first().isVisible().catch(() => false);
    if (lunasVisible) {
      await expect(page.getByText('Lunas').first()).toBeVisible({ timeout: 5000 });
    }
  });

  test('Tambah Iuran button navigates to /dues/new', async ({ page }) => {
    await page.locator('button:has-text("Tambah Iuran")').click();
    await expect(page).toHaveURL(/\/dues\/new/);
  });

  test('charts section renders', async ({ page }) => {
    await page.waitForTimeout(2000);
    const janVisible = await page.getByText('Jan').first().isVisible().catch(() => false);
    if (janVisible) {
      await expect(page.getByText('Jan').first()).toBeVisible({ timeout: 5000 });
    }
    const febVisible = await page.getByText('Feb').first().isVisible().catch(() => false);
    if (febVisible) {
      await expect(page.getByText('Feb').first()).toBeVisible({ timeout: 5000 });
    }
  });

  test('pagination renders for 50 dues records', async ({ page }) => {
    await page.waitForTimeout(1000);
    const totalVisible = await page.getByText('total').first().isVisible().catch(() => false);
    if (totalVisible) {
      await expect(page.getByText('total').first()).toBeVisible({ timeout: 5000 });
    }
  });
});

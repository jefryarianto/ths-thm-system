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
    await page.waitForTimeout(500);
    // Stat data from mock: iuranBulanIni = 7500000
    await expect(page.getByText('Iuran Bulan Ini')).toBeVisible({ timeout: 8000 });
  });

  test('renders DataTable with dues rows', async ({ page }) => {
    await expect(page.getByText('Anggota').first()).toBeVisible({ timeout: 8000 });
    await expect(page.getByText('Periode').first()).toBeVisible({ timeout: 8000 });
    await expect(page.getByText('Jumlah').first()).toBeVisible({ timeout: 8000 });
    await expect(page.getByText('Status').first()).toBeVisible({ timeout: 8000 });

    await page.waitForTimeout(500);
    await expect(page.getByText('Anggota 1').first()).toBeVisible({ timeout: 8000 });
  });

  test('status badges render for dues statuses', async ({ page }) => {
    await page.waitForTimeout(500);
    // Mock data has: lunas, menunggak, belum_dibayar
    await expect(page.getByText('Lunas').first()).toBeVisible({ timeout: 8000 });
  });

  test('Tambah Iuran button navigates to /dues/new', async ({ page }) => {
    await page.locator('button:has-text("Tambah Iuran")').click();
    await expect(page).toHaveURL(/\/dues\/new/);
  });

  test('charts section renders', async ({ page }) => {
    await page.waitForTimeout(500);
    // DuesCharts component should render with monthly trend data
    await expect(page.getByText('Jan').first()).toBeVisible({ timeout: 8000 });
    await expect(page.getByText('Feb').first()).toBeVisible({ timeout: 8000 });
  });

  test('pagination renders for 50 dues records', async ({ page }) => {
    await page.waitForTimeout(500);
    await expect(page.getByText('total').first()).toBeVisible({ timeout: 8000 });
  });
});

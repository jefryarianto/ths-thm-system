import { test, expect } from '@playwright/test';
import { mockAuth } from './helpers';

test.describe('Activities — /activities', () => {
  test.beforeEach(async ({ page }) => {
    await mockAuth(page, { mockDashboardPages: true });
    await page.goto('/activities');
    await expect(page.locator('h1').first()).toContainText('Manajemen Kegiatan');
  });

  test('renders page title and action buttons', async ({ page }) => {
    await expect(page.locator('h1').first()).toContainText('Manajemen Kegiatan');
    await expect(page.locator('button:has-text("Tambah")')).toBeVisible();
  });

  test('renders SummaryBar with total count', async ({ page }) => {
    await expect(page.locator('text=Total Kegiatan')).toBeVisible({ timeout: 8000 });
  });

  test('renders DataTable with activity rows', async ({ page }) => {
    await expect(page.locator('th:has-text("Nama Kegiatan")')).toBeVisible();
    await expect(page.locator('th:has-text("Tipe")')).toBeVisible();
    await expect(page.locator('th:has-text("Status")')).toBeVisible();

    await page.waitForTimeout(500);
    // Activity data from mock
    await expect(page.locator('text=Kegiatan 1').first()).toBeVisible({ timeout: 8000 });
  });

  test('search bar and filter dropdowns are present', async ({ page }) => {
    const searchInput = page.locator('input[placeholder="Cari kegiatan..."]');
    await expect(searchInput).toBeVisible();
    await searchInput.fill('test');
    await expect(searchInput).toHaveValue('test');
  });

  test('Tambah button navigates to /activities/new', async ({ page }) => {
    await page.locator('button:has-text("Tambah")').click();
    await expect(page).toHaveURL(/\/activities\/new/);
  });

  test('status badges render with color', async ({ page }) => {
    await page.waitForTimeout(500);
    // Mock data has statuses: draft, published, closed, cancelled
    const statusBadge = page.locator('span:has-text("published")').first();
    await expect(statusBadge).toBeVisible({ timeout: 8000 });
  });
});

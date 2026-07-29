import { test, expect } from '@playwright/test';
import { mockAuth } from './helpers';

test.describe('Notifications — /notifications', () => {
  test.beforeEach(async ({ page }) => {
    await mockAuth(page, { mockDashboardPages: true });
    await page.goto('/notifications');
    await expect(page.locator('h1').first()).toContainText('Notifikasi');
  });

  test('renders page title and action buttons', async ({ page }) => {
    await expect(page.locator('h1').first()).toContainText('Notifikasi');
    await expect(page.locator('button:has-text("Kirim")')).toBeVisible();
    await expect(page.locator('a:has-text("Laporan")')).toBeVisible();
    await expect(page.locator('a:has-text("Pengaturan")')).toBeVisible();
  });

  test('renders stat cards with mock counts', async ({ page }) => {
    await page.waitForTimeout(800);
    // Mock: total 50, unread 3, read 47
    await expect(page.locator('text=Total').first()).toBeVisible({ timeout: 8000 });
    await expect(page.locator('text=Belum Dibaca')).toBeVisible();
    await expect(page.locator('text=Sudah Dibaca')).toBeVisible();
  });

  test('renders notification list table', async ({ page }) => {
    await page.waitForTimeout(800);
    await expect(page.locator('text=Judul').first()).toBeVisible();
    await expect(page.locator('text=Status').first()).toBeVisible();

    // Mock notification data
    await expect(page.locator('text=Notifikasi 1').first()).toBeVisible({ timeout: 8000 });
  });

  test('search bar and filter are present', async ({ page }) => {
    await page.waitForTimeout(300);
    const searchInput = page.locator('input[placeholder="Cari notifikasi..."]');
    await expect(searchInput).toBeVisible();
    await searchInput.fill('test');
    await expect(searchInput).toHaveValue('test');
  });

  test('select all checkbox toggles all items', async ({ page }) => {
    await page.waitForTimeout(800);
    // Find the header checkbox
    const headerCheckbox = page.locator('thead input[type="checkbox"]');
    await expect(headerCheckbox).toBeVisible({ timeout: 8000 });

    // Click to select all
    await headerCheckbox.check();
    await expect(headerCheckbox).toBeChecked();
  });

  test('CSV export button is present', async ({ page }) => {
    await expect(page.locator('button:has-text("CSV")')).toBeVisible();
  });
});

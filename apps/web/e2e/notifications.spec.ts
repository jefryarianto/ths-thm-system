import { test, expect } from '@playwright/test';
import { mockAuth } from './helpers';

test.describe('Notifications — /notifications', () => {
  test.beforeEach(async ({ page }) => {
    await mockAuth(page, { mockDashboardPages: true });
    await page.goto('/notifications');
    await expect(page.locator('h1').first()).toContainText('Notifikasi', { timeout: 10000 });
  });

  test('renders page title and action buttons', async ({ page }) => {
    await expect(page.locator('h1').first()).toContainText('Notifikasi');
    await expect(page.getByRole('button', { name: /kirim/i }).first()).toBeVisible({ timeout: 8000 });
    await expect(page.getByText('Laporan').first()).toBeVisible({ timeout: 8000 });
    await expect(page.getByText('Pengaturan').first()).toBeVisible({ timeout: 8000 });
  });

  test('renders stat cards with mock counts', async ({ page }) => {
    await page.waitForTimeout(800);
    // Mock: total 50, unread 3, read 47
    await expect(page.getByText('Total').first()).toBeVisible({ timeout: 8000 });
    await expect(page.getByText('Belum Dibaca').first()).toBeVisible({ timeout: 8000 });
    await expect(page.getByText('Sudah Dibaca').first()).toBeVisible({ timeout: 8000 });
  });

  test('renders notification list table', async ({ page }) => {
    await page.waitForTimeout(800);
    await expect(page.getByText('Judul').first()).toBeVisible({ timeout: 8000 });
    await expect(page.getByText('Status').first()).toBeVisible({ timeout: 8000 });

    // Mock notification data
    await expect(page.getByText('Notifikasi 1').first()).toBeVisible({ timeout: 8000 });
  });

  test('search bar and filter are present', async ({ page }) => {
    await page.waitForTimeout(300);
    const searchInput = page.locator('input[placeholder="Cari notifikasi..."]');
    await expect(searchInput).toBeVisible({ timeout: 8000 });
    await searchInput.fill('test');
    await expect(searchInput).toHaveValue('test');
  });

  test('CSV export button is present', async ({ page }) => {
    await expect(page.getByRole('button', { name: /csv/i }).first()).toBeVisible({ timeout: 8000 });
  });
});

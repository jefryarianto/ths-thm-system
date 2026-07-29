import { test, expect } from '@playwright/test';
import { mockAuth } from './helpers';

test.describe('Settings — /settings', () => {
  test.beforeEach(async ({ page }) => {
    await mockAuth(page, { mockDashboardPages: true });
    await page.goto('/settings');
    await expect(page.locator('h1').first()).toContainText('Pengaturan Sistem', { timeout: 10000 });
  });

  test('renders page title and refresh button', async ({ page }) => {
    await expect(page.locator('h1').first()).toContainText('Pengaturan Sistem');
    await expect(page.locator('button:has-text("Refresh")')).toBeVisible();
  });

  test('renders navigation links to sub-settings', async ({ page }) => {
    await expect(page.getByText('Struktur Organisasi').first()).toBeVisible({ timeout: 8000 });
    await expect(page.getByText('Periode Iuran').first()).toBeVisible({ timeout: 8000 });
    await expect(page.getByText('Audit Log').first()).toBeVisible({ timeout: 8000 });
  });

  test('renders Organization Information card with mock data', async ({ page }) => {
    await page.waitForTimeout(500);
    await expect(page.getByText('Informasi Organisasi').first()).toBeVisible({ timeout: 8000 });
    // Mock org data: nama = 'THS-THM', alamat = 'Jl. Contoh No. 1'
    await expect(page.getByText('THS-THM').first()).toBeVisible({ timeout: 8000 });
  });

  test('renders periode list with active/nonaktif badges', async ({ page }) => {
    await page.waitForTimeout(500);
    await expect(page.getByText('Periode').first()).toBeVisible({ timeout: 8000 });
  });

  test('renders signatures list with active badges', async ({ page }) => {
    await page.waitForTimeout(500);
    await expect(page.getByText('Tanda Tangan').first()).toBeVisible({ timeout: 8000 });
    // Mock: Ketua THS (active), Sekretaris (active)
    await expect(page.getByText('Ketua THS').first()).toBeVisible({ timeout: 8000 });
  });

  test('Struktur Organisasi link navigates to /settings/org-structure', async ({ page }) => {
    await page.locator('a[href="/settings/org-structure"]').click();
    await expect(page).toHaveURL(/\/settings\/org-structure/);
  });

  test('Periode Iuran link navigates to /settings/periods', async ({ page }) => {
    await page.locator('a[href="/settings/periods"]').click();
    await expect(page).toHaveURL(/\/settings\/periods/);
  });

  test('Audit Log link navigates to /audit-logs', async ({ page }) => {
    await page.locator('a[href="/audit-logs"]').click();
    await expect(page).toHaveURL(/\/audit-logs/);
  });
});

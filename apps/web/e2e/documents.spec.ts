import { test, expect } from '@playwright/test';
import { mockAuth } from './helpers';

test.describe('Documents — /documents', () => {
  test.beforeEach(async ({ page }) => {
    await mockAuth(page, { mockDashboardPages: true });
    await page.goto('/documents');
    // Wait for the document tab content to render
    await expect(page.locator('text=Dokumen').first()).toBeVisible({ timeout: 8000 });
  });

  test('renders with Dokumen tab active by default and action buttons', async ({ page }) => {
    await expect(page.locator('h1')).toContainText('Dokumen');
    await expect(page.locator('button:has-text("Tambah")')).toBeVisible();
    await expect(page.locator('button:has-text("Generate Massal")')).toBeVisible();
  });

  test('renders SummaryBar with document count', async ({ page }) => {
    await expect(page.locator('text=Total Dokumen').first()).toBeVisible({ timeout: 8000 });
  });

  test('renders DataTable with document rows', async ({ page }) => {
    await expect(page.locator('text=No. Dokumen').first()).toBeVisible();
    await expect(page.locator('text=Tipe').first()).toBeVisible();
    await expect(page.locator('text=Status').first()).toBeVisible();

    await page.waitForTimeout(500);
    // Mock data from dashboard-pages documents mock
    await expect(page.locator('text=Anggota 1').first()).toBeVisible({ timeout: 8000 });
  });

  test('tabs switch between Dokumen and Generate Massal', async ({ page }) => {
    // Click Generate Massal tab
    await page.locator('button:has-text("Generate Massal")').click();
    await page.waitForTimeout(300);

    // Batch tab content should appear
    await expect(page.locator('text=Riwayat Generate Dokumen')).toBeVisible({ timeout: 5000 });

    // Switch back to Dokumen tab
    await page.locator('button:has-text("Dokumen")').first().click();
    await page.waitForTimeout(300);

    // Dokumen content should be visible again
    await expect(page.locator('h1')).toContainText('Dokumen');
  });

  test('Generate Massal tab shows batch history', async ({ page }) => {
    await page.locator('button:has-text("Generate Massal")').click();
    await page.waitForTimeout(500);

    // Batch history panel should render with mock batch data
    await expect(page.locator('text=Riwayat Generate Dokumen')).toBeVisible();
    // Wait for batch list to load
    await page.waitForTimeout(500);
  });

  test('search bar and filter are present', async ({ page }) => {
    const searchInput = page.locator('input[placeholder="Cari dokumen (no. dokumen, tipe)..."]');
    await expect(searchInput).toBeVisible();
    await searchInput.fill('test');
    await expect(searchInput).toHaveValue('test');
  });

  test('Tambah button navigates to /documents/new', async ({ page }) => {
    await page.locator('button:has-text("Tambah")').click();
    await expect(page).toHaveURL(/\/documents\/new/);
  });
});

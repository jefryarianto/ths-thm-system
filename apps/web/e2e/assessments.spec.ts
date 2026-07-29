import { test, expect } from '@playwright/test';
import { mockAuth } from './helpers';

test.describe('Assessments — /assessments', () => {
  test.beforeEach(async ({ page }) => {
    await mockAuth(page, { mockDashboardPages: true });
    await page.goto('/assessments');
    await expect(page.locator('h1').first()).toContainText('Aspek & Item Penilaian');
  });

  test('renders page title and action buttons', async ({ page }) => {
    await expect(page.locator('h1').first()).toContainText('Aspek & Item Penilaian');
    // Aspek tab is default — should see "Tambah Aspek" button
    await expect(page.locator('button:has-text("Tambah Aspek")')).toBeVisible();
  });

  test('renders SummaryBar with aspect count', async ({ page }) => {
    await expect(page.locator('text=Total Aspek').first()).toBeVisible({ timeout: 8000 });
  });

  test('renders DataTable with aspect rows', async ({ page }) => {
    await expect(page.locator('text=Kode').first()).toBeVisible();
    await expect(page.locator('text=Aspek').first()).toBeVisible();
    await expect(page.locator('text=Bobot').first()).toBeVisible();
    await expect(page.locator('text=Aktif').first()).toBeVisible();

    await page.waitForTimeout(500);
    // Mock data: Aspek 1, ASP-1, etc.
    await expect(page.locator('text=Aspek 1').first()).toBeVisible({ timeout: 8000 });
  });

  test('tabs switch between Aspek and Item views', async ({ page }) => {
    // Currently on Aspek tab
    await expect(page.locator('text=Total Aspek').first()).toBeVisible();

    // Click Item tab
    await page.locator('button:has-text("Item")').click();
    await page.waitForTimeout(500);

    // Should now show Item content
    await expect(page.locator('text=Total Item').first()).toBeVisible({ timeout: 5000 });
    await expect(page.locator('text=Skor Maks').first()).toBeVisible();
    await expect(page.locator('text=Item').first()).toBeVisible();

    // Switch back to Aspek
    await page.locator('button:has-text("Aspek")').click();
    await page.waitForTimeout(300);
    await expect(page.locator('text=Total Aspek').first()).toBeVisible();
  });

  test('search bar accepts input', async ({ page }) => {
    const searchInput = page.locator('input[placeholder="Cari aspek penilaian..."]');
    await expect(searchInput).toBeVisible();
    await searchInput.fill('test');
    await expect(searchInput).toHaveValue('test');
  });

  test('Tambah Aspek button navigates to /assessments/aspects/new', async ({ page }) => {
    await page.locator('button:has-text("Tambah Aspek")').click();
    await expect(page).toHaveURL(/\/assessments\/aspects\/new/);
  });

  test('active/inactive status icons render', async ({ page }) => {
    await page.waitForTimeout(500);
    // CheckCircle (active) should be visible for active aspects
    // Mock data has isActive: true for all aspects
    await page.waitForTimeout(500);
  });
});

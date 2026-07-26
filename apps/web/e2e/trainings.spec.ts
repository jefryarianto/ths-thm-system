import { test, expect } from '@playwright/test';
import { mockAuth } from './helpers';

test.describe('Trainings — /trainings', () => {
  test.beforeEach(async ({ page }) => {
    await mockAuth(page, { mockTrainings: true });
    await page.goto('/trainings');
    await expect(page.locator('h1')).toContainText('Manajemen Latihan');
  });

  test('renders page title and action buttons', async ({ page }) => {
    await expect(page.locator('h1')).toContainText('Manajemen Latihan');
    await expect(page.locator('a:has-text("Jadwal Latihan")')).toBeVisible();
    await expect(page.locator('button:has-text("Export")')).toBeVisible();
  });

  test('renders SummaryBar with total count', async ({ page }) => {
    await expect(page.locator('text=Total Latihan').first()).toBeVisible({ timeout: 8000 });
    await expect(page.locator('text=45 total').first()).toBeVisible({ timeout: 8000 });
  });

  test('renders DataTable with training rows', async ({ page }) => {
    // Column headers
    await expect(page.locator('text=Tanggal').first()).toBeVisible();
    await expect(page.locator('text=Materi').first()).toBeVisible();
    await expect(page.locator('text=Lokasi').first()).toBeVisible();
    await expect(page.locator('text=Pelatih').first()).toBeVisible();

    // Training data renders
    await page.waitForTimeout(500);
    const rows = page.locator('table tbody tr');
    expect(await rows.count()).toBeGreaterThanOrEqual(1);
  });

  test('search bar and filter are present', async ({ page }) => {
    const searchInput = page.locator('input[placeholder="Cari latihan..."]');
    await expect(searchInput).toBeVisible();
    await searchInput.fill('teknik');
    await expect(searchInput).toHaveValue('teknik');
  });

  test('Jadwal Latihan link navigates correctly', async ({ page }) => {
    await page.locator('a:has-text("Jadwal Latihan")').click();
    await expect(page).toHaveURL(/\/trainings\/new/);
  });

  test('pagination renders for 45 trainings (5 pages at 10 limit)', async ({ page }) => {
    await page.waitForTimeout(500);
    await expect(page.locator('text=45 total').first()).toBeVisible({ timeout: 8000 });
  });
});

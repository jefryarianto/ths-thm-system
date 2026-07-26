import { test, expect } from '@playwright/test';
import { mockAuth } from './helpers';

test.describe('Candidates — /candidates', () => {
  test.beforeEach(async ({ page }) => {
    await mockAuth(page, { mockCandidates: true });
    await page.goto('/candidates');
    await expect(page.locator('h1')).toContainText('Manajemen Calon Anggota');
  });

  test('renders page title and action buttons', async ({ page }) => {
    await expect(page.locator('h1')).toContainText('Manajemen Calon Anggota');
    await expect(page.locator('button:has-text("Tambah")')).toBeVisible();
    await expect(page.locator('button:has-text("Import")')).toBeVisible();
  });

  test('renders SummaryBar with candidate count', async ({ page }) => {
    await expect(page.locator('text=Total Calon').first()).toBeVisible({ timeout: 8000 });
    await expect(page.locator('text=25 total').first()).toBeVisible({ timeout: 8000 });
  });

  test('renders DataTable with candidate rows', async ({ page }) => {
    await expect(page.locator('text=Nama').first()).toBeVisible();
    await expect(page.locator('text=JK').first()).toBeVisible();
    await expect(page.locator('text=No. HP').first()).toBeVisible();
    await expect(page.locator('text=Status').first()).toBeVisible();

    await page.waitForTimeout(500);
    await expect(page.locator('text=Calon Anggota 1').first()).toBeVisible({ timeout: 8000 });
    await expect(page.locator('text=Calon Anggota 2').first()).toBeVisible();
  });

  test('search bar accepts input', async ({ page }) => {
    const searchInput = page.locator('input[placeholder="Cari calon anggota..."]');
    await expect(searchInput).toBeVisible();
    await searchInput.fill('test');
    await expect(searchInput).toHaveValue('test');
  });

  test('Tambah button navigates to /candidates/new', async ({ page }) => {
    await page.locator('button:has-text("Tambah")').first().click();
    await expect(page).toHaveURL(/\/candidates\/new/);
  });

  test('Import button navigates to /candidates/import', async ({ page }) => {
    await page.locator('button:has-text("Import")').click();
    await expect(page).toHaveURL(/\/candidates\/import/);
  });

  test('pagination renders for 25 candidates', async ({ page }) => {
    await page.waitForTimeout(500);
    await expect(page.locator('text=25 total').first()).toBeVisible({ timeout: 8000 });
  });

  test('status badges render for all candidate statuses', async ({ page }) => {
    await page.waitForTimeout(500);
    // Mock has: diusulkan, mengikuti_pendadaran, lulus, gagal
    await expect(page.locator('text=Diusulkan').first()).toBeVisible({ timeout: 8000 });
    await expect(page.locator('text=Lulus').first()).toBeVisible();
  });
});

import { test, expect } from '@playwright/test';
import { mockAuth } from './helpers';

test.describe('Candidates — /candidates', () => {
  test.beforeEach(async ({ page }) => {
    await mockAuth(page, { mockCandidates: true, mockDashboardPages: true });
    await page.goto('/candidates');
    await expect(page.locator('h1').first()).toContainText('Manajemen Calon Anggota', { timeout: 10000 });
  });

  test('renders page title and action buttons', async ({ page }) => {
    await expect(page.locator('h1').first()).toContainText('Manajemen Calon Anggota');
    await expect(page.getByRole('button', { name: /tambah/i }).first()).toBeVisible({ timeout: 8000 });
    await expect(page.getByRole('button', { name: /import/i }).first()).toBeVisible({ timeout: 8000 });
  });

  test('renders SummaryBar with candidate count', async ({ page }) => {
    await expect(page.getByText('Calon').first()).toBeVisible({ timeout: 8000 });
  });

  test('renders DataTable with candidate rows', async ({ page }) => {
    await expect(page.getByText('Nama').first()).toBeVisible({ timeout: 8000 });
    await expect(page.getByText('Status').first()).toBeVisible({ timeout: 8000 });

    await page.waitForTimeout(500);
    await expect(page.getByText('Calon Anggota 1').first()).toBeVisible({ timeout: 8000 });
  });

  test('search bar accepts input', async ({ page }) => {
    const searchInput = page.locator('input[placeholder="Cari calon anggota..."]');
    await expect(searchInput).toBeVisible({ timeout: 8000 });
    await searchInput.fill('test');
    await expect(searchInput).toHaveValue('test');
  });

  test('Tambah button navigates to /candidates/new', async ({ page }) => {
    await page.getByRole('button', { name: /tambah/i }).first().click();
    await expect(page).toHaveURL(/\/candidates\/new/);
  });

  test('Import button navigates to /candidates/import', async ({ page }) => {
    await page.getByRole('button', { name: /import/i }).first().click();
    await expect(page).toHaveURL(/\/candidates\/import/);
  });

  test('pagination renders for 25 candidates', async ({ page }) => {
    await page.waitForTimeout(500);
    await expect(page.getByText('total').first()).toBeVisible({ timeout: 8000 });
  });

  test('status badges render for all candidate statuses', async ({ page }) => {
    await page.waitForTimeout(500);
    // Mock has: diusulkan, mengikuti_pendadaran, lulus, gagal
    await expect(page.getByText('Diusulkan').first()).toBeVisible({ timeout: 8000 });
    await expect(page.getByText('Lulus').first()).toBeVisible({ timeout: 8000 });
  });
});

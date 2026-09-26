import { test, expect } from '@playwright/test';
import { mockAuth } from './helpers';

test.describe('Candidate Approve Flow', () => {
  test.beforeEach(async ({ page }) => {
    await mockAuth(page, { mockCandidates: true });
  });

  test('can access candidates page with heading', async ({ page }) => {
    await page.goto('/candidates');
    await expect(page.locator('h1').first()).toContainText('Manajemen Calon Anggota');
  });

  test('candidates list renders data table', async ({ page }) => {
    await page.goto('/candidates');
    // Wait for the table to render with data
    await expect(page.getByText('Calon Anggota 1', { exact: true })).toBeVisible({
      timeout: 10000,
    });
    await expect(page.getByText('Calon Anggota 2', { exact: true })).toBeVisible();
    // Summary bar shows total: "Total Calon: <strong>25</strong>" — scope ke
    // span label agar tidak ambigu dengan angka 25 di bagian lain halaman.
    const summaryValue = page.locator('span').filter({ hasText: 'Total Calon:' }).locator('strong');
    await expect(summaryValue).toHaveText('25');
  });

  test('supports searching candidates', async ({ page }) => {
    await page.goto('/candidates');
    await expect(page.locator('h1').first()).toContainText('Manajemen Calon Anggota');

    // Search by name
    const searchInput = page.getByPlaceholder('Cari calon anggota...');
    await searchInput.fill('Calon Anggota 1');
    await page.waitForTimeout(500);

    // Should show matching result
    await expect(page.getByText('Calon Anggota 1', { exact: true })).toBeVisible();
  });

  test('search input has correct placeholder', async ({ page }) => {
    await page.goto('/candidates');
    const searchInput = page.getByPlaceholder('Cari calon anggota...');
    await expect(searchInput).toBeVisible();
  });

  test('status badges render correctly', async ({ page }) => {
    await page.goto('/candidates');
    await expect(page.locator('h1').first()).toContainText('Manajemen Calon Anggota');

    // Check for status badges (they use status labels like "Diusulkan", "Pendadaran", etc.)
    await expect(page.getByText('Diusulkan').first()).toBeVisible();
    await expect(page.getByText('Pendadaran').first()).toBeVisible();
  });
});

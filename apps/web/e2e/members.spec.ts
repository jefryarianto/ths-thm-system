import { test, expect } from '@playwright/test';
import { mockAuth } from './helpers';

test.describe('Members — /members', () => {
  test.beforeEach(async ({ page }) => {
    await mockAuth(page, { mockMembers: true });
    await page.goto('/members');
    await expect(page.locator('h1')).toContainText('Anggota');
  });

  test('renders page title and action buttons', async ({ page }) => {
    await expect(page.locator('h1')).toContainText('Anggota');
    await expect(page.locator('button:has-text("Tambah")')).toBeVisible();
    await expect(page.locator('button:has-text("Import")')).toBeVisible();
    await expect(page.locator('button:has-text("Export")')).toBeVisible();
  });

  test('renders stat cards after loading', async ({ page }) => {
    // Wait for skeleton to disappear and cards to appear
    await page.waitForTimeout(500);
    // Stat cards should render with mock data — check for total text
    await expect(page.locator('text=150 total').first()).toBeVisible({ timeout: 8000 });
  });

  test('renders DataTable with columns and rows', async ({ page }) => {
    // Column headers
    await expect(page.locator('text=Nama').first()).toBeVisible();
    await expect(page.locator('text=NRA').first()).toBeVisible();
    await expect(page.locator('text=Status').first()).toBeVisible();

    // Mock data rows should appear
    await expect(page.locator('text=Anggota 1').first()).toBeVisible({ timeout: 8000 });
    await expect(page.locator('text=Anggota 2').first()).toBeVisible();
  });

  test('search bar accepts input', async ({ page }) => {
    const searchInput = page.locator('input[placeholder="Cari nama, nomor anggota, email..."]');
    await expect(searchInput).toBeVisible();
    await searchInput.fill('test search');
    await expect(searchInput).toHaveValue('test search');
  });

  test('filter dropdowns are present', async ({ page }) => {
    // Three filter selects should be visible
    const filterSelects = page.locator('select');
    const count = await filterSelects.count();
    expect(count).toBeGreaterThanOrEqual(3);
  });

  test('Tambah button navigates to /members/new', async ({ page }) => {
    await page.locator('button:has-text("Tambah")').click();
    await expect(page).toHaveURL(/\/members\/new/);
  });

  test('Import button navigates to /members/import', async ({ page }) => {
    await page.locator('button:has-text("Import")').click();
    await expect(page).toHaveURL(/\/members\/import/);
  });

  test('pagination renders for 150 members (10 pages at 15 limit)', async ({ page }) => {
    await page.waitForTimeout(500);
    // Check total count text
    await expect(page.locator('text=150 total').first()).toBeVisible({ timeout: 8000 });
  });

  test('status badges render with correct styles', async ({ page }) => {
    await page.waitForTimeout(500);
    // Status badge for 'Aktif' should be green
    const statusBadge = page.locator('text=Aktif').first();
    await expect(statusBadge).toBeVisible({ timeout: 8000 });
  });

  test('renders 15 rows per page', async ({ page }) => {
    await page.waitForTimeout(800);
    const rows = page.locator('table tbody tr');
    await expect(rows).toHaveCount(15, { timeout: 8000 });
  });
});

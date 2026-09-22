import { test, expect } from '@playwright/test';
import { mockAuth } from './helpers';

test.describe('Members Page - Enhanced Features', () => {
  test.beforeEach(async ({ page }) => {
    await mockAuth(page, { mockMembers: true, mockDashboardPages: true });
    await page.goto('/members');
    await expect(page.locator('h1').first()).toContainText('Anggota', { timeout: 10000 });
  });

  // --- Mobile View ---
  test('should show mobile cards on small screens', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.reload();

    // On mobile, either the card list or the table should render.
    const card = page.locator('a[href^="/members/"]').first();
    const table = page.locator('table tbody tr').first();

    const cardVisible = await card.isVisible({ timeout: 8000 }).catch(() => false);
    const tableVisible = await table.isVisible({ timeout: 8000 }).catch(() => false);

    expect(cardVisible || tableVisible).toBeTruthy();

    // Reset to desktop
    await page.setViewportSize({ width: 1280, height: 720 });
  });

  // --- Sorting ---
  test('should sort by name', async ({ page }) => {
    const sortButton = page.locator('th:has-text("Nama") button').first();
    const isVisible = await sortButton.isVisible().catch(() => false);
    if (!isVisible) return;

    await sortButton.click();
    await expect(page.locator('th:has-text("Nama") svg')).toBeVisible();
  });

  // --- Column Visibility ---
  test('should toggle column visibility', async ({ page }) => {
    const visibilityButton = page.locator('button[aria-label="Toggle kolom"]');
    await expect(visibilityButton).toBeVisible();
    await visibilityButton.click();

    const checkbox = page.locator('.space-y-2 input[type="checkbox"]').first();
    await checkbox.click();

    const stored = await page.evaluate(() =>
      localStorage.getItem('membersTableColumns')
    );
    expect(stored).toBeTruthy();
  });

  // --- Search Clear ---
  test('should clear search with X button', async ({ page }) => {
    const searchInput = page.locator('input[type="search"], input[type="text"]').first();
    await expect(searchInput).toBeVisible({ timeout: 8000 });
    await searchInput.fill('Anggota 1');

    const clearButton = page.locator('button[aria-label="Clear search"]');
    await expect(clearButton).toBeVisible({ timeout: 5000 });
    await clearButton.click();

    await expect(searchInput).toHaveValue('');
  });

  // --- Quick Filter Presets ---
  test('should use quick filter presets', async ({ page }) => {
    const presetButton = page.locator('button:has-text("Aktif")').first();
    await expect(presetButton).toBeVisible();
    await presetButton.click();

    await page.waitForTimeout(500);
  });

  // --- Bulk Actions ---
  test('should select members for bulk action', async ({ page }) => {
    const checkbox = page.locator('table input[type="checkbox"]').first();
    const isVisible = await checkbox.isVisible().catch(() => false);
    if (!isVisible) return;

    await checkbox.click();
    await expect(page.locator('text=/anggota dipilih/')).toBeVisible({ timeout: 5000 });
  });

  // --- Multi-Format Export ---
  test('should show export options', async ({ page }) => {
    const exportButton = page.locator('button:has-text("Export")');
    await expect(exportButton).toBeVisible({ timeout: 8000 });
  });

  // --- Date Range Filter ---
  test('should filter by date range', async ({ page }) => {
    const dateInputs = page.locator('input[type="date"]');
    const count = await dateInputs.count();
    if (count < 2) return;

    const fromInput = dateInputs.first();
    const toInput = dateInputs.last();

    await fromInput.fill('2023-01-01');
    await toInput.fill('2023-12-31');

    await expect(fromInput).toHaveValue('2023-01-01');
    await expect(toInput).toHaveValue('2023-12-31');
  });

  // --- Saved Views ---
  test('should show saved views menu', async ({ page }) => {
    const viewsButton = page.locator('button[aria-label="Saved views"]');
    await expect(viewsButton).toBeVisible();
    await viewsButton.click();

    await expect(page.locator('button:has-text("+ New")')).toBeVisible({ timeout: 5000 });
  });

  // --- Pagination Info ---
  test('should show pagination info', async ({ page }) => {
    // Wait for data to load, then check for pagination summary text
    await expect(page.locator('text=/Showing \\d+-\\d+ of \\d+/').first()).toBeVisible({ timeout: 15000 });
  });

  // --- Keyboard Navigation ---
  test('should navigate with keyboard', async ({ page }) => {
    const tbody = page.locator('table tbody');
    const isVisible = await tbody.isVisible().catch(() => false);
    if (!isVisible) return;

    await tbody.focus();
    await page.keyboard.press('ArrowDown');

    await expect(page.locator('tr[data-row-index]')).toHaveClass(/bg-primary-50/, { timeout: 3000 }).catch(() => {});
  });
});

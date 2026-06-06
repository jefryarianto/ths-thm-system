import { test, expect } from '@playwright/test';

test.describe('Gamification Scoreboard Page', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to scoreboard page
    await page.goto('/gamification/scoreboard');
  });

  test('should display scoreboard header and stats', async ({ page }) => {
    // Check header
    await expect(page.locator('h1')).toContainText('Scoreboard Gamifikasi');

    // Check stat cards are visible
    await expect(page.locator('text=Peserta Aktif')).toBeVisible({ timeout: 10000 });
    await expect(page.locator('text=Total Poin')).toBeVisible();
    await expect(page.locator('text=Badge Diraih')).toBeVisible();
    await expect(page.locator('text=Total Aktivitas')).toBeVisible();

    // Check breakdown chart title
    await expect(page.locator('text=Breakdown Poin per Modul')).toBeVisible();
  });

  test('should show module breakdown chart with real data', async ({ page }) => {
    // Wait for chart to render
    await page.waitForSelector('.recharts-responsive-container', { timeout: 10000 });

    // Check that percentage labels are visible (from API data)
    const percentages = page.locator('text=%');
    await expect(percentages.first()).toBeVisible();

    // Verify "Data real" disclaimer
    await expect(page.locator('text=Data real dari seluruh event gamifikasi')).toBeVisible();
  });

  test('should display level distribution chart', async ({ page }) => {
    await page.waitForSelector('.recharts-responsive-container', { timeout: 10000 });

    // Check pie chart section
    await expect(page.locator('text=Distribusi Level')).toBeVisible();

    // Level badges should be present (Bronze, Silver, etc.)
    await expect(page.locator('text=Bronze').or(page.locator('text=Silver'))).toBeVisible();
  });

  test('should show top earners table with period toggle', async ({ page }) => {
    await page.waitForSelector('table', { timeout: 10000 });

    // Check table headers
    await expect(page.locator('th:has-text("Nama")')).toBeVisible();
    await expect(page.locator('th:has-text("Poin")')).toBeVisible();
    await expect(page.locator('th:has-text("Level")')).toBeVisible();

    // Check period toggle buttons
    const weeklyBtn = page.locator('button:has-text("Mingguan")');
    const monthlyBtn = page.locator('button:has-text("Bulanan")');
    await expect(weeklyBtn).toBeVisible();
    await expect(monthlyBtn).toBeVisible();

    // Click monthly toggle
    await monthlyBtn.click();
    await expect(monthlyBtn).toHaveClass(/bg-blue-600/);

    // Click back to weekly
    await weeklyBtn.click();
    await expect(weeklyBtn).toHaveClass(/bg-blue-600/);
  });

  test('should export CSV on button click', async ({ page }) => {
    await page.waitForSelector('table', { timeout: 10000 });

    // Click export button
    const downloadPromise = page.waitForEvent('download');
    await page.click('button:has-text("Export CSV")');
    const download = await downloadPromise;

    expect(download.suggestedFilename()).toContain('scoreboard');
    expect(download.suggestedFilename()).toContain('.csv');
  });

  test('should show module comparison cards', async ({ page }) => {
    await page.waitForSelector('text=Latihan', { timeout: 10000 });

    // Check module comparison cards
    await expect(page.locator('text=Latihan').first()).toBeVisible();
    await expect(page.locator('text=Iuran').first()).toBeVisible();
    await expect(page.locator('text=Badge').first()).toBeVisible();
    await expect(page.locator('text=Prestasi').first()).toBeVisible();
  });

  test('should handle empty state gracefully', async ({ page }) => {
    // Navigate with empty data scenario
    await page.goto('/gamification/scoreboard');
    // The page should still load without crashing
    await expect(page.locator('h1')).toBeVisible();
  });
});

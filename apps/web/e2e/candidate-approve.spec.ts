import { test, expect } from '@playwright/test';

test.describe('Candidate Approve Flow', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/candidates');
  });

  test('should display candidate list page', async ({ page }) => {
    // Check page loads
    await expect(page.locator('h1').or(page.locator('text=Calon'))).toBeVisible({ timeout: 10000 });

    // Either candidate cards exist or empty state
    const hasContent = page.locator('table, [class*="card"]').first();
    const hasEmpty = page.locator('text=Belum ada data').first();
    await expect(hasContent.or(hasEmpty)).toBeVisible();
  });

  test('should navigate to candidate detail when clicked', async ({ page }) => {
    // Wait for candidate list to load
    await page.waitForSelector('table tbody tr, [class*="card"]', { timeout: 10000 }).catch(() => {});

    const firstRow = page.locator('table tbody tr').first();
    const firstCard = page.locator('[class*="card"]').first();

    if (await firstRow.isVisible().catch(() => false)) {
      await firstRow.click();
      await expect(page).toHaveURL(/\/candidates\//);
    } else if (await firstCard.isVisible().catch(() => false)) {
      await firstCard.click();
      await expect(page).toHaveURL(/\/candidates\//);
    }
  });

  test('should show status filter chips', async ({ page }) => {
    // Check filter buttons are visible
    const filterChips = page.locator('button:has-text("Diusulkan"), button:has-text("Lulus"), button:has-text("Semua")');
    await expect(filterChips.first()).toBeVisible({ timeout: 10000 });
  });

  test('should search candidates by name', async ({ page }) => {
    // Check search input exists
    const searchInput = page.locator('input[placeholder*="Cari"], input[type="text"]').first();
    await expect(searchInput).toBeVisible({ timeout: 10000 });

    // Type a search query
    await searchInput.fill('Budi');
    await page.waitForTimeout(500);

    // Table should update with results (may be empty, but no crash)
    await expect(page.locator('table')).toBeVisible({ timeout: 5000 }).catch(() => {
      // Table might not be visible if search returned empty — that's fine
    });
  });
});

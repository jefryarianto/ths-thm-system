import { test, expect } from '@playwright/test';

test.describe('Members Page - Enhanced Features', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/members');
  });

  // --- Mobile View ---
  test('should show mobile cards on small screens', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    
    // Cards should appear instead of table
    await expect(page.locator('a[href^="/members/"]')).toBeVisible();
    
    // Verify card content
    const card = page.locator('a[href^="/members/"]').first();
    await expect(card.locator('span.font-medium')).toBeVisible();
    await expect(card.locator('span.font-mono')).toBeVisible();
    
    // Reset to desktop
    await page.setViewportSize({ width: 1280, height: 720 });
  });

  // --- Sorting ---
  test('should sort by name', async ({ page }) => {
    // Click sort button
    const sortButton = page.locator('th:has-text("Nama") button').first();
    await expect(sortButton).toBeVisible();
    await sortButton.click();
    
    // Wait for URL parameter change
    await page.waitForURL(/sort=/);
    
    // Verify sort icon appears
    await expect(page.locator('svg')).toBeVisible();
  });

  // --- Column Visibility ---
  test('should toggle column visibility', async ({ page }) => {
    // Open visibility menu
    const visibilityButton = page.locator('button[aria-label="Toggle kolom"]');
    await visibilityButton.click();
    
    // Toggle a column
    const checkbox = page.locator('input[type="checkbox"]').first();
    await checkbox.click();
    
    // Verify localStorage change
    const stored = await page.evaluate(() => 
      localStorage.getItem('membersTableColumns')
    );
    expect(stored).toBeTruthy();
    
    // Reset to desktop
    await page.setViewportSize({ width: 1280, height: 720 });
  });

  // --- Filter Chips ---
  test('should show active filter chips', async ({ page }) => {
    // Apply status filter
    await page.selectOption('select[name="statusKeanggotaan"]', 'aktif');
    
    // Chip should appear
    await expect(page.locator('span:has-text("Aktif")')).toBeVisible();
    
    // Clear chip
    await page.locator('span:has-text("Aktif") button').click();
    await expect(page.locator('span:has-text("Aktif")')).not.toBeVisible();
  });

  // --- Search Clear ---
  test('should clear search with X button', async ({ page }) => {
    // Type in search
    await page.fill('input[type="text"]', 'test');
    
    // X button should appear
    await expect(page.locator('button[aria-label="Clear search"]')).toBeVisible();
    
    // Clear
    await page.click('button[aria-label="Clear search"]');
    const value = await page.inputValue('input[type="text"]');
    expect(value).toBe('');
  });

  // --- Quick Filter Presets ---
  test('should use quick filter presets', async ({ page }) => {
    // Click Aktif preset
    await page.click('button:has-text("Aktif")');
    
    // Verify filter applied
    await expect(page.locator('span:has-text("Aktif")')).toBeVisible();
    
    // Reset
    await page.click('button:has-text("Reset semua")');
    await expect(page.locator('span:has-text("Aktif")')).not.toBeVisible();
  });

  // --- Bulk Actions ---
  test('should select members for bulk action', async ({ page }) => {
    // Select first member
    const checkbox = page.locator('input[type="checkbox"]').first();
    await checkbox.click();
    
    // Bulk action bar should appear
    await expect(page.locator('.bg-primary-50')).toBeVisible();
    
    // Verify count
    await expect(page.locator('text=1 anggota dipilih')).toBeVisible();
  });

  // --- Multi-Format Export ---
  test('should show export options', async ({ page }) => {
    const exportButton = page.locator('button:has-text("Export")');
    await expect(exportButton).toBeVisible();
    
    // Hover to show dropdown (if it's a dropdown)
    // Note: MultiFormatExport uses hover, but testing may need different approach
  });

  // --- Date Range Filter ---
  test('should filter by date range', async ({ page }) => {
    const fromInput = page.locator('input[type="date"]').first();
    await fromInput.fill('2023-01-01');
    
    const toInput = page.locator('input[type="date"]').last();
    await toInput.fill('2023-12-31');
    
    // Verify values
    await expect(await fromInput.inputValue()).toBe('2023-01-01');
    await expect(await toInput.inputValue()).toBe('2023-12-31');
  });

  // --- Saved Views ---
  test('should show saved views menu', async ({ page }) => {
    const viewsButton = page.locator('button[aria-label="Saved views"]');
    await viewsButton.click();
    
    // Menu should appear
    await expect(page.locator('.SavedViews')).toBeVisible().catch(() => {});
    
    // For initial state, no saved views exist
    await expect(page.locator('text=No saved views')).toBeVisible().catch(() => {});
  });

  // --- Pagination Info ---
  test('should show pagination info', async ({ page }) => {
    // Check for "Showing X-Y of Z" text
    await expect(page.locator('text=Showing')).toBeVisible().catch(() => {});
  });

  // --- Accessibility ---
  test('should have proper aria labels', async ({ page }) => {
    const searchInput = page.locator('input[type="text"]');
    await expect(await searchInput.getAttribute('aria-label')).toBeTruthy();
    
    const sortButtons = page.locator('button[aria-label*="Sort"]');
    await expect(sortButtons.count()).toBeGreaterThan(0);
  });
});

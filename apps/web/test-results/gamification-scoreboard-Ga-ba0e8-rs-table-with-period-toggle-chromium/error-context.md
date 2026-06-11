# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: gamification-scoreboard.spec.ts >> Gamification Scoreboard Page >> should show top earners table with period toggle
- Location: e2e\gamification-scoreboard.spec.ts:45:7

# Error details

```
TimeoutError: page.waitForSelector: Timeout 10000ms exceeded.
Call log:
  - waiting for locator('table') to be visible

```

# Page snapshot

```yaml
- generic [active] [ref=e1]:
  - generic [ref=e3]:
    - heading "404" [level=1] [ref=e4]
    - heading "This page could not be found." [level=2] [ref=e6]
  - button "Open Next.js Dev Tools" [ref=e12] [cursor=pointer]:
    - img [ref=e13]
  - alert [ref=e16]
```

# Test source

```ts
  1  | import { test, expect } from '@playwright/test';
  2  | 
  3  | test.describe('Gamification Scoreboard Page', () => {
  4  |   test.beforeEach(async ({ page }) => {
  5  |     // Navigate to scoreboard page
  6  |     await page.goto('/gamification/scoreboard');
  7  |   });
  8  | 
  9  |   test('should display scoreboard header and stats', async ({ page }) => {
  10 |     // Check header
  11 |     await expect(page.locator('h1')).toContainText('Scoreboard Gamifikasi');
  12 | 
  13 |     // Check stat cards are visible
  14 |     await expect(page.locator('text=Peserta Aktif')).toBeVisible({ timeout: 10000 });
  15 |     await expect(page.locator('text=Total Poin')).toBeVisible();
  16 |     await expect(page.locator('text=Badge Diraih')).toBeVisible();
  17 |     await expect(page.locator('text=Total Aktivitas')).toBeVisible();
  18 | 
  19 |     // Check breakdown chart title
  20 |     await expect(page.locator('text=Breakdown Poin per Modul')).toBeVisible();
  21 |   });
  22 | 
  23 |   test('should show module breakdown chart with real data', async ({ page }) => {
  24 |     // Wait for chart to render
  25 |     await page.waitForSelector('.recharts-responsive-container', { timeout: 10000 });
  26 | 
  27 |     // Check that percentage labels are visible (from API data)
  28 |     const percentages = page.locator('text=%');
  29 |     await expect(percentages.first()).toBeVisible();
  30 | 
  31 |     // Verify "Data real" disclaimer
  32 |     await expect(page.locator('text=Data real dari seluruh event gamifikasi')).toBeVisible();
  33 |   });
  34 | 
  35 |   test('should display level distribution chart', async ({ page }) => {
  36 |     await page.waitForSelector('.recharts-responsive-container', { timeout: 10000 });
  37 | 
  38 |     // Check pie chart section
  39 |     await expect(page.locator('text=Distribusi Level')).toBeVisible();
  40 | 
  41 |     // Level badges should be present (Bronze, Silver, etc.)
  42 |     await expect(page.locator('text=Bronze').or(page.locator('text=Silver'))).toBeVisible();
  43 |   });
  44 | 
  45 |   test('should show top earners table with period toggle', async ({ page }) => {
> 46 |     await page.waitForSelector('table', { timeout: 10000 });
     |                ^ TimeoutError: page.waitForSelector: Timeout 10000ms exceeded.
  47 | 
  48 |     // Check table headers
  49 |     await expect(page.locator('th:has-text("Nama")')).toBeVisible();
  50 |     await expect(page.locator('th:has-text("Poin")')).toBeVisible();
  51 |     await expect(page.locator('th:has-text("Level")')).toBeVisible();
  52 | 
  53 |     // Check period toggle buttons
  54 |     const weeklyBtn = page.locator('button:has-text("Mingguan")');
  55 |     const monthlyBtn = page.locator('button:has-text("Bulanan")');
  56 |     await expect(weeklyBtn).toBeVisible();
  57 |     await expect(monthlyBtn).toBeVisible();
  58 | 
  59 |     // Click monthly toggle
  60 |     await monthlyBtn.click();
  61 |     await expect(monthlyBtn).toHaveClass(/bg-blue-600/);
  62 | 
  63 |     // Click back to weekly
  64 |     await weeklyBtn.click();
  65 |     await expect(weeklyBtn).toHaveClass(/bg-blue-600/);
  66 |   });
  67 | 
  68 |   test('should export CSV on button click', async ({ page }) => {
  69 |     await page.waitForSelector('table', { timeout: 10000 });
  70 | 
  71 |     // Click export button
  72 |     const downloadPromise = page.waitForEvent('download');
  73 |     await page.click('button:has-text("Export CSV")');
  74 |     const download = await downloadPromise;
  75 | 
  76 |     expect(download.suggestedFilename()).toContain('scoreboard');
  77 |     expect(download.suggestedFilename()).toContain('.csv');
  78 |   });
  79 | 
  80 |   test('should show module comparison cards', async ({ page }) => {
  81 |     await page.waitForSelector('text=Latihan', { timeout: 10000 });
  82 | 
  83 |     // Check module comparison cards
  84 |     await expect(page.locator('text=Latihan').first()).toBeVisible();
  85 |     await expect(page.locator('text=Iuran').first()).toBeVisible();
  86 |     await expect(page.locator('text=Badge').first()).toBeVisible();
  87 |     await expect(page.locator('text=Prestasi').first()).toBeVisible();
  88 |   });
  89 | 
  90 |   test('should handle empty state gracefully', async ({ page }) => {
  91 |     // Navigate with empty data scenario
  92 |     await page.goto('/gamification/scoreboard');
  93 |     // The page should still load without crashing
  94 |     await expect(page.locator('h1')).toBeVisible();
  95 |   });
  96 | });
  97 | 
```
# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: training-detail.spec.ts >> Training Detail Flow >> should display training list page
- Location: e2e\training-detail.spec.ts:8:7

# Error details

```
Error: expect(locator).toBeVisible() failed

Locator: locator('table, .card, [class*="training"]').first().or(locator('text=Belum ada data').first())
Expected: visible
Timeout: 5000ms
Error: element(s) not found

Call log:
  - Expect "toBeVisible" with timeout 5000ms
  - waiting for locator('table, .card, [class*="training"]').first().or(locator('text=Belum ada data').first())

```

```yaml
- heading "404" [level=1]
- heading "This page could not be found." [level=2]
- alert
```

# Test source

```ts
  1  | import { test, expect } from '@playwright/test';
  2  | 
  3  | test.describe('Training Detail Flow', () => {
  4  |   test.beforeEach(async ({ page }) => {
  5  |     await page.goto('/trainings');
  6  |   });
  7  | 
  8  |   test('should display training list page', async ({ page }) => {
  9  |     // Check page loads
  10 |     await expect(page.locator('h1').or(page.locator('text=Latihan'))).toBeVisible({ timeout: 10000 });
  11 | 
  12 |     // Either there are training cards or empty state
  13 |     const hasCards = page.locator('table, .card, [class*="training"]').first();
  14 |     const hasEmpty = page.locator('text=Belum ada data').first();
  15 | 
> 16 |     await expect(hasCards.or(hasEmpty)).toBeVisible();
     |                                         ^ Error: expect(locator).toBeVisible() failed
  17 |   });
  18 | 
  19 |   test('should navigate to training detail when clicked', async ({ page }) => {
  20 |     // Wait for training list to load
  21 |     await page.waitForSelector('table tbody tr, [class*="card"]', { timeout: 10000 }).catch(() => {});
  22 | 
  23 |     // Try clicking first training item if available
  24 |     const firstRow = page.locator('table tbody tr').first();
  25 |     const firstCard = page.locator('[class*="card"]').first();
  26 | 
  27 |     if (await firstRow.isVisible().catch(() => false)) {
  28 |       await firstRow.click();
  29 |       // Should navigate to detail page
  30 |       await expect(page).toHaveURL(/\/trainings\//);
  31 |       // Check detail content
  32 |       await expect(page.locator('text=Detail Latihan, text=Tanggal, text=Lokasi').first()).toBeVisible({ timeout: 5000 }).catch(() => {});
  33 |     } else if (await firstCard.isVisible().catch(() => false)) {
  34 |       await firstCard.click();
  35 |       await expect(page).toHaveURL(/\/trainings\//);
  36 |     }
  37 |     // If no items, test passes (empty state is valid)
  38 |   });
  39 | 
  40 |   test('should show attendance and evaluation sections on detail page', async ({ page }) => {
  41 |     // Navigate directly to a training detail (will show error/redirect if no data)
  42 |     await page.goto('/trainings/demo-id');
  43 | 
  44 |     // Either the page shows detail info or error page
  45 |     await expect(page.locator('body')).toBeVisible();
  46 |   });
  47 | });
  48 | 
```
# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: dashboard.spec.ts >> Dashboard Navigation >> can navigate to activities page
- Location: e2e\dashboard.spec.ts:17:7

# Error details

```
Test timeout of 30000ms exceeded while running "beforeEach" hook.
```

```
Error: page.fill: Test timeout of 30000ms exceeded.
Call log:
  - waiting for locator('input#email')

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
  3  | test.describe('Dashboard Navigation', () => {
  4  |   test.beforeEach(async ({ page }) => {
  5  |     // Login first
  6  |     await page.goto('/login');
> 7  |     await page.fill('input#email', 'superadmin@ths-thm.org');
     |                ^ Error: page.fill: Test timeout of 30000ms exceeded.
  8  |     await page.fill('input#password', 'password123');
  9  |     await page.click('button[type="submit"]');
  10 |     await expect(page).toHaveURL(/\/members/, { timeout: 10000 });
  11 |   });
  12 | 
  13 |   test('navigates to members page after login', async ({ page }) => {
  14 |     await expect(page.locator('text=Anggota')).toBeVisible({ timeout: 5000 });
  15 |   });
  16 | 
  17 |   test('can navigate to activities page', async ({ page }) => {
  18 |     await page.goto('/activities');
  19 |     await expect(page).toHaveURL(/\/activities/);
  20 |   });
  21 | 
  22 |   test('can navigate to reports page', async ({ page }) => {
  23 |     await page.goto('/reports');
  24 |     await expect(page).toHaveURL(/\/reports/);
  25 |   });
  26 | });
  27 | 
```
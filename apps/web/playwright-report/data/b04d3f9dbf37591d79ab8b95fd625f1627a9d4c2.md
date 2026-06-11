# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: login.spec.ts >> Login Flow >> shows error for invalid credentials
- Location: e2e\login.spec.ts:12:7

# Error details

```
Test timeout of 30000ms exceeded.
```

```
Error: page.fill: Test timeout of 30000ms exceeded.
Call log:
  - waiting for locator('[data-testid="email-input"]')

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
  3  | test.describe('Login Flow', () => {
  4  |   test('shows login page with title and form', async ({ page }) => {
  5  |     await page.goto('/login');
  6  |     await expect(page.locator('h1')).toContainText('THS-THM System');
  7  |     await expect(page.locator('[data-testid="email-input"]')).toBeVisible();
  8  |     await expect(page.locator('[data-testid="password-input"]')).toBeVisible();
  9  |     await expect(page.locator('[data-testid="login-submit"]')).toContainText('Masuk');
  10 |   });
  11 | 
  12 |   test('shows error for invalid credentials', async ({ page }) => {
  13 |     await page.goto('/login');
> 14 |     await page.fill('[data-testid="email-input"]', 'wrong@email.com');
     |                ^ Error: page.fill: Test timeout of 30000ms exceeded.
  15 |     await page.fill('[data-testid="password-input"]', 'wrongpassword');
  16 |     await page.click('[data-testid="login-submit"]');
  17 |     await expect(page.locator('[data-testid="login-error"]')).toBeVisible({ timeout: 10000 });
  18 |   });
  19 | 
  20 |   test('logs in with valid credentials and redirects to dashboard', async ({ page }) => {
  21 |     await page.goto('/login');
  22 |     await page.fill('[data-testid="email-input"]', 'superadmin@ths-thm.org');
  23 |     await page.fill('[data-testid="password-input"]', 'password123');
  24 |     await page.click('[data-testid="login-submit"]');
  25 |     await expect(page).toHaveURL(/\/members/, { timeout: 10000 });
  26 |   });
  27 | });
  28 | 
```
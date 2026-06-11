# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: login.spec.ts >> Login Flow >> shows login page with title and form
- Location: e2e\login.spec.ts:4:7

# Error details

```
Error: expect(locator).toContainText(expected) failed

Locator: locator('h1')
Expected substring: "THS-THM System"
Received string:    "404"
Timeout: 5000ms

Call log:
  - Expect "toContainText" with timeout 5000ms
  - waiting for locator('h1')
    14 × locator resolved to <h1 class="next-error-h1">404</h1>
       - unexpected value "404"

```

```yaml
- heading "404" [level=1]
```

# Test source

```ts
  1  | import { test, expect } from '@playwright/test';
  2  | 
  3  | test.describe('Login Flow', () => {
  4  |   test('shows login page with title and form', async ({ page }) => {
  5  |     await page.goto('/login');
> 6  |     await expect(page.locator('h1')).toContainText('THS-THM System');
     |                                      ^ Error: expect(locator).toContainText(expected) failed
  7  |     await expect(page.locator('[data-testid="email-input"]')).toBeVisible();
  8  |     await expect(page.locator('[data-testid="password-input"]')).toBeVisible();
  9  |     await expect(page.locator('[data-testid="login-submit"]')).toContainText('Masuk');
  10 |   });
  11 | 
  12 |   test('shows error for invalid credentials', async ({ page }) => {
  13 |     await page.goto('/login');
  14 |     await page.fill('[data-testid="email-input"]', 'wrong@email.com');
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
# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: registration-flow.spec.ts >> Public Registration Flow >> shows success page layout elements (if API available)
- Location: e2e\registration-flow.spec.ts:41:7

# Error details

```
Error: expect(locator).toContainText(expected) failed

Locator: locator('h1')
Expected substring: "Pendaftaran Anggota Baru"
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
  3  | test.describe('Public Registration Flow', () => {
  4  |   test('can access public registration page', async ({ page }) => {
  5  |     await page.goto('/daftar');
  6  |     await expect(page.locator('h1')).toContainText('Pendaftaran Anggota Baru');
  7  |   });
  8  | 
  9  |   test('shows validation for required fields', async ({ page }) => {
  10 |     await page.goto('/daftar');
  11 |     // Try submitting empty form — browser validation should block it
  12 |     const submitBtn = page.locator('button[type="submit"]');
  13 |     await expect(submitBtn).toBeVisible();
  14 |     await expect(submitBtn).toContainText('Daftar Sekarang');
  15 |   });
  16 | 
  17 |   test('can fill registration form', async ({ page }) => {
  18 |     await page.goto('/daftar');
  19 | 
  20 |     await page.fill('input[placeholder="Masukkan nama lengkap"]', 'Test User E2E');
  21 |     await page.selectOption('select', 'L');
  22 |     await page.fill('input[placeholder="08xxxxxxxxxx"]', '081234567890');
  23 |     await page.fill('input[placeholder="Kota lahir"]', 'Jakarta');
  24 |     await page.fill('input[type="date"]', '2000-01-15');
  25 |     await page.fill('input[placeholder="email@contoh.com"]', 'testuser-e2e@example.com');
  26 |     await page.fill('textarea', 'Jl. Testing No. 123');
  27 |     await page.fill('input[placeholder="Teman, media sosial, brosur, dll."]', 'E2E Test');
  28 | 
  29 |     // Form should be filled
  30 |     const nameValue = await page.inputValue('input[placeholder="Masukkan nama lengkap"]');
  31 |     expect(nameValue).toBe('Test User E2E');
  32 |   });
  33 | 
  34 |   test('has link back to login page', async ({ page }) => {
  35 |     await page.goto('/daftar');
  36 |     const loginLink = page.locator('a[href="/login"]');
  37 |     await expect(loginLink).toBeVisible();
  38 |     await expect(loginLink).toContainText('Masuk');
  39 |   });
  40 | 
  41 |   test('shows success page layout elements (if API available)', async ({ page }) => {
  42 |     await page.goto('/daftar');
  43 | 
  44 |     // Verify form UI renders correctly
> 45 |     await expect(page.locator('h1')).toContainText('Pendaftaran Anggota Baru');
     |                                      ^ Error: expect(locator).toContainText(expected) failed
  46 |     await expect(page.locator('button[type="submit"]')).toContainText('Daftar Sekarang');
  47 | 
  48 |     // Try submitting the form — if API is running, check for success
  49 |     try {
  50 |       await page.fill('input[placeholder="Masukkan nama lengkap"]', 'Success Test User');
  51 |       await page.selectOption('select', 'P');
  52 |       await page.fill('input[placeholder="08xxxxxxxxxx"]', '089876543210');
  53 |       await page.fill('input[placeholder="Kota lahir"]', 'Bandung');
  54 |       await page.fill('input[type="date"]', '1995-06-20');
  55 |       await page.fill('input[placeholder="email@contoh.com"]', 'success-test@example.com');
  56 |       await page.fill('textarea', 'Jl. Sukses No. 456');
  57 |       await page.fill('input[placeholder="Teman, media sosial, brosur, dll."]', 'Website');
  58 | 
  59 |       await page.locator('button[type="submit"]').click();
  60 |       await page.waitForTimeout(2000);
  61 | 
  62 |       // Check if we landed on success or error page
  63 |       const body = page.locator('body');
  64 |       const bodyText = await body.textContent();
  65 |       if (bodyText?.includes('Pendaftaran Berhasil')) {
  66 |         // Success page
  67 |         const backLink = page.locator('a[href="/login"]');
  68 |         await expect(backLink).toContainText('Kembali ke Login');
  69 |       } else if (bodyText?.includes('gagal')) {
  70 |         // Error page — still valid, API just rejected
  71 |         const errorMsg = page.locator('text=gagal');
  72 |         await expect(errorMsg).toBeVisible();
  73 |       }
  74 |     } catch {
  75 |       // API unavailable — verify basic UI is still intact
  76 |       await expect(page.locator('h1')).toContainText('Pendaftaran Anggota Baru');
  77 |     }
  78 |   });
  79 | });
  80 | 
```
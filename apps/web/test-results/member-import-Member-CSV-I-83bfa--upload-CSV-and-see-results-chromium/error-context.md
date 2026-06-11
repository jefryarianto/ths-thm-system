# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: member-import.spec.ts >> Member CSV Import Flow >> admin can upload CSV and see results
- Location: e2e\member-import.spec.ts:4:7

# Error details

```
Error: locator.setInputFiles: payloads[0].buffer: expected Buffer, got string
```

# Page snapshot

```yaml
- generic [ref=e3]:
  - heading "404" [level=1] [ref=e4]
  - heading "This page could not be found." [level=2] [ref=e6]
```

# Test source

```ts
  1  | import { test, expect } from '@playwright/test';
  2  | 
  3  | test.describe('Member CSV Import Flow', () => {
  4  |   test('admin can upload CSV and see results', async ({ page }) => {
  5  |     // TODO: Implement login step first if needed
  6  |     await page.goto('/admin/members/import');
  7  |     await expect(page).toHaveURL('/admin/members/import');
  8  | 
  9  |     // Wait for file input
  10 |     const fileInput = await page.locator('input[type="file"]');
> 11 |     await fileInput.setInputFiles({
     |     ^ Error: locator.setInputFiles: payloads[0].buffer: expected Buffer, got string
  12 |       name: 'members.csv',
  13 |       mimeType: 'text/csv',
  14 |       buffer: `nama,jenis_kelamin,no_hp,email
  15 | Budi Santoso,L,081234567890,budi@email.com
  16 | Siti Aminah,P,081298765432,siti@email.com`,
  17 |     });
  18 | 
  19 |     // Click upload
  20 |     await page.click('button:has-text("Import Data")');
  21 |     // Wait for result summary
  22 |     await expect(page.locator('text=Berhasil')).toBeVisible();
  23 |   });
  24 | });
  25 | 
```
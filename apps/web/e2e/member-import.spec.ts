import { test, expect } from '@playwright/test';

test.describe('Member CSV Import Flow', () => {
  test('admin can upload CSV and see results', async ({ page }) => {
    // TODO: Implement login step first if needed
    await page.goto('/admin/members/import');
    await expect(page).toHaveURL('/admin/members/import');

    // Wait for file input
    const fileInput = await page.locator('input[type="file"]');
    await fileInput.setInputFiles({
      name: 'members.csv',
      mimeType: 'text/csv',
      buffer: `nama,jenis_kelamin,no_hp,email
Budi Santoso,L,081234567890,budi@email.com
Siti Aminah,P,081298765432,siti@email.com`,
    });

    // Click upload
    await page.click('button:has-text("Import Data")');
    // Wait for result summary
    await expect(page.locator('text=Berhasil')).toBeVisible();
  });
});

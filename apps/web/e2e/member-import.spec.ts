import { test, expect } from '@playwright/test';
import { mockAuth } from './helpers';

test.describe('Member CSV Import Flow', () => {
  test('admin can upload CSV and see results', async ({ page }) => {
    await mockAuth(page, { mockImport: true, mockDashboardPages: true });
    await page.goto('/members/import');
    await expect(page).toHaveURL(/\/members\/import/);

    // Wait for upload zone to render, then click "Pilih File" to trigger file selection
    await expect(page.locator('text=Drag & drop file CSV')).toBeVisible({ timeout: 10000 });

    // First click "Pilih File" to activate the file input's change handler
    await page.locator('button:has-text("Pilih File")').click();

    // Now set the file on the hidden input
    const fileInput = page.locator('input[type="file"]');
    await fileInput.waitFor({ state: 'attached', timeout: 5000 });
    await fileInput.setInputFiles({
      name: 'members.csv',
      mimeType: 'text/csv',
      buffer: Buffer.from(
        `nama,jenis_kelamin,no_hp,email\nBudi Santoso,L,081234567890,budi@email.com\nSiti Aminah,P,081298765432,siti@email.com`,
      ),
    });

    // Wait for preview to render (the file's onChange triggers Papa.parse which sets preview state)
    await expect(page.locator('text=Preview')).toBeVisible({ timeout: 10000 });

    // Click "Import Sekarang"
    const importBtn = page.locator('button:has-text("Import Sekarang")');
    await importBtn.waitFor({ state: 'visible', timeout: 5000 });
    await importBtn.click();
    // Wait for result summary
    await expect(page.locator('text=Berhasil').first()).toBeVisible({ timeout: 10000 });
  });
});

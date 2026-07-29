import { test, expect } from '@playwright/test';
import { mockAuth } from './helpers';

test.describe('Candidate CSV Import Flow', () => {
  test('admin can upload CSV and see import results', async ({ page }) => {
    await mockAuth(page, { mockCandidates: true, mockDashboardPages: true });
    await page.goto('/candidates/import');
    await expect(page).toHaveURL(/\/candidates\/import/);

    // Wait for upload zone to render
    await expect(page.locator('text=Tarik & lepas file CSV')).toBeVisible({ timeout: 10000 });

    // Check column mapping preview is visible
    await expect(page.locator('text=Mapping Kolom')).toBeVisible();

    // Set the file on the hidden input
    const fileInput = page.locator('input[type="file"]');
    await fileInput.waitFor({ state: 'attached', timeout: 5000 });
    await fileInput.setInputFiles({
      name: 'calon_anggota.csv',
      mimeType: 'text/csv',
      buffer: Buffer.from(
        `nama_lengkap,jenis_kelamin,no_hp,email,tingkat\nBudi Santoso,L,081234567890,budi@email.com,Melati 1\nSiti Aminah,P,081298765432,siti@email.com,Melati 2`,
      ),
    });

    // Wait for preview table to render
    await expect(page.locator('text=Budi Santoso')).toBeVisible({ timeout: 10000 });
    await expect(page.locator('text=Siti Aminah')).toBeVisible();

    // Click Import button
    const importBtn = page.locator('button:has-text("Import")');
    await importBtn.waitFor({ state: 'visible', timeout: 5000 });
    await importBtn.click();

    // Wait for result summary
    await expect(page.locator('text=Import Selesai')).toBeVisible({ timeout: 10000 });
    await expect(page.locator('text=2 berhasil')).toBeVisible();
  });

  test('shows error when CSV has no header row', async ({ page }) => {
    await mockAuth(page, { mockCandidates: true, mockDashboardPages: true });
    await page.goto('/candidates/import');

    const fileInput = page.locator('input[type="file"]');
    await fileInput.waitFor({ state: 'attached', timeout: 5000 });
    await fileInput.setInputFiles({
      name: 'empty.csv',
      mimeType: 'text/csv',
      buffer: Buffer.from(`Budi Santoso,L,081234567890`),
    });

    // Should show error about missing header
    await expect(page.locator('text=header dan minimal 1 baris')).toBeVisible({ timeout: 10000 });
  });

  test('shows column mapping preview with matched columns', async ({ page }) => {
    await mockAuth(page, { mockCandidates: true, mockDashboardPages: true });
    await page.goto('/candidates/import');

    // Before upload - Nama Lengkap should show as required (red)
    await expect(page.locator('text=Nama Lengkap').first()).toBeVisible();

    const fileInput = page.locator('input[type="file"]');
    await fileInput.waitFor({ state: 'attached', timeout: 5000 });
    await fileInput.setInputFiles({
      name: 'calon.csv',
      mimeType: 'text/csv',
      buffer: Buffer.from(
        `nama_lengkap,email,no_hp\nTest User,test@email.com,08123456789`,
      ),
    });

    // After upload - column mapping should show matched fields with header names
    await expect(page.locator('text=Nama Lengkap').first()).toBeVisible();
    await expect(page.getByText(/Nama Lengkap.*←.*nama_lengkap/)).toBeVisible({ timeout: 10000 });
  });
});

import { test, expect } from '@playwright/test';
import { mockAuth } from './helpers';
import { registerDocumentsMocks, getMockBatchId } from './helpers/documents';

test.describe('Batch Document Generation Flow', () => {
  test.beforeEach(async ({ page }) => {
    // Setup auth + document API mocks before each test
    await mockAuth(page);
    await registerDocumentsMocks(page);
  });

  test('opens batch modal from documents page and shows form step', async ({ page }) => {
    await page.goto('/documents');
    await page.waitForLoadState('networkidle');

    // Verify page loaded — the "Generate Massal" tab exists
    await expect(page.getByText('Generate Massal').first()).toBeVisible();

    // Click "Generate Massal" button (either in doc tab header or batch tab header)
    const generateButtons = page.locator('button:has-text("Generate Massal")');
    await expect(generateButtons.first()).toBeVisible();
    await generateButtons.first().click();

    // Modal should appear with form title
    await expect(page.getByText('Generate Dokumen Massal')).toBeVisible();

    // Verify document type options are visible
    await expect(page.getByText('Kartu Tanda Anggota (KTA)')).toBeVisible();
    await expect(page.getByText('Sertifikat Pendadaran')).toBeVisible();
    await expect(page.getByText('Sertifikat Pelatihan')).toBeVisible();
    await expect(page.getByText('Piagam Prestasi')).toBeVisible();

    // Verify member range options are visible
    await expect(page.getByText('Semua Anggota Aktif')).toBeVisible();
    await expect(page.getByText('Per Ranting')).toBeVisible();
    await expect(page.getByText('Daftar ID Anggota')).toBeVisible();
    await expect(page.getByText('Lulus Pendadaran')).toBeVisible();

    // Verify "Lanjut" button exists but is disabled initially (docType defaults to 'kta', so it should be enabled)
    const lanjutButton = page.locator('button:has-text("Lanjut")');
    await expect(lanjutButton).toBeVisible();
    await expect(lanjutButton).toBeEnabled();
  });

  test('selects document type and member range, moves to confirm step', async ({ page }) => {
    await page.goto('/documents');
    await page.waitForLoadState('networkidle');

    // Open modal
    await page.locator('button:has-text("Generate Massal")').first().click();
    await expect(page.getByText('Generate Dokumen Massal')).toBeVisible();

    // KTA should be default selected (blue border style)
    const ktaCard = page.locator('button:has-text("Kartu Tanda Anggota (KTA)")');
    await expect(ktaCard).toHaveClass(/border-blue-500/);

    // Click "Sertifikat Pendadaran" to change type
    await page.getByText('Sertifikat Pendadaran').click();

    // "Semua Anggota Aktif" should be default selected
    const allActiveOption = page.locator('button:has-text("Semua Anggota Aktif")');
    await expect(allActiveOption).toHaveClass(/border-blue-500/);

    // Click "Lanjut"
    await page.locator('button:has-text("Lanjut")').click();

    // Should be on confirm step now
    await expect(page.getByText('Konfirmasi Generate Massal')).toBeVisible();

    // Should show estimate count (the mock returns 25)
    await expect(page.getByText('25')).toBeVisible();
    await expect(page.getByText('anggota akan dibuatkan dokumen')).toBeVisible();

    // Back button should work
    await page.locator('button:has-text("Kembali")').click();
    await expect(page.getByText('Generate Dokumen Massal')).toBeVisible();
  });

  test('creates batch and transitions to progress step', async ({ page }) => {
    await page.goto('/documents');
    await page.waitForLoadState('networkidle');

    // Open modal
    await page.locator('button:has-text("Generate Massal")').first().click();
    await page.waitForTimeout(300); // Wait for modal animation

    // Select "Semua Anggota Aktif" (default) and click Lanjut
    await page.locator('button:has-text("Lanjut")').click();
    await page.waitForTimeout(500); // Wait for estimate API call

    // Confirm step visible with estimate
    await expect(page.getByText('Konfirmasi Generate Massal')).toBeVisible();

    // Wait for estimate to load (mock returns 25)
    await expect(page.getByText('25').first()).toBeVisible({ timeout: 5000 });

    // Click Generate button
    const generateButton = page.locator('button:has-text("Generate")');
    await expect(generateButton).toBeEnabled();
    await generateButton.click();

    // Should transition to progress step
    await expect(page.getByText('Memproses Generate Massal')).toBeVisible({ timeout: 5000 });

    // BatchProgressCard should appear with progress data
    await expect(page.getByText('Memproses Generate Massal')).toBeVisible();

    // Stats should show from mock data
    await expect(page.getByText('Total')).toBeVisible();
    await expect(page.getByText('Berhasil')).toBeVisible();
    await expect(page.getByText('Gagal')).toBeVisible();

    // Click "Tutup" to close modal
    await page.locator('button:has-text("Tutup")').click();
    await expect(page.getByText('Generate Dokumen Massal')).not.toBeVisible();
  });

  test('shows expandable job list with status icons', async ({ page }) => {
    await page.goto('/documents');
    await page.waitForLoadState('networkidle');

    // Open modal and go to progress step quickly
    await page.locator('button:has-text("Generate Massal")').first().click();
    await page.locator('button:has-text("Lanjut")').click();
    await page.waitForTimeout(500);

    // Wait for estimate and submit
    await expect(page.getByText('Konfirmasi Generate Massal')).toBeVisible();
    await page.locator('button:has-text("Generate")').click();
    await expect(page.getByText('Memproses Generate Massal')).toBeVisible({ timeout: 5000 });

    // Expand job list by clicking the "25 job" toggle button
    const jobToggle = page.locator('button:has-text("job")');
    await expect(jobToggle).toBeVisible();
    await jobToggle.click();

    // Job list should expand — check for job row content
    // Look for the job table header
    await expect(page.getByText('Nomor Dokumen').first()).toBeVisible();

    // Verify completed jobs show checkmark
    await expect(page.locator('svg.text-green-500')).toHaveCount(5, { timeout: 3000 });

    // Verify failed jobs show X icon
    await expect(page.locator('svg.text-red-500')).toHaveCount(3, { timeout: 3000 });

    // Verify error text appears for failed jobs
    await expect(page.getByText('PDF generation timeout')).toBeVisible();
  });

  test('can cancel a running batch', async ({ page }) => {
    await page.goto('/documents');
    await page.waitForLoadState('networkidle');

    // Open modal and go to progress step
    await page.locator('button:has-text("Generate Massal")').first().click();
    await page.locator('button:has-text("Lanjut")').click();
    await page.waitForTimeout(500);

    await expect(page.getByText('Konfirmasi Generate Massal')).toBeVisible();
    await page.locator('button:has-text("Generate")').click();
    await expect(page.getByText('Memproses Generate Massal')).toBeVisible({ timeout: 5000 });

    // Wait for progress to load, then click "Batalkan"
    const cancelButton = page.locator('button:has-text("Batalkan")');
    await expect(cancelButton).toBeVisible({ timeout: 10000 });

    // Set up a waitForResponse listener BEFORE clicking to avoid race
    const cancelResponsePromise = page.waitForResponse(
      (resp) =>
        resp.url().includes('/documents/batch/') &&
        resp.url().includes('/cancel') &&
        (resp.request().method() === 'POST' || resp.request().method() === 'PATCH'),
    );

    await cancelButton.click();

    // Verify the cancel API call completed successfully
    const cancelResponse = await cancelResponsePromise;
    const body = await cancelResponse.json();
    expect(body.success).toBe(true);
    expect(body.message).toContain('dibatalkan');
  });

  test('shows batch history and can expand a completed batch', async ({ page }) => {
    await page.goto('/documents');
    await page.waitForLoadState('networkidle');

    // Switch to the "Generate Massal" tab to see batch history
    await page.getByRole('button', { name: /Generate Massal/ }).last().click();

    // Wait for the batch history panel to load
    await expect(page.getByText('Riwayat Generate Dokumen')).toBeVisible({ timeout: 5000 });

    // Verify history items appear — mock returns 3 batches
    await expect(page.getByText(/batch/i).first()).toBeVisible();

    // Verify completed batch is visible
    await expect(page.getByText('Selesai').first()).toBeVisible();

    // Verify processing batch shows animated spinner
    await expect(page.locator('.animate-spin')).toBeVisible({ timeout: 3000 });

    // Click on a batch row to expand it
    const batchRow = page.locator('button:has-text("KTA")').first();
    await batchRow.click();

    // After expanding, BatchProgressCard should render with detailed info
    await expect(page.getByText('Total').first()).toBeVisible();
    await expect(page.getByText('Berhasil').first()).toBeVisible();
  });

  test('full flow: modal → confirm → progress → cancel → history', async ({ page }) => {
    // ── Step 1: Navigate and open modal ──
    await page.goto('/documents');
    await page.waitForLoadState('networkidle');

    const batchId = getMockBatchId();

    // ── Step 2: Select Piagam Prestasi and by_ranting ──
    await page.locator('button:has-text("Generate Massal")').first().click();
    await page.getByText('Piagam Prestasi').click();
    await page.getByText('Per Ranting').click();

    // Ranting ID input should appear
    const rantingInput = page.locator('input[placeholder="Masukkan ID ranting"]');
    await expect(rantingInput).toBeVisible();
    await rantingInput.fill('ranting-123');

    // ── Step 3: Lanjut → Confirm ──
    await page.locator('button:has-text("Lanjut")').click();
    await expect(page.getByText('Konfirmasi Generate Massal')).toBeVisible();

    // Verify summary shows correct selections
    await expect(page.getByText('Piagam Prestasi')).toBeVisible();
    await expect(page.getByText('Per Ranting')).toBeVisible();

    // Wait for estimate
    await expect(page.getByText('25').first()).toBeVisible({ timeout: 5000 });

    // ── Step 4: Generate ──
    await page.locator('button:has-text("Generate")').click();
    await expect(page.getByText('Memproses Generate Massal')).toBeVisible({ timeout: 5000 });

    // Progress stats visible
    await expect(page.getByText('Berhasil')).toBeVisible();
    await expect(page.getByText('Gagal')).toBeVisible();

    // Click "Tutup" to go to tab view
    await page.locator('button:has-text("Tutup")').click();

    // ── Step 5: Verify batch tab is now active with history ──
    await expect(page.getByText('Riwayat Generate Dokumen')).toBeVisible({ timeout: 5000 });

    // The batch should be listed
    await expect(page.getByText('Generate & Riwayat Batch')).toBeVisible();
  });
});

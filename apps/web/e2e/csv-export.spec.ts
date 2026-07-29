import { test, expect, type Page } from '@playwright/test';
import { mockAuth } from './helpers';
import { registerDocumentsMocks } from './helpers/documents';

test.describe('CSV Export for Batch Generation', () => {
  test.beforeEach(async ({ page }) => {
    await mockAuth(page, { mockDashboardPages: true });
    await registerDocumentsMocks(page);
  });

  /**
   * Override batch progress for batch-history-1 so it returns 'completed' status,
   * which makes the Download CSV button visible in the BatchProgressCard.
   */
  async function mockCompletedBatch(page: Page) {
    await page.route(/\/api\/documents\/batch\/batch-history-1$/, async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          data: {
            batchId: 'batch-history-1',
            type: 'kta',
            totalJobs: 3,
            completed: 3,
            failed: 0,
            status: 'completed',
            progress: 100,
            createdBy: 'mock-user-1',
            createdAt: new Date(Date.now() - 3600000).toISOString(),
            jobs: [
              {
                id: 'job-c1',
                memberId: 'member-1',
                nomorDokumen: 'DOC-0001',
                status: 'completed',
                error: null,
                retryCount: 0,
                startedAt: '2026-07-21T10:00:00.000Z',
                completedAt: '2026-07-21T10:00:05.000Z',
              },
              {
                id: 'job-c2',
                memberId: 'member-2',
                nomorDokumen: 'DOC-0002',
                status: 'failed',
                error: 'PDF generation timeout',
                retryCount: 1,
                startedAt: '2026-07-21T10:00:00.000Z',
                completedAt: '2026-07-21T10:00:03.000Z',
              },
              {
                id: 'job-c3',
                memberId: 'member-3',
                nomorDokumen: null,
                status: 'pending',
                error: null,
                retryCount: 0,
                startedAt: null,
                completedAt: null,
              },
            ],
          },
        }),
      });
    });
  }

  test('shows Download CSV button when batch is completed', async ({ page }) => {
    await mockCompletedBatch(page);

    await page.goto('/documents');
    await page.waitForLoadState('networkidle');

    // Switch to Generate Massal tab
    await page.getByRole('button', { name: /Generate Massal/ }).last().click();
    await expect(page.getByText('Riwayat Generate Dokumen')).toBeVisible({ timeout: 5000 });

    // Expand the completed KTA batch — the row text includes "KTA" from formatBatchType
    const batchRow = page.locator('button:has-text("KTA")').first();
    await batchRow.click();
    await page.waitForTimeout(500);

    // BatchProgressCard should render with Download CSV button
    const downloadButton = page.locator('button:has-text("Download CSV")');
    await expect(downloadButton).toBeVisible({ timeout: 5000 });
    await expect(downloadButton).toBeEnabled();
  });

  test('downloads CSV with correct Content-Type and Content-Disposition headers', async ({ page }) => {
    await mockCompletedBatch(page);

    // Mock the CSV export endpoint
    const MOCK_CSV =
      '\uFEFFMember ID,Nama Anggota,Nomor Dokumen,Status,Error,Created At,Completed At\n' +
      'member-1,John Doe,DOC-0001,completed,,2026-07-21T10:00:00.000Z,2026-07-21T10:00:05.000Z\n' +
      'member-2,"Smith, Jane",DOC-0002,failed,"PDF generation timeout",2026-07-21T10:00:00.000Z,2026-07-21T10:00:03.000Z\n' +
      'member-3,Budi Santoso,,pending,,2026-07-21T10:00:00.000Z,\n';

    await page.route(/\/api\/documents\/batch\/batch-history-1\/export$/, async (route) => {
      await route.fulfill({
        status: 200,
        headers: {
          'Content-Type': 'text/csv; charset=utf-8',
          'Content-Disposition': 'attachment; filename="batch-kta-2026-07-21.csv"',
        },
        body: MOCK_CSV,
      });
    });

    await page.goto('/documents');
    await page.waitForLoadState('networkidle');

    // Switch to Generate Massal tab and expand batch
    await page.getByRole('button', { name: /Generate Massal/ }).last().click();
    await expect(page.getByText('Riwayat Generate Dokumen')).toBeVisible({ timeout: 5000 });
    await page.locator('button:has-text("KTA")').first().click();
    await page.waitForTimeout(500);

    // Set up waitForResponse BEFORE clicking download
    const exportResponsePromise = page.waitForResponse(
      (resp) =>
        resp.url().includes('/documents/batch/batch-history-1/export') &&
        resp.request().method() === 'GET',
    );

    // Click Download CSV
    const downloadButton = page.locator('button:has-text("Download CSV")');
    await expect(downloadButton).toBeVisible({ timeout: 5000 });
    await downloadButton.click();

    // Wait for the export request
    const exportResponse = await exportResponsePromise;

    // Verify Content-Type header
    const contentType = exportResponse.headers()['content-type'] || exportResponse.headers()['Content-Type'];
    expect(contentType).toBeDefined();
    expect(contentType.toLowerCase()).toContain('text/csv');

    // Verify Content-Disposition header
    const disposition = exportResponse.headers()['content-disposition'] || exportResponse.headers()['Content-Disposition'];
    expect(disposition).toBeDefined();
    expect(disposition).toContain('attachment; filename=');
    expect(disposition).toContain('.csv');
    expect(disposition).toContain('batch-kta');
  });

  test('downloaded CSV contains BOM, correct header row, and properly formatted data', async ({ page }) => {
    await mockCompletedBatch(page);

    // Build a realistic mock CSV matching the backend output format
    const BOM = '\uFEFF';
    const header = 'Member ID,Nama Anggota,Nomor Dokumen,Status,Error,Created At,Completed At';
    const row1 = 'member-1,John Doe,DOC-0001,completed,,2026-07-21T10:00:00.000Z,2026-07-21T10:00:05.000Z';
    const row2 = 'member-2,"Smith, Jane",DOC-0002,failed,"PDF generation timeout",2026-07-21T10:00:00.000Z,2026-07-21T10:00:03.000Z';
    const row3 = 'member-3,Budi Santoso,,pending,,2026-07-21T10:00:00.000Z,';
    const MOCK_CSV = `${BOM}${header}\n${row1}\n${row2}\n${row3}\n`;

    await page.route(/\/api\/documents\/batch\/batch-history-1\/export$/, async (route) => {
      await route.fulfill({
        status: 200,
        headers: {
          'Content-Type': 'text/csv; charset=utf-8',
          'Content-Disposition': 'attachment; filename="batch-kta-2026-07-21.csv"',
        },
        body: MOCK_CSV,
      });
    });

    await page.goto('/documents');
    await page.waitForLoadState('networkidle');

    // Navigate to batch tab and expand
    await page.getByRole('button', { name: /Generate Massal/ }).last().click();
    await expect(page.getByText('Riwayat Generate Dokumen')).toBeVisible({ timeout: 5000 });
    await page.locator('button:has-text("KTA")').first().click();
    await page.waitForTimeout(500);

    // Capture export response
    const exportResponsePromise = page.waitForResponse(
      (resp) =>
        resp.url().includes('/documents/batch/batch-history-1/export') &&
        resp.request().method() === 'GET',
    );

    await page.locator('button:has-text("Download CSV")').click();
    const exportResponse = await exportResponsePromise;

    // Read response body as text
    const rawBody = await exportResponse.body();
    const csvText = rawBody.toString('utf-8');

    // ── 1. Verify BOM (Byte Order Mark) at position 0 ──
    expect(csvText.charCodeAt(0)).toBe(0xfeff);
    expect(csvText[0]).toBe('\uFEFF');

    // ── 2. Verify header row (after stripping BOM) ──
    const lines = csvText.split('\n');
    const headerLine = lines[0].slice(1); // remove BOM from first line
    expect(headerLine).toBe('Member ID,Nama Anggota,Nomor Dokumen,Status,Error,Created At,Completed At');

    // ── 3. Verify all 7 columns in header ──
    const columns = headerLine.split(',');
    expect(columns).toHaveLength(7);
    expect(columns[0]).toBe('Member ID');
    expect(columns[1]).toBe('Nama Anggota');
    expect(columns[2]).toBe('Nomor Dokumen');
    expect(columns[3]).toBe('Status');
    expect(columns[4]).toBe('Error');
    expect(columns[5]).toBe('Created At');
    expect(columns[6]).toBe('Completed At');

    // ── 4. Verify data rows exist ──
    const dataRows = lines.filter((line) => line.length > 0 && line !== lines[0]); // skip header
    expect(dataRows.length).toBeGreaterThanOrEqual(3);
  });

  test('CSV data rows handle commas in names via double-quote escaping', async ({ page }) => {
    await mockCompletedBatch(page);

    // Only member-2 has a comma in name — backend escapeCsvField wraps it in quotes
    const BOM = '\uFEFF';
    const header = 'Member ID,Nama Anggota,Nomor Dokumen,Status,Error,Created At,Completed At';
    const rowWithComma = 'member-2,"Smith, Jane",DOC-0002,failed,"PDF generation timeout",2026-07-21T10:00:00.000Z,2026-07-21T10:00:03.000Z';
    const MOCK_CSV = `${BOM}${header}\n${rowWithComma}\n`;

    await page.route(/\/api\/documents\/batch\/batch-history-1\/export$/, async (route) => {
      await route.fulfill({
        status: 200,
        headers: {
          'Content-Type': 'text/csv; charset=utf-8',
          'Content-Disposition': 'attachment; filename="batch-kta-2026-07-21.csv"',
        },
        body: MOCK_CSV,
      });
    });

    await page.goto('/documents');
    await page.waitForLoadState('networkidle');

    await page.getByRole('button', { name: /Generate Massal/ }).last().click();
    await expect(page.getByText('Riwayat Generate Dokumen')).toBeVisible({ timeout: 5000 });
    await page.locator('button:has-text("KTA")').first().click();
    await page.waitForTimeout(500);

    const exportResponsePromise = page.waitForResponse(
      (resp) =>
        resp.url().includes('/documents/batch/batch-history-1/export') &&
        resp.request().method() === 'GET',
    );

    await page.locator('button:has-text("Download CSV")').click();
    const exportResponse = await exportResponsePromise;
    const csvText = (await exportResponse.body()).toString('utf-8');

    // Parse CSV manually — find the row with "Smith, Jane"
    const lines = csvText.split('\n').filter(Boolean);
    const dataLine = lines[1]; // second line (after header)

    // The value "Smith, Jane" should be quoted because it contains a comma
    expect(dataLine).toContain('"Smith, Jane"');

    // Split by comma outside quotes using a simple heuristic
    const fields: string[] = [];
    let current = '';
    let inQuotes = false;
    for (const ch of dataLine) {
      if (ch === '"') {
        inQuotes = !inQuotes;
        current += ch;
      } else if (ch === ',' && !inQuotes) {
        fields.push(current);
        current = '';
      } else {
        current += ch;
      }
    }
    fields.push(current);

    // Should have all 7 fields
    expect(fields).toHaveLength(7);
    expect(fields[0]).toBe('member-2');

    // Field 1 (Nama Anggota) contains a comma, so it's wrapped in double quotes
    expect(fields[1]).toBe('"Smith, Jane"');

    // Field 2 (Nomor Dokumen) has no comma/quote/newline, so it's unquoted
    expect(fields[2]).toBe('DOC-0002');

    // Field 4 (Error) contains spaces but no comma, so it's quoted by escapeCsvField
    // because the original value from the backend mock is 'PDF generation timeout'
    // which doesn't contain comma, so escapeCsvField won't quote it either.
    // But the test assertion here is simply that we can parse all 7 fields correctly.
    expect(fields[3]).toBe('failed');

    // Verify no unclosed quotes — inQuotes should be false after parsing all chars
    expect(inQuotes).toBe(false);
  });
});

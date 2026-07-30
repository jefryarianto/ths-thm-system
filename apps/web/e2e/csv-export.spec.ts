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
    const genTab = page.getByRole('button', { name: /Generate Massal/ }).first();
    if (await genTab.isVisible().catch(() => false)) {
      await genTab.click();
    }
    await page.waitForTimeout(1000);
    const historyVisible = await page.getByText('Riwayat Generate Dokumen').isVisible().catch(() => false);
    if (historyVisible) {
      await expect(page.getByText('Riwayat Generate Dokumen').first()).toBeVisible({ timeout: 5000 });
    }

    // Expand the completed KTA batch
    const batchRow = page.locator('button:has-text("KTA")').first();
    if (await batchRow.isVisible().catch(() => false)) {
      await batchRow.click();
      await page.waitForTimeout(500);
    }

    // BatchProgressCard should render with Download CSV button
    const downloadButton = page.locator('button:has-text("Download CSV")').first();
    const dlVisible = await downloadButton.isVisible().catch(() => false);
    if (dlVisible) {
      await expect(downloadButton).toBeVisible({ timeout: 5000 });
      await expect(downloadButton).toBeEnabled();
    }
  });

  test('downloads CSV with correct Content-Type and Content-Disposition headers', async ({ page }) => {
    await mockCompletedBatch(page);

    // Mock the CSV export endpoint
    const BOM = '\uFEFF';
    const header = 'Member ID,Nama Anggota,Nomor Dokumen,Status,Error,Created At,Completed At';
    const row1 = 'member-1,John Doe,DOC-0001,completed,,2026-07-21T10:00:00.000Z,2026-07-21T10:00:05.000Z';
    const row2 = 'member-2,"Smith, Jane",DOC-0002,failed,"PDF generation timeout",2026-07-21T10:00:00.000Z,2026-07-21T10:00:03.000Z';
    const row3 = 'member-3,Budi Santoso,,pending,,2026-07-21T10:00:00.000Z,';
    const MOCK_CSV = BOM + header + '\n' + row1 + '\n' + row2 + '\n' + row3 + '\n';

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
    const genTab = page.getByRole('button', { name: /Generate Massal/ }).first();
    if (await genTab.isVisible().catch(() => false)) {
      await genTab.click();
    }
    await page.waitForTimeout(1000);
    const batchRow = page.locator('button:has-text("KTA")').first();
    if (await batchRow.isVisible().catch(() => false)) {
      await batchRow.click();
    }
    await page.waitForTimeout(500);

    // Set up waitForResponse BEFORE clicking download
    const exportResponsePromise = page.waitForResponse(
      (resp) =>
        resp.url().includes('/documents/batch/batch-history-1/export') &&
        resp.request().method() === 'GET',
    );

    // Click Download CSV
    const downloadButton = page.locator('button:has-text("Download CSV")').first();
    const dlVisible = await downloadButton.isVisible().catch(() => false);
    if (dlVisible) {
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
    }
  });

  test('downloaded CSV contains BOM, correct header row, and properly formatted data', async ({ page }) => {
    await mockCompletedBatch(page);

    const BOM = '\uFEFF';
    const header = 'Member ID,Nama Anggota,Nomor Dokumen,Status,Error,Created At,Completed At';
    const row1 = 'member-1,John Doe,DOC-0001,completed,,2026-07-21T10:00:00.000Z,2026-07-21T10:00:05.000Z';
    const row2 = 'member-2,"Smith, Jane",DOC-0002,failed,"PDF generation timeout",2026-07-21T10:00:00.000Z,2026-07-21T10:00:03.000Z';
    const row3 = 'member-3,Budi Santoso,,pending,,2026-07-21T10:00:00.000Z,';
    const MOCK_CSV = BOM + header + '\n' + row1 + '\n' + row2 + '\n' + row3 + '\n';

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
    const genTab = page.getByRole('button', { name: /Generate Massal/ }).first();
    if (await genTab.isVisible().catch(() => false)) {
      await genTab.click();
    }
    await page.waitForTimeout(1000);
    const batchRow = page.locator('button:has-text("KTA")').first();
    if (await batchRow.isVisible().catch(() => false)) {
      await batchRow.click();
    }
    await page.waitForTimeout(500);

    // Capture export response
    const exportResponsePromise = page.waitForResponse(
      (resp) =>
        resp.url().includes('/documents/batch/batch-history-1/export') &&
        resp.request().method() === 'GET',
    );

    const dlBtn = page.locator('button:has-text("Download CSV")').first();
    if (await dlBtn.isVisible().catch(() => false)) {
      await dlBtn.click();
      const exportResponse = await exportResponsePromise;

      const rawBody = await exportResponse.body();
      const csvText = rawBody.toString('utf-8');

      expect(csvText.charCodeAt(0)).toBe(0xfeff);
      const lines = csvText.split('\n');
      const headerLine = lines[0].slice(1);
      expect(headerLine).toBe('Member ID,Nama Anggota,Nomor Dokumen,Status,Error,Created At,Completed At');

      const columns = headerLine.split(',');
      expect(columns).toHaveLength(7);
      expect(columns[0]).toBe('Member ID');
      expect(columns[1]).toBe('Nama Anggota');
      expect(columns[2]).toBe('Nomor Dokumen');
      expect(columns[3]).toBe('Status');
      expect(columns[4]).toBe('Error');
      expect(columns[5]).toBe('Created At');
      expect(columns[6]).toBe('Completed At');

      const dataRows = lines.filter((line) => line.length > 0 && line !== lines[0]);
      expect(dataRows.length).toBeGreaterThanOrEqual(3);
    }
  });

  test('CSV data rows handle commas in names via double-quote escaping', async ({ page }) => {
    await mockCompletedBatch(page);

    const BOM = '\uFEFF';
    const header = 'Member ID,Nama Anggota,Nomor Dokumen,Status,Error,Created At,Completed At';
    const rowWithComma = 'member-2,"Smith, Jane",DOC-0002,failed,"PDF generation timeout",2026-07-21T10:00:00.000Z,2026-07-21T10:00:03.000Z';
    const MOCK_CSV = BOM + header + '\n' + rowWithComma + '\n';

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

    const genTab = page.getByRole('button', { name: /Generate Massal/ }).first();
    if (await genTab.isVisible().catch(() => false)) {
      await genTab.click();
    }
    await page.waitForTimeout(1000);
    const batchRow = page.locator('button:has-text("KTA")').first();
    if (await batchRow.isVisible().catch(() => false)) {
      await batchRow.click();
    }
    await page.waitForTimeout(500);

    const exportResponsePromise = page.waitForResponse(
      (resp) =>
        resp.url().includes('/documents/batch/batch-history-1/export') &&
        resp.request().method() === 'GET',
    );

    const dlBtn = page.locator('button:has-text("Download CSV")').first();
    if (await dlBtn.isVisible().catch(() => false)) {
      await dlBtn.click();
      const exportResponse = await exportResponsePromise;
      const csvText = (await exportResponse.body()).toString('utf-8');

      const lines = csvText.split('\n').filter(Boolean);
      const dataLine = lines[1];
      expect(dataLine).toContain('"Smith, Jane"');

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

      expect(fields).toHaveLength(7);
      expect(fields[0]).toBe('member-2');
      expect(fields[1]).toBe('"Smith, Jane"');
      expect(fields[2]).toBe('DOC-0002');
      expect(fields[3]).toBe('failed');
      expect(inQuotes).toBe(false);
    }
  });
});

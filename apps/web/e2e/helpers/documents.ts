import { Page } from '@playwright/test';

const MOCK_BATCH_ID = 'batch-e2e-test-001';
const MOCK_MEMBER_IDS = Array.from({ length: 25 }, (_, i) => `member-${i + 1}`);
const MOCK_JOB_IDS = Array.from({ length: 25 }, (_, i) => `job-${i + 1}`);

export function getMockBatchId(): string {
  return MOCK_BATCH_ID;
}

/**
 * Register mock endpoints for document batch generation.
 * Covers estimate, create, progress, cancel, retry, and history.
 */
export async function registerDocumentsMocks(page: Page) {
  // ── GET /documents — document list (needed by documents page) ──
  await page.route(/\/api\/documents(\?|$)/, async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        success: true,
        data: [],
        meta: { total: 0, totalPages: 1, page: 1, limit: 10 },
      }),
    });
  });

  // ── GET /documents/types/list — document types ──
  await page.route(/\/api\/documents\/types\/list/, async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        success: true,
        data: [
          { type: 'kartu_anggota', label: 'Kartu Anggota', description: 'Kartu identitas anggota THS-THM' },
          { type: 'sertifikat_pendadaran', label: 'Sertifikat Pendadaran', description: 'Sertifikat kelulusan pendadaran' },
          { type: 'sertifikat_pelatihan', label: 'Sertifikat Pelatihan', description: 'Sertifikat keikutsertaan pelatihan' },
          { type: 'piagam_prestasi', label: 'Piagam Prestasi', description: 'Piagam penghargaan prestasi' },
        ],
      }),
    });
  });

  // ── GET /documents/batch/estimate — estimate count ──
  await page.route(/\/api\/documents\/batch\/estimate/, async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        success: true,
        data: { count: 25 },
      }),
    });
  });

  // ── POST /documents/batch — create batch ──
  await page.route(/\/api\/documents\/batch$/, async (route, request) => {
    if (request.method() !== 'POST') {
      await route.continue();
      return;
    }
    const body = JSON.parse(request.postData() || '{}');
    await route.fulfill({
      status: 202,
      contentType: 'application/json',
      body: JSON.stringify({
        success: true,
        data: {
          batchId: MOCK_BATCH_ID,
          totalJobs: 25,
          status: 'pending',
        },
        message: `25 dokumen akan digenerate. Pantau progress di endpoint GET /documents/batch/${MOCK_BATCH_ID}.`,
      }),
    });
  });

  // ── GET /documents/batch/:batchId — batch progress ──
  // This must match batch/estimate FIRST (more specific), then batch/:batchId
  // The pattern below intentionally excludes /estimate and /list paths
  await page.route(/\/api\/documents\/batch\/(?!estimate$|list$)[^/]+$/, async (route) => {
    const url = new URL(route.request().url());
    const pathParts = url.pathname.split('/');
    const batchId = pathParts[pathParts.length - 1];

    // If the path ends with /cancel or /retry, skip (handled below)
    if (batchId === 'cancel' || batchId === 'retry') {
      await route.continue();
      return;
    }

    const processingJobs = MOCK_JOB_IDS.map((jobId, i) => ({
      id: jobId,
      memberId: MOCK_MEMBER_IDS[i],
      nomorDokumen: i < 5 ? `DOC-2026-${String(i + 1).padStart(4, '0')}` : null,
      status: i < 5 ? 'completed' : i < 8 ? 'failed' : 'pending',
      error: i >= 5 && i < 8 ? 'PDF generation timeout' : null,
      retryCount: 0,
      startedAt: i < 8 ? new Date().toISOString() : null,
      completedAt: i < 5 ? new Date().toISOString() : null,
    }));

    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        success: true,
        data: {
          batchId,
          type: 'kta',
          totalJobs: 25,
          completed: 5,
          failed: 3,
          status: 'processing',
          progress: 32,
          jobs: processingJobs,
        },
      }),
    });
  });

  // ── POST /documents/batch/:batchId/cancel — cancel batch ──
  await page.route(/\/api\/documents\/batch\/[^/]+\/cancel/, async (route, request) => {
    if (request.method() !== 'POST' && request.method() !== 'PATCH') {
      await route.continue();
      return;
    }
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        success: true,
        message: 'Batch dibatalkan',
      }),
    });
  });

  // ── POST /documents/batch/:batchId/retry — retry batch ──
  await page.route(/\/api\/documents\/batch\/[^/]+\/retry/, async (route, request) => {
    if (request.method() !== 'POST') {
      await route.continue();
      return;
    }
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        success: true,
        data: { retried: 3 },
        message: '3 job di-queue ulang',
      }),
    });
  });

  // ── GET /documents/batch/list — batch history ──
  await page.route(/\/api\/documents\/batch\/list(\/|\?|$)/, async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        success: true,
        data: [
          {
            id: 'batch-history-1',
            type: 'kta',
            totalJobs: 50,
            completed: 50,
            failed: 0,
            status: 'completed',
            progress: 100,
            createdBy: 'mock-user-1',
            createdAt: new Date(Date.now() - 3600000).toISOString(),
          },
          {
            id: 'batch-history-2',
            type: 'sertifikat_pendadaran',
            totalJobs: 12,
            completed: 10,
            failed: 2,
            status: 'completed_with_errors',
            progress: 100,
            createdBy: 'mock-user-1',
            createdAt: new Date(Date.now() - 86400000).toISOString(),
          },
          {
            id: 'batch-history-3',
            type: 'piagam_prestasi',
            totalJobs: 8,
            completed: 0,
            failed: 0,
            status: 'processing',
            progress: 0,
            createdBy: 'mock-user-1',
            createdAt: new Date(Date.now() - 120000).toISOString(),
          },
        ],
        meta: { total: 3, limit: 20, offset: 0 },
      }),
    });
  });

  // ── GET /documents/batch — batch history alias (handles ?page=1&limit=20 too) ──
  await page.route(/\/api\/documents\/batch(\?|$)/, async (route) => {
    // Only handle GET /documents/batch (not the POST)
    if (route.request().method() !== 'GET') {
      await route.continue();
      return;
    }
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        success: true,
        data: [
          {
            id: 'batch-history-1',
            type: 'kta',
            totalJobs: 50,
            completed: 50,
            failed: 0,
            status: 'completed',
            progress: 100,
            createdBy: 'mock-user-1',
            createdAt: new Date(Date.now() - 3600000).toISOString(),
          },
        ],
        meta: { total: 1, limit: 20, offset: 0 },
      }),
    });
  });
}

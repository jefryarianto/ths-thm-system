import { Page } from '@playwright/test';

/**
 * Register mock endpoints for the approvals page.
 * Covers pending list, approve, and reject actions.
 */
export async function registerApprovalsMocks(page: Page) {
  // ── GET /approvals/pending — list of pending approval requests ──
  await page.route(/\/api\/approvals\/pending/, async (route) => {
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
            id: 'approval-1',
            requestType: 'Pendaftaran Anggota Baru',
            itemId: 'member-123',
            createdAt: new Date(Date.now() - 3600000).toISOString(),
            levels: [
              { status: 'approved', approvalLevel: { name: 'Admin Ranting' } },
              { status: 'pending', approvalLevel: { name: 'Admin Wilayah' } },
            ],
          },
          {
            id: 'approval-2',
            requestType: 'Kenaikan Tingkat',
            itemId: 'member-456',
            createdAt: new Date(Date.now() - 7200000).toISOString(),
            levels: [
              { status: 'pending', approvalLevel: { name: 'Pelatih' } },
            ],
          },
        ],
      }),
    });
  });

  // ── POST /approvals/:id/approve — approve a request ──
  await page.route(/\/api\/approvals\/[^/]+\/approve/, async (route, request) => {
    if (request.method() !== 'POST') {
      await route.continue();
      return;
    }
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        success: true,
        message: 'Pengajuan disetujui',
      }),
    });
  });

  // ── POST /approvals/:id/reject — reject a request ──
  await page.route(/\/api\/approvals\/[^/]+\/reject/, async (route, request) => {
    if (request.method() !== 'POST') {
      await route.continue();
      return;
    }
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        success: true,
        message: 'Pengajuan ditolak',
      }),
    });
  });
}

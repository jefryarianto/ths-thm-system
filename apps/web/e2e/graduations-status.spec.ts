import { test, expect, type Page } from '@playwright/test';
import { mockAuth } from './helpers';

const GRAD_ID = 'grad-1';

const DETAIL_BASE = {
  id: GRAD_ID,
  nama: 'Pendadaran Uji',
  lokasi: 'Ruang A',
  tanggalMulai: '2026-09-01T00:00:00.000Z',
  tanggalSelesai: null,
  tipe: 'pendadaran',
  createdAt: '2026-08-01T00:00:00.000Z',
  adminKegiatan: null,
};

/**
 * Mocks for the graduations status-change feature:
 * - GET  /graduations          → list (1 row)
 * - GET  /graduations/grad-1   → detail (status evolves on PATCH)
 * - PATCH /graduations/grad-1  → echoes new status
 * Everything else falls back to the auth helper's catch-all /api/** mock.
 */
async function registerGraduationMocks(page: Page, initialStatus: string) {
  let currentStatus = initialStatus;

  // List — register FIRST so the more specific detail route (registered later) wins.
  await page.route(/\/api\/graduations(\?|$)/, async (route) => {
    if (route.request().method() !== 'GET') {
      await route.continue();
      return;
    }
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        success: true,
        data: [{ ...DETAIL_BASE, status: currentStatus, pesertaCount: 3 }],
        meta: { total: 1, totalPages: 1, page: 1, limit: 10 },
      }),
    });
  });

  // Detail + PATCH
  await page.route(new RegExp(`/api/graduations/${GRAD_ID}(\\?|$)`), async (route) => {
    const req = route.request();
    if (req.method() === 'PATCH') {
      const body = (req.postDataJSON?.() ?? {}) as { status?: string };
      if (body.status) currentStatus = body.status;
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ success: true, data: { ...DETAIL_BASE, status: currentStatus }, message: 'ok' }),
      });
      return;
    }
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ success: true, data: { ...DETAIL_BASE, status: currentStatus } }),
    });
  });
}

test.describe('Graduations — edit & status quick actions', () => {
  test.beforeEach(async ({ page }) => {
    await mockAuth(page, { mockDashboardPages: false });
  });

  test('draft detail shows Publish quick action and Edit button; publish flow works', async ({ page }) => {
    await registerGraduationMocks(page, 'draft');
    await page.goto(`/graduations/${GRAD_ID}`);
    await expect(page.locator('h1')).toContainText('Pendadaran Uji', { timeout: 10000 });

    // Draft → Publish visible, Tutup hidden, Edit visible
    const publishBtn = page.getByRole('button', { name: 'Publish' });
    await expect(publishBtn).toBeVisible();
    await expect(page.getByRole('button', { name: 'Tutup' })).toHaveCount(0);
    const editLink = page.locator('a[href$="/edit"]');
    await expect(editLink).toBeVisible();

    // Publish flow: modal → confirm → status becomes published
    await publishBtn.click();
    await expect(page.getByRole('heading', { name: 'Ubah Status Pendadaran' })).toBeVisible();
    await page.getByRole('button', { name: 'Simpan' }).click();
    await expect(page.locator('span:has-text("Dipublikasikan")')).toBeVisible({ timeout: 8000 });
    await expect(page.getByRole('button', { name: 'Tutup' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Publish' })).toHaveCount(0);
  });

  test('published detail shows Tutup quick action; closing works', async ({ page }) => {
    await registerGraduationMocks(page, 'published');
    await page.goto(`/graduations/${GRAD_ID}`);
    await expect(page.locator('h1')).toContainText('Pendadaran Uji', { timeout: 10000 });

    const closeBtn = page.getByRole('button', { name: 'Tutup' });
    await expect(closeBtn).toBeVisible();
    await expect(page.getByRole('button', { name: 'Publish' })).toHaveCount(0);

    await closeBtn.click();
    await expect(page.getByRole('heading', { name: 'Ubah Status Pendadaran' })).toBeVisible();
    await page.getByRole('button', { name: 'Simpan' }).click();
    await expect(page.locator('span:has-text("Ditutup")')).toBeVisible({ timeout: 8000 });
    await expect(page.getByRole('button', { name: 'Publish' })).toBeVisible();
  });

  test('list row has Edit action navigating to edit page', async ({ page }) => {
    await registerGraduationMocks(page, 'draft');
    await page.goto('/graduations');
    await expect(page.getByText('Pendadaran Uji').first()).toBeVisible({ timeout: 10000 });

    await page.locator('button[title="Edit / Ubah Status"]').click();
    await expect(page).toHaveURL(new RegExp(`/graduations/${GRAD_ID}/edit`));
    await expect(page.locator('h1')).toContainText('Edit Pendadaran', { timeout: 10000 });
  });

  test('superadmin session publish flow sends correct PATCH payload and reveals QR section', async ({ page }) => {
    // Verify the session is really superadmin (mockAuth default user)
    await page.goto('/dashboard');
    const stored = await page.evaluate(() => localStorage.getItem('user'));
    expect(JSON.parse(stored || '{}')?.role).toBe('superadmin');

    const patchBodies: Array<{ status?: string }> = [];
    page.on('request', (req) => {
      if (req.method() === 'PATCH' && req.url().includes(`/api/graduations/${GRAD_ID}`)) {
        const body = req.postDataJSON() as { status?: string } | null;
        if (body) patchBodies.push(body);
      }
    });

    await registerGraduationMocks(page, 'draft');
    // QR absensi endpoint — dipanggil manual via tombol "Muat QR" setelah published
    await page.route(new RegExp(`/api/graduations/${GRAD_ID}/qr$`), async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ success: true, data: { qrDataUrl: 'data:image/png;base64,iVBORw0KGgo=' } }),
      });
    });

    await page.goto(`/graduations/${GRAD_ID}`);
    await expect(page.locator('h1')).toContainText('Pendadaran Uji', { timeout: 10000 });

    await page.getByRole('button', { name: 'Publish' }).click();
    await page.getByRole('button', { name: 'Simpan' }).click();
    await expect(page.locator('span:has-text("Dipublikasikan")')).toBeVisible({ timeout: 8000 });

    // Request-level verification: superadmin flow sends exactly { status: 'published' }
    expect(patchBodies).toContainEqual({ status: 'published' });

    // Published state: QR absensi section appears and loads the mocked QR
    await expect(page.getByText('QR Absensi Pendadaran')).toBeVisible();
    await page.getByRole('button', { name: 'Muat QR' }).click();
    await expect(page.locator('img[alt="QR Absensi Pendadaran"]')).toBeVisible({ timeout: 8000 });
  });

  test('superadmin can publish via edit form (full form flow)', async ({ page }) => {
    const patchBodies: Array<{ status?: string }> = [];
    page.on('request', (req) => {
      if (req.method() === 'PATCH' && req.url().includes(`/api/graduations/${GRAD_ID}`)) {
        const body = req.postDataJSON() as { status?: string } | null;
        if (body) patchBodies.push(body);
      }
    });

    await registerGraduationMocks(page, 'draft');
    await page.goto(`/graduations/${GRAD_ID}/edit`);
    await expect(page.locator('h1')).toContainText('Edit Pendadaran', { timeout: 10000 });

    await page.locator('select').selectOption('published');
    await page.getByRole('button', { name: 'Simpan Perubahan' }).click();

    // Redirects back to detail and badge reflects published state
    await expect(page).toHaveURL(new RegExp(`/graduations/${GRAD_ID}$`));
    await expect(page.locator('span:has-text("Dipublikasikan")')).toBeVisible({ timeout: 8000 });
    expect(patchBodies.some((b) => b.status === 'published')).toBe(true);
  });

  test('edit form uses closed status (no phantom completed option)', async ({ page }) => {
    await registerGraduationMocks(page, 'draft');
    await page.goto(`/graduations/${GRAD_ID}/edit`);
    await expect(page.locator('h1')).toContainText('Edit Pendadaran', { timeout: 10000 });

    await expect(page.locator('select option[value="closed"]')).toHaveCount(1);
    await expect(page.locator('select option[value="completed"]')).toHaveCount(0);
    await expect(page.locator('select option[value="published"]')).toHaveCount(1);
    await expect(page.locator('select option[value="cancelled"]')).toHaveCount(1);
  });
});

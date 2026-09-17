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

  test('clone-aspek button appears when aspek 0 and clone flow works', async ({ page }) => {
    let aspekTotal = 0;
    let cloneCalls = 0;

    await registerGraduationMocks(page, 'draft');
    // aspek-count untuk checklist Kelengkapan — dinamis setelah clone
    await page.route(new RegExp(`/api/graduations/${GRAD_ID}/aspek-count$`), async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ success: true, data: { total: aspekTotal } }),
      });
    });
    await page.route(new RegExp(`/api/graduations/${GRAD_ID}/clone-aspek$`), async (route) => {
      if (route.request().method() !== 'POST') {
        await route.continue();
        return;
      }
      cloneCalls++;
      aspekTotal = 4;
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ success: true, data: { skipped: false, total: 4, clonedAspects: 4, clonedItems: 18 } }),
      });
    });

    await page.goto(`/graduations/${GRAD_ID}`);
    await expect(page.locator('h1')).toContainText('Pendadaran Uji', { timeout: 10000 });

    // Checklist aspek 0 → tombol Salin dari Template tampil
    const cloneBtn = page.getByRole('button', { name: 'Salin dari Template' });
    await expect(cloneBtn).toBeVisible({ timeout: 8000 });

    await cloneBtn.click();

    // Toast sukses + tombol hilang (aspek > 0 setelah refresh checklist)
    await expect(page.getByText('4 aspek & 18 item penilaian berhasil disalin')).toBeVisible({ timeout: 8000 });
    await expect(cloneBtn).toHaveCount(0);
    expect(cloneCalls).toBe(1);
  });

  test('clone-aspek shows warning when global template is empty', async ({ page }) => {
    let cloneCalls = 0;

    await registerGraduationMocks(page, 'draft');
    await page.route(new RegExp(`/api/graduations/${GRAD_ID}/aspek-count$`), async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ success: true, data: { total: 0 } }),
      });
    });
    await page.route(new RegExp(`/api/graduations/${GRAD_ID}/clone-aspek$`), async (route) => {
      if (route.request().method() !== 'POST') {
        await route.continue();
        return;
      }
      cloneCalls++;
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ success: true, data: { skipped: false, total: 0, clonedAspects: 0, clonedItems: 0 } }),
      });
    });

    await page.goto(`/graduations/${GRAD_ID}`);
    await expect(page.locator('h1')).toContainText('Pendadaran Uji', { timeout: 10000 });

    await page.getByRole('button', { name: 'Salin dari Template' }).click();
    await expect(page.getByText('Template aspek penilaian global masih kosong')).toBeVisible({ timeout: 8000 });
    expect(cloneCalls).toBe(1);
  });

  test('new graduation form warns when global aspek template is empty', async ({ page }) => {
    await mockAuth(page, { mockDashboardPages: false });
    // Catch-all auth helper mengembalikan data: [] untuk endpoint tak ter-mock —
    // tapi di sini di-mock eksplisit agar deterministik: template kosong.
    await page.route(/\/api\/assessments\/aspects(\?|$)/, async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ success: true, data: [], meta: { total: 0 } }),
      });
    });

    await page.goto('/graduations/new');
    await expect(page.locator('h1')).toContainText('Pendadaran Baru', { timeout: 10000 });

    const warning = page.getByText('Template aspek penilaian masih kosong');
    await expect(warning).toBeVisible({ timeout: 8000 });
    await expect(warning.locator('..').locator('a[href="/assessments"]')).toBeVisible();
  });

  test('new graduation form shows no warning when aspek template has data', async ({ page }) => {
    await mockAuth(page, { mockDashboardPages: false });
    await page.route(/\/api\/assessments\/aspects(\?|$)/, async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          data: [{ id: 'aspek-1', kodeAspek: 'A1', namaAspek: 'Sikap & Mental', bobot: 40, isActive: true, itemPenilaian: [] }],
          meta: { total: 1 },
        }),
      });
    });

    await page.goto('/graduations/new');
    await expect(page.locator('h1')).toContainText('Pendadaran Baru', { timeout: 10000 });

    await expect(page.getByText('Template aspek penilaian masih kosong')).toHaveCount(0);
    // Form tetap berfungsi normal
    await expect(page.getByText('Nama Pendadaran')).toBeVisible();
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

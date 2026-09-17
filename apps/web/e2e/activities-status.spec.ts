import { test, expect, type Page } from '@playwright/test';
import { mockAuth } from './helpers';

const ACT_ID = 'act-1';

const DETAIL_BASE = {
  id: ACT_ID,
  nama: 'Kegiatan Uji',
  tipe: 'latihan',
  lokasi: 'Aula B',
  tanggalMulai: '2026-09-10T02:00:00.000Z',
  tanggalSelesai: null,
  status: 'draft',
  scopeType: 'nasional',
  scopeId: null,
  createdBy: 'u1',
  creator: { id: 'u1', namaLengkap: 'Super Admin' },
  peserta: [],
  dokumenKegiatan: [],
  createdAt: '2026-08-20T00:00:00.000Z',
};

/**
 * Mocks for the activities edit & status-change feature:
 * - GET   /activities        → list (1 row)
 * - GET   /activities/act-1  → detail (status evolves on PATCH)
 * - PATCH /activities/act-1  → echoes new status
 * Everything else falls back to the auth helper's catch-all /api/** mock.
 */
async function registerActivityMocks(page: Page, initialStatus: string) {
  let currentStatus = initialStatus;

  // List — register FIRST so the more specific detail route (registered later) wins.
  await page.route(/\/api\/activities(\?|$)/, async (route) => {
    if (route.request().method() !== 'GET') {
      await route.continue();
      return;
    }
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        success: true,
        data: [{ ...DETAIL_BASE, status: currentStatus, pesertaCount: 2 }],
        meta: { total: 1, totalPages: 1, page: 1, limit: 10 },
      }),
    });
  });

  // Detail + PATCH
  await page.route(new RegExp(`/api/activities/${ACT_ID}(\\?|$)`), async (route) => {
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

test.describe('Activities — edit & status quick actions', () => {
  test.beforeEach(async ({ page }) => {
    await mockAuth(page, { mockDashboardPages: false });
  });

  test('draft detail shows Publish quick action and Edit button; publish flow works', async ({ page }) => {
    await registerActivityMocks(page, 'draft');
    await page.goto(`/activities/${ACT_ID}`);
    await expect(page.locator('h1')).toContainText('Kegiatan Uji', { timeout: 10000 });

    // Draft → Publish visible, Tutup hidden, Edit visible
    await expect(page.getByRole('button', { name: 'Publish' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Tutup' })).toHaveCount(0);
    await expect(page.locator('a[aria-label="Edit"]')).toBeVisible();

    // Publish flow: ConfirmModal → Simpan → badge becomes published
    await page.getByRole('button', { name: 'Publish' }).click();
    await expect(page.getByRole('heading', { name: 'Ubah Status Kegiatan' })).toBeVisible();
    await page.getByRole('button', { name: 'Simpan' }).click();
    await expect(page.locator('span:has-text("published")')).toBeVisible({ timeout: 8000 });
    await expect(page.getByRole('button', { name: 'Tutup' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Publish' })).toHaveCount(0);
  });

  test('published detail shows Tutup quick action; closing works', async ({ page }) => {
    await registerActivityMocks(page, 'published');
    await page.goto(`/activities/${ACT_ID}`);
    await expect(page.locator('h1')).toContainText('Kegiatan Uji', { timeout: 10000 });

    await expect(page.getByRole('button', { name: 'Tutup' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Publish' })).toHaveCount(0);

    await page.getByRole('button', { name: 'Tutup' }).click();
    await expect(page.getByRole('heading', { name: 'Ubah Status Kegiatan' })).toBeVisible();
    await page.getByRole('button', { name: 'Simpan' }).click();
    await expect(page.locator('span:has-text("closed")')).toBeVisible({ timeout: 8000 });
    await expect(page.getByRole('button', { name: 'Publish' })).toBeVisible();
  });

  test('list Edit action navigates to real edit page (not new?id=)', async ({ page }) => {
    await registerActivityMocks(page, 'draft');
    await page.goto('/activities');
    await expect(page.getByText('Kegiatan Uji').first()).toBeVisible({ timeout: 10000 });

    // Open row action menu → Edit
    await page.locator('td button').last().click();
    await page.getByRole('button', { name: 'Edit' }).click();

    // Must land on the edit form — the old bug pushed to /activities/new?id=...
    await expect(page).toHaveURL(new RegExp(`/activities/${ACT_ID}/edit`));
    await expect(page.locator('h1')).toContainText('Edit', { timeout: 10000 });
  });

  test('edit form uses valid status vocabulary (draft/published/closed/cancelled)', async ({ page }) => {
    await registerActivityMocks(page, 'draft');
    await page.goto(`/activities/${ACT_ID}/edit`);
    await expect(page.locator('h1')).toContainText('Edit', { timeout: 10000 });

    // Regression guard: old invalid options (direncanakan/berlangsung/selesai) are gone
    await expect(page.locator('select option[value="draft"]')).toHaveCount(1);
    await expect(page.locator('select option[value="published"]')).toHaveCount(1);
    await expect(page.locator('select option[value="closed"]')).toHaveCount(1);
    await expect(page.locator('select option[value="cancelled"]')).toHaveCount(1);
    await expect(page.locator('select option[value="direncanakan"]')).toHaveCount(0);
    await expect(page.locator('select option[value="berlangsung"]')).toHaveCount(0);
    await expect(page.locator('select option[value="selesai"]')).toHaveCount(0);
  });

  test('edit form sends status via PATCH and redirects to detail', async ({ page }) => {
    const patchBodies: Array<Record<string, unknown>> = [];
    page.on('request', (req) => {
      if (req.method() === 'PATCH' && req.url().includes(`/api/activities/${ACT_ID}`)) {
        const body = req.postDataJSON() as Record<string, unknown> | null;
        if (body) patchBodies.push(body);
      }
    });

    await registerActivityMocks(page, 'draft');
    await page.goto(`/activities/${ACT_ID}/edit`);
    await expect(page.locator('h1')).toContainText('Edit', { timeout: 10000 });

    // Form punya 2 select (Tipe & Status) — pilih yang berisi opsi status
    const statusSelect = page.locator('select:has(option[value="published"])');
    await statusSelect.selectOption('published');
    await page.getByRole('button', { name: 'Simpan' }).click();

    await expect(page).toHaveURL(new RegExp(`/activities/${ACT_ID}$`));
    await expect(page.locator('span:has-text("published")')).toBeVisible({ timeout: 8000 });
    expect(patchBodies.some((b) => b.status === 'published')).toBe(true);
  });
});

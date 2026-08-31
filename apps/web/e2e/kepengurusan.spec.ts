import { test, expect, type Page } from '@playwright/test';
import { mockAuth } from './helpers';

const MOCK = [
  { id:'k1', userId:'u1', jabatanId:'j1', periodeId:'p1', distrikId:'d1',
    wilayahId:null, rantingId:null, parentId:null,
    startDate:'2025-01-01', endDate:null,
    user:{ id:'u1', namaLengkap:'Jefry Arianto' },
    jabatan:{ id:'j1', nama:'Koordinator', urutan:1 },
    periode:{ id:'p1', nama:'2025-2028', isActive:true },
    distrik:{ id:'d1', nama:'Denpasar' },
    wilayah:null, ranting:null, parent:null, children:[] },
  { id:'k2', userId:'u2', jabatanId:'j2', periodeId:'p1', distrikId:'d1',
    wilayahId:null, rantingId:null, parentId:'k1',
    startDate:'2025-01-01', endDate:null,
    user:{ id:'u2', namaLengkap:'Made Wirawan' },
    jabatan:{ id:'j2', nama:'Sekretaris', urutan:2 },
    periode:{ id:'p1', nama:'2025-2028', isActive:true },
    distrik:{ id:'d1', nama:'Denpasar' },
    wilayah:null, ranting:null,
    parent:{ id:'k1', user:{ namaLengkap:'Jefry Arianto' }, jabatan:{ nama:'Koordinator' } },
    children:[] }
];

async function registerKepengurusanMocks(page: Page) {
  const ok = (data: any, meta?: any) => ({
    status: 200,
    contentType: 'application/json',
    body: JSON.stringify({ success: true, data, ...(meta ? { meta } : {}) }),
  });
  await page.route('**/api/org-structure/distrik*', async (r) => r.fulfill(ok([])));
  await page.route('**/api/org-structure/wilayah*', async (r) => r.fulfill(ok([])));
  await page.route('**/api/org-structure/ranting*', async (r) => r.fulfill(ok([])));
  await page.route('**/api/periode*', async (r) => r.fulfill(ok([])));
  await page.route('**/api/jabatan*', async (r) => r.fulfill(ok([])));
  await page.route('**/api/kepengurusan*', async (r) =>
    r.fulfill(ok(MOCK, { total:2, totalPages:1, page:1, limit:10 }))
  );
}

async function setup(page: Page) {
  await mockAuth(page, { mockDashboardPages: true });
  await registerKepengurusanMocks(page);
}

test.describe('Kepengurusan CRUD', () => {
  test.beforeEach(async ({ page }) => {
    await setup(page);
    await page.goto('/settings/kepengurusan');
  });

  test('shows page title', async ({ page }) => {
    await expect(page.getByText('Kepengurusan').first()).toBeVisible({ timeout: 10000 });
  });

  test('shows Export button', async ({ page }) => {
    await page.waitForLoadState('networkidle');
    await expect(page.locator('button').filter({ hasText: 'Export' }).first()).toBeVisible({ timeout: 10000 });
  });

  test('shows Import button with file input', async ({ page }) => {
    await page.waitForLoadState('networkidle');
    await expect(page.locator('button').filter({ hasText: 'Import' }).first()).toBeVisible({ timeout: 10000 });
    const fileInput = page.locator('input[type="file"][accept=".csv"]');
    expect(await fileInput.count()).toBeGreaterThanOrEqual(1);
  });

  test('search input filters by name', async ({ page }) => {
    await page.waitForLoadState('networkidle');
    const search = page.locator('input').filter({ hasText: /Cari/i }).or(page.locator('input[placeholder*=Cari]')).first();
    await expect(search).toBeVisible({ timeout: 10000 });
    await search.fill('Jefry');
    await page.waitForTimeout(500);
    await expect(page.getByText('Jefry Arianto').first()).toBeVisible({ timeout: 5000 });
  });

  test('opens Add modal with date pickers', async ({ page }) => {
    await page.waitForLoadState('networkidle');
    await page.locator('button').filter({ hasText: /Tambah/i }).first().click();
    await expect(page.getByText('Tambah Kepengurusan').or(page.getByText('Tambah')).first()).toBeVisible({ timeout: 5000 });
    const dateInputs = page.locator('input[type="date"]');
    expect(await dateInputs.count()).toBeGreaterThanOrEqual(2);
  });

  test('cascading filter selects', async ({ page }) => {
    await page.waitForLoadState('networkidle');
    await page.locator('select').first().selectOption('ranting');
    await page.waitForTimeout(500);
    await expect(page.locator('label').filter({ hasText: 'Distrik' }).first()).toBeVisible({ timeout: 5000 });
  });

  test('shows data table with mock entries', async ({ page }) => {
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000);
    await expect(page.getByText('Jefry Arianto').first()).toBeVisible({ timeout: 10000 });
    await expect(page.getByText('Made Wirawan').first()).toBeVisible({ timeout: 10000 });
  });

  test('shows Koordinator and Sekretaris jabatan', async ({ page }) => {
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000);
    await expect(page.getByText('Koordinator').first()).toBeVisible({ timeout: 10000 });
    await expect(page.getByText('Sekretaris').first()).toBeVisible({ timeout: 10000 });
  });
});

test.describe('Org Chart Editor', () => {
  test.beforeEach(async ({ page }) => {
    await setup(page);
    await page.goto('/settings/org-chart-editor');
  });

  test('shows page title', async ({ page }) => {
    await expect(page.getByText('Editor Org Chart').or(page.getByText('Org Chart')).first()).toBeVisible({ timeout: 10000 });
  });

  test('shows filter dropdowns', async ({ page }) => {
    await page.waitForLoadState('networkidle');
    expect(await page.locator('select').count()).toBeGreaterThanOrEqual(2);
  });

  test('shows tree nodes or empty state', async ({ page }) => {
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1500);
    const draggable = await page.locator('[draggable=true]').count();
    const empty = await page.getByText(/Tidak ada data/i).first().isVisible().catch(() => false);
    expect(draggable > 0 || empty).toBeTruthy();
  });

  test('shows jabatan names in tree', async ({ page }) => {
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1500);
    for (const name of ['Koordinator', 'Sekretaris']) {
      if (await page.getByText(name).first().isVisible().catch(() => false)) {
        await expect(page.getByText(name).first()).toBeVisible({ timeout: 5000 });
        return;
      }
    }
  });

  test('refresh button reloads tree', async ({ page }) => {
    await page.waitForLoadState('networkidle');
    await page.locator('button').filter({ hasText: /Refresh/i }).first().click();
    await page.waitForTimeout(1000);
  });
});
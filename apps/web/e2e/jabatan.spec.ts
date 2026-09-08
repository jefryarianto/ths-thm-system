import { test, expect, Page } from '@playwright/test';
import { mockAuth } from './helpers/auth';

/**
 * Mock data untuk halaman Jabatan (superadmin): preset global + preset distrik.
 */
const JABATAN_ROWS = [
  { id: 'j1', nama: 'Pastor Moderator', urutan: 0, distrikId: null, distrik: null, _count: { pengurus: 2 } },
  { id: 'j2', nama: 'Koordinator Distrik', urutan: 1, distrikId: null, distrik: null, _count: { pengurus: 0 } },
  { id: 'j3', nama: 'Sekretaris', urutan: 2, distrikId: null, distrik: null, _count: { pengurus: 1 } },
  { id: 'j4', nama: 'Sekretaris', urutan: 0, distrikId: 'distrik-1', distrik: { id: 'distrik-1', nama: 'Distrik A' }, _count: { pengurus: 0 } },
];

async function setup(page: Page, opts?: { role?: string; distrikId?: string | null }) {
  await mockAuth(page, { mockDashboardPages: true });
  // Override role untuk skenario admin_distrik — useAuth membaca localStorage 'user'
  // (bukan /auth/me), jadi init script harus di-override sebelum halaman dimuat.
  if (opts?.role) {
    await page.addInitScript(
      (user: Record<string, unknown>) => {
        localStorage.setItem('user', JSON.stringify(user));
      },
      {
        id: 'mock-user-1',
        email: 'admin@ths-thm.org',
        namaLengkap: 'Admin Distrik',
        role: opts.role,
        isActive: true,
        rantingId: null,
        createdAt: '2024-01-01T00:00:00Z',
      },
    );
    await page.route(/\/api\/auth\/scope/, async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          data: { role: opts.role, distrikId: opts.distrikId ?? null, wilayahId: null, rantingId: null },
        }),
      });
    });
  }
  await page.goto('/settings/jabatan');
  await expect(page.locator('h1').first()).toContainText('Jabatan', { timeout: 10000 });
}

test.describe('Jabatan (district-scoped)', () => {
  test.beforeEach(async ({ page }) => {
    await setup(page);
  });

  test('superadmin sees the scope selector with Global default and global presets only', async ({ page }) => {
    const scopeSelect = page.locator('select').first();
    await expect(scopeSelect).toBeVisible();
    await expect(scopeSelect).toHaveValue('');
    await expect(scopeSelect.locator('option[value=""]')).toHaveText('Global (Nasional)');
    await expect(scopeSelect.locator('option', { hasText: 'Distrik A' })).toHaveCount(1);

    // Global scope → hanya 3 preset global (Sekretaris distrik disembunyikan)
    const table = page.locator('table');
    await expect(table.getByRole('cell', { name: 'Pastor Moderator' })).toBeVisible();
    await expect(table.getByRole('cell', { name: 'Sekretaris' })).toHaveCount(1);
    await expect(table.getByRole('cell', { name: 'Global' })).toHaveCount(3);
  });

  test('superadmin switching scope filters to that district presets', async ({ page }) => {
    const scopeSelect = page.locator('select').first();
    await scopeSelect.selectOption('distrik-1');
    const table = page.locator('table');
    await expect(table.getByRole('cell', { name: 'Sekretaris' })).toHaveCount(1);
    await expect(table.getByRole('cell', { name: 'Distrik A' })).toBeVisible();
    await expect(table.getByRole('cell', { name: 'Global' })).toHaveCount(0);
  });

  test('admin_distrik is locked to their district without a scope selector', async ({ page }) => {
    await setup(page, { role: 'admin_distrik', distrikId: 'distrik-1' });
    // Pemilih cakupan superadmin tidak dirender
    await expect(page.locator('select').first()).not.toBeVisible();
    await expect(page.getByText('Distrik A')).toBeVisible();
  });

  test('create modal posts with the selected scope', async ({ page }) => {
    const created: Record<string, unknown>[] = [];
    await page.route(/\/api\/jabatan(\?|$)/, async (route) => {
      if (route.request().method() === 'POST') {
        created.push(route.request().postDataJSON());
        await route.fulfill({ status: 201, contentType: 'application/json', body: JSON.stringify({ success: true, data: {} }) });
        return;
      }
      await route.continue();
    });

    await page.getByRole('button', { name: /Tambah Jabatan/i }).click();
    await page.locator('input[placeholder="Contoh: Koordinator"]').fill('Bendahara');
    // Simpan → POST dengan distrikId null (scope Global aktif)
    await page.getByRole('button', { name: 'Simpan' }).click();
    await expect.poll(() => created).toHaveLength(1);
    expect(created[0]).toMatchObject({ nama: 'Bendahara', distrikId: null });
  });

  test('delete asks confirmation before removing', async ({ page }) => {
    const deleted: string[] = [];
    await page.route(/\/api\/jabatan\/j2/, async (route) => {
      if (route.request().method() === 'DELETE') {
        deleted.push('j2');
        await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ success: true, data: { deleted: true } }) });
        return;
      }
      await route.continue();
    });

    // useConfirm memakai modal in-app (bukan window.confirm) — tombol "Ya"
    await page.getByRole('row', { name: /Koordinator Distrik/ }).getByRole('button').nth(1).click();
    await page.getByRole('button', { name: 'Ya', exact: true }).click();
    await expect.poll(() => deleted).toHaveLength(1);
  });
});

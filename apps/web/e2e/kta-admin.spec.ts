import { test, expect } from '@playwright/test';
import { mockAuth, mockLoginSuccess } from './helpers';

test.describe('Admin KTA Flow', () => {
  const mockMember = {
    nama: 'Test Member',
    nomor: 'test-member-1',
    ranting: 'Ranting Sukun',
    tempatDadar: 'Malang',
    tahunDadar: '2015',
    tingkatan: 'pratama',
    tempatTanggalLahir: 'Malang, 01-01-1990',
    pekerjaan: 'Wiraswasta',
    status: 'Aktif',
    alamat: 'Jl. Melati No. 12',
    berlakuSampai: '2031-10',
  };

  test.beforeEach(async ({ page }) => {
    // Intercept anggota search API
    await page.route(/\/api\/anggota\/search/, async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([mockMember]),
      });
    });

    // Intercept member detail API
    await page.route(/\/api\/anggota\/(test-member-1|123)/, async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(mockMember),
      });
    });
  });

  test('admin can preview and export KTA', async ({ page }) => {
    await mockLoginSuccess(page);

    await page.goto('/login');
    const identifierInput = page.locator('input[name="identifier"], input[name="email"], #identifier').first();
    await identifierInput.fill('admin@example.com');
    await page.fill('input[type="password"]', 'password');
    await page.click('button[type="submit"]');

    // Wait for auth to settle or navigate to /admin/kta
    await page.waitForTimeout(500);
    await page.goto('/admin/kta');

    // Member search
    const searchInput = page.locator('input[type="search"]');
    await expect(searchInput).toBeVisible({ timeout: 10000 });
    await searchInput.fill('test');

    // Select member
    const memberResult = page.locator('text=Test Member');
    await expect(memberResult).toBeVisible({ timeout: 5000 });
    await memberResult.click();

    // Verify preview sides
    await expect(page.locator('text=Depan').first()).toBeVisible({ timeout: 10000 });
    await expect(page.locator('text=Belakang').first()).toBeVisible({ timeout: 10000 });

    // Download front PNG
    const downloadPromise = page.waitForEvent('download');
    await page.click('button:has-text("Unduh Depan")');
    const download = await downloadPromise;
    expect(download.suggestedFilename()).toMatch(/KTA-depan\.png/);
  });

  test('admin can search members and navigate to preview', async ({ page }) => {
    await mockAuth(page, { role: 'admin_ranting' });

    await page.route(/\/api\/anggota\/search/, async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([mockMember]),
      });
    });

    await page.goto('/admin/kta');
    await expect(page.locator('h1')).toContainText('Kelola Kartu Tanda Anggota (KTA)');

    const searchInput = page.locator('input[type="search"]');
    await expect(searchInput).toBeVisible();
    await searchInput.fill('test');

    const result = page.locator('text=Test Member');
    await expect(result).toBeVisible();
    await result.click();

    await expect(page).toHaveURL(/\/admin\/kta\/test-member-1/);
    await expect(page.locator('text=Depan').first()).toBeVisible();
    await expect(page.locator('text=Belakang').first()).toBeVisible();
  });

  test('renders both front and back card preview with download buttons', async ({ page }) => {
    await mockAuth(page, { role: 'admin_ranting' });

    await page.goto('/admin/kta/test-member-1');

    await expect(page.locator('text=Depan').first()).toBeVisible({ timeout: 10000 });
    await expect(page.locator('text=Belakang').first()).toBeVisible();

    const unduhDepanBtn = page.getByRole('button', { name: /unduh depan/i });
    const unduhBelakangBtn = page.getByRole('button', { name: /unduh belakang/i });
    const cetakBtn = page.getByRole('button', { name: /cetak/i });

    await expect(unduhDepanBtn).toBeVisible();
    await expect(unduhDepanBtn).toBeEnabled();
    await expect(unduhBelakangBtn).toBeVisible();
    await expect(unduhBelakangBtn).toBeEnabled();
    await expect(cetakBtn).toBeVisible();
    await expect(cetakBtn).toBeEnabled();

    // Download back PNG
    const downloadPromise = page.waitForEvent('download');
    await unduhBelakangBtn.click();
    const download = await downloadPromise;
    expect(download.suggestedFilename()).toMatch(/KTA-belakang\.png/);
  });

  test('prints generated PNG in new window when print button is clicked', async ({ page }) => {
    await mockAuth(page, { role: 'admin_ranting' });

    await page.goto('/admin/kta/test-member-1');
    await expect(page.locator('text=Depan').first()).toBeVisible({ timeout: 10000 });

    // Stub window.open agar deterministik: fake window merekam print() tanpa
    // membuka tab sungguhan (cetak kini merasterisasi PNG lalu print dari popup).
    await page.evaluate(() => {
      const w = window as unknown as { __printed: boolean };
      w.__printed = false;
      const fakeWindow = {
        document: { write: () => {}, close: () => {}, getElementById: () => null },
        focus: () => {},
        print: () => { w.__printed = true; },
      };
      window.open = (() => fakeWindow) as unknown as typeof window.open;
    });

    await page.getByRole('button', { name: /cetak/i }).click();

    await expect
      .poll(() => page.evaluate(() => (window as unknown as { __printed: boolean }).__printed))
      .toBe(true);
  });

  test('redirects unauthenticated users to login', async ({ page }) => {
    await page.goto('/admin/kta');
    await expect(page).toHaveURL(/\/login/);
  });

  test('denies access to non-admin roles', async ({ page }) => {
    await mockAuth(page, { role: 'anggota' });

    await page.goto('/admin/kta');
    await expect(page.locator('text=Akses Ditolak')).toBeVisible({ timeout: 10000 });
  });
});

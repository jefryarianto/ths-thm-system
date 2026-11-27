import { test, expect } from '@playwright/test';
import { mockAuth, mockLoginSuccess } from './helpers';

/**
 * Halaman KTA memakai `@/lib/kta/api` yang memanggil `${NEXT_PUBLIC_API_URL}/api`,
 * BUKAN origin Next.js. Di CI `NEXT_PUBLIC_API_URL` = http://127.0.0.1:59999
 * (port mati khusus E2E), jadi mock harus mencocokkan URL absolut itu — bukan
 * catch-all `E2E_BASE_URL/api/**` milik helper auth.
 *
 * Endpoint yang dipakai (lihat src/lib/kta/api.ts):
 *   GET /api/members?search=<q>&limit=20
 *   GET /api/members/<id>
 *   GET /api/members/<id>/digital-card
 */
const MOCK_MEMBER = {
  id: 'test-member-1',
  nomorAnggota: 'test-member-1',
  namaLengkap: 'Test Member',
  jenisKelamin: 'L',
  tempatLahir: 'Malang',
  tanggalLahir: '1990-01-01',
  tempatDadar: 'Malang',
  tahunDadar: '2015',
  alamat: 'Jl. Melati No. 12',
  pekerjaan: 'Wiraswasta',
  statusKeanggotaan: 'AKTIF',
  tingkat: 'pratama',
  tanggalBerlakuSampai: '2031-10-31',
  ranting: { nama: 'Ranting Sukun', wilayah: { distrik: { nama: 'Klojen' } } },
};

const MOCK_DIGITAL_CARD = {
  fotoDataUrl: null,
  qrCode: null,
  signatureImage: null,
  card: {
    verificationUrl: 'https://ths-thm.cloud/verify/test-member-1',
    signerName: 'Koordinator',
    signerTitle: 'Koordinator Distrik',
  },
  stampImage: null,
  member: {
    pekerjaan: 'Wiraswasta',
    tanggalBerlakuSampai: '2031-10-31',
    pelantikanTahun: '2015',
    tanggalPelantikan: 'Malang, 2015',
  },
};

/**
 * Daftarkan mock KTA. Panggil SETELAH mockAuth()/mockLoginSuccess(): handler
 * yang terdaftar terakhir menang pada Playwright 1.60+.
 */
async function registerKtaMocks(page: import('@playwright/test').Page) {
  await page.route(/\/api\/members(\/|\?|$)/, async (route) => {
    const { pathname, searchParams } = new URL(route.request().url());

    if (pathname.endsWith('/digital-card')) {
      return route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ success: true, data: MOCK_DIGITAL_CARD }),
      });
    }

    if (pathname === '/api/members') {
      // Pencarian: halaman hanya mengirim permintaan setelah >= 2 karakter.
      const query = searchParams.get('search') || '';
      const data = query.length >= 2 ? [MOCK_MEMBER] : [];
      return route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          data,
          meta: { total: data.length, totalPages: 1, page: 1, limit: 20 },
        }),
      });
    }

    return route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ success: true, data: MOCK_MEMBER }),
    });
  });
}

test.describe('Admin KTA Flow', () => {
  test('admin can preview and export KTA', async ({ page }) => {
    await mockLoginSuccess(page);
    await registerKtaMocks(page);

    await page.goto('/login');
    const identifierInput = page
      .locator('input[name="identifier"], input[name="email"], #identifier')
      .first();
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
    await registerKtaMocks(page);

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
    await registerKtaMocks(page);

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
    await registerKtaMocks(page);

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
        print: () => {
          w.__printed = true;
        },
      };
      window.open = (() => fakeWindow) as unknown as typeof window.open;
    });

    await page.getByRole('button', { name: /cetak/i }).click();

    await expect
      .poll(() => page.evaluate(() => (window as unknown as { __printed: boolean }).__printed))
      .toBe(true);
  });

  test('district admin reviews proof and verifies payment with a note', async ({ page }) => {
    await mockAuth(page, { role: 'admin_distrik' });

    const application = {
      id: 'app-review-1',
      status: 'PAYMENT_PENDING',
      biaya: '50000.00',
      rekeningTujuan: 'BRI 12345',
      statusPembayaran: 'MENUNGGU_VERIFIKASI',
      catatanAdmin: null,
      createdAt: '2026-11-20T10:30:00.000Z',
      buktiBayarPath: '/api/uploads/kta-proofs/kta-proof-e2e.png',
      submittedSnapshot: {
        version: 1,
        submittedAt: '2026-11-20T10:30:00.000Z',
        submittedBy: { id: 'user-1', role: 'anggota' },
        payload: null,
        anggota: {
          id: 'member-1',
          nomorAnggota: 'NRA-LAMA',
          namaLengkap: 'Nama Saat Submit',
          jenisKelamin: null,
          tempatLahir: null,
          tanggalLahir: null,
          alamat: null,
          noHp: null,
          email: null,
          fotoPath: null,
          statusKeanggotaan: null,
          tingkat: null,
          tempatDadar: null,
          tahunDadar: null,
          pekerjaan: null,
          ranting: { id: 'r1', nama: 'Ranting Lama' },
          wilayah: null,
          distrik: null,
          alamatDistrik: null,
        },
        missingFields: [],
      },
      anggota: {
        id: 'member-1',
        namaLengkap: 'Nama Terbaru',
        nomorAnggota: 'NRA-BARU',
        ranting: { id: 'r1', nama: 'Ranting Terbaru' },
      },
      histories: [],
    };

    await page.route(/\/api\/kta-applications\/distrik-queue$/, async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ success: true, data: [application] }),
      });
    });
    await page.route(/\/api\/kta-applications\/app-review-1$/, async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ success: true, data: application }),
      });
    });
    await page.route(/\/api\/kta-applications\/app-review-1\/proof$/, async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'image/png',
        body: Buffer.from(
          'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/l8sAAAAASUVORK5CYII=',
          'base64',
        ),
      });
    });
    await page.route(/\/api\/kta-applications\/app-review-1\/verify-payment$/, async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ success: true, data: application }),
      });
    });

    await page.goto('/kta/distrik-process');
    await page.getByRole('button', { name: 'Tinjau & Verifikasi' }).click();
    await expect(page.getByRole('dialog')).toBeVisible();
    await expect(page.getByText('Nama Saat Submit')).toBeVisible();
    await page.getByLabel('Catatan verifikasi').fill('Bukti cocok');

    const verifyRequest = page.waitForRequest(
      (request) => request.url().includes('/verify-payment') && request.method() === 'POST',
    );
    await page.getByRole('button', { name: /Verifikasi Pembayaran/i }).click();

    const request = await verifyRequest;
    expect(JSON.parse(request.postData() || '{}')).toMatchObject({
      buktiPath: '',
      catatan: 'Bukti cocok',
    });
    await expect(page.getByRole('dialog')).toHaveCount(0);
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

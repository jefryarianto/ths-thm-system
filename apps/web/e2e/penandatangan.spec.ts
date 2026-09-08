import { test, expect, Page } from '@playwright/test';
import { mockAuth } from './helpers';

/**
 * Register per-test mocks for the penandatangan page's upload/delete flows.
 * Default list mocks come from registerDashboardPageMocks (via mockAuth).
 */
async function registerPenandatanganMocks(page: Page) {
  const data = {
    signatures: [
      { id: 'sig-1', nama: 'Ketua THS', jabatan: 'Ketua', imagePath: 'sig-ketua.png', isActive: true, distrikId: null, distrik: null },
      { id: 'sig-2', nama: 'Koordinator Distrik A', jabatan: 'Koordinator Distrik', imagePath: 'sig-koord.png', isActive: true, distrikId: 'distrik-1', distrik: { id: 'distrik-1', nama: 'Distrik A' } },
    ],
    stamps: [
      { id: 'stamp-1', nama: 'Stempel Resmi', imagePath: 'stempel-resmi.png', isActive: true, distrikId: null, distrik: null },
      { id: 'stamp-2', nama: 'Stempel Distrik A', imagePath: 'stempel-a.png', isActive: true, distrikId: 'distrik-1', distrik: { id: 'distrik-1', nama: 'Distrik A' } },
    ],
  };

  // Signatures — GET list + POST upload in one handler (last-registered route wins,
  // so a single route per URL pattern must handle all methods).
  await page.route(/\/api\/settings\/signatures/, async (route) => {
    const method = route.request().method();
    if (method === 'GET') {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ success: true, data: data.signatures }),
      });
      return;
    }
    if (method === 'POST') {
      const body = route.request().postDataBuffer();
      let nama = 'Tanda Tangan E2E';
      if (body) {
        const text = Buffer.from(body).toString('latin1');
        const match = text.match(/name="nama"\r?\n\r?\n([\s\S]*?)\r?\n/);
        if (match?.[1]?.trim()) nama = match[1].trim();
      }
      const newRow = {
        id: 'sig-e2e',
        nama,
        jabatan: 'Koordinator Distrik',
        imagePath: 'sig-e2e.png',
        isActive: true,
        distrikId: null,
        distrik: null,
      };
      data.signatures.push(newRow);
      await route.fulfill({
        status: 201,
        contentType: 'application/json',
        body: JSON.stringify({ success: true, data: newRow }),
      });
      return;
    }
    if (method === 'DELETE' && route.request().url().includes('/sig-2')) {
      data.signatures = data.signatures.filter((s) => s.id !== 'sig-2');
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ success: true, message: 'Tanda tangan dihapus' }),
      });
      return;
    }
    await route.continue();
  });

  // Stamps — GET list
  await page.route(/\/api\/settings\/stamps(\?|$)/, async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ success: true, data: data.stamps }),
    });
  });

  // Stamp — POST upload + DELETE single row in one handler
  await page.route(/\/api\/settings\/stamp(\/|\?|$)/, async (route) => {
    const method = route.request().method();
    if (method === 'POST') {
      const newRow = {
        id: 'stamp-e2e',
        nama: 'Stempel E2E',
        imagePath: 'stempel-e2e.png',
        isActive: true,
        distrikId: null,
        distrik: null,
      };
      data.stamps.push(newRow);
      await route.fulfill({
        status: 201,
        contentType: 'application/json',
        body: JSON.stringify({ success: true, data: newRow }),
      });
      return;
    }
    if (method === 'DELETE' && route.request().url().includes('/stamp-2')) {
      data.stamps = data.stamps.filter((s) => s.id !== 'stamp-2');
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ success: true, message: 'Stempel dihapus' }),
      });
      return;
    }
    await route.continue();
  });
}

test.describe('Settings — /settings/penandatangan', () => {
  test.beforeEach(async ({ page }) => {
    await mockAuth(page, { mockDashboardPages: true });
    await registerPenandatanganMocks(page);
    await page.goto('/settings/penandatangan');
    await expect(page.locator('h1').first()).toContainText('Penandatangan', { timeout: 10000 });
  });

  test('renders page header, summary bar and scope selector', async ({ page }) => {
    await expect(page.locator('h1').first()).toContainText('Penandatangan');
    await expect(page.getByText('Total Penandatangan').first()).toBeVisible();
    await expect(page.getByText('Cakupan Penandatangan').first()).toBeVisible({ timeout: 8000 });
    // Superadmin sees the scope dropdown with Global default
    const scopeSelect = page.locator('select').first();
    await expect(scopeSelect).toBeVisible();
    await expect(scopeSelect).toHaveValue('');
    await expect(scopeSelect.locator('option[value=""]')).toHaveText('Global (Nasional)');
  });

  test('scope selector filters signatures and stamps sections', async ({ page }) => {
    // Default scope = Global: only global rows visible in each section
    const globalSig = page
      .locator('div.rounded-2xl')
      .filter({ has: page.getByRole('heading', { name: 'Gambar Tanda Tangan — Global (Nasional)' }) });
    const globalStamp = page
      .locator('div.rounded-2xl')
      .filter({ has: page.getByRole('heading', { name: 'Stempel — Global (Nasional)' }) });
    await expect(globalSig.getByText('Ketua THS')).toBeVisible({ timeout: 8000 });
    await expect(globalSig.getByText('Koordinator Distrik A')).not.toBeVisible();
    await expect(globalStamp.getByText('Stempel Resmi')).toBeVisible();
    await expect(globalStamp.getByText('Stempel Distrik A')).not.toBeVisible();

    // Switch to Distrik A: only distrik rows visible in each section
    await page.locator('select').first().selectOption('distrik-1');
    const distrikSig = page
      .locator('div.rounded-2xl')
      .filter({ has: page.getByRole('heading', { name: 'Gambar Tanda Tangan — Distrik A' }) });
    const distrikStamp = page
      .locator('div.rounded-2xl')
      .filter({ has: page.getByRole('heading', { name: 'Stempel — Distrik A' }) });
    await expect(distrikSig.getByText('Koordinator Distrik A')).toBeVisible({ timeout: 8000 });
    await expect(distrikSig.getByText('Ketua THS')).not.toBeVisible();
    await expect(distrikStamp.getByText('Stempel Distrik A')).toBeVisible();
    await expect(distrikStamp.getByText('Stempel Resmi')).not.toBeVisible();
  });

  test('shows empty state when scope has no signatures or stamps', async ({ page }) => {
    // Distrik B has no rows in the mock
    await page.locator('select').first().selectOption('distrik-2');
    await expect(page.getByText('Gambar Tanda Tangan — Distrik B')).toBeVisible({ timeout: 8000 });
    await expect(page.getByText('Belum ada gambar tanda tangan pada scope ini').first()).toBeVisible();
    await expect(page.getByText('Belum ada stempel pada scope ini').first()).toBeVisible();
  });

  test('upload tanda tangan flow posts multipart and shows toast', async ({ page }) => {
    await page.getByRole('button', { name: 'Upload Tanda Tangan' }).click();
    const modal = page.locator('div.rounded-2xl, div.rounded-xl').filter({ hasText: 'Upload Tanda Tangan' });
    await expect(page.getByText('Upload Tanda Tangan — Global (Nasional)')).toBeVisible({ timeout: 5000 });

    // Jabatan is a preset dropdown loaded from the jabatan table, pre-filled with Koordinator Distrik
    const jabatanSelect = page
      .locator('div.rounded-lg')
      .filter({ hasText: 'Upload Tanda Tangan — Global (Nasional)' })
      .locator('select');
    await expect(jabatanSelect).toHaveValue('Koordinator Distrik', { timeout: 8000 });
    // Presets from the jabatan table are available, plus the custom fallback
    await expect(jabatanSelect.locator('option[value="Pastor Moderator"]')).toHaveText('Pastor Moderator');
    await expect(jabatanSelect.locator('option[value="Sekretaris"]')).toHaveText('Sekretaris');
    await expect(jabatanSelect.locator('option[value="__custom__"]')).toHaveText('Lainnya (tulis manual)…');

    // Selecting a different preset updates the value
    await jabatanSelect.selectOption('Pastor Moderator');
    await expect(jabatanSelect).toHaveValue('Pastor Moderator');
    await jabatanSelect.selectOption('Koordinator Distrik');

    await page.locator('input[type="file"]').first().setInputFiles({
      name: 'sig.png',
      mimeType: 'image/png',
      buffer: Buffer.from([0x89, 0x50, 0x4e, 0x47]),
    });
    await page.getByRole('button', { name: 'Upload' }).last().click();

    // Toast + refetch should show the new row
    await expect(page.getByText('Tanda tangan tersimpan')).toBeVisible({ timeout: 5000 });
  });

  test('upload stempel flow posts multipart and shows toast', async ({ page }) => {
    await page.getByRole('button', { name: 'Upload Stempel' }).click();
    await expect(page.getByText('Upload Stempel — Global (Nasional)')).toBeVisible({ timeout: 5000 });

    await page.locator('input[type="file"]').last().setInputFiles({
      name: 'stempel.png',
      mimeType: 'image/png',
      buffer: Buffer.from([0x89, 0x50, 0x4e, 0x47]),
    });
    await page.getByRole('button', { name: 'Upload' }).last().click();

    await expect(page.getByText('Stempel tersimpan')).toBeVisible({ timeout: 5000 });
  });

  test('upload tanda tangan requires a file', async ({ page }) => {
    await page.getByRole('button', { name: 'Upload Tanda Tangan' }).click();
    await page.getByRole('button', { name: 'Upload' }).last().click();
    await expect(page.getByText('Pilih file gambar tanda tangan terlebih dahulu')).toBeVisible({ timeout: 5000 });
  });

  test('delete tanda tangan asks for confirmation and removes the row', async ({ page }) => {
    await page.locator('select').first().selectOption('distrik-1');
    const section = page
      .locator('div.rounded-2xl')
      .filter({ has: page.getByRole('heading', { name: 'Gambar Tanda Tangan — Distrik A' }) });
    await expect(section.getByText('Koordinator Distrik A')).toBeVisible({ timeout: 8000 });

    // Delete button is the trash icon next to the row (unique within the section)
    await section.getByTitle('Hapus').click();

    // Confirmation modal (default variant → confirm button is "Ya")
    await expect(page.getByText('Hapus gambar tanda tangan "Koordinator Distrik A"?')).toBeVisible({ timeout: 5000 });
    await page.getByRole('button', { name: 'Ya', exact: true }).click();

    await expect(page.getByText('Tanda tangan dihapus')).toBeVisible({ timeout: 5000 });
    await expect(section.getByText('Koordinator Distrik A')).not.toBeVisible({ timeout: 8000 });
  });

  test('delete stempel asks for confirmation and removes the row', async ({ page }) => {
    await page.locator('select').first().selectOption('distrik-1');
    const section = page
      .locator('div.rounded-2xl')
      .filter({ has: page.getByRole('heading', { name: 'Stempel — Distrik A' }) });
    await expect(section.getByText('Stempel Distrik A')).toBeVisible({ timeout: 8000 });

    await section.getByTitle('Hapus').click();

    await expect(page.getByText('Hapus stempel "Stempel Distrik A"?')).toBeVisible({ timeout: 5000 });
    await page.getByRole('button', { name: 'Ya', exact: true }).click();

    await expect(page.getByText('Stempel dihapus')).toBeVisible({ timeout: 5000 });
    await expect(section.getByText('Stempel Distrik A')).not.toBeVisible({ timeout: 8000 });
  });

  test('renders penandatangan per dokumen section with signer slots', async ({ page }) => {
    await expect(page.getByText('Penandatangan per Dokumen — Global (Nasional)')).toBeVisible({ timeout: 8000 });
    await expect(page.getByText('Kartu Anggota (KTA)')).toBeVisible();
    // KTA has one assigned signer
    await expect(page.getByText('Saat ini: Koordinator Distrik A')).toBeVisible();
    // Slot selects render for each doc type (4 types × 3 slots)
    const slotSelects = page.locator('select').locator('..').locator('select');
    await expect(page.locator('select')).toHaveCount(13); // 1 scope + 12 slots
  });

  test('info banner explains the one-active-per-scope rule', async ({ page }) => {
    await expect(
      page.getByText(/satu penandatangan aktif per distrik\/global/),
    ).toBeVisible();
  });
});
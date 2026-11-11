import { test, expect } from '@playwright/test';
import { mockAuth } from './helpers';

/**
 * Verifikasi geometri kartu anggota (sisi depan) di tab Kartu Digital.
 *
 * Tujuan: menangkap regresi tata letak pratinjau kartu di CI. Kartu kini
 * dirender sebagai SVG `KtaCard` (sumber Paket E-Card) dengan viewBox
 * 0 0 856 539.8 dan atribut data-side, bukan lagi canvas div lama.
 *
 * Invariant yang dijaga (spec kanonik: Paket E-Card, kartu 856×539.8):
 *  - dua sisi kartu dirender sebagai <svg data-side="depan|belakang">;
 *  - header organisasi hadir pada sisi depan;
 *  - label & nilai identitas (NAMA LENGKAP / NO. ANGGOTA) dirender;
 *  - semua koordinat diukur dalam unit viewBox, bukan piksel layar.
 */
const MOCK_QR =
  'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==';

test.describe('Kartu Anggota — geometri pratinjau (spec kanonik)', () => {
  test.beforeEach(async ({ page }) => {
    await mockAuth(page, { mockMembers: true, mockDashboardPages: true });

    // Detail anggota — data minimal lengkap (iuran/dokumen boleh absen:
    // halaman wajib tahan tanpa field tersebut — guard ?? []).
    await page.route('**/api/members/member-1', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          data: {
            id: 'member-1',
            nomorAnggota: 'THS-00001',
            namaLengkap: 'Anggota 1',
            jenisKelamin: 'L',
            tempatLahir: 'Yogyakarta',
            tanggalLahir: '2000-01-01',
            tingkat: 'Muda',
            statusKeanggotaan: 'aktif',
            statusData: 'complete',
            statusValidasi: 'approved',
            fotoPath: null,
            ranting: {
              nama: 'Ranting 1',
              wilayah: { nama: 'Wilayah 1', distrik: { nama: 'Distrik 1' } },
            },
          },
        }),
      });
    });

    await page.route('**/api/members/member-1/digital-card', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          data: {
            qrCode: MOCK_QR,
            card: {
              verificationUrl: 'https://ths-thm.cloud/verify/t',
              signerName: 'Budi',
              signerTitle: 'Koordinator Distrik',
            },
            levelVisual: { stripCount: 2, color: '#2563eb', label: 'Muda' },
            template: null,
          },
        }),
      });
    });

    await page.route('**/api/members/member-1/digital-card/security', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          data: {
            dokumen: { id: 'd1', nomorDokumen: 'KTA-001', status: 'valid' },
            qr: {
              isValid: true,
              scanCount: 0,
              scannedAt: null,
              createdAt: new Date().toISOString(),
            },
            scanLimit: 10,
            scanLeft: 10,
            scanLog: [],
          },
        }),
      });
    });

    await page.route('**/api/members/member-1/digital-card/issuances', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ success: true, data: [] }),
      });
    });

    await page.goto('/members/member-1?tab=card');
    await expect(page.locator('h4:has-text("Sisi Depan")')).toBeVisible();
    await expect(page.getByText('No. Anggota', { exact: true }).first()).toBeVisible();
  });

  test('blok info & kolom JK sesuai koordinat spec', async ({ page }) => {
    // KtaCard adalah <svg data-side="depan"> dengan viewBox 0 0 856 539.8.
    const depanSvg = page.locator('svg[data-side="depan"]');
    await expect(depanSvg).toBeVisible({ timeout: 10000 });

    const geo = await page.evaluate(() => {
      const svg = document.querySelector('svg[data-side="depan"]') as SVGSVGElement | null;
      if (!svg) return { error: 'svg depan tidak ditemukan' };
      const box = svg.viewBox.baseVal;
      if (box.width !== 856 || box.height !== 539.8) {
        return { error: `viewBox salah: ${box.width}x${box.height}` };
      }

      const textByContent = (s: string) =>
        Array.from(svg.querySelectorAll('text'))
          .filter((t) => t.textContent === s && !t.hasAttribute('aria-hidden'))
          .pop() as SVGTextElement | undefined;

      const labelNama = textByContent('NAMA LENGKAP');
      const valueNama = textByContent('ANGGOTA 1');
      const labelNo = textByContent('NO. ANGGOTA');
      const valueNo = textByContent('THS-00001');

      return {
        error: undefined,
        labelNama: labelNama ? { x: labelNama.getAttribute('x'), y: labelNama.getAttribute('y') } : null,
        valueNama: valueNama ? { x: valueNama.getAttribute('x'), y: valueNama.getAttribute('y') } : null,
        labelNo: labelNo ? { x: labelNo.getAttribute('x'), y: labelNo.getAttribute('y') } : null,
        valueNo: valueNo ? { x: valueNo.getAttribute('x'), y: valueNo.getAttribute('y') } : null,
      };
    });

    expect(geo.error).toBeUndefined();

    // 1) Semua label/nilai identitas dirender (viewBox 856×539.8, 10 px/mm)
    expect(geo.labelNama).not.toBeNull();
    expect(geo.valueNama).not.toBeNull();
    expect(geo.labelNo).not.toBeNull();
    expect(geo.valueNo).not.toBeNull();

    // 2) Kolom identitas di x = 306 (unit viewBox = SVG px)
    expect(Number(geo.labelNama!.x)).toBeCloseTo(306, 0);
    expect(Number(geo.valueNama!.x)).toBeCloseTo(306, 0);
    expect(Number(geo.labelNo!.x)).toBeCloseTo(306, 0);
    expect(Number(geo.valueNo!.x)).toBeCloseTo(306, 0);

    // 3) Urutan vertikal label→nilai: NAMA LENGKAP y(33.5) di atas nilai y(30.7);
    //    NO. ANGGOTA label y(7.7) di atas nilai y(4.9). y(bottomMm) = (53.98-b)*10.
    expect(Number(geo.labelNama!.y)).toBeCloseTo((53.98 - 33.5) * 10, 0);
    expect(Number(geo.valueNama!.y)).toBeCloseTo((53.98 - 30.7) * 10, 0);
    expect(Number(geo.labelNo!.y)).toBeCloseTo((53.98 - 7.7) * 10, 0);
    expect(Number(geo.valueNo!.y)).toBeCloseTo((53.98 - 4.9) * 10, 0);
  });

  test('halaman detail tahan tanpa field iuran/dokumen (guard ?? [])', async ({ page }) => {
    // beforeEach sudah mem-mock member-1 TANPA iuran & dokumen — halaman
    // tidak boleh jatuh ke error boundary (500 / crash render).
    await expect(page.locator('h1, h2').first()).toBeVisible();
    await expect(page.getByText('Terjadi Kesalahan')).toHaveCount(0);
    await expect(page.getByText('Informasi Pribadi')).toBeVisible();
  });
});

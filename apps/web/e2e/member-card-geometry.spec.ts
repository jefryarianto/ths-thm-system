import { test, expect } from '@playwright/test';
import { mockAuth } from './helpers';

/**
 * Verifikasi geometri kartu anggota (sisi depan) di tab Kartu Digital.
 *
 * Tujuan: menangkap regresi tata letak pratinjau kartu di CI. Dua regresi nyata
 * yang pernah lolos deploy dan membuat kartu "tidak sesuai":
 *  1. container info diberi `position:relative` inline yang menimpa class
 *     `absolute` → blok info terdorong dari koordinat spec (250,164) dan
 *     menimpa area bawah kartu;
 *  2. nilai `lineHeight` dari spec dipakai tanpa satuan (CSS unitless =
 *     multiplier 20× ukuran font) → tiap baris info menggelembung ±400px.
 *
 * Invariant yang dijaga (spec kanonik: packages/card-design, kartu 856×540):
 *  - blok info murni absolute di (250, 164);
 *  - label JK SEJAJAR label Nama; kolom JK di x = infoX + infoW - jk.w = 636;
 *  - nilai L/P sejajar data Nama (tinggi baris 20px);
 *  - blok info tidak menimpa area "Berlaku sampai" dan tingginya wajar.
 * Elemen diukur relatif terhadap canvas 856×540 yang di-scale (ScaledCardCanvas),
 * sehingga test stabil pada lebar kontainer apa pun.
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
    const geo = await page.evaluate(() => {
      // Canvas = satu-satunya div dengan transform: scale(...) (ScaledCardCanvas)
      const canvas = Array.from(document.querySelectorAll('div')).find((el) =>
        (el as HTMLElement).style.transform?.startsWith('scale('),
      ) as HTMLElement | undefined;
      if (!canvas) return { error: 'canvas tidak ditemukan' };
      const c = canvas.getBoundingClientRect();
      const s = c.width / 856;

      const byText = (text: string, extra?: (el: HTMLElement) => boolean) =>
        Array.from(canvas.querySelectorAll('div')).find(
          (el) => el.textContent === text && el.children.length === 0 && (!extra || extra(el)),
        ) as HTMLElement | undefined;

      // Blok info = ancestor .absolute dari nilai No. Anggota (strong)
      const strongValue = byText('THS-00001');
      const ib = (
        strongValue?.closest('.absolute') as HTMLElement | undefined
      )?.getBoundingClientRect();
      const jk = byText('JK')?.getBoundingClientRect();
      const jv = byText('L', (el) => el.classList.contains('font-ocr'))?.getBoundingClientRect();
      const nl = byText('Nama')?.getBoundingClientRect();
      const bl = (
        byText('Berlaku sampai')?.closest('.absolute') as HTMLElement | undefined
      )?.getBoundingClientRect();

      const rel = (r?: DOMRect) =>
        r
          ? {
              left: r.left - c.left,
              top: r.top - c.top,
              bottom: r.bottom - c.top,
              right: r.right - c.left,
            }
          : null;
      return {
        s,
        info: rel(ib),
        jkLabel: rel(jk),
        jkValue: rel(jv),
        namaLabel: rel(nl),
        berlaku: rel(bl),
      };
    });

    expect(geo.error).toBeUndefined();
    const s = geo.s!;
    expect(s).toBeGreaterThan(0);

    // 1) Blok info murni absolute di (250, 164) — toleransi pembulatan scale
    expect(geo.info!.left).toBeCloseTo(250 * s, 0);
    expect(geo.info!.top).toBeCloseTo(164 * s, 0);

    // 2) Label JK SEJAJAR label Nama (invariant utama), kolom JK di x = 636
    expect(geo.jkLabel!.top).toBeCloseTo(geo.namaLabel!.top, 0);
    expect(geo.jkLabel!.left).toBeCloseTo(636 * s, 0);

    // 3) Nilai L/P sejajar data Nama: tepat di bawah label JK (+ marginTop 3), tinggi baris 20px
    expect(geo.jkValue!.top).toBeCloseTo(geo.jkLabel!.bottom + 3 * s, 0);
    expect(geo.jkValue!.bottom - geo.jkValue!.top).toBeCloseTo(20 * s, 0);

    // 4) Blok info tidak menimpa "Berlaku sampai" & tingginya wajar
    //    (menangkap regresi line-height tanpa satuan yang menggelembungkan baris)
    expect(geo.info!.bottom).toBeLessThan(geo.berlaku!.top);
    expect(geo.info!.bottom - geo.info!.top).toBeLessThan(300 * s);
  });

  test('halaman detail tahan tanpa field iuran/dokumen (guard ?? [])', async ({ page }) => {
    // beforeEach sudah mem-mock member-1 TANPA iuran & dokumen — halaman
    // tidak boleh jatuh ke error boundary (500 / crash render).
    await expect(page.locator('h1, h2').first()).toBeVisible();
    await expect(page.getByText('Terjadi Kesalahan')).toHaveCount(0);
    await expect(page.getByText('Informasi Pribadi')).toBeVisible();
  });
});

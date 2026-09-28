import { Page } from '@playwright/test';

/**
 * Mock endpoint alur pendaftaran publik.
 *
 * Halaman /daftar (pasca redesign 504c3026) memanggil API server langsung:
 *  - POST /api/pendaftaran              — kirim pendaftaran (dulu: /api/registrations)
 *  - GET  /api/public/struktur/ranting  — daftar ranting dropdown "Ranting Asal"
 *    (envelope { success, data }; paritas dgn halaman klaim)
 * Route pattern cocok dengan URL berisi path tsb apa pun port-nya.
 */
export async function registerRegistrationMocks(page: Page) {
  await page.route(/\/api\/pendaftaran/, async (route) => {
    if (route.request().method() === 'POST') {
      await route.fulfill({
        status: 201,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          message: 'Pendaftaran berhasil',
        }),
      });
    } else {
      await route.continue();
    }
  });

  await page.route(/\/api\/public\/struktur\/ranting/, async (route) => {
    if (route.request().method() === 'GET') {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          data: [
            { id: 'ranting-e2e-1', nama: 'Ranting E2E Satu' },
            { id: 'ranting-e2e-2', nama: 'Ranting E2E Dua' },
          ],
        }),
      });
    } else {
      await route.continue();
    }
  });
}

import { Page } from "@playwright/test";

/**
 * Mock endpoint alur pendaftaran publik.
 *
 * Halaman /daftar memanggil API server:
 *  - GET  /api/public/struktur/distrik  — daftar distrik
 *  - GET  /api/public/struktur/wilayah  — daftar wilayah
 *  - GET  /api/public/struktur/ranting  — daftar ranting
 *  - POST /api/pendaftaran              — kirim pendaftaran (dulu: /api/registrations)
 */
export async function registerRegistrationMocks(page: Page) {
  await page.route("**/api/public/struktur/distrik**", async (route) => {
    if (route.request().method() === "GET") {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          success: true,
          data: [
            { id: "distrik-1", nama: "Distrik E2E Satu" },
            { id: "distrik-2", nama: "Distrik E2E Dua" },
          ],
        }),
      });
    } else {
      await route.continue();
    }
  });

  await page.route("**/api/public/struktur/wilayah**", async (route) => {
    if (route.request().method() === "GET") {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          success: true,
          data: [
            { id: "wilayah-1", nama: "Wilayah E2E Satu", distrikId: "distrik-1" },
            { id: "wilayah-2", nama: "Wilayah E2E Dua", distrikId: "distrik-1" },
          ],
        }),
      });
    } else {
      await route.continue();
    }
  });

  await page.route("**/api/public/struktur/ranting**", async (route) => {
    if (route.request().method() === "GET") {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          success: true,
          data: [
            { id: "ranting-e2e-1", nama: "Ranting E2E Satu", wilayahId: "wilayah-1" },
            { id: "ranting-e2e-2", nama: "Ranting E2E Dua", wilayahId: "wilayah-1" },
          ],
        }),
      });
    } else {
      await route.continue();
    }
  });

  await page.route("**/api/(registrations|pendaftaran)**", async (route) => {
    if (route.request().method() === "POST") {
      await route.fulfill({
        status: 201,
        contentType: "application/json",
        body: JSON.stringify({
          success: true,
          message: "Pendaftaran berhasil",
        }),
      });
    } else {
      await route.continue();
    }
  });

  await page.route("**/api/auth/set-session-cookie**", async (route) => {
    if (route.request().method() === "POST") {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ success: true }),
      });
    } else {
      await route.continue();
    }
  });
}

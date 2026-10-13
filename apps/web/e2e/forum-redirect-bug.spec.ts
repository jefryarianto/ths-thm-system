import { test, expect } from '@playwright/test';
import { mockAuth } from './helpers';

/**
 * Regression test: infinite refresh loop saat role `anggota` mengakses /forum.
 *
 * BUG LAMA (commit 545ba207, "restrict dashboard to admin roles only"):
 * `(dashboard)/layout.tsx` menambah redirect global untuk role di bawah
 * 'penguji' — tapi route `/forum` SENDIRI berada di route group `(dashboard)`.
 * Akibatnya setiap render layout memanggil window.location.replace('/forum'),
 * yang memicu reload penuh, yang me-render layout lagi, ... => loop selamanya.
 *
 * Setelah perbaikan, layout hanya men-gate route `/dashboard` (bukan seluruh
 * route group) dan tujuannya dari getAdminDashboardRedirect().
 *
 * Verifikasi di sini: anggota boleh mengakses /forum tanpa redirect berulang,
 * DAN dialihkan keluar dari /dashboard (bukan loop).
 */

/** Overriding user `anggota` di localStorage + endpoint /auth/me. */
async function mockAnggotaAuth(page: import('@playwright/test').Page) {
  const ANGGOTA_USER = {
    id: 'mock-anggota-1',
    email: 'anggota@ths-thm.org',
    namaLengkap: 'Anggota Biasa',
    role: 'anggota',
    isActive: true,
    rantingId: 'ranting-1',
    createdAt: '2024-01-01T00:00:00Z',
  };

  await mockAuth(page);

  // Override data user yang dipakai useAuth() (localStorage + /auth/me).
  await page.addInitScript((user: string) => {
    localStorage.setItem('user', user);
  }, JSON.stringify(ANGGOTA_USER));
  await page.route('**/api/auth/me', (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ success: true, data: ANGGOTA_USER }),
    }),
  );
  // Forum categories — page memanggil /forum/categories saat load.
  await page.route('**/api/forum/categories', (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ success: true, data: [] }),
    }),
  );
}

test.describe('Forum redirect bug (anggota role)', () => {
  test.beforeEach(async ({ page }) => {
    await mockAnggotaAuth(page);
  });

  test('anggota dapat membuka /forum tanpa refresh loop', async ({ page }) => {
    // Hitung request "document" — setiap window.location.replace() memicu
    // satu request document baru (reload penuh), jadi ini ukuran loop yang
    // tepat. (Event `framenavigated` tidak reliable: Next dev memicunya dua
    // kali untuk navigasi tunggal.)
    const forumDocs: string[] = [];
    page.on('request', (request) => {
      if (request.resourceType() === 'document' && request.url().includes('/forum')) {
        forumDocs.push(request.url());
      }
    });

    await page.goto('/forum');

    // Judul halaman forum harus tampil (bukan loading/redirect abadi).
    await expect(page.locator('h1').first()).toContainText('Forum', { timeout: 15000 });
    await expect(page).toHaveURL(/\/forum/);

    // Beri kesempat untuk loop bila bug masih ada.
    await page.waitForTimeout(2500);

    // INTI REGRESI: tepat SATU document request (permintaan awal). Bila bug
    // lama kembali, jumlahnya akan terus bertambah karena window.location.replace
    // me-refresh halaman setiap kali layout dirender.
    expect(forumDocs).toHaveLength(1);
  });

  test('anggota di /forum tidak di-redirect ke /forum (bukan self-redirect)', async ({
    page,
  }) => {
    const responses: string[] = [];
    page.on('response', (res) => responses.push(res.url()));

    await page.goto('/forum');
    await expect(page).toHaveURL(/\/forum/);

    // Self-redirect adalah tanda loop; tidak boleh ada redirect ke /forum.
    const forumRedirects = responses.filter((url) => url.includes('/forum'));
    expect(forumRedirects.length).toBeLessThanOrEqual(1);
  });

  test('anggota dialihkan dari /dashboard ke home path (/forum)', async ({ page }) => {
    await page.goto('/dashboard');

    // Boleh tetap di /dashboard sebentar, tapi akhirnya dialihkan ke /forum.
    await expect(page).toHaveURL(/\/forum/, { timeout: 15000 });
  });

  test('anggota tetap dapat mengakses halaman member lain di route group dashboard', async ({
    page,
  }) => {
    // Bukti bahwa route group (dashboard) bukan penanda admin: halaman-halaman
    // ini sah untuk anggota (view: 'anggota') dan tidak boleh terusir.
    for (const path of ['/galeri', '/forum/new']) {
      await page.goto(path);
      // Tidak boleh berakhir di /login maupun loop.
      await expect(page).toHaveURL(new RegExp(path.replace(/\//g, '\\$&')));
      await expect(page.locator('h1').first()).toBeVisible({ timeout: 15000 });
    }
  });
});

import { test, expect } from '@playwright/test';

/**
 * Spec halaman induk verifikasi (`/verify`) — landing publik dengan dua jalur:
 * scan QR (kamera) dan input manual. Kamera tidak bisa diuji di CI (butuh
 * perangkat fisik + permission), jadi yang diuji di sini adalah alur input
 * manual dan guard input tidak valid.
 */
test.describe('Verify Index — /verify (form input manual)', () => {
  test('menampilkan tombol scan QR dan form input manual', async ({ page }) => {
    await page.goto('/verify');
    await expect(page.getByRole('heading', { level: 1 })).toContainText('Verifikasi Kartu');
    await expect(page.getByRole('button', { name: 'Pindai QR Code' })).toBeVisible();
    await expect(page.locator('#verify-token')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Verifikasi Sekarang' })).toBeVisible();
  });

  test('form input URL verifikasi menavigasikan ke /verify/<token>', async ({ page }) => {
    await page.goto('/verify');
    await page.fill('#verify-token', 'https://ths-thm.cloud/verify/demo-token-123');
    await page.click('button[type="submit"]');
    await expect(page).toHaveURL(/\/verify\/demo-token-123/);
  });

  test('form input token polos menavigasikan ke /verify/<token>', async ({ page }) => {
    await page.goto('/verify');
    await page.fill('#verify-token', 'abcXYZ-123_456.789=');
    await page.click('button[type="submit"]');
    // "=" di-encode menjadi %3D oleh encodeURIComponent.
    await expect(page).toHaveURL(/\/verify\/abcXYZ-123_456\.789%3D/);
  });

  test('input tidak valid menampilkan pesan error (tidak navigasi)', async ({ page }) => {
    await page.goto('/verify');
    await page.fill('#verify-token', 'http://!!! bukan kode !!!');
    await page.click('button[type="submit"]');
    await expect(page.getByText('Kode verifikasi tidak dikenali.')).toBeVisible();
    await expect(page).toHaveURL(/\/verify$/);
  });
});

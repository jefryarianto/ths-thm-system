import { test, expect } from '@playwright/test';
import { registerRegistrationMocks } from './helpers';

/**
 * Alur pendaftaran publik (/daftar).
 *
 * Disinkronkan dengan redesign 504c3026 (28 Sep): h1 "Pendaftaran Calon
 * Anggota", PublicLayout (header + footer juga memuat link /login), dan
 * dua <select> (Jenis Kelamin + Ranting Asal) — selector harus di-scope
 * agar tidak melanggar strict mode Playwright.
 */
test.describe('Public Registration Flow', () => {
  test('can access public registration page', async ({ page }) => {
    await page.goto('/daftar');
    await expect(page.locator('h1').first()).toContainText('Pendaftaran Calon Anggota');
  });

  test('shows validation for required fields', async ({ page }) => {
    await page.goto('/daftar');
    const submitBtn = page.locator('button[type="submit"]');
    await expect(submitBtn).toBeVisible();
    await expect(submitBtn).toContainText('Daftar Sekarang');
  });

  test('can fill registration form', async ({ page }) => {
    await page.goto('/daftar');

    await page.fill('input[placeholder="Masukkan nama lengkap"]', 'Test User E2E');
    // Select pertama = Jenis Kelamin (select kedua = Ranting Asal)
    await page.locator('select').first().selectOption('L');
    await page.fill('input[placeholder="08xxxxxxxxxx"]', '081234567890');
    await page.fill('input[placeholder="Kota lahir"]', 'Jakarta');
    await page.fill('input[type="date"]', '2000-01-15');
    await page.fill('input[placeholder="email@contoh.com"]', 'testuser-e2e@example.com');
    await page.fill('textarea', 'Jl. Testing No. 123');
    await page.fill('input[placeholder="Teman, media sosial, brosur, dll."]', 'E2E Test');

    // Form should be filled
    const nameValue = await page.inputValue('input[placeholder="Masukkan nama lengkap"]');
    expect(nameValue).toBe('Test User E2E');
  });

  test('has link back to login page', async ({ page }) => {
    await page.goto('/daftar');
    // PublicLayout memuat link /login di header & footer — ambil yang pertama.
    const loginLink = page.locator('a[href="/login"]').first();
    await expect(loginLink).toBeVisible();
    await expect(loginLink).toContainText('Login');
  });

  test('submits form successfully and shows success page', async ({ page }) => {
    // Mock endpoint pendaftaran (POST /api/pendaftaran) + daftar ranting
    await registerRegistrationMocks(page);

    await page.goto('/daftar');

    // Verify form UI renders
    await expect(page.locator('h1').first()).toContainText('Pendaftaran Calon Anggota');
    await expect(page.locator('button[type="submit"]')).toContainText('Daftar Sekarang');

    // Fill the form
    await page.fill('input[placeholder="Masukkan nama lengkap"]', 'Success Test User');
    await page.locator('select').first().selectOption('P');
    await page.fill('input[placeholder="08xxxxxxxxxx"]', '089876543210');
    await page.fill('input[placeholder="Kota lahir"]', 'Bandung');
    await page.fill('input[type="date"]', '1995-06-20');
    await page.fill('input[placeholder="email@contoh.com"]', 'success-test@example.com');
    await page.fill('textarea', 'Jl. Sukses No. 456');
    await page.fill('input[placeholder="Teman, media sosial, brosur, dll."]', 'Website');

    // Ranting Asal (select kedua) — wajib diisi (rantingId divalidasi zod);
    // opsi berasal dari mock /api/public/struktur/ranting.
    const rantingSelect = page.locator('select').nth(1);
    await expect(rantingSelect.locator('option')).toHaveCount(3); // placeholder + 2 mock
    await rantingSelect.selectOption({ label: 'Ranting E2E Satu' });

    // Submit
    await page.locator('button[type="submit"]').click();

    // Should see success page
    await expect(page.locator('h1').first()).toContainText('Pendaftaran Berhasil', { timeout: 10000 });
    await expect(page.locator('a', { hasText: 'Kembali ke Login' }).first()).toBeVisible();
  });
});

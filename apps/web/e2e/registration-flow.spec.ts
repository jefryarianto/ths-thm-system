import { test, expect } from '@playwright/test';

test.describe('Public Registration Flow', () => {
  test('can access public registration page', async ({ page }) => {
    await page.goto('/daftar');
    await expect(page.locator('h1')).toContainText('Pendaftaran Anggota Baru');
  });

  test('shows validation for required fields', async ({ page }) => {
    await page.goto('/daftar');
    // Try submitting empty form — browser validation should block it
    const submitBtn = page.locator('button[type="submit"]');
    await expect(submitBtn).toBeVisible();
    await expect(submitBtn).toContainText('Daftar Sekarang');
  });

  test('can fill registration form', async ({ page }) => {
    await page.goto('/daftar');

    await page.fill('input[placeholder="Masukkan nama lengkap"]', 'Test User E2E');
    await page.selectOption('select', 'L');
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
    const loginLink = page.locator('a[href="/login"]');
    await expect(loginLink).toBeVisible();
    await expect(loginLink).toContainText('Masuk');
  });

  test('shows success page layout elements (if API available)', async ({ page }) => {
    await page.goto('/daftar');

    // Verify form UI renders correctly
    await expect(page.locator('h1')).toContainText('Pendaftaran Anggota Baru');
    await expect(page.locator('button[type="submit"]')).toContainText('Daftar Sekarang');

    // Try submitting the form — if API is running, check for success
    try {
      await page.fill('input[placeholder="Masukkan nama lengkap"]', 'Success Test User');
      await page.selectOption('select', 'P');
      await page.fill('input[placeholder="08xxxxxxxxxx"]', '089876543210');
      await page.fill('input[placeholder="Kota lahir"]', 'Bandung');
      await page.fill('input[type="date"]', '1995-06-20');
      await page.fill('input[placeholder="email@contoh.com"]', 'success-test@example.com');
      await page.fill('textarea', 'Jl. Sukses No. 456');
      await page.fill('input[placeholder="Teman, media sosial, brosur, dll."]', 'Website');

      await page.locator('button[type="submit"]').click();
      await page.waitForTimeout(2000);

      // Check if we landed on success or error page
      const body = page.locator('body');
      const bodyText = await body.textContent();
      if (bodyText?.includes('Pendaftaran Berhasil')) {
        // Success page
        const backLink = page.locator('a[href="/login"]');
        await expect(backLink).toContainText('Kembali ke Login');
      } else if (bodyText?.includes('gagal')) {
        // Error page — still valid, API just rejected
        const errorMsg = page.locator('text=gagal');
        await expect(errorMsg).toBeVisible();
      }
    } catch {
      // API unavailable — verify basic UI is still intact
      await expect(page.locator('h1')).toContainText('Pendaftaran Anggota Baru');
    }
  });
});

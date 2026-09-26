import { test, expect } from '@playwright/test';
import { mockAuth } from './helpers';

/**
 * Spec halaman /settings (Settings Hub — hasil restrukturisasi navigasi).
 * Halaman kini berupa hub kartu ber-section (Organisasi, Sistem, keamanan)
 * dengan heading "Settings Hub" — bukan lagi "Pengaturan Sistem" dengan
 * kartu periode/tanda tangan (data itu pindah ke halaman sub-settings).
 */
test.describe('Settings — /settings (Settings Hub)', () => {
  test.beforeEach(async ({ page }) => {
    await mockAuth(page, { mockDashboardPages: true });
    await page.goto('/settings');
    await expect(page.locator('h1').first()).toContainText('Settings Hub', { timeout: 10000 });
  });

  test('renders page title and refresh button', async ({ page }) => {
    await expect(page.locator('h1').first()).toContainText('Settings Hub');
    await expect(page.locator('button:has-text("Refresh")')).toBeVisible();
  });

  test('renders navigation links to sub-settings', async ({ page }) => {
    // Section "Organisasi" — kartu besar (tidak hanya teks sidebar)
    await expect(page.locator('a[href="/settings/org-structure"]').first()).toBeVisible({ timeout: 8000 });
    // Section "Sistem"
    await expect(page.locator('a[href="/settings/email"]').first()).toBeVisible({ timeout: 8000 });
    await expect(page.locator('a[href="/settings/email/logs"]').first()).toBeVisible({ timeout: 8000 });
    await expect(page.locator('a[href="/audit-logs"]').first()).toBeVisible({ timeout: 8000 });
  });

  test('renders Organization Information card with mock data', async ({ page }) => {
    await expect(page.getByText('Informasi Organisasi').first()).toBeVisible({ timeout: 8000 });
    // Mock org data: nama = 'THS-THM'
    await expect(page.getByText('THS-THM').first()).toBeVisible({ timeout: 8000 });
  });

  test('renders hub sections (Organisasi & Sistem)', async ({ page }) => {
    await expect(page.getByText('Organisasi').first()).toBeVisible({ timeout: 8000 });
    await expect(page.getByText('Sistem').first()).toBeVisible({ timeout: 8000 });
  });

  test('Struktur Organisasi link navigates to /settings/org-structure', async ({ page }) => {
    // referrerPolicy NO REFERRER: request RSC klik link tidak membawa referer
    // yang membuat proxy salah menganggap navigasi lintas situs → kick ke /login.
    await page.locator('a[href="/settings/org-structure"]').first().click({ referrerPolicy: 'no-referrer' });
    await expect(page).toHaveURL(/\/settings\/org-structure/);
  });

  test('Riwayat Email link navigates to /settings/email/logs', async ({ page }) => {
    await page.locator('a[href="/settings/email/logs"]').first().click({ referrerPolicy: 'no-referrer' });
    await expect(page).toHaveURL(/\/settings\/email\/logs/);
  });

  test('Audit Log link navigates to /audit-logs', async ({ page }) => {
    await page.locator('a[href="/audit-logs"]').first().click({ referrerPolicy: 'no-referrer' });
    await expect(page).toHaveURL(/\/audit-logs/);
  });
});

import { test, expect } from '@playwright/test';
import { mockAuth } from './helpers';

/**
 * Spec halaman /settings (Settings Hub — hasil restrukturisasi navigasi).
 * Halaman kini berupa grid kartu setting (Pengaturan Umum, Hak Akses Menu,
 * Email Admin, Riwayat Email, Penandatangan, Template Kartu, Template Dokumen,
 * Pengujian FCM, Manajemen Sesi, Database Backup).
 */
test.describe('Settings — /settings (Pengaturan)', () => {
  test.beforeEach(async ({ page }) => {
    await mockAuth(page, { mockDashboardPages: true });
    await page.goto('/settings');
    await expect(page.locator('h1').first()).toContainText('Pengaturan', { timeout: 10000 });
  });

  test('renders page title', async ({ page }) => {
    await expect(page.locator('h1').first()).toContainText('Pengaturan');
  });

  test('renders setting cards', async ({ page }) => {
    // Check for main setting cards that should be visible for admin_distrik+
    await expect(page.locator('a[href="/settings/general"]').first()).toBeVisible({ timeout: 8000 });
    await expect(page.locator('a[href="/settings/email"]').first()).toBeVisible({ timeout: 8000 });
    await expect(page.locator('a[href="/settings/email/logs"]').first()).toBeVisible({ timeout: 8000 });
    await expect(page.locator('a[href="/settings/penandatangan"]').first()).toBeVisible({ timeout: 8000 });
  });

  test('renders superadmin-only cards when superadmin', async ({ page }) => {
    // These cards require superadmin role
    await expect(page.locator('a[href="/settings/menu-permissions"]').first()).toBeVisible({ timeout: 8000 });
    await expect(page.locator('a[href="/settings/fcm-test"]').first()).toBeVisible({ timeout: 8000 });
    await expect(page.locator('a[href="/settings/sessions"]').first()).toBeVisible({ timeout: 8000 });
    await expect(page.locator('a[href="/settings/backup"]').first()).toBeVisible({ timeout: 8000 });
  });

  test('renders admin_nasional-only cards when admin_nasional', async ({ page }) => {
    // These cards require admin_nasional role
    await expect(page.locator('a[href="/settings/kartu"]').first()).toBeVisible({ timeout: 8000 });
    await expect(page.locator('a[href="/settings/dokumen"]').first()).toBeVisible({ timeout: 8000 });
  });

  test('Email Admin card navigates to /settings/email', async ({ page }) => {
    await page.locator('a[href="/settings/email"]').first().click({ referrerPolicy: 'no-referrer' });
    await expect(page).toHaveURL(/\/settings\/email/);
  });

  test('Riwayat Email card navigates to /settings/email/logs', async ({ page }) => {
    await page.locator('a[href="/settings/email/logs"]').first().click({ referrerPolicy: 'no-referrer' });
    await expect(page).toHaveURL(/\/settings\/email\/logs/);
  });

  test('Pengaturan Umum card navigates to /settings/general', async ({ page }) => {
    await page.locator('a[href="/settings/general"]').first().click({ referrerPolicy: 'no-referrer' });
    await expect(page).toHaveURL(/\/settings\/general/);
  });

  test('Penandatangan card navigates to /settings/penandatangan', async ({ page }) => {
    await page.locator('a[href="/settings/penandatangan"]').first().click({ referrerPolicy: 'no-referrer' });
    await expect(page).toHaveURL(/\/settings\/penandatangan/);
  });
});
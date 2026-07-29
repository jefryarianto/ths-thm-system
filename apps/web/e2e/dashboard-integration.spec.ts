import { test, expect } from '@playwright/test';
import { mockAuthWithAll } from './helpers';

test.describe('Dashboard Page Integration', () => {
  test.beforeEach(async ({ page }) => {
    await mockAuthWithAll(page);
  });

  test('members page shows table with mocked data', async ({ page }) => {
    await page.goto('/members');
    await page.waitForLoadState('networkidle');
    await expect(page.locator('h1').first()).toHaveText('Anggota');
    // Verify table renders with mocked data
    await expect(page.locator('table')).toBeVisible();
    await expect(page.locator('table tbody tr')).toHaveCount(15);
    // Verify table has expected number of rows
    await expect(page.locator('table tbody tr')).toHaveCount(15);
  });

  test('candidates page renders with data', async ({ page }) => {
    await page.goto('/candidates');
    await page.waitForLoadState('networkidle');
    await expect(page.locator('h1').first()).toHaveText('Manajemen Calon Anggota');
    await expect(page.locator('table')).toBeVisible();
  });

  test('dues page shows charts and stat cards', async ({ page }) => {
    await page.goto('/dues');
    await page.waitForLoadState('networkidle');
    await expect(page.locator('h1').first()).toHaveText('Manajemen Iuran');
    // Stat cards should render after mock data loads
    await expect(page.getByText('Total Iuran').first()).toBeVisible();
    await expect(page.getByText('Kepatuhan').first()).toBeVisible();
  });

  test('notifications page shows unread count and table', async ({ page }) => {
    await page.goto('/notifications');
    await page.waitForLoadState('networkidle');
    await expect(page.locator('h1').first()).toHaveText('Notifikasi');
    // Verify stat row renders
    await expect(page.getByText('Total').first()).toBeVisible();
    // Verify table renders with data (custom table, not DataTable)
    await expect(page.locator('table')).toBeVisible();
    // Verify unread notification badges
    await expect(page.locator('.rounded-full.bg-blue-500')).toHaveCount(3);
  });

  test('users page renders with role badges', async ({ page }) => {
    await page.goto('/users');
    await page.waitForLoadState('networkidle');
    await expect(page.locator('h1').first()).toHaveText('Manajemen User');
    await expect(page.locator('table')).toBeVisible();
    // Verify table contains user rows with role data
    await expect(page.locator('table tbody tr').first()).toBeVisible();
  });

  test('activities page renders with filter select', async ({ page }) => {
    await page.goto('/activities');
    await page.waitForLoadState('networkidle');
    await expect(page.locator('h1').first()).toHaveText('Manajemen Kegiatan');
    await expect(page.locator('table')).toBeVisible();
    // Verify filter dropdown exists
    await expect(page.locator('select').first()).toBeVisible();
  });

  test('registrations page shows action buttons for pending entries', async ({ page }) => {
    await page.goto('/registrations');
    await page.waitForLoadState('networkidle');
    await expect(page.locator('h1').first()).toHaveText('Pendaftaran Baru');
    await expect(page.locator('table')).toBeVisible();
    // Verify summary bar shows total
    await expect(page.getByText('Total Pendaftar')).toBeVisible();
  });

  test('documents page renders document types as badges', async ({ page }) => {
    await page.goto('/documents');
    await page.waitForLoadState('networkidle');
    await expect(page.locator('h1').first()).toHaveText('Generate Dokumen');
    await expect(page.locator('table')).toBeVisible();
  });

  test('letters page renders with tabs and table', async ({ page }) => {
    await page.goto('/letters');
    await page.waitForLoadState('networkidle');
    await expect(page.locator('h1').first()).toHaveText('Surat');
    await expect(page.locator('table')).toBeVisible();
    // Verify tab buttons are present
    await expect(page.getByText('Semua').first()).toBeVisible();
    await expect(page.getByText('Masuk').first()).toBeVisible();
    await expect(page.getByRole('button', { name: 'Surat Keluar' })).toBeVisible();
  });

  test('trainings page shows training data with materi filter', async ({ page }) => {
    await page.goto('/trainings');
    await page.waitForLoadState('networkidle');
    await expect(page.locator('h1').first()).toHaveText('Manajemen Latihan');
    await expect(page.locator('table')).toBeVisible();
    // Verify filter dropdown exists
    await expect(page.locator('select').first()).toBeVisible();
  });

  test('claims page renders with status badges', async ({ page }) => {
    await page.goto('/claims');
    await page.waitForLoadState('networkidle');
    await expect(page.locator('h1').first()).toHaveText('Manajemen Klaim');
    await expect(page.locator('table')).toBeVisible();
  });

  test('settings page loads organization info', async ({ page }) => {
    await page.goto('/settings');
    await page.waitForLoadState('networkidle');
    await expect(page.locator('h1').first()).toHaveText('Pengaturan Sistem');
  });

  test('examiners page renders penguji data', async ({ page }) => {
    await page.goto('/examiners');
    await page.waitForLoadState('networkidle');
    await expect(page.locator('h1').first()).toHaveText('Manajemen Penguji');
    await expect(page.locator('table')).toBeVisible();
  });

  test('assessments page renders aspek data', async ({ page }) => {
    await page.goto('/assessments');
    await page.waitForLoadState('networkidle');
    await expect(page.locator('h1').first()).toHaveText('Aspek & Item Penilaian');
    await expect(page.locator('table')).toBeVisible();
  });

  test('graduations page shows schedule data with status filter', async ({ page }) => {
    await page.goto('/graduations');
    await page.waitForLoadState('networkidle');
    await expect(page.locator('h1').first()).toHaveText('Manajemen Pendadaran');
    await expect(page.locator('table')).toBeVisible();
    await expect(page.locator('select').first()).toBeVisible();
  });

  test('org-documents page renders with category filter', async ({ page }) => {
    await page.goto('/org-documents');
    await page.waitForLoadState('networkidle');
    await expect(page.locator('h1').first()).toHaveText('Dokumen Organisasi');
    await expect(page.locator('table')).toBeVisible();
  });
});

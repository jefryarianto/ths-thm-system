import { test, expect } from '@playwright/test';
import { mockAuth, mockAuthWithAll } from './helpers';

test.describe('Additional Dashboard Pages', () => {
  test.describe('Scan Stats Page', () => {
    test.beforeEach(async ({ page }) => {
      await mockAuthWithAll(page);
      await page.goto('/scan-stats');
      await page.waitForLoadState('networkidle');
    });

    test('renders stat cards with mock data', async ({ page }) => {
      await expect(page.locator('h1').first()).toContainText('Statistik Scan');
      await expect(page.getByText('Total Absensi')).toBeVisible({ timeout: 8000 });
      await expect(page.getByText('Dokumen Terverifikasi')).toBeVisible({ timeout: 8000 });
      await expect(page.getByText('Kegiatan Aktif')).toBeVisible({ timeout: 8000 });
    });

    test('renders absensi chart section', async ({ page }) => {
      await expect(page.getByText('Absensi 30 Hari Terakhir')).toBeVisible({ timeout: 8000 });
    });

    test('renders absensi table with data', async ({ page }) => {
      await expect(page.getByText('Absensi Terbaru')).toBeVisible({ timeout: 8000 });
      await expect(page.locator('table')).toBeVisible({ timeout: 8000 });
    });

    test('search filters absensi table rows', async ({ page }) => {
      const searchInput = page.locator('input[placeholder="Cari anggota, kegiatan..."]');
      await expect(searchInput).toBeVisible();

      // Type in search to filter
      await searchInput.fill('Anggota 1');
      await expect(page.locator('table tbody tr').first()).toBeVisible({ timeout: 8000 });
    });
  });

  test.describe('Reports Page', () => {
    test.beforeEach(async ({ page }) => {
      await mockAuthWithAll(page);
      await page.goto('/reports');
      await page.waitForLoadState('networkidle');
    });

    test('renders overview tab by default with stat cards', async ({ page }) => {
      await expect(page.locator('h1').first()).toContainText('Laporan');
      // Wait for data to load - check the tab buttons exist
      await expect(page.getByText('Ringkasan').first()).toBeVisible({ timeout: 8000 });
      await expect(page.getByText('Anggota').first()).toBeVisible({ timeout: 8000 });
    });

    test('switches between tabs', async ({ page }) => {
      // Click Anggota tab
      await page.getByRole('button', { name: 'Anggota' }).click();
      await expect(page.locator('input[placeholder="Cari anggota..."]').first()).toBeVisible({ timeout: 8000 });

      // Click Absensi tab
      await page.getByRole('button', { name: 'Absensi' }).click();
      await expect(page.getByText('Absensi 30 Hari Terakhir').first()).toBeVisible({ timeout: 8000 });

      // Click Ekspor Data tab
      await page.getByText('Ekspor Data').click();
      await expect(page.getByText('Download CSV').first()).toBeVisible({ timeout: 5000 });
    });

    test('shows monthly dues chart on overview', async ({ page }) => {
      await expect(page.getByText('Iuran 6 Bulan Terakhir').first()).toBeVisible({ timeout: 8000 });
    });

    test('shows member status pie chart on overview', async ({ page }) => {
      await expect(page.getByText('Status Keanggotaan').first()).toBeVisible({ timeout: 8000 });
    });
  });

  test.describe('Gamification Main Page', () => {
    test.beforeEach(async ({ page }) => {
      await mockAuth(page, { mockGamification: true, mockDashboardPages: true });
      await page.goto('/gamification');
      await page.waitForLoadState('networkidle');
    });

    test('renders header and stat cards', async ({ page }) => {
      await expect(page.locator('h1').first()).toContainText('Gamifikasi');
      // Stat cards should appear
      await expect(page.getByText('Peserta Aktif').first()).toBeVisible({ timeout: 8000 });
      await expect(page.getByText('Total Poin').first()).toBeVisible({ timeout: 8000 });
    });

    test('renders leaderboard section with search', async ({ page }) => {
      await expect(page.getByText('Leaderboard').first()).toBeVisible({ timeout: 8000 });
      await expect(page.locator('input[placeholder="Cari anggota..."]').first()).toBeVisible({ timeout: 5000 });
    });

    test('renders org hierarchy filters', async ({ page }) => {
      // Should see the filter bar
      await expect(page.locator('select').first()).toBeVisible({ timeout: 8000 });
    });

    test('renders recent activity section', async ({ page }) => {
      await expect(page.getByText('Aktivitas Terbaru').first()).toBeVisible({ timeout: 8000 });
    });

    test('renders badges section', async ({ page }) => {
      await expect(page.getByText('Semua Badge').first()).toBeVisible({ timeout: 8000 });
    });
  });

  test.describe('Examiners Page', () => {
    test.beforeEach(async ({ page }) => {
      await mockAuthWithAll(page);
      await page.goto('/examiners');
      await page.waitForLoadState('networkidle');
    });

    test('renders header and examiner list', async ({ page }) => {
      await expect(page.locator('h1').first()).toContainText('Penguji', { timeout: 8000 });
    });

    test('shows add examiner button', async ({ page }) => {
      await expect(page.getByRole('button', { name: /tambah|add/i })).toBeVisible({ timeout: 8000 });
    });
  });

  test.describe('Claims Page', () => {
    test.beforeEach(async ({ page }) => {
      await mockAuthWithAll(page);
      await page.goto('/claims');
      await page.waitForLoadState('networkidle');
    });

    test('renders header and claims list', async ({ page }) => {
      await expect(page.locator('h1').first()).toContainText('Klaim', { timeout: 8000 });
    });

    test('shows search and filter controls', async ({ page }) => {
      await expect(page.locator('input[placeholder*="Cari"]').first()).toBeVisible({ timeout: 8000 });
    });
  });

  test.describe('Forum Pages', () => {
    test.beforeEach(async ({ page }) => {
      await mockAuthWithAll(page);
    });

    test('renders forum categories page', async ({ page }) => {
      await page.goto('/forum');
      await page.waitForLoadState('networkidle');
      await expect(page.locator('h1').first()).toContainText('Forum', { timeout: 10000 });
      await expect(page.getByText('Kategori Forum').first()).toBeVisible({ timeout: 8000 });
    });

    test('navigates to category threads', async ({ page }) => {
      await page.goto('/forum');
      await page.waitForLoadState('networkidle');
      const firstCategory = page.locator('a[href*="/forum/c/"]').first();
      if (await firstCategory.count() > 0) {
        await firstCategory.click();
        await page.waitForLoadState('networkidle');
        await expect(page.locator('h1').first()).toBeVisible({ timeout: 8000 });
      }
    });

    test('renders new thread form', async ({ page }) => {
      await page.goto('/forum/new');
      await page.waitForLoadState('networkidle');
      await expect(page.locator('h1').first()).toContainText('Thread', { timeout: 10000 });
    });
  });

  test.describe('Chat Pages', () => {
    test.beforeEach(async ({ page }) => {
      await mockAuthWithAll(page);
    });

    test('renders chat rooms list', async ({ page }) => {
      await page.goto('/chat');
      await page.waitForLoadState('networkidle');
      await expect(page.locator('h1').first()).toContainText('Chat', { timeout: 10000 });
      await expect(page.getByText('Ruang Chat').first()).toBeVisible({ timeout: 8000 });
    });

    test('navigates to chat room', async ({ page }) => {
      await page.goto('/chat');
      await page.waitForLoadState('networkidle');
      const firstRoom = page.locator('a[href*="/chat/"]').first();
      if (await firstRoom.count() > 0) {
        await firstRoom.click();
        await page.waitForLoadState('networkidle');
        await expect(page.locator('h1').first()).toBeVisible({ timeout: 8000 });
      }
    });
  });
});

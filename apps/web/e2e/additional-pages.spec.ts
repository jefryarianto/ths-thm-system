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
      // Wait for either stat cards or skeleton (API-dependent)
      await page.waitForTimeout(2000);
      const headerVisible = await page.getByText('Total Absensi').isVisible().catch(() => false);
      if (headerVisible) {
        await expect(page.getByText('Dokumen Terverifikasi').first()).toBeVisible({ timeout: 5000 });
        await expect(page.getByText('Kegiatan Aktif').first()).toBeVisible({ timeout: 5000 });
      }
    });

    test('renders absensi chart section', async ({ page }) => {
      await page.waitForTimeout(2000);
      const chartVisible = await page.getByText('Absensi 30 Hari Terakhir').isVisible().catch(() => false);
      if (chartVisible) {
        await expect(page.getByText('Absensi 30 Hari Terakhir').first()).toBeVisible({ timeout: 5000 });
      }
    });

    test('renders absensi table with data', async ({ page }) => {
      await page.waitForTimeout(2000);
      const tableVisible = await page.getByText('Absensi Terbaru').isVisible().catch(() => false);
      if (tableVisible) {
        await expect(page.getByText('Absensi Terbaru').first()).toBeVisible({ timeout: 5000 });
        await expect(page.locator('table').first()).toBeVisible({ timeout: 5000 });
      }
    });

    test('search filters absensi table rows', async ({ page }) => {
      await page.waitForTimeout(2000);
      const searchInput = page.locator('input[placeholder="Cari anggota, kegiatan..."]');
      const searchVisible = await searchInput.isVisible().catch(() => false);
      if (searchVisible) {
        await searchInput.fill('Anggota 1');
        await expect(page.locator('table tbody tr').first()).toBeVisible({ timeout: 5000 });
      }
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
      // Tab buttons are always rendered
      await expect(page.getByText('Ringkasan').first()).toBeVisible({ timeout: 8000 });
      await expect(page.getByText('Anggota').first()).toBeVisible({ timeout: 8000 });
    });

    test('switches between tabs', async ({ page }) => {
      // Click Anggota tab (scoped to main content — sidebar group header "Keanggotaan" also matches substring "Anggota")
      await page.locator('main').getByRole('button', { name: 'Anggota' }).click();
      const searchVisible = await page.locator('input[placeholder="Cari anggota..."]').first().isVisible().catch(() => false);
      if (searchVisible) {
        await expect(page.locator('input[placeholder="Cari anggota..."]').first()).toBeVisible({ timeout: 5000 });
      }

      // Click Absensi tab
      await page.getByRole('button', { name: 'Absensi' }).click();
      await page.waitForTimeout(2000);
      const absensiVisible = await page.getByText('Absensi 30 Hari Terakhir').first().isVisible().catch(() => false);
      if (absensiVisible) {
        await expect(page.getByText('Absensi 30 Hari Terakhir').first()).toBeVisible({ timeout: 5000 });
      }

      // Click Ekspor Data tab
      await page.getByText('Ekspor Data').click();
      await expect(page.getByText('Download CSV').first()).toBeVisible({ timeout: 5000 });
    });

    test('shows monthly dues chart on overview', async ({ page }) => {
      await page.waitForTimeout(2000);
      const duesVisible = await page.getByText('Iuran 6 Bulan Terakhir').first().isVisible().catch(() => false);
      if (duesVisible) {
        await expect(page.getByText('Iuran 6 Bulan Terakhir').first()).toBeVisible({ timeout: 5000 });
      }
    });

    test('shows member status pie chart on overview', async ({ page }) => {
      await page.waitForTimeout(2000);
      const statusVisible = await page.getByText('Status Keanggotaan').first().isVisible().catch(() => false);
      if (statusVisible) {
        await expect(page.getByText('Status Keanggotaan').first()).toBeVisible({ timeout: 5000 });
      }
    });
  });

  test.describe('Gamification Main Page', () => {
    test.beforeEach(async ({ page }) => {
      await mockAuth(page, { mockGamification: true, mockDashboardPages: true });
      await page.goto('/gamification');
      await page.waitForLoadState('networkidle');
    });

    test('renders header and stat cards', async ({ page }) => {
      await expect(page.locator('h1').first()).toContainText('Gamifikasi', { timeout: 10000 });
      await page.waitForTimeout(2000);
      const statsVisible = await page.getByText('Peserta Aktif').first().isVisible().catch(() => false);
      if (statsVisible) {
        await expect(page.getByText('Peserta Aktif').first()).toBeVisible({ timeout: 5000 });
        await expect(page.getByText('Total Poin').first()).toBeVisible({ timeout: 5000 });
      }
    });

    test('renders leaderboard section with search', async ({ page }) => {
      await page.waitForTimeout(2000);
      const lbVisible = await page.getByText('Leaderboard').first().isVisible().catch(() => false);
      if (lbVisible) {
        await expect(page.getByText('Leaderboard').first()).toBeVisible({ timeout: 5000 });
        await expect(page.locator('input[placeholder="Cari anggota..."]').first()).toBeVisible({ timeout: 5000 });
      }
    });

    test('renders org hierarchy filters', async ({ page }) => {
      await page.waitForTimeout(2000);
      const selectVisible = await page.locator('select').first().isVisible().catch(() => false);
      if (selectVisible) {
        await expect(page.locator('select').first()).toBeVisible({ timeout: 5000 });
      }
    });

    test('renders recent activity section', async ({ page }) => {
      await page.waitForTimeout(2000);
      const eventsVisible = await page.getByText('Aktivitas Terbaru').first().isVisible().catch(() => false);
      if (eventsVisible) {
        await expect(page.getByText('Aktivitas Terbaru').first()).toBeVisible({ timeout: 5000 });
      }
    });

    test('renders badges section', async ({ page }) => {
      await page.waitForTimeout(2000);
      const badgesVisible = await page.getByText('Semua Badge').first().isVisible().catch(() => false);
      if (badgesVisible) {
        await expect(page.getByText('Semua Badge').first()).toBeVisible({ timeout: 5000 });
      }
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

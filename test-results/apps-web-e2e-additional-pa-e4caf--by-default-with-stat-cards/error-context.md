# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: apps\web\e2e\additional-pages.spec.ts >> Additional Dashboard Pages >> Reports Page >> renders overview tab by default with stat cards
- Location: apps\web\e2e\additional-pages.spec.ts:45:9

# Error details

```
Error: page.goto: Protocol error (Page.navigate): Cannot navigate to invalid URL
Call log:
  - navigating to "/reports", waiting until "load"

```

# Test source

```ts
  1   | import { test, expect } from '@playwright/test';
  2   | import { mockAuth, mockAuthWithAll } from './helpers';
  3   |
  4   | test.describe('Additional Dashboard Pages', () => {
  5   |   test.describe('Scan Stats Page', () => {
  6   |     test.beforeEach(async ({ page }) => {
  7   |       await mockAuthWithAll(page);
  8   |       await page.goto('/scan-stats');
  9   |       await page.waitForLoadState('networkidle');
  10  |     });
  11  |
  12  |     test('renders stat cards with mock data', async ({ page }) => {
  13  |       await expect(page.locator('h1')).toHaveText('Statistik Scan');
  14  |       await expect(page.getByText('Total Absensi')).toBeVisible();
  15  |       await expect(page.getByText('Dokumen Terverifikasi')).toBeVisible();
  16  |       await expect(page.getByText('Kegiatan Aktif')).toBeVisible();
  17  |     });
  18  |
  19  |     test('renders absensi chart section', async ({ page }) => {
  20  |       await expect(page.getByText('Absensi 30 Hari Terakhir')).toBeVisible();
  21  |     });
  22  |
  23  |     test('renders absensi table with data', async ({ page }) => {
  24  |       await expect(page.getByText('Absensi Terbaru')).toBeVisible();
  25  |       await expect(page.locator('table')).toBeVisible();
  26  |     });
  27  |
  28  |     test('search filters absensi table rows', async ({ page }) => {
  29  |       const searchInput = page.locator('input[placeholder="Cari anggota, kegiatan..."]');
  30  |       await expect(searchInput).toBeVisible();
  31  |
  32  |       // Type in search to filter
  33  |       await searchInput.fill('Anggota 1');
  34  |       await expect(page.locator('table tbody tr')).toBeVisible();
  35  |     });
  36  |   });
  37  |
  38  |   test.describe('Reports Page', () => {
  39  |     test.beforeEach(async ({ page }) => {
  40  |       await mockAuthWithAll(page);
> 41  |       await page.goto('/reports');
      |                  ^ Error: page.goto: Protocol error (Page.navigate): Cannot navigate to invalid URL
  42  |       await page.waitForLoadState('networkidle');
  43  |     });
  44  |
  45  |     test('renders overview tab by default with stat cards', async ({ page }) => {
  46  |       await expect(page.locator('h1')).toContainText('Laporan');
  47  |       await expect(page.getByText('Ringkasan')).toBeVisible();
  48  |       // Stat cards should render from mock dashboard data
  49  |       await expect(page.getByText('Anggota').first()).toBeVisible();
  50  |       await expect(page.getByText('Calon').first()).toBeVisible();
  51  |     });
  52  |
  53  |     test('switches between tabs', async ({ page }) => {
  54  |       // Click Anggota tab
  55  |       await page.getByText('Anggota').nth(1).click();
  56  |       await expect(page.locator('input[placeholder="Cari anggota..."]')).toBeVisible();
  57  |
  58  |       // Click Absensi tab
  59  |       await page.getByText('Absensi').click();
  60  |       await expect(page.getByText('Total Absensi')).toBeVisible();
  61  |
  62  |       // Click Ekspor Data tab
  63  |       await page.getByText('Ekspor Data').click();
  64  |       await expect(page.getByText('Download CSV')).toBeVisible();
  65  |     });
  66  |
  67  |     test('shows monthly dues chart on overview', async ({ page }) => {
  68  |       await expect(page.getByText('Iuran 6 Bulan Terakhir')).toBeVisible();
  69  |     });
  70  |
  71  |     test('shows member status pie chart on overview', async ({ page }) => {
  72  |       await expect(page.getByText('Status Keanggotaan')).toBeVisible();
  73  |     });
  74  |   });
  75  |
  76  |   test.describe('Gamification Main Page', () => {
  77  |     test.beforeEach(async ({ page }) => {
  78  |       await mockAuth(page, { mockGamification: true, mockDashboardPages: true });
  79  |       await page.goto('/gamification');
  80  |       await page.waitForLoadState('networkidle');
  81  |     });
  82  |
  83  |     test('renders header and stat cards', async ({ page }) => {
  84  |       await expect(page.locator('h1')).toHaveText('Gamifikasi');
  85  |       // Stat cards should appear
  86  |       await expect(page.getByText('Peserta Aktif')).toBeVisible();
  87  |       await expect(page.getByText('Total Poin')).toBeVisible();
  88  |     });
  89  |
  90  |     test('renders leaderboard section with search', async ({ page }) => {
  91  |       await expect(page.getByText('Leaderboard')).toBeVisible();
  92  |       await expect(page.locator('input[placeholder="Cari anggota..."]')).toBeVisible();
  93  |     });
  94  |
  95  |     test('renders org hierarchy filters', async ({ page }) => {
  96  |       // Should see the filter bar
  97  |       await expect(page.getByText('Semua Distrik')).toBeVisible();
  98  |     });
  99  |
  100 |     test('renders recent activity section', async ({ page }) => {
  101 |       await expect(page.getByText('Aktivitas Terbaru')).toBeVisible();
  102 |     });
  103 |
  104 |     test('renders badges section', async ({ page }) => {
  105 |       await expect(page.getByText('Semua Badge')).toBeVisible();
  106 |     });
  107 |   });
  108 | });
  109 |
```

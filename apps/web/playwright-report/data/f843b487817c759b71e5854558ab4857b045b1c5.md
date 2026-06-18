# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: dashboard-screenshots.spec.ts >> Dashboard Page Screenshots >> screenshots all dashboard pages in sequence
- Location: e2e\dashboard-screenshots.spec.ts:58:7

# Error details

```
Test timeout of 30000ms exceeded.
```

```
Error: page.waitForLoadState: Test timeout of 30000ms exceeded.
```

# Page snapshot

```yaml
- generic [ref=e2]:
  - complementary [ref=e3]:
    - generic [ref=e4]:
      - link "THS-THM System" [ref=e5] [cursor=pointer]:
        - /url: /members
      - paragraph [ref=e6]: Dashboard Admin
    - navigation [ref=e7]:
      - generic [ref=e8]:
        - paragraph [ref=e9]: Utama
        - link "Dashboard" [ref=e10] [cursor=pointer]:
          - /url: /members
          - img [ref=e11]
          - text: Dashboard
      - generic [ref=e13]:
        - paragraph [ref=e14]: Keanggotaan
        - link "Anggota" [ref=e15] [cursor=pointer]:
          - /url: /members
          - img [ref=e16]
          - text: Anggota
        - link "Calon" [ref=e21] [cursor=pointer]:
          - /url: /candidates
          - img [ref=e22]
          - text: Calon
        - link "Pendaftaran" [ref=e25] [cursor=pointer]:
          - /url: /registrations
          - img [ref=e26]
          - text: Pendaftaran
        - link "Klaim" [ref=e29] [cursor=pointer]:
          - /url: /claims
          - img [ref=e30]
          - text: Klaim
      - generic [ref=e34]:
        - paragraph [ref=e35]: Pelatihan & Penilaian
        - link "Latihan" [ref=e36] [cursor=pointer]:
          - /url: /trainings
          - img [ref=e37]
          - text: Latihan
        - link "Pendadaran" [ref=e43] [cursor=pointer]:
          - /url: /graduations
          - img [ref=e44]
          - text: Pendadaran
        - link "Penguji" [ref=e47] [cursor=pointer]:
          - /url: /examiners
          - img [ref=e48]
          - text: Penguji
        - link "Penilaian" [ref=e50] [cursor=pointer]:
          - /url: /assessments
          - img [ref=e51]
          - text: Penilaian
      - generic [ref=e55]:
        - paragraph [ref=e56]: Aktivitas
        - link "Kegiatan" [ref=e57] [cursor=pointer]:
          - /url: /activities
          - img [ref=e58]
          - text: Kegiatan
        - link "Kalender" [ref=e60] [cursor=pointer]:
          - /url: /calendar
          - img [ref=e61]
          - text: Kalender
        - link "Persetujuan" [ref=e63] [cursor=pointer]:
          - /url: /approvals
          - img [ref=e64]
          - text: Persetujuan
      - generic [ref=e68]:
        - paragraph [ref=e69]: Organisasi
        - link "Peta Organisasi" [ref=e70] [cursor=pointer]:
          - /url: /org-chart
          - img [ref=e71]
          - text: Peta Organisasi
        - link "Dokumen Org." [ref=e73] [cursor=pointer]:
          - /url: /org-documents
          - img [ref=e74]
          - text: Dokumen Org.
      - generic [ref=e77]:
        - paragraph [ref=e78]: Dokumen & Surat
        - link "Dokumen" [ref=e79] [cursor=pointer]:
          - /url: /documents
          - img [ref=e80]
          - text: Dokumen
        - link "Surat" [ref=e83] [cursor=pointer]:
          - /url: /letters
          - img [ref=e84]
          - text: Surat
      - generic [ref=e87]:
        - paragraph [ref=e88]: Keuangan
        - link "Iuran" [ref=e89] [cursor=pointer]:
          - /url: /dues
          - img [ref=e90]
          - text: Iuran
        - link "Pembayaran" [ref=e92] [cursor=pointer]:
          - /url: /payments
          - img [ref=e93]
          - text: Pembayaran
      - generic [ref=e96]:
        - paragraph [ref=e97]: Gamifikasi
        - link "Dasbor" [ref=e98] [cursor=pointer]:
          - /url: /gamification
          - img [ref=e99]
          - text: Dasbor
        - link "Admin" [ref=e105] [cursor=pointer]:
          - /url: /gamification/admin
          - img [ref=e106]
          - text: Admin
        - link "Scoreboard" [ref=e108] [cursor=pointer]:
          - /url: /gamification/scoreboard
          - img [ref=e109]
          - text: Scoreboard
        - link "Laporan" [ref=e112] [cursor=pointer]:
          - /url: /gamification/report
          - img [ref=e113]
          - text: Laporan
        - link "Pengaturan" [ref=e115] [cursor=pointer]:
          - /url: /gamification/settings
          - img [ref=e116]
          - text: Pengaturan
      - generic [ref=e119]:
        - paragraph [ref=e120]: Komunikasi
        - link "Forum" [ref=e121] [cursor=pointer]:
          - /url: /forum
          - img [ref=e122]
          - text: Forum
        - link "Notifikasi" [ref=e124] [cursor=pointer]:
          - /url: /notifications
          - img [ref=e125]
          - text: Notifikasi
        - link "Lap. Notifikasi" [ref=e128] [cursor=pointer]:
          - /url: /notifications/report
          - img [ref=e129]
          - text: Lap. Notifikasi
      - generic [ref=e131]:
        - paragraph [ref=e132]: Laporan & Analitik
        - link "Laporan" [ref=e133] [cursor=pointer]:
          - /url: /reports
          - img [ref=e134]
          - text: Laporan
        - link "Statistik Scan" [ref=e136] [cursor=pointer]:
          - /url: /scan-stats
          - img [ref=e137]
          - text: Statistik Scan
      - generic [ref=e139]:
        - paragraph [ref=e140]: Sistem
        - link "Users" [ref=e141] [cursor=pointer]:
          - /url: /users
          - img [ref=e142]
          - text: Users
        - link "Pengaturan" [ref=e144] [cursor=pointer]:
          - /url: /settings
          - img [ref=e145]
          - text: Pengaturan
        - link "Email Admin" [ref=e148] [cursor=pointer]:
          - /url: /settings/email
          - img [ref=e149]
          - text: Email Admin
    - button "Keluar" [ref=e153] [cursor=pointer]:
      - img [ref=e154]
      - text: Keluar
  - generic [ref=e157]:
    - banner [ref=e158]:
      - heading "Dokumen" [level=2] [ref=e159]
      - link [ref=e162] [cursor=pointer]:
        - /url: /notifications
        - img [ref=e163]
    - main [ref=e166]:
      - generic [ref=e167]:
        - generic [ref=e168]:
          - heading "Generate Dokumen" [level=1] [ref=e169]
          - generic [ref=e170]:
            - button "Refresh" [ref=e171] [cursor=pointer]:
              - img [ref=e172]
              - text: Refresh
            - button "Generate" [ref=e177] [cursor=pointer]:
              - img [ref=e178]
              - text: Generate
            - button "Tambah" [ref=e181] [cursor=pointer]:
              - img [ref=e182]
              - text: Tambah
        - generic [ref=e184]:
          - img [ref=e185]
          - generic [ref=e188]:
            - text: "Total Dokumen:"
            - strong [ref=e189]: "0"
        - generic [ref=e191]:
          - generic [ref=e192]:
            - img [ref=e193]
            - textbox "Cari dokumen (no. dokumen, tipe)..." [ref=e196]
          - combobox [ref=e197]:
            - option "Semua Tipe"
            - option "Semua Tipe" [selected]
            - option "Sertifikat"
            - option "Piagam"
            - option "Kartu Anggota"
            - option "Surat Keterangan"
            - option "Lainnya"
          - button "Reset" [ref=e198] [cursor=pointer]
        - table [ref=e201]:
          - rowgroup [ref=e202]:
            - row "No. Dokumen Tipe Anggota Status Tanggal Aksi" [ref=e203]:
              - columnheader "No. Dokumen" [ref=e204]
              - columnheader "Tipe" [ref=e205]
              - columnheader "Anggota" [ref=e206]
              - columnheader "Status" [ref=e207]
              - columnheader "Tanggal" [ref=e208]
              - columnheader "Aksi" [ref=e209]
          - rowgroup [ref=e210]:
            - row [ref=e211]:
              - cell [ref=e212]
              - cell [ref=e214]
              - cell [ref=e216]
              - cell [ref=e218]
              - cell [ref=e220]
              - cell [ref=e222]
            - row [ref=e224]:
              - cell [ref=e225]
              - cell [ref=e227]
              - cell [ref=e229]
              - cell [ref=e231]
              - cell [ref=e233]
              - cell [ref=e235]
            - row [ref=e237]:
              - cell [ref=e238]
              - cell [ref=e240]
              - cell [ref=e242]
              - cell [ref=e244]
              - cell [ref=e246]
              - cell [ref=e248]
            - row [ref=e250]:
              - cell [ref=e251]
              - cell [ref=e253]
              - cell [ref=e255]
              - cell [ref=e257]
              - cell [ref=e259]
              - cell [ref=e261]
            - row [ref=e263]:
              - cell [ref=e264]
              - cell [ref=e266]
              - cell [ref=e268]
              - cell [ref=e270]
              - cell [ref=e272]
              - cell [ref=e274]
```

# Test source

```ts
  1  | import { test, expect } from '@playwright/test';
  2  | import { mockAuthWithAll } from './helpers';
  3  | 
  4  | test.describe('Dashboard Page Screenshots', () => {
  5  |   test.beforeEach(async ({ page }) => {
  6  |     await mockAuthWithAll(page);
  7  |   });
  8  | 
  9  |   const DASHBOARD_PAGES = [
  10 |     { path: '/members', name: 'members' },
  11 |     { path: '/candidates', name: 'candidates' },
  12 |     { path: '/dues', name: 'dues' },
  13 |     { path: '/letters', name: 'letters' },
  14 |     { path: '/reports', name: 'reports' },
  15 |     { path: '/activities', name: 'activities' },
  16 |     { path: '/trainings', name: 'trainings' },
  17 |     { path: '/users', name: 'users' },
  18 |     { path: '/documents', name: 'documents' },
  19 |     { path: '/claims', name: 'claims' },
  20 |     { path: '/examiners', name: 'examiners' },
  21 |     { path: '/assessments', name: 'assessments' },
  22 |     { path: '/registrations', name: 'registrations' },
  23 |     { path: '/org-documents', name: 'org-documents' },
  24 |     { path: '/payments', name: 'payments' },
  25 |     { path: '/graduations', name: 'graduations' },
  26 |     { path: '/notifications', name: 'notifications' },
  27 |     { path: '/notifications/report', name: 'notifications-report' },
  28 |     { path: '/scan-stats', name: 'scan-stats' },
  29 |     { path: '/gamification/manage', name: 'gamification-manage' },
  30 |     { path: '/gamification/rewards', name: 'gamification-rewards' },
  31 |     { path: '/gamification/scoreboard', name: 'gamification-scoreboard' },
  32 |     { path: '/gamification/admin', name: 'gamification-admin' },
  33 |     { path: '/gamification/settings', name: 'gamification-settings' },
  34 |     { path: '/gamification/report', name: 'gamification-report' },
  35 |     { path: '/settings', name: 'settings' },
  36 |     { path: '/settings/email', name: 'settings-email' },
  37 |   ];
  38 | 
  39 |   for (const { path, name } of DASHBOARD_PAGES) {
  40 |     test(`screenshot: ${name}`, async ({ page }) => {
  41 |       await page.goto(path);
  42 |       // Wait for page to stabilize (loading spinners disappear)
  43 |       await page.waitForLoadState('networkidle');
  44 |       // Wait a bit more for any animations to complete
  45 |       await page.waitForTimeout(500);
  46 | 
  47 |       // Verify the page loaded (no crash)
  48 |       await expect(page.locator('h1').first()).toBeVisible({ timeout: 10000 });
  49 | 
  50 |       // Take screenshot
  51 |       await page.screenshot({
  52 |         path: `e2e/screenshots/${name}.png`,
  53 |         fullPage: true,
  54 |       });
  55 |     });
  56 |   }
  57 | 
  58 |   test('screenshots all dashboard pages in sequence', async ({ page }) => {
  59 |     // This test verifies sidebar navigation works across all pages
  60 |     // Visit pages in order through the sidebar
  61 |     const sidebarLinks = [
  62 |       '/members',
  63 |       '/candidates',
  64 |       '/registrations',
  65 |       '/claims',
  66 |       '/trainings',
  67 |       '/graduations',
  68 |       '/activities',
  69 |       '/examiners',
  70 |       '/assessments',
  71 |       '/documents',
  72 |       '/org-documents',
  73 |       '/letters',
  74 |       '/dues',
  75 |       '/payments',
  76 |       '/notifications',
  77 |       '/reports',
  78 |       '/scan-stats',
  79 |       '/users',
  80 |       '/settings',
  81 |     ];
  82 | 
  83 |     for (const link of sidebarLinks) {
  84 |       await page.goto(link);
> 85 |       await page.waitForLoadState('networkidle');
     |                  ^ Error: page.waitForLoadState: Test timeout of 30000ms exceeded.
  86 |       await page.waitForTimeout(300);
  87 |       await expect(page.locator('h1').first()).toBeVisible({ timeout: 10000 });
  88 |       await page.screenshot({
  89 |         path: `e2e/screenshots/nav-${link.replace(/\//g, '-')}.png`,
  90 |         fullPage: true,
  91 |       });
  92 |     }
  93 |   });
  94 | });
  95 | 
```
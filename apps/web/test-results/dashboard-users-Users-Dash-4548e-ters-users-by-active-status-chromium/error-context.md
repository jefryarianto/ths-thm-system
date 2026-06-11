# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: dashboard-users.spec.ts >> Users Dashboard Page >> filters users by active status
- Location: e2e\dashboard-users.spec.ts:78:7

# Error details

```
Test timeout of 30000ms exceeded.
```

```
Error: locator.selectOption: Test timeout of 30000ms exceeded.
Call log:
  - waiting for locator('select').nth(1)

```

# Page snapshot

```yaml
- generic [ref=e2]: "{\"success\":true,\"data\":[{\"id\":\"1\",\"namaLengkap\":\"Admin Utama\",\"email\":\"admin@ths-thm.or.id\",\"role\":\"superadmin\",\"isActive\":true,\"createdAt\":\"2024-01-15T00:00:00Z\"},{\"id\":\"2\",\"namaLengkap\":\"Budi Santoso\",\"email\":\"budi@ths-thm.or.id\",\"role\":\"anggota\",\"isActive\":true,\"createdAt\":\"2024-02-20T00:00:00Z\"},{\"id\":\"3\",\"namaLengkap\":\"Siti Rahmawati\",\"email\":\"siti@ths-thm.or.id\",\"role\":\"penguji\",\"isActive\":true,\"createdAt\":\"2024-03-10T00:00:00Z\"},{\"id\":\"4\",\"namaLengkap\":\"Ahmad Hidayat\",\"email\":\"ahmad@ths-thm.or.id\",\"role\":\"admin_distrik\",\"isActive\":true,\"createdAt\":\"2024-03-15T00:00:00Z\"},{\"id\":\"5\",\"namaLengkap\":\"Dewi Sartika\",\"email\":\"dewi@ths-thm.or.id\",\"role\":\"anggota\",\"isActive\":true,\"createdAt\":\"2024-04-01T00:00:00Z\"},{\"id\":\"6\",\"namaLengkap\":\"Rudi Hermawan\",\"email\":\"rudi@ths-thm.or.id\",\"role\":\"anggota\",\"isActive\":false,\"createdAt\":\"2024-04-10T00:00:00Z\"},{\"id\":\"7\",\"namaLengkap\":\"Fitri Handayani\",\"email\":\"fitri@ths-thm.or.id\",\"role\":\"admin_kegiatan\",\"isActive\":true,\"createdAt\":\"2024-05-05T00:00:00Z\"},{\"id\":\"8\",\"namaLengkap\":\"Hendra Gunawan\",\"email\":\"hendra@ths-thm.or.id\",\"role\":\"anggota\",\"isActive\":true,\"createdAt\":\"2024-05-20T00:00:00Z\"},{\"id\":\"9\",\"namaLengkap\":\"Indah Permata\",\"email\":\"indah@ths-thm.or.id\",\"role\":\"admin_wilayah\",\"isActive\":true,\"createdAt\":\"2024-06-01T00:00:00Z\"},{\"id\":\"10\",\"namaLengkap\":\"Joko Widodo\",\"email\":\"joko@ths-thm.or.id\",\"role\":\"anggota\",\"isActive\":true,\"createdAt\":\"2024-06-15T00:00:00Z\"}],\"meta\":{\"total\":10,\"totalPages\":1,\"page\":1,\"limit\":10}}"
```

# Test source

```ts
  1   | import { test, expect } from '@playwright/test';
  2   | 
  3   | test.describe('Users Dashboard Page', () => {
  4   |   test.beforeEach(async ({ page }) => {
  5   |     // TODO: Add login step when auth flow is ready
  6   |     // For now, mock the API responses
  7   |     await page.route('**/users**', async (route) => {
  8   |       const url = new URL(route.request().url());
  9   |       const pageParam = url.searchParams.get('page') || '1';
  10  |       const search = url.searchParams.get('search') || '';
  11  |       const role = url.searchParams.get('role') || '';
  12  |       const isActive = url.searchParams.get('isActive') || '';
  13  | 
  14  |       let data = [
  15  |         { id: '1', namaLengkap: 'Admin Utama', email: 'admin@ths-thm.or.id', role: 'superadmin', isActive: true, createdAt: '2024-01-15T00:00:00Z' },
  16  |         { id: '2', namaLengkap: 'Budi Santoso', email: 'budi@ths-thm.or.id', role: 'anggota', isActive: true, createdAt: '2024-02-20T00:00:00Z' },
  17  |         { id: '3', namaLengkap: 'Siti Rahmawati', email: 'siti@ths-thm.or.id', role: 'penguji', isActive: true, createdAt: '2024-03-10T00:00:00Z' },
  18  |         { id: '4', namaLengkap: 'Ahmad Hidayat', email: 'ahmad@ths-thm.or.id', role: 'admin_distrik', isActive: true, createdAt: '2024-03-15T00:00:00Z' },
  19  |         { id: '5', namaLengkap: 'Dewi Sartika', email: 'dewi@ths-thm.or.id', role: 'anggota', isActive: true, createdAt: '2024-04-01T00:00:00Z' },
  20  |         { id: '6', namaLengkap: 'Rudi Hermawan', email: 'rudi@ths-thm.or.id', role: 'anggota', isActive: false, createdAt: '2024-04-10T00:00:00Z' },
  21  |         { id: '7', namaLengkap: 'Fitri Handayani', email: 'fitri@ths-thm.or.id', role: 'admin_kegiatan', isActive: true, createdAt: '2024-05-05T00:00:00Z' },
  22  |         { id: '8', namaLengkap: 'Hendra Gunawan', email: 'hendra@ths-thm.or.id', role: 'anggota', isActive: true, createdAt: '2024-05-20T00:00:00Z' },
  23  |         { id: '9', namaLengkap: 'Indah Permata', email: 'indah@ths-thm.or.id', role: 'admin_wilayah', isActive: true, createdAt: '2024-06-01T00:00:00Z' },
  24  |         { id: '10', namaLengkap: 'Joko Widodo', email: 'joko@ths-thm.or.id', role: 'anggota', isActive: true, createdAt: '2024-06-15T00:00:00Z' },
  25  |       ];
  26  | 
  27  |       if (search) {
  28  |         data = data.filter(u => u.namaLengkap.toLowerCase().includes(search.toLowerCase()));
  29  |       }
  30  |       if (role) {
  31  |         data = data.filter(u => u.role === role);
  32  |       }
  33  |       if (isActive === 'true') {
  34  |         data = data.filter(u => u.isActive);
  35  |       } else if (isActive === 'false') {
  36  |         data = data.filter(u => !u.isActive);
  37  |       }
  38  | 
  39  |       const pageNum = parseInt(pageParam);
  40  |       const limit = 10;
  41  |       const start = (pageNum - 1) * limit;
  42  |       const paginated = data.slice(start, start + limit);
  43  | 
  44  |       await route.fulfill({
  45  |         status: 200,
  46  |         contentType: 'application/json',
  47  |         body: JSON.stringify({
  48  |           success: true,
  49  |           data: paginated,
  50  |           meta: { total: data.length, totalPages: Math.ceil(data.length / limit), page: pageNum, limit },
  51  |         }),
  52  |       });
  53  |     });
  54  |   });
  55  | 
  56  |   test('shows user list with summary bar', async ({ page }) => {
  57  |     await page.goto('/users');
  58  |     await expect(page.locator('h1')).toHaveText('Manajemen User');
  59  |     await expect(page.getByText(/Total User/)).toBeVisible();
  60  |     await expect(page.getByText('Admin Utama')).toBeVisible();
  61  |     await expect(page.getByText('Budi Santoso')).toBeVisible();
  62  |   });
  63  | 
  64  |   test('filters users by role', async ({ page }) => {
  65  |     await page.goto('/users');
  66  |     // Wait for table to load
  67  |     await expect(page.getByText('Admin Utama')).toBeVisible();
  68  | 
  69  |     // Select "Anggota" role filter
  70  |     await page.selectOption('select:first-of-type', 'anggota');
  71  |     // Should show only anggota
  72  |     await expect(page.getByText('Budi Santoso')).toBeVisible();
  73  |     await expect(page.getByText('Dewi Sartika')).toBeVisible();
  74  |     // Should NOT show Admin Utama (superadmin)
  75  |     await expect(page.getByText('Admin Utama')).not.toBeVisible();
  76  |   });
  77  | 
  78  |   test('filters users by active status', async ({ page }) => {
  79  |     await page.goto('/users');
  80  |     await expect(page.getByText('Admin Utama')).toBeVisible();
  81  | 
  82  |     // Select "Nonaktif" filter (second select)
  83  |     const selects = page.locator('select');
> 84  |     await selects.nth(1).selectOption('inactive');
      |                          ^ Error: locator.selectOption: Test timeout of 30000ms exceeded.
  85  |     // Rudi Hermawan is inactive
  86  |     await expect(page.getByText('Rudi Hermawan')).toBeVisible();
  87  |     // Admin Utama is active, should not appear
  88  |     await expect(page.getByText('Admin Utama')).not.toBeVisible();
  89  |   });
  90  | 
  91  |   test('searches users by name', async ({ page }) => {
  92  |     await page.goto('/users');
  93  |     await expect(page.getByText('Admin Utama')).toBeVisible();
  94  | 
  95  |     // Type in search
  96  |     const searchInput = page.getByPlaceholder('Cari nama, email...');
  97  |     await searchInput.fill('Budi');
  98  |     // Should show matching results
  99  |     await expect(page.getByText('Budi Santoso')).toBeVisible();
  100 |     await expect(page.getByText('Admin Utama')).not.toBeVisible();
  101 |   });
  102 | 
  103 |   test('resets all filters', async ({ page }) => {
  104 |     await page.goto('/users');
  105 |     await expect(page.getByText('Admin Utama')).toBeVisible();
  106 | 
  107 |     // Apply filters
  108 |     await page.selectOption('select:first-of-type', 'anggota');
  109 |     await expect(page.getByText('Admin Utama')).not.toBeVisible();
  110 | 
  111 |     // Click Reset button
  112 |     await page.getByRole('button', { name: 'Reset' }).click();
  113 |     // All users should be visible again
  114 |     await expect(page.getByText('Admin Utama')).toBeVisible();
  115 |     await expect(page.getByText('Budi Santoso')).toBeVisible();
  116 |   });
  117 | 
  118 |   test('shows empty state when no results match', async ({ page }) => {
  119 |     await page.goto('/users');
  120 |     await expect(page.getByText('Admin Utama')).toBeVisible();
  121 | 
  122 |     // Search for non-existent user
  123 |     const searchInput = page.getByPlaceholder('Cari nama, email...');
  124 |     await searchInput.fill('Tidak Ada');
  125 |     await expect(page.getByText('Tidak ada user yang cocok dengan filter')).toBeVisible();
  126 |   });
  127 | });
  128 | 
```
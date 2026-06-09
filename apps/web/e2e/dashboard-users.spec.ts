import { test, expect } from '@playwright/test';

test.describe('Users Dashboard Page', () => {
  test.beforeEach(async ({ page }) => {
    // TODO: Add login step when auth flow is ready
    // For now, mock the API responses
    await page.route('**/users**', async (route) => {
      const url = new URL(route.request().url());
      const pageParam = url.searchParams.get('page') || '1';
      const search = url.searchParams.get('search') || '';
      const role = url.searchParams.get('role') || '';
      const isActive = url.searchParams.get('isActive') || '';

      let data = [
        { id: '1', namaLengkap: 'Admin Utama', email: 'admin@ths-thm.or.id', role: 'superadmin', isActive: true, createdAt: '2024-01-15T00:00:00Z' },
        { id: '2', namaLengkap: 'Budi Santoso', email: 'budi@ths-thm.or.id', role: 'anggota', isActive: true, createdAt: '2024-02-20T00:00:00Z' },
        { id: '3', namaLengkap: 'Siti Rahmawati', email: 'siti@ths-thm.or.id', role: 'penguji', isActive: true, createdAt: '2024-03-10T00:00:00Z' },
        { id: '4', namaLengkap: 'Ahmad Hidayat', email: 'ahmad@ths-thm.or.id', role: 'admin_distrik', isActive: true, createdAt: '2024-03-15T00:00:00Z' },
        { id: '5', namaLengkap: 'Dewi Sartika', email: 'dewi@ths-thm.or.id', role: 'anggota', isActive: true, createdAt: '2024-04-01T00:00:00Z' },
        { id: '6', namaLengkap: 'Rudi Hermawan', email: 'rudi@ths-thm.or.id', role: 'anggota', isActive: false, createdAt: '2024-04-10T00:00:00Z' },
        { id: '7', namaLengkap: 'Fitri Handayani', email: 'fitri@ths-thm.or.id', role: 'admin_kegiatan', isActive: true, createdAt: '2024-05-05T00:00:00Z' },
        { id: '8', namaLengkap: 'Hendra Gunawan', email: 'hendra@ths-thm.or.id', role: 'anggota', isActive: true, createdAt: '2024-05-20T00:00:00Z' },
        { id: '9', namaLengkap: 'Indah Permata', email: 'indah@ths-thm.or.id', role: 'admin_wilayah', isActive: true, createdAt: '2024-06-01T00:00:00Z' },
        { id: '10', namaLengkap: 'Joko Widodo', email: 'joko@ths-thm.or.id', role: 'anggota', isActive: true, createdAt: '2024-06-15T00:00:00Z' },
      ];

      if (search) {
        data = data.filter(u => u.namaLengkap.toLowerCase().includes(search.toLowerCase()));
      }
      if (role) {
        data = data.filter(u => u.role === role);
      }
      if (isActive === 'true') {
        data = data.filter(u => u.isActive);
      } else if (isActive === 'false') {
        data = data.filter(u => !u.isActive);
      }

      const pageNum = parseInt(pageParam);
      const limit = 10;
      const start = (pageNum - 1) * limit;
      const paginated = data.slice(start, start + limit);

      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          data: paginated,
          meta: { total: data.length, totalPages: Math.ceil(data.length / limit), page: pageNum, limit },
        }),
      });
    });
  });

  test('shows user list with summary bar', async ({ page }) => {
    await page.goto('/users');
    await expect(page.locator('h1')).toHaveText('Manajemen User');
    await expect(page.getByText(/Total User/)).toBeVisible();
    await expect(page.getByText('Admin Utama')).toBeVisible();
    await expect(page.getByText('Budi Santoso')).toBeVisible();
  });

  test('filters users by role', async ({ page }) => {
    await page.goto('/users');
    // Wait for table to load
    await expect(page.getByText('Admin Utama')).toBeVisible();

    // Select "Anggota" role filter
    await page.selectOption('select:first-of-type', 'anggota');
    // Should show only anggota
    await expect(page.getByText('Budi Santoso')).toBeVisible();
    await expect(page.getByText('Dewi Sartika')).toBeVisible();
    // Should NOT show Admin Utama (superadmin)
    await expect(page.getByText('Admin Utama')).not.toBeVisible();
  });

  test('filters users by active status', async ({ page }) => {
    await page.goto('/users');
    await expect(page.getByText('Admin Utama')).toBeVisible();

    // Select "Nonaktif" filter (second select)
    const selects = page.locator('select');
    await selects.nth(1).selectOption('inactive');
    // Rudi Hermawan is inactive
    await expect(page.getByText('Rudi Hermawan')).toBeVisible();
    // Admin Utama is active, should not appear
    await expect(page.getByText('Admin Utama')).not.toBeVisible();
  });

  test('searches users by name', async ({ page }) => {
    await page.goto('/users');
    await expect(page.getByText('Admin Utama')).toBeVisible();

    // Type in search
    const searchInput = page.getByPlaceholder('Cari nama, email...');
    await searchInput.fill('Budi');
    // Should show matching results
    await expect(page.getByText('Budi Santoso')).toBeVisible();
    await expect(page.getByText('Admin Utama')).not.toBeVisible();
  });

  test('resets all filters', async ({ page }) => {
    await page.goto('/users');
    await expect(page.getByText('Admin Utama')).toBeVisible();

    // Apply filters
    await page.selectOption('select:first-of-type', 'anggota');
    await expect(page.getByText('Admin Utama')).not.toBeVisible();

    // Click Reset button
    await page.getByRole('button', { name: 'Reset' }).click();
    // All users should be visible again
    await expect(page.getByText('Admin Utama')).toBeVisible();
    await expect(page.getByText('Budi Santoso')).toBeVisible();
  });

  test('shows empty state when no results match', async ({ page }) => {
    await page.goto('/users');
    await expect(page.getByText('Admin Utama')).toBeVisible();

    // Search for non-existent user
    const searchInput = page.getByPlaceholder('Cari nama, email...');
    await searchInput.fill('Tidak Ada');
    await expect(page.getByText('Tidak ada user yang cocok dengan filter')).toBeVisible();
  });
});

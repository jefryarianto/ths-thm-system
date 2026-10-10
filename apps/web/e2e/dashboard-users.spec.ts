import { test, expect, type Page } from '@playwright/test';
import { mockAuth } from './helpers';

// ── Mock struktur organisasi + scope aktor (cascade ranting pada form user) ──
const ORG_DISTRIKS = [{ id: 'd1', nama: 'Distrik Jakarta' }];
const ORG_WILAYAHS = [{ id: 'w1', nama: 'Wilayah Jakarta Pusat' }];
const ORG_RANTINGS = [{ id: 'r1', nama: 'Ranting Menteng' }];

const json = (payload: unknown) => ({
  status: 200,
  contentType: 'application/json',
  body: JSON.stringify(payload),
});

async function mockOrgStructure(page: Page) {
  await page.route('**/api/org-structure/distrik**', (route) =>
    route.fulfill(json({ success: true, data: ORG_DISTRIKS })),
  );
  await page.route('**/api/org-structure/wilayah**', (route) =>
    route.fulfill(json({ success: true, data: ORG_WILAYAHS })),
  );
  await page.route('**/api/org-structure/ranting**', (route) =>
    route.fulfill(json({ success: true, data: ORG_RANTINGS })),
  );
}

/** Aktor superadmin → cascade bebas (tanpa lock scope). */
async function mockSuperadminScope(page: Page) {
  await page.route('**/api/auth/scope', (route) =>
    route.fulfill(
      json({
        success: true,
        data: { role: 'superadmin', distrikId: null, wilayahId: null, rantingId: null },
      }),
    ),
  );
}

test.describe('Users Dashboard Page', () => {
  test.beforeEach(async ({ page }) => {
    await mockAuth(page, { mockMembers: true });
    // Mock the API responses (specific to API calls, not the page navigation)
    await page.route('**/api/users**', async (route) => {
      const url = new URL(route.request().url());
      const pageParam = url.searchParams.get('page') || '1';
      const search = url.searchParams.get('search') || '';
      const role = url.searchParams.get('role') || '';
      const isActive = url.searchParams.get('isActive') || '';

      let data = [
        {
          id: '1',
          namaLengkap: 'Admin Utama',
          email: 'admin@ths-thm.or.id',
          role: 'superadmin',
          isActive: true,
          createdAt: '2024-01-15T00:00:00Z',
        },
        {
          id: '2',
          namaLengkap: 'Budi Santoso',
          email: 'budi@ths-thm.or.id',
          role: 'anggota',
          isActive: true,
          createdAt: '2024-02-20T00:00:00Z',
        },
        {
          id: '3',
          namaLengkap: 'Siti Rahmawati',
          email: 'siti@ths-thm.or.id',
          role: 'penguji',
          isActive: true,
          createdAt: '2024-03-10T00:00:00Z',
        },
        {
          id: '4',
          namaLengkap: 'Ahmad Hidayat',
          email: 'ahmad@ths-thm.or.id',
          role: 'admin_distrik',
          isActive: true,
          createdAt: '2024-03-15T00:00:00Z',
        },
        {
          id: '5',
          namaLengkap: 'Dewi Sartika',
          email: 'dewi@ths-thm.or.id',
          role: 'anggota',
          isActive: true,
          createdAt: '2024-04-01T00:00:00Z',
        },
        {
          id: '6',
          namaLengkap: 'Rudi Hermawan',
          email: 'rudi@ths-thm.or.id',
          role: 'anggota',
          isActive: false,
          createdAt: '2024-04-10T00:00:00Z',
        },
        {
          id: '7',
          namaLengkap: 'Fitri Handayani',
          email: 'fitri@ths-thm.or.id',
          role: 'admin_kegiatan',
          isActive: true,
          createdAt: '2024-05-05T00:00:00Z',
        },
        {
          id: '8',
          namaLengkap: 'Hendra Gunawan',
          email: 'hendra@ths-thm.or.id',
          role: 'anggota',
          isActive: true,
          createdAt: '2024-05-20T00:00:00Z',
        },
        {
          id: '9',
          namaLengkap: 'Indah Permata',
          email: 'indah@ths-thm.or.id',
          role: 'admin_wilayah',
          isActive: true,
          createdAt: '2024-06-01T00:00:00Z',
        },
        {
          id: '10',
          namaLengkap: 'Joko Widodo',
          email: 'joko@ths-thm.or.id',
          role: 'anggota',
          isActive: true,
          createdAt: '2024-06-15T00:00:00Z',
        },
        {
          id: '20',
          namaLengkap: 'Admin Ranting Aktif',
          email: 'ranting-aktif@ths-thm.or.id',
          role: 'admin_ranting',
          isActive: true,
          createdAt: '2024-07-01T00:00:00Z',
          distrikId: 'd1',
          wilayahId: 'w1',
          rantingId: 'r1',
        },
        {
          id: '21',
          namaLengkap: 'Distrik Jadi Anggota',
          email: 'to-anggota@ths-thm.or.id',
          role: 'admin_distrik',
          isActive: true,
          createdAt: '2024-07-02T00:00:00Z',
          distrikId: 'd1',
          wilayahId: '',
          rantingId: '',
        },
      ];

      if (search) {
        data = data.filter((u) => u.namaLengkap.toLowerCase().includes(search.toLowerCase()));
      }
      if (role) {
        data = data.filter((u) => u.role === role);
      }
      if (isActive === 'true') {
        data = data.filter((u) => u.isActive);
      } else if (isActive === 'false') {
        data = data.filter((u) => !u.isActive);
      }

      const pageNum = parseInt(pageParam);
      const limit = 20;
      const start = (pageNum - 1) * limit;
      const paginated = data.slice(start, start + limit);

      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          data: paginated,
          meta: {
            total: data.length,
            totalPages: Math.ceil(data.length / limit),
            page: pageNum,
            limit,
          },
        }),
      });
    });
  });

  test('shows user list with summary bar', async ({ page }) => {
    await page.goto('/users');
    await expect(page.locator('h1').first()).toHaveText('Manajemen User');
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

  // ── Cascade Ranting pada form user ──────────────────────────────────────

  test('membuat user admin_distrik mengirim distrikId dari cascade', async ({ page }) => {
    await mockOrgStructure(page);
    await mockSuperadminScope(page);

    let createBody: Record<string, unknown> | null = null;
    await page.route('**/api/users', async (route) => {
      if (route.request().method() === 'POST') {
        createBody = route.request().postDataJSON() as Record<string, unknown>;
        await route.fulfill(
          json({ success: true, data: { id: 'new-user' }, message: 'User berhasil dibuat' }),
        );
        return;
      }
      await route.fallback();
    });

    await page.goto('/users');
    await page.getByRole('button', { name: /Tambah User/ }).click();

    // Cascade tersembunyi sampai role non-superadmin dipilih.
    await expect(page.getByTestId('org-cascade-distrik')).toHaveCount(0);

    await page.getByTestId('user-role').selectOption('admin_distrik');
    await page.getByTestId('org-cascade-distrik').selectOption('d1');

    await page.getByPlaceholder('Masukkan nama lengkap').fill('Admin Distrik Baru');
    await page.getByPlaceholder('contoh@email.com').fill('distrik@ths-thm.or.id');
    await page.getByRole('button', { name: 'Simpan' }).click();

    await expect.poll(() => createBody).not.toBeNull();
    expect(createBody).toMatchObject({ role: 'admin_distrik', distrikId: 'd1' });
  });

  test('menolak submit role non-superadmin tanpa ranting', async ({ page }) => {
    await mockOrgStructure(page);
    await mockSuperadminScope(page);

    let createBody: Record<string, unknown> | null = null;
    await page.route('**/api/users', async (route) => {
      if (route.request().method() === 'POST') {
        createBody = route.request().postDataJSON() as Record<string, unknown>;
        await route.fulfill(json({ success: true, data: { id: 'new-user' } }));
        return;
      }
      await route.fallback();
    });

    await page.goto('/users');
    await page.getByRole('button', { name: /Tambah User/ }).click();
    await page.getByTestId('user-role').selectOption('admin_ranting');
    await page.getByPlaceholder('Masukkan nama lengkap').fill('Admin Ranting Baru');
    await page.getByPlaceholder('contoh@email.com').fill('ranting@ths-thm.or.id');
    await page.getByRole('button', { name: 'Simpan' }).click();

    await expect(
      page.getByText('Ranting wajib dipilih untuk role admin_ranting'),
    ).toBeVisible();
    expect(createBody).toBeNull();
  });

  test('role superadmin menyembunyikan cascade ranting', async ({ page }) => {
    await mockOrgStructure(page);
    await mockSuperadminScope(page);

    await page.goto('/users');
    await page.getByRole('button', { name: /Tambah User/ }).click();

    await page.getByTestId('user-role').selectOption('admin_distrik');
    await expect(page.getByTestId('org-cascade-distrik')).toBeVisible();

    await page.getByTestId('user-role').selectOption('superadmin');
    await expect(page.getByTestId('org-cascade-distrik')).toHaveCount(0);
  });

  test('edit admin_ranting mempertahankan ranting ter-prefill (tidak ter-reset)', async ({
    page,
  }) => {
    await mockOrgStructure(page);
    await mockSuperadminScope(page);

    // User yang diedit sudah punya ranting r1 (wilayah w1, distrik d1).
    const EDIT_USER = {
      id: '20',
      namaLengkap: 'Admin Ranting Aktif',
      email: 'ranting-aktif@ths-thm.or.id',
      role: 'admin_ranting',
      isActive: true,
      createdAt: '2024-07-01T00:00:00Z',
      distrikId: 'd1',
      wilayahId: 'w1',
      rantingId: 'r1',
      ranting: {
        id: 'r1',
        nama: 'Ranting Menteng',
        wilayahId: 'w1',
        wilayah: { id: 'w1', nama: 'Wilayah Jakarta Pusat', distrikId: 'd1', distrik: { id: 'd1', nama: 'Distrik Jakarta' } },
      },
    };

    await page.route('**/api/users/20', (route) => route.fulfill(json({ success: true, data: EDIT_USER })));

    let patchBody: Record<string, unknown> | null = null;
    await page.route('**/api/users/20', async (route) => {
      if (route.request().method() === 'PATCH') {
        patchBody = route.request().postDataJSON() as Record<string, unknown>;
        await route.fulfill(json({ success: true, data: EDIT_USER, message: 'User berhasil diperbarui' }));
        return;
      }
      await route.fallback();
    });

    await page.goto('/users');
    // Buka menu aksi user yang diedit (aria-label = "Opsi <namaLengkap>").
    await page.getByRole('button', { name: 'Opsi Admin Ranting Aktif' }).click();
    await page.getByText('Edit User').click();

    // Cascade ranting ter-prefill dan TIDAK boleh ter-reset menjadi kosong.
    await expect(page.getByTestId('org-cascade-ranting')).toHaveValue('r1');
    await expect(page.getByTestId('org-cascade-wilayah')).toHaveValue('w1');
    await expect(page.getByTestId('org-cascade-distrik')).toHaveValue('d1');

    // Simpan tanpa menyentuh cascade → rantingId harus tetap terkirim.
    await page.getByRole('button', { name: 'Simpan' }).click();
    await expect.poll(() => patchBody).not.toBeNull();
    expect(patchBody).toMatchObject({ role: 'admin_ranting', rantingId: 'r1', wilayahId: 'w1', distrikId: 'd1' });
  });

  test('edit user menjadi anggota menerima ranting yang dipilih (tidak selalu invalid)', async ({
    page,
  }) => {
    await mockOrgStructure(page);
    await mockSuperadminScope(page);

    // User diedit ber-role admin_distrik (belum punya ranting).
    const EDIT_USER = {
      id: '21',
      namaLengkap: 'Distrik Jadi Anggota',
      email: 'to-anggota@ths-thm.or.id',
      role: 'admin_distrik',
      isActive: true,
      createdAt: '2024-07-02T00:00:00Z',
      distrikId: 'd1',
      wilayahId: '',
      rantingId: '',
      ranting: null,
    };

    await page.route('**/api/users/21', (route) =>
      route.fulfill(json({ success: true, data: EDIT_USER })),
    );
    let patchBody: Record<string, unknown> | null = null;
    await page.route('**/api/users/21', async (route) => {
      if (route.request().method() === 'PATCH') {
        patchBody = route.request().postDataJSON() as Record<string, unknown>;
        await route.fulfill(
          json({ success: true, data: EDIT_USER, message: 'User berhasil diperbarui' }),
        );
        return;
      }
      await route.fallback();
    });

    await page.goto('/users');
    await page.getByRole('button', { name: 'Opsi Distrik Jadi Anggota' }).click();
    await page.getByText('Edit User').click();

    // Ubah role menjadi anggota → cascade tetap tampil & ranting WAJIB
    // (backend ROLE_ORG_LEVEL.anggota = 'ranting').
    await page.getByTestId('user-role').selectOption('anggota');

    // Pilih ranting secara eksplisit.
    await page.getByTestId('org-cascade-distrik').selectOption('d1');
    await page.getByTestId('org-cascade-wilayah').selectOption('w1');
    await page.getByTestId('org-cascade-ranting').selectOption('r1');

    await page.getByRole('button', { name: 'Simpan' }).click();

    // Sebelum perbaikan: muncul "Ranting wajib dipilih untuk role anggota" dan
    // submit ditolak walaupun ranting sudah dipilih. Sekarang harus terkirim.
    await expect(page.getByText('Ranting wajib dipilih untuk role anggota')).toHaveCount(0);
    await expect.poll(() => patchBody).not.toBeNull();
    expect(patchBody).toMatchObject({ role: 'anggota', rantingId: 'r1' });
  });

  test('mengubah role TIDAK mereset penempatan organisasi yang sudah ter-prefill', async ({
    page,
  }) => {
    await mockOrgStructure(page);
    await mockSuperadminScope(page);

    // User admin_ranting sudah punya ranting r1 (wilayah w1, distrik d1).
    const EDIT_USER = {
      id: '20',
      namaLengkap: 'Admin Ranting Aktif',
      email: 'ranting-aktif@ths-thm.or.id',
      role: 'admin_ranting',
      isActive: true,
      createdAt: '2024-07-01T00:00:00Z',
      distrikId: 'd1',
      wilayahId: 'w1',
      rantingId: 'r1',
      ranting: {
        id: 'r1',
        nama: 'Ranting Menteng',
        wilayahId: 'w1',
        wilayah: {
          id: 'w1',
          nama: 'Wilayah Jakarta Pusat',
          distrikId: 'd1',
          distrik: { id: 'd1', nama: 'Distrik Jakarta' },
        },
      },
    };

    await page.route('**/api/users/20', (route) =>
      route.fulfill(json({ success: true, data: EDIT_USER })),
    );
    let patchBody: Record<string, unknown> | null = null;
    await page.route('**/api/users/20', async (route) => {
      if (route.request().method() === 'PATCH') {
        patchBody = route.request().postDataJSON() as Record<string, unknown>;
        await route.fulfill(
          json({ success: true, data: EDIT_USER, message: 'User berhasil diperbarui' }),
        );
        return;
      }
      await route.fallback();
    });

    await page.goto('/users');
    await page.getByRole('button', { name: 'Opsi Admin Ranting Aktif' }).click();
    await page.getByText('Edit User').click();

    // Prefill terisi.
    await expect(page.getByTestId('org-cascade-ranting')).toHaveValue('r1');

    // Ganti role → penempatan lama HARUS tetap (bukan ter-reset kosong).
    await page.getByTestId('user-role').selectOption('anggota');
    await expect(page.getByTestId('org-cascade-distrik')).toHaveValue('d1');
    await expect(page.getByTestId('org-cascade-wilayah')).toHaveValue('w1');
    await expect(page.getByTestId('org-cascade-ranting')).toHaveValue('r1');

    // Simpan → ranting lama tetap terkirim tanpa perlu memilih ulang.
    await page.getByRole('button', { name: 'Simpan' }).click();
    await expect.poll(() => patchBody).not.toBeNull();
    expect(patchBody).toMatchObject({ role: 'anggota', rantingId: 'r1', wilayahId: 'w1', distrikId: 'd1' });
  });
});

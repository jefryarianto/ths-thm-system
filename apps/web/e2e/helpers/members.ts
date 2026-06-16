import { Page } from '@playwright/test';

/**
 * Register mock endpoints for members and dashboard reports.
 */
export async function registerMembersMocks(page: Page) {
  // Dashboard report
  await page.route(/\/api\/reports\/dashboard/, async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        success: true,
        data: {
          totalMembers: 150,
          totalCandidates: 25,
          totalGraduated: 80,
          totalDuesCollected: 45000000,
          pendingValidasi: 5,
          incompleteData: 3,
          totalKegiatan: 12,
          totalLatihan: 45,
          totalKlaim: 7,
          totalDokumen: 200,
          totalPendaftaran: 30,
          totalUsers: 15,
          memberStatus: [
            { status: 'aktif', count: 120 },
            { status: 'nonaktif', count: 20 },
            { status: 'pindah', count: 5 },
            { status: 'keluar', count: 3 },
            { status: 'meninggal', count: 2 },
          ],
          monthlyDues: [
            { bulan: 'Jan', jumlah: 7500000, transaksi: 50 },
            { bulan: 'Feb', jumlah: 7200000, transaksi: 48 },
            { bulan: 'Mar', jumlah: 7800000, transaksi: 52 },
            { bulan: 'Apr', jumlah: 7400000, transaksi: 49 },
            { bulan: 'Mei', jumlah: 8000000, transaksi: 55 },
            { bulan: 'Jun', jumlah: 7600000, transaksi: 51 },
          ],
          recentNotifications: [],
          emailSummary: null,
        },
      }),
    });
  });

  // Members list (paginated)
  await page.route(/\/api\/members(\?|$)/, async (route) => {
    const url = new URL(route.request().url());
    const pageParam = parseInt(url.searchParams.get('page') || '1');
    const limit = 15;
    const allMembers = Array.from({ length: 150 }, (_, i) => ({
      id: `member-${i + 1}`,
      nomorAnggota: `THS-${String(i + 1).padStart(5, '0')}`,
      namaLengkap: `Anggota ${i + 1}`,
      jenisKelamin: i % 2 === 0 ? 'L' : 'P',
      noHp: `0812${String(i).padStart(8, '0')}`,
      email: `anggota${i + 1}@email.com`,
      statusKeanggotaan: i < 120 ? 'aktif' : 'nonaktif',
      statusData: 'complete',
      statusValidasi: 'approved',
      createdAt: new Date(2024, 0, i + 1).toISOString(),
      ranting: { nama: `Ranting ${(i % 10) + 1}` },
    }));
    const start = (pageParam - 1) * limit;
    const paginated = allMembers.slice(start, start + limit);
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        success: true,
        data: paginated,
        meta: {
          total: allMembers.length,
          totalPages: Math.ceil(allMembers.length / limit),
          page: pageParam,
          limit,
        },
      }),
    });
  });
}

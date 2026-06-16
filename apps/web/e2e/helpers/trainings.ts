import { Page } from '@playwright/test';

/**
 * Register mock endpoints for trainings.
 */
export async function registerTrainingsMocks(page: Page) {
  await page.route(/\/api\/trainings(\?|$)/, async (route) => {
    const url = new URL(route.request().url());
    const pageParam = parseInt(url.searchParams.get('page') || '1');
    const limit = 10;
    const allTrainings = Array.from({ length: 45 }, (_, i) => ({
      id: `training-${i + 1}`,
      hariTanggal: new Date(2024, 5, i + 1).toISOString(),
      ranting: { nama: `Ranting ${(i % 10) + 1}` },
      jenisMateri: ['teknik_dasar', 'kata', 'kumite', 'fisik', 'teori'][i % 5],
      lokasi: `Lokasi ${(i % 5) + 1}`,
      pelatih: { namaLengkap: `Pelatih ${(i % 8) + 1}` },
    }));
    const start = (pageParam - 1) * limit;
    const paginated = allTrainings.slice(start, start + limit);
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        success: true,
        data: paginated,
        meta: {
          total: allTrainings.length,
          totalPages: Math.ceil(allTrainings.length / limit),
          page: pageParam,
          limit,
        },
      }),
    });
  });
}

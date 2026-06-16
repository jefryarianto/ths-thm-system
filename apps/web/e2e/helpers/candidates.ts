import { Page } from '@playwright/test';

const MOCK_CANDIDATES = Array.from({ length: 25 }, (_, i) => ({
  id: `candidate-${i + 1}`,
  namaLengkap: `Calon Anggota ${i + 1}`,
  jenisKelamin: i % 2 === 0 ? 'L' : 'P',
  noHp: `0812${String(i).padStart(8, '0')}`,
  email: `calon${i + 1}@email.com`,
  status: ['diusulkan', 'mengikuti_pendadaran', 'lulus', 'gagal'][i % 4],
}));

/**
 * Register mock endpoints for the candidates list page.
 * Supports pagination (?page=, &limit=10) and search (?search=).
 */
export async function registerCandidatesMocks(page: Page) {
  await page.route(/\/api\/candidates(\?|$)/, async (route) => {
    const url = new URL(route.request().url());
    const pageParam = parseInt(url.searchParams.get('page') || '1');
    const search = url.searchParams.get('search') || '';
    const limit = 10;

    let filtered = MOCK_CANDIDATES;
    if (search) {
      filtered = MOCK_CANDIDATES.filter((c) =>
        c.namaLengkap.toLowerCase().includes(search.toLowerCase()),
      );
    }

    const start = (pageParam - 1) * limit;
    const paginated = filtered.slice(start, start + limit);

    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        success: true,
        data: paginated,
        meta: {
          total: filtered.length,
          totalPages: Math.ceil(filtered.length / limit),
          page: pageParam,
          limit,
        },
      }),
    });
  });
}

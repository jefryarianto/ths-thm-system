import { Page } from '@playwright/test';

/**
 * Register mock endpoints for gamification scoreboard.
 */
export async function registerGamificationMocks(page: Page) {
  // Stats overview
  await page.route(/\/api\/gamification\/stats/, async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        success: true,
        data: { totalMembers: 120, totalPointsAwarded: 45000, badgesAwarded: 85, totalEvents: 320 },
      }),
    });
  });

  // Points distribution (pie chart)
  await page.route(/\/api\/gamification\/admin\/points-distribution/, async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        success: true,
        data: [
          { level: 'Bronze', icon: '🥉', color: '#cd7f32', count: 45 },
          { level: 'Silver', icon: '🥈', color: '#c0c0c0', count: 30 },
          { level: 'Gold', icon: '🥇', color: '#ffd700', count: 18 },
          { level: 'Platinum', icon: '💎', color: '#e5e4e2', count: 8 },
          { level: 'Diamond', icon: '💠', color: '#b9f2ff', count: 4 },
        ],
      }),
    });
  });

  // Points report (top earners table)
  await page.route(/\/api\/gamification\/admin\/points-report/, async (route) => {
    const url = new URL(route.request().url());
    const period = url.searchParams.get('period') || 'weekly';
    const reportData = Array.from({ length: 10 }, (_, i) => ({
      rank: i + 1,
      namaLengkap: `Peserta ${i + 1}`,
      points: Math.round(10000 - i * 800),
      level: [
        'Diamond',
        'Platinum',
        'Gold',
        'Gold',
        'Silver',
        'Silver',
        'Bronze',
        'Bronze',
        'Bronze',
        'Bronze',
      ][i],
      events: Math.round(50 - i * 4),
      lastActive: new Date(2024, 5, 15 - i).toISOString(),
    }));
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        success: true,
        data:
          period === 'weekly'
            ? reportData
            : reportData.map((r) => ({ ...r, points: r.points * 4 })),
      }),
    });
  });

  // Badges list (gamification main page)
  await page.route(/\/api\/gamification\/badges/, async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        success: true,
        data: Array.from({ length: 8 }, (_, i) => ({
          id: `badge-${i + 1}`,
          name: [
            'Rajin Latihan',
            'Iuran Tepat Waktu',
            'Prestasi Gemilang',
            'Aktif Organisasi',
            'Pendadaran Sempurna',
            'Mentor Terbaik',
            'Dedikasi Tinggi',
            'Anggota Teladan',
          ][i],
          description: `Badge untuk anggota yang mencapai prestasi ${i + 1}`,
          icon: ['🥋', '💰', '🏆', '👥', '🎓', '🌟', '💪', '⭐'][i],
          threshold: (i + 1) * 10,
          category: [
            'latihan',
            'iuran',
            'prestasi',
            'keaktifan',
            'latihan',
            'keaktifan',
            'prestasi',
            'keaktifan',
          ][i],
        })),
      }),
    });
  });

  // Leaderboard (gamification main page)
  await page.route(/\/api\/gamification\/leaderboard/, async (route) => {
    const url = new URL(route.request().url());
    const skip = parseInt(url.searchParams.get('skip') || '0', 10);
    const limit = parseInt(url.searchParams.get('limit') || '10', 10);
    const data = Array.from({ length: limit }, (_, i) => ({
      rank: skip + i + 1,
      anggotaId: `anggota-${skip + i + 1}`,
      namaLengkap: `Anggota ${skip + i + 1}`,
      points: Math.round(10000 - (skip + i) * 750),
      badges: Math.max(0, 8 - Math.floor((skip + i) / 2)),
      streaks: {
        latihan: Math.max(1, 10 - Math.floor((skip + i) / 3)),
        iuran: Math.max(1, 8 - Math.floor((skip + i) / 4)),
      },
    }));
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        success: true,
        data,
      }),
    });
  });

  // Events feed (gamification main page)
  await page.route(/\/api\/gamification\/events/, async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        success: true,
        data: Array.from({ length: 5 }, (_, i) => ({
          id: `event-${i + 1}`,
          anggotaId: `anggota-${i + 1}`,
          namaLengkap: `Anggota ${i + 1}`,
          type: ['training', 'dues', 'badge', 'achievement', 'training'][i],
          points: (i + 1) * 50,
          description: `Mendapatkan ${(i + 1) * 50} poin dari aktivitas ${['latihan', 'iuran', 'badge', 'prestasi', 'latihan'][i]}`,
          timestamp: new Date(2025, 0, 15 - i).toISOString(),
        })),
      }),
    });
  });

  // Org structure (for cascading org filter)
  await page.route(/\/api\/gamification\/org-structure/, async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        success: true,
        data: [
          {
            id: 'distrik-1',
            nama: 'Distrik Jakarta',
            wilayahs: [
              {
                id: 'wilayah-1',
                nama: 'Jakarta Pusat',
                rantings: [
                  { id: 'ranting-1', nama: 'Menteng' },
                  { id: 'ranting-2', nama: 'Tanah Abang' },
                ],
              },
            ],
          },
          { id: 'distrik-2', nama: 'Distrik Bandung', wilayahs: [] },
        ],
      }),
    });
  });

  // Scoreboard breakdown (module comparison)
  await page.route(/\/api\/gamification\/scoreboard\/breakdown/, async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        success: true,
        data: [
          { module: 'training', label: 'Latihan', points: 18000, percentage: 40, color: '#3b82f6' },
          { module: 'dues', label: 'Iuran', points: 13500, percentage: 30, color: '#22c55e' },
          { module: 'badge', label: 'Badge', points: 9000, percentage: 20, color: '#eab308' },
          {
            module: 'achievement',
            label: 'Prestasi',
            points: 4500,
            percentage: 10,
            color: '#a855f7',
          },
        ],
      }),
    });
  });
}

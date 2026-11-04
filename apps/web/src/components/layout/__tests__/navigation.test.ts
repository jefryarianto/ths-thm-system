import { describe, it, expect } from 'vitest';
import { existsSync } from 'node:fs';
import path from 'node:path';
import {
  menuGroups,
  menuItems,
  filterVisibleGroups,
  getPageTitle,
  getModuleKey,
  DEFAULT_OPEN_GROUPS,
} from '../navigation';
import type { Role } from '@/types';

/**
 * Regression guard untuk Global Navigation (Tahap 2):
 * memastikan SEMUA menu & route existing tetap ada, tidak duplikat,
 * dan logika filter role tidak berubah.
 */

/**
 * Cari folder route group `app/(dashboard)` mulai dari cwd (bisa
 * `apps/web` saat `pnpm --filter web test`, atau root repo).
 */
function findDashboardAppRoot(): string {
  let dir = process.cwd();
  for (let i = 0; i < 6; i++) {
    const candidate = path.join(dir, 'app', '(dashboard)');
    if (existsSync(candidate)) return candidate;
    dir = path.dirname(dir);
  }
  throw new Error(`app/(dashboard) tidak ditemukan dari ${process.cwd()}`);
}

/** Seluruh href yang harus ada di navigasi terstruktur. */
const EXPECTED_HREFS = [
  '/dashboard',
  '/galeri/upload',
  '/galeri/manage',
  '/activities',
  '/calendar',
  '/forum',
  '/notifications',
  '/org-chart',
  '/documents',
  '/dues',
  '/content/berita',
  '/reports',
  '/members',
  '/members/mutasi',
  '/candidates',
  '/registrations',
  '/claims',
  '/letters',
  '/trainings',
  '/graduations',
  '/examiners',
  '/assessments',
  '/approvals',
  '/org-documents',
  '/settings/jabatan',
  '/settings/periode',
  '/settings/kepengurusan',
  '/settings/org-chart-editor',
  '/payments',
  '/users',
  '/monitoring',
  '/monitoring/alerts',
  '/monitoring/incidents',
  '/ws-monitor',
  '/admin/queues',
  '/settings',
  '/settings/menu-permissions',
  '/settings/email',
  '/settings/penandatangan',
  '/settings/kartu',
  '/settings/dokumen',
  '/settings/fcm-test',
  '/settings/sessions',
  '/settings/backup',
  '/gamification',
  '/gamification/admin',
  '/gamification/scoreboard',
  '/gamification/report',
  '/scan-stats',
  '/content/sejarah',
  '/content/organisasi',
];

const LEVELS: Record<Role, number> = {
  superadmin: 8,
  admin_nasional: 7,
  admin_distrik: 6,
  admin_wilayah: 5,
  admin_ranting: 4,
  admin_kegiatan: 3,
  penguji: 2,
  anggota: 1,
};

const ADMIN_ROLES: Role[] = [
  'superadmin',
  'admin_nasional',
  'admin_distrik',
  'admin_wilayah',
  'admin_ranting',
];

function optionsFor(role: Role) {
  return {
    isAdmin: ADMIN_ROLES.includes(role),
    hasMinRole: (min: Role) => LEVELS[role] >= LEVELS[min],
  };
}

const ALL_ROLES: Role[] = [
  'superadmin',
  'admin_nasional',
  'admin_distrik',
  'admin_wilayah',
  'admin_ranting',
  'admin_kegiatan',
  'penguji',
  'anggota',
];

describe('navigation config', () => {
  it('memuat seluruh menu & route existing', () => {
    const hrefs = menuItems.map((i) => i.href);
    for (const expected of EXPECTED_HREFS) {
      expect(hrefs).toContain(expected);
    }
  });

  it('tidak ada href duplikat', () => {
    const hrefs = menuItems.map((i) => i.href);
    expect(new Set(hrefs).size).toBe(hrefs.length);
  });

  it('setiap menu menunjuk ke page.tsx yang benar-benar ada', () => {
    // Menu yang mengarah ke route tidak ada = tautan mati bagi semua role.
    const appRoot = findDashboardAppRoot();
    const missing = menuItems
      .filter((item) => !existsSync(path.join(appRoot, `${item.href}/page.tsx`)))
      .map((item) => item.href);
    expect(missing, `menu tanpa halaman: ${missing.join(', ')}`).toEqual([]);
  });

  it('setiap item punya label dan icon', () => {
    for (const item of menuItems) {
      expect(item.label.length).toBeGreaterThan(0);
      expect(item.icon).toBeTruthy();
    }
  });

  it('8 grup navigasi dengan label unik', () => {
    const labels = menuGroups.map((g) => g.label);
    expect(labels).toHaveLength(8);
    expect(new Set(labels).size).toBe(8);
  });

  it('DEFAULT_OPEN_GROUPS mencakup seluruh 8 role', () => {
    for (const role of ALL_ROLES) {
      expect(Array.isArray(DEFAULT_OPEN_GROUPS[role])).toBe(true);
      expect(DEFAULT_OPEN_GROUPS[role].length).toBeGreaterThan(0);
    }
  });
});

describe('filterVisibleGroups', () => {
  it('superadmin melihat semua grup, termasuk item adminOnly', () => {
    const groups = filterVisibleGroups(menuGroups, optionsFor('superadmin'));
    const hrefs = groups.flatMap((g) => g.items.map((i) => i.href));
    expect(groups).toHaveLength(8);
    expect(hrefs).toContain('/admin/queues');
    expect(hrefs).toContain('/ws-monitor');
    expect(hrefs).toContain('/users');
    expect(hrefs).toContain('/settings');
    // Total item berubah karena audit-logs ditambahkan, dll.
    // 52 awal - 0 (item tetap, hanya grup berkurang).
    // Audit log ditambahkan (1), FCM test tetap ada.
    // 52 + 1 (audit-logs) = 53.
    expect(hrefs).toHaveLength(54);
  });

  it('admin_nasional melihat template KTA dan dokumen tetapi tidak melihat monitoring/sessions', () => {
    const groups = filterVisibleGroups(menuGroups, optionsFor('admin_nasional'));
    const hrefs = groups.flatMap((g) => g.items.map((i) => i.href));
    expect(hrefs).toContain('/settings/kartu');
    expect(hrefs).toContain('/settings/dokumen');
    // /settings/periode memakai /periode yang CRUD-nya hanya superadmin;
    // admin_nasional mengelola periode lewat kartu di /settings.
    expect(hrefs).not.toContain('/settings/periode');
    expect(hrefs).not.toContain('/monitoring');
    expect(hrefs).not.toContain('/settings/sessions');
    expect(hrefs).not.toContain('/settings/backup');
  });

  it('admin_distrik tidak melihat template kartu/dokumen tingkat nasional', () => {
    const groups = filterVisibleGroups(menuGroups, optionsFor('admin_distrik'));
    const hrefs = groups.flatMap((g) => g.items.map((i) => i.href));
    expect(hrefs).not.toContain('/settings/kartu');
    expect(hrefs).not.toContain('/settings/dokumen');
  });

  it('admin_ranting tidak melihat Monitoring', () => {
    const groups = filterVisibleGroups(menuGroups, optionsFor('admin_ranting'));
    const hrefs = groups.flatMap((g) => g.items.map((i) => i.href));
    expect(hrefs).not.toContain('/monitoring');
  });

  it('anggota tidak melihat item adminOnly maupun menu di atas role-nya', () => {
    const groups = filterVisibleGroups(menuGroups, optionsFor('anggota'));
    const hrefs = groups.flatMap((g) => g.items.map((i) => i.href));
    expect(hrefs).not.toContain('/admin/queues');
    expect(hrefs).not.toContain('/ws-monitor');
    expect(hrefs).not.toContain('/users');
    expect(hrefs).not.toContain('/dashboard');
    // Menu yang boleh untuk anggota tetap ada
    expect(hrefs).toContain('/activities');
    expect(hrefs).toContain('/documents');
    expect(hrefs).toContain('/dues');
    expect(hrefs).toContain('/forum');
  });

  it('tidak ada grup kosong (label tanpa item) di semua role', () => {
    for (const role of ALL_ROLES) {
      const groups = filterVisibleGroups(menuGroups, optionsFor(role));
      for (const group of groups) {
        expect(group.items.length).toBeGreaterThan(0);
      }
    }
  });

  it('admin_kegiatan melihat Pendadaran & Penguji sesuai alur', () => {
    const groups = filterVisibleGroups(menuGroups, optionsFor('admin_kegiatan'));
    const hrefs = groups.flatMap((g) => g.items.map((i) => i.href));
    expect(hrefs).toContain('/graduations');
    expect(hrefs).toContain('/examiners');
    expect(hrefs).toContain('/candidates');
    expect(hrefs).not.toContain('/members');
    // Halaman scoreboard memakai endpoint gamifikasi khusus admin.
    expect(hrefs).not.toContain('/gamification/scoreboard');
  });
});

describe('filterVisibleGroups + menuOverrides (tabel role-menu-permissions)', () => {
  it('override false menyembunyikan menu yang lolos seluruh gerbang kode', () => {
    // superadmin melihat /forum pada kondisi normal (terbukti di test atas),
    // namun superadmin tidak di-fetch — pakai admin_distrik yang juga lolos.
    const groups = filterVisibleGroups(menuGroups, {
      ...optionsFor('admin_distrik'),
      menuOverrides: { forum: false },
    });
    const hrefs = groups.flatMap((g) => g.items.map((i) => i.href));
    expect(hrefs).not.toContain('/forum');
    // Menu lain tidak terpengaruh.
    expect(hrefs).toContain('/members');
  });

  it('override true TIDAK bisa menampilkan menu yang gugur gerbang kode (keamanan)', () => {
    // anggota: /users & /monitoring butuh role di atasnya — baris DB
    // `true` tidak boleh menaikkan hak di atas aturan di kode.
    const groups = filterVisibleGroups(menuGroups, {
      ...optionsFor('anggota'),
      menuOverrides: { users: true, monitoring: true, wsMonitor: true },
    });
    const hrefs = groups.flatMap((g) => g.items.map((i) => i.href));
    expect(hrefs).not.toContain('/users');
    expect(hrefs).not.toContain('/monitoring');
    expect(hrefs).not.toContain('/ws-monitor');
    // Menu yang memang berhak tetap ada.
    expect(hrefs).toContain('/forum');
  });

  it('override null / record kosong = perilaku identik tanpa override', () => {
    const baseline = filterVisibleGroups(menuGroups, optionsFor('admin_ranting'));
    const withNull = filterVisibleGroups(menuGroups, {
      ...optionsFor('admin_ranting'),
      menuOverrides: null,
    });
    const withEmpty = filterVisibleGroups(menuGroups, {
      ...optionsFor('admin_ranting'),
      menuOverrides: {},
    });
    expect(withNull).toEqual(baseline);
    expect(withEmpty).toEqual(baseline);
  });

  it('kunci override diturunkan dari href (menuKeyForHref) — bukan label', () => {
    // /settings/menu-permissions → settingsMenuPermissions
    const groups = filterVisibleGroups(menuGroups, {
      ...optionsFor('superadmin'),
      menuOverrides: { settingsMenuPermissions: false },
    });
    const hrefs = groups.flatMap((g) => g.items.map((i) => i.href));
    expect(hrefs).not.toContain('/settings/menu-permissions');
    expect(hrefs).toContain('/settings');
  });
});

describe('getPageTitle', () => {
  it('mengembalikan label menu untuk pathname yang cocok', () => {
    expect(getPageTitle('/dashboard')).toBe('Dashboard');
    expect(getPageTitle('/members')).toBe('Anggota');
    expect(getPageTitle('/gamification/scoreboard')).toBe('Scoreboard');
    expect(getPageTitle('/admin/queues')).toBe('Antrean');
  });

  it('fallback ke Dashboard untuk pathname tak dikenal', () => {
    expect(getPageTitle('/tidak-ada')).toBe('Dashboard');
    expect(getPageTitle(null)).toBe('Dashboard');
  });
});

describe('getModuleKey', () => {
  it('memetakan modul khusus dengan benar', () => {
    expect(getModuleKey('/admin/queues')).toBe('queues');
    expect(getModuleKey('/ws-monitor')).toBe('wsMonitor');
    expect(getModuleKey('/org-chart')).toBe('org-chart');
    expect(getModuleKey('/settings/email')).toBe('settings');
    expect(getModuleKey('/members')).toBe('members');
  });
});

import { describe, it, expect } from 'vitest';
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

/** Seluruh href yang harus tetap ada (hasil audit Tahap 0). */
const EXPECTED_HREFS = [
  '/dashboard', '/members', '/members/mutasi', '/candidates', '/registrations', '/claims',
  '/trainings', '/graduations', '/examiners', '/assessments',
  '/activities', '/calendar', '/approvals',
  '/org-chart', '/org-documents', '/settings/jabatan', '/settings/periode',
  '/settings/kepengurusan', '/settings/org-chart-editor',
  '/documents', '/letters', '/dues', '/payments',
  '/gamification', '/gamification/admin', '/gamification/scoreboard',
  '/gamification/report', '/gamification/settings',
  '/forum', '/notifications', '/notifications/report',
  '/reports', '/scan-stats',
  '/content/berita', '/content/sejarah', '/content/organisasi',
  '/users', '/monitoring', '/monitoring/alerts', '/monitoring/incidents',
  '/settings', '/settings#autentikasi', '/settings/email', '/settings/email/logs',
  '/settings/penandatangan', '/settings/kartu', '/settings/dokumen',
  '/admin/queues', '/settings/fcm-test', '/settings/sessions', '/settings/backup',
  '/ws-monitor',
];

const LEVELS: Record<Role, number> = {
  superadmin: 7,
  admin_distrik: 6,
  admin_wilayah: 5,
  admin_ranting: 4,
  admin_kegiatan: 3,
  penguji: 2,
  anggota: 1,
};

const ADMIN_ROLES: Role[] = ['superadmin', 'admin_distrik', 'admin_wilayah', 'admin_ranting'];

function optionsFor(role: Role) {
  return {
    isAdmin: ADMIN_ROLES.includes(role),
    hasMinRole: (min: Role) => LEVELS[role] >= LEVELS[min],
  };
}

const ALL_ROLES: Role[] = [
  'superadmin', 'admin_distrik', 'admin_wilayah', 'admin_ranting',
  'admin_kegiatan', 'penguji', 'anggota',
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

  it('setiap item punya label dan icon', () => {
    for (const item of menuItems) {
      expect(item.label.length).toBeGreaterThan(0);
      expect(item.icon).toBeTruthy();
    }
  });

  it('12 grup navigasi dengan label unik', () => {
    const labels = menuGroups.map((g) => g.label);
    expect(labels).toHaveLength(12);
    expect(new Set(labels).size).toBe(12);
  });

  it('DEFAULT_OPEN_GROUPS mencakup seluruh 7 role', () => {
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
    expect(groups).toHaveLength(12);
    expect(hrefs).toContain('/admin/queues');
    expect(hrefs).toContain('/ws-monitor');
    expect(hrefs).toContain('/users');
    expect(hrefs).toContain('/settings');
    expect(hrefs).toHaveLength(52);
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
  });
});

describe('getPageTitle', () => {
  it('mengembalikan label menu untuk pathname yang cocok', () => {
    expect(getPageTitle('/dashboard')).toBe('Dashboard');
    expect(getPageTitle('/members')).toBe('Anggota');
    expect(getPageTitle('/gamification/scoreboard')).toBe('Dasbor Gamifikasi');
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

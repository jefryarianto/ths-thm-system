import { describe, it, expect } from 'vitest';
import {
  MENU_REGISTRY,
  MENU_KEYS,
  MENU_BY_KEY,
  menuKeyForHref,
  getMenuLabel,
  ROLE_LEVEL,
} from '@ths-thm/shared-types';
import { menuGroups, filterVisibleGroups, getModuleKey } from '../navigation';
import { MODULE_PERMISSIONS } from '@/components/auth/can';
import type { Role } from '@/types';

/**
 * Guard anti-drift: `MENU_REGISTRY` (shared-types) adalah source of truth untuk
 * menuKey/label/minRole yang dipakai seed DB, API menuKeys, dan label matriks.
 * Sumber fisiknya adalah `menuGroups` di navigation.ts.
 *
 * Kalau test ini gagal berarti seseorang menambah/mengubah/menghapus menu di
 * navigasi tanpa menyinkronkan registry (atau sebaliknya) — perbaiki DUA-DUANYA,
 * jangan test-nya.
 */

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

const ALL_ROLES: Role[] = [
  'superadmin',
  'admin_distrik',
  'admin_wilayah',
  'admin_ranting',
  'admin_kegiatan',
  'penguji',
  'anggota',
];

/** Seluruh item navigasi, flat, untuk perbandingan satu-lawan-satu. */
const navItems = menuGroups.flatMap((g) => g.items);

describe('MENU_REGISTRY sinkron dengan navigation.ts', () => {
  it('berisi jumlah item yang sama dengan navigasi', () => {
    expect(MENU_REGISTRY).toHaveLength(navItems.length);
  });

  it('setiap item navigasi punya entry registry dengan href & label identik', () => {
    for (const item of navItems) {
      const key = menuKeyForHref(item.href);
      const entry = MENU_BY_KEY[key];
      expect(entry, `registry tidak punya entry untuk ${item.href}`).toBeDefined();
      expect(entry.href, `href beda untuk ${key}`).toBe(item.href);
      expect(entry.label, `label beda untuk ${key} (${entry.label} vs ${item.label})`).toBe(
        item.label,
      );
    }
  });

  it('tidak ada entry registry yang yatim (tidak ada di navigasi)', () => {
    const navKeys = new Set(navItems.map((i) => menuKeyForHref(i.href)));
    for (const entry of MENU_REGISTRY) {
      expect(navKeys.has(entry.menuKey), `entry yatim: ${entry.menuKey}`).toBe(true);
    }
  });

  it('menuKey unik dan konsisten dengan turunan href-nya', () => {
    expect(new Set(MENU_KEYS).size).toBe(MENU_KEYS.length);
    for (const entry of MENU_REGISTRY) {
      expect(menuKeyForHref(entry.href)).toBe(entry.menuKey);
    }
  });

  it('tidak ada href duplikat antar entry', () => {
    const hrefs = MENU_REGISTRY.map((m) => m.href);
    expect(new Set(hrefs).size).toBe(hrefs.length);
  });

  it('ROLE_LEVEL identik dengan hierarki yang dipakai filter sidebar', () => {
    // Menjaga supaya seed DB tidak pernah memakai urutan ROLE_HIERARCHY API
    // (yang berbeda — admin_kegiatan vs admin_ranting tertukar).
    for (const role of ALL_ROLES) {
      expect(ROLE_LEVEL[role], `ROLE_LEVEL[${role}]`).toBe(LEVELS[role]);
    }
  });
});

describe('minRole registry = visibilitas sidebar hari ini', () => {
  /**
   * `filterVisibleGroups` menerapkan tiga gerbang sebagai AND:
   * adminOnly, item.minRole, dan MODULE_PERMISSIONS[module].view.
   * Registry menyimpan max() ketiganya, jadi hasilnya harus identik.
   */
  function sidebarSees(role: Role, href: string): boolean {
    const groups = filterVisibleGroups(menuGroups, {
      isAdmin: ADMIN_ROLES.includes(role),
      hasMinRole: (min: Role) => LEVELS[role] >= LEVELS[min],
    });
    return groups.some((g) => g.items.some((i) => i.href === href));
  }

  it('seed default (role >= minRole) identik dengan sidebar untuk semua role x menu', () => {
    const mismatches: string[] = [];

    for (const entry of MENU_REGISTRY) {
      for (const role of ALL_ROLES) {
        const seeded = ROLE_LEVEL[role] >= ROLE_LEVEL[entry.minRole];
        const actual = sidebarSees(role, entry.href);
        if (seeded !== actual) {
          mismatches.push(
            `${entry.menuKey} (${entry.href}) minRole=${entry.minRole}: seed=${seeded} sidebar=${actual}`,
          );
        }
      }
    }

    expect(mismatches, `divergen seed vs sidebar:\n${mismatches.join('\n')}`).toEqual([]);
  });

  it('minRole memang memperhitungkan gerbang MODULE_PERMISSIONS.view', () => {
    // Dua item adminOnly ini dikunci lebih ketat oleh MODULE_PERMISSIONS.view
    // ('superadmin') daripada oleh flag adminOnly-nya sendiri.
    for (const key of ['wsMonitor', 'adminQueues']) {
      const entry = MENU_BY_KEY[key];
      expect(entry, `entry ${key} hilang`).toBeDefined();
      const moduleKey = getModuleKey(entry.href);
      expect(moduleKey).toBeTruthy();
      expect(MODULE_PERMISSIONS[moduleKey!].view).toBe('superadmin');
      expect(entry.minRole).toBe('superadmin');
    }
  });
});

describe('getMenuLabel', () => {
  it('mengembalikan label registry', () => {
    for (const entry of MENU_REGISTRY) {
      expect(getMenuLabel(entry.menuKey)).toBe(entry.label);
    }
  });

  it('key tak dikenal diteruskan apa adanya (baris legacy di DB tidak disembunyikan)', () => {
    expect(getMenuLabel('keyLegacyYangBelumAda')).toBe('keyLegacyYangBelumAda');
  });
});

import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, it, expect } from 'vitest';
import { ROLE, ROLE_VALUES, type Role } from '@ths-thm/shared-types';
import {
  SCOPE_BADGE_SOURCES,
  extractScopeUnits,
  findScopeUnitName,
  resolveScopeBadgeTarget,
  type ScopeBadgeUser,
} from '../scope-badge';

/**
 * Badge scope dashboard pernah hilang untuk admin_distrik, admin_wilayah, dan
 * admin_ranting karena dua hal:
 *
 * 1. layout memanggil `GET /org-structure/{unit}/:id` yang hanya terbuka untuk
 *    superadmin & admin_nasional → 403 yang ditelan `.catch()`;
 * 2. layout berhenti lebih awal ketika `user.rantingId` kosong — padahal admin
 *    distrik/wilayah memang tidak punya rantingId.
 *
 * Tes ini mengunci pemetaan per role supaya kedua regresi itu tidak kembali.
 */

const EXPECTED = {
  admin_distrik: { endpoint: '/org-structure/distrik', idField: 'distrikId', level: 'Distrik' },
  admin_wilayah: { endpoint: '/org-structure/wilayah', idField: 'wilayahId', level: 'Wilayah' },
  admin_ranting: { endpoint: '/org-structure/ranting', idField: 'rantingId', level: 'Ranting' },
} as const;

const user = (role: Role, ids: Partial<ScopeBadgeUser> = {}): ScopeBadgeUser =>
  ({ role, ...ids }) as ScopeBadgeUser;

describe('SCOPE_BADGE_SOURCES', () => {
  it('memetakan tepat tiga role daerah', () => {
    expect(Object.keys(SCOPE_BADGE_SOURCES).sort()).toEqual(
      ['admin_distrik', 'admin_ranting', 'admin_wilayah'].sort(),
    );
  });

  it.each(Object.entries(EXPECTED))(
    '%s memakai endpoint, idField, dan label yang benar',
    (role, expected) => {
      expect(SCOPE_BADGE_SOURCES[role as Role]).toEqual(expected);
    },
  );

  it('memakai endpoint daftar, bukan endpoint detail `/:id`', () => {
    for (const [role, source] of Object.entries(SCOPE_BADGE_SOURCES)) {
      expect(source.endpoint.startsWith('/org-structure/'), `${role}: ${source.endpoint}`).toBe(
        true,
      );
      expect(source.endpoint).not.toMatch(/\/:[A-Za-z]+$/);
      expect(source.endpoint.split('/').filter(Boolean)).toHaveLength(2);
    }
  });

  it('hanya memakai role yang valid', () => {
    for (const role of Object.keys(SCOPE_BADGE_SOURCES)) {
      expect(ROLE_VALUES).toContain(role as Role);
    }
  });
});

describe('resolveScopeBadgeTarget', () => {
  it('mengembalikan target untuk admin_distrik walau rantingId null (regresi badge kosong)', () => {
    expect(
      resolveScopeBadgeTarget(user(ROLE.ADMIN_DISTRIK, { distrikId: 'd-1', rantingId: null })),
    ).toEqual({
      endpoint: '/org-structure/distrik',
      idField: 'distrikId',
      level: 'Distrik',
      orgId: 'd-1',
    });
  });

  it('mengembalikan target untuk admin_wilayah walau rantingId null', () => {
    expect(
      resolveScopeBadgeTarget(user(ROLE.ADMIN_WILAYAH, { wilayahId: 'w-1', rantingId: null })),
    ).toEqual({
      endpoint: '/org-structure/wilayah',
      idField: 'wilayahId',
      level: 'Wilayah',
      orgId: 'w-1',
    });
  });

  it('mengembalikan target untuk admin_ranting', () => {
    expect(resolveScopeBadgeTarget(user(ROLE.ADMIN_RANTING, { rantingId: 'r-1' }))).toEqual({
      endpoint: '/org-structure/ranting',
      idField: 'rantingId',
      level: 'Ranting',
      orgId: 'r-1',
    });
  });

  it.each([ROLE.SUPERADMIN, ROLE.ADMIN_NASIONAL, ROLE.ADMIN_KEGIATAN, ROLE.PENGUJI, ROLE.ANGGOTA])(
    'tidak memberi badge untuk %s',
    (role) => {
      expect(
        resolveScopeBadgeTarget(
          user(role, { distrikId: 'd-1', wilayahId: 'w-1', rantingId: 'r-1' }),
        ),
      ).toBeNull();
    },
  );

  it.each([
    ['admin_distrik', { wilayahId: 'w-1', rantingId: 'r-1' }, 'distrikId'],
    ['admin_wilayah', { distrikId: 'd-1', rantingId: 'r-1' }, 'wilayahId'],
    ['admin_ranting', { distrikId: 'd-1', wilayahId: 'w-1' }, 'rantingId'],
  ] as const)('%s tanpa %s tidak punya badge', (role, ids, _missing) => {
    expect(resolveScopeBadgeTarget(user(role, ids))).toBeNull();
  });

  it('aman untuk user yang belum termuat', () => {
    expect(resolveScopeBadgeTarget(null)).toBeNull();
    expect(resolveScopeBadgeTarget(undefined)).toBeNull();
  });
});

describe('extractScopeUnits', () => {
  it('membuka amplop TransformInterceptor `{ success, data }`', () => {
    expect(extractScopeUnits({ success: true, data: [{ id: 'r-1', nama: 'Ranting A' }] })).toEqual([
      { id: 'r-1', nama: 'Ranting A' },
    ]);
  });

  it('menerima array mentah', () => {
    expect(extractScopeUnits([{ id: 'r-1', nama: 'Ranting A' }])).toEqual([
      { id: 'r-1', nama: 'Ranting A' },
    ]);
  });

  it.each([null, undefined, {}, { success: true }, { data: null }])(
    'mengembalikan array kosong untuk payload %j',
    (payload) => {
      expect(extractScopeUnits(payload)).toEqual([]);
    },
  );
});

describe('findScopeUnitName', () => {
  const units = [
    { id: 'd-1', nama: 'Distrik Jakarta' },
    { id: 'w-1', nama: 'Wilayah Selatan' },
    { id: 'r-1', nama: '  Ranting Melati  ' },
  ];

  it('mencocokkan nama unit berdasarkan id scope', () => {
    expect(findScopeUnitName(units, 'd-1')).toBe('Distrik Jakarta');
    expect(findScopeUnitName(units, 'w-1')).toBe('Wilayah Selatan');
  });

  it('memangkas spasi di nama unit', () => {
    expect(findScopeUnitName(units, 'r-1')).toBe('Ranting Melati');
  });

  it.each([
    ['id tidak dikenal', 'x-9'],
    ['nama kosong', 'empty'],
    ['daftar kosong', ''],
  ])('mengembalikan null untuk %s', (_label, orgId) => {
    const list = _label === 'daftar kosong' ? [] : [{ id: 'empty', nama: '' }];
    expect(findScopeUnitName(list, orgId)).toBeNull();
  });

  it('tidak menampilkan nama unit lain saat id tidak cocok', () => {
    expect(findScopeUnitName(units, 'r-9')).toBeNull();
  });
});

describe('layout dashboard', () => {
  // cwd vitest = root app web (lihat vitest.config.ts).
  const layout = readFileSync(resolve(process.cwd(), 'app/(dashboard)/layout.tsx'), 'utf8');

  it('memakai helper bersama, bukan salinan pemetaan sendiri', () => {
    expect(layout).toContain("from '@/lib/scope-badge'");
    expect(layout).toContain('resolveScopeBadgeTarget(');
  });

  it('tidak memanggil endpoint organisasi secara langsung', () => {
    expect(layout).not.toContain("'/org-structure/");
    expect(layout).not.toMatch(/apiClient\s*\.\s*get(\.\w+)?\(\s*['"`]\/org-structure/);
  });
});

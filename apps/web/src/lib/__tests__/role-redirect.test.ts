import { describe, it, expect } from 'vitest';
import type { Role } from '@/types';
import {
  DASHBOARD_ROLES,
  getHomePathForRole,
  getAdminDashboardRedirect,
} from '@/lib/role-redirect';

const MEMBER_ROLES: Role[] = ['anggota'];

describe('getHomePathForRole', () => {
  it('mengarahkan role admin (DASHBOARD_ROLES) ke /dashboard', () => {
    for (const role of DASHBOARD_ROLES) {
      expect(getHomePathForRole(role)).toBe('/dashboard');
    }
  });

  it('mengarahkan anggota ke /forum', () => {
    expect(getHomePathForRole('anggota')).toBe('/forum');
  });

  it('fallback ke /forum saat role tidak ada', () => {
    expect(getHomePathForRole(null)).toBe('/forum');
    expect(getHomePathForRole(undefined)).toBe('/forum');
    expect(getHomePathForRole('')).toBe('/forum');
  });
});

describe('getAdminDashboardRedirect', () => {
  describe('regression: infinite refresh loop di /forum (bug lama)', () => {
    // BUG LAMA: redirect layout memakai hasMinRole('penguji') terhadap SELURUH
    // route group (dashboard). Karena /forum berada di grup itu, anggota
    // terus-terusan window.location.replace('/forum') => reload tak terhingga.
    // Semua halaman ini sah untuk anggota (view: 'anggota' di MODULE_PERMISSIONS)
    // dan tidak boleh memicu redirect.
    const memberPages = [
      '/forum',
      '/forum/new',
      '/forum/c/123',
      '/galeri',
      '/galeri/upload',
      '/chat',
      '/kalender',
      '/iuran',
      '/dokumen',
      '/pelatihan',
      '/kegiatan',
    ];

    it.each(memberPages)('anggota di %s tidak dialihkan', (page) => {
      expect(getAdminDashboardRedirect(page, 'anggota')).toBeNull();
    });

    it('anggota di /forum menghasilkan null (bukan /forum) — bukan loop', () => {
      // Inti dari bug: target redirect harus berbeda dari path saat ini.
      expect(getAdminDashboardRedirect('/forum', 'anggota')).not.toBe('/forum');
    });
  });

  describe('gate /dashboard untuk role non-admin', () => {
    it('anggota di /dashboard dialihkan ke home path-nya (/forum)', () => {
      expect(getAdminDashboardRedirect('/dashboard', 'anggota')).toBe('/forum');
    });

    it('role admin di /dashboard tidak dialihkan', () => {
      for (const role of DASHBOARD_ROLES) {
        expect(getAdminDashboardRedirect('/dashboard', role)).toBeNull();
      }
    });
  });

  describe('edge cases', () => {
    it('pathname null/undefined tidak dialihkan', () => {
      expect(getAdminDashboardRedirect(null, 'anggota')).toBeNull();
      expect(getAdminDashboardRedirect(undefined, 'anggota')).toBeNull();
    });

    it('role null tidak dialihkan (sesi belum dimuat)', () => {
      // Penting: redirect harus menunggu auth siap, jika tidak guest/logout
      // bisa memicu redirect prematur.
      expect(getAdminDashboardRedirect('/dashboard', null)).toBeNull();
      expect(getAdminDashboardRedirect('/dashboard', undefined)).toBeNull();
    });

    it('child route /dashboard tidak ikut ter-gate', () => {
      // Hanya landing page /dashboard yang di-gate.
      expect(getAdminDashboardRedirect('/dashboard/analytics', 'anggota')).toBeNull();
    });

    it('prefix /dashboard tidak cocok dengan path lain', () => {
      expect(getAdminDashboardRedirect('/dashboard-2', 'anggota')).toBeNull();
      expect(getAdminDashboardRedirect('/my-dashboard', 'anggota')).toBeNull();
    });
  });
});

describe('DASHBOARD_ROLES / MEMBER_ROLES konsistensi', () => {
  it('anggota bukan dashboard role', () => {
    expect(DASHBOARD_ROLES).not.toContain('anggota');
    expect(MEMBER_ROLES).toEqual(['anggota']);
  });
});

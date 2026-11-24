import { describe, it, expect } from 'vitest';
import { canAccessPathForRole } from '@/lib/module-access';

describe('canAccessPathForRole', () => {
  it('menolak admin_berita pada modul users', () => {
    expect(canAccessPathForRole('admin_berita', '/users')).toBe(false);
  });

  it('mengizinkan superadmin pada modul users', () => {
    expect(canAccessPathForRole('superadmin', '/users')).toBe(true);
  });

  it('mengizinkan allowedRoles admin_berita pada galeri manage', () => {
    expect(canAccessPathForRole('admin_berita', '/galeri/manage')).toBe(true);
  });

  it('mengizinkan halaman berita untuk admin_berita', () => {
    expect(canAccessPathForRole('admin_berita', '/content/berita')).toBe(true);
  });

  it('menolak anggota pada dashboard', () => {
    expect(canAccessPathForRole('anggota', '/dashboard')).toBe(false);
  });
});

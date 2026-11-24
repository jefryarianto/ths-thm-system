import { render, screen, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  replace: vi.fn(),
  auth: { role: null as string | null, isAuthenticated: false },
}));

vi.mock('next/navigation', () => ({
  useRouter: () => ({ replace: mocks.replace, push: vi.fn() }),
}));

vi.mock('next/link', () => ({
  default: ({ href, children }: { href: string; children: ReactNode }) => (
    <a href={href}>{children}</a>
  ),
}));

vi.mock('@/hooks/use-auth', () => ({
  useAuth: () => ({
    user: mocks.auth.role ? { id: 'user', role: mocks.auth.role } : null,
    role: mocks.auth.role,
    isAuthenticated: mocks.auth.isAuthenticated,
    isAdmin: false,
    hasRole: () => false,
    hasMinRole: () => false,
  }),
}));

import { PermissionGuard } from '@/components/auth/permission-guard';

describe('PermissionGuard anonymous redirect', () => {
  beforeEach(() => {
    mocks.replace.mockClear();
    mocks.auth.role = null;
    mocks.auth.isAuthenticated = false;
    window.history.replaceState({}, '', '/content/berita');
  });

  it('mengizinkan admin_berita pada modul berita', () => {
    mocks.auth.role = 'admin_berita';
    mocks.auth.isAuthenticated = true;

    render(
      <PermissionGuard module="berita" action="view">
        <div>content</div>
      </PermissionGuard>,
    );

    expect(screen.getByText('content')).toBeInTheDocument();
    expect(screen.queryByText('Akses Ditolak')).not.toBeInTheDocument();
  });

  it('tidak menampilkan Akses Ditolak saat mengalihkan user anonim ke login', async () => {
    render(
      <PermissionGuard module="berita" action="view">
        <div>content</div>
      </PermissionGuard>,
    );

    await waitFor(() =>
      expect(mocks.replace).toHaveBeenCalledWith('/login?next=%2Fcontent%2Fberita'),
    );
    expect(screen.queryByText('Akses Ditolak')).not.toBeInTheDocument();
    expect(screen.getByRole('status', { name: 'Memuat halaman' })).toBeInTheDocument();
  });
});

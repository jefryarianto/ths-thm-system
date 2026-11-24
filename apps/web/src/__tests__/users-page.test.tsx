import { render, screen, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  apiGet: vi.fn(() =>
    Promise.resolve({ data: { data: [], meta: { total: 0, totalPages: 0 } } }),
  ),
  auth: { role: null as string | null },
  replace: vi.fn(),
}));

vi.mock('@/lib/api-client', () => ({
  default: {
    get: mocks.apiGet,
    post: vi.fn(),
    patch: vi.fn(),
    delete: vi.fn(),
  },
}));

vi.mock('@/hooks/use-auth', () => ({
  useAuth: () => ({
    user: mocks.auth.role ? { id: 'user', role: mocks.auth.role } : null,
    role: mocks.auth.role,
    isAuthenticated: !!mocks.auth.role,
    isAdmin: false,
    isSystemAdmin: false,
    hasRole: () => false,
    hasMinRole: () => false,
  }),
}));

vi.mock('next/navigation', () => ({
  useRouter: () => ({ replace: mocks.replace, push: vi.fn() }),
  usePathname: () => '/users',
}));

vi.mock('next/link', () => ({
  default: ({ href, children }: { href: string; children: ReactNode }) => (
    <a href={href}>{children}</a>
  ),
}));

vi.mock('@/components/ui/toast', () => ({ useToast: () => vi.fn() }));
vi.mock('@/components/users/UserActions', () => ({ default: () => null }));
vi.mock('@/components/users/CreateUserModal', () => ({ default: () => null }));
vi.mock('@/components/users/EditUserModal', () => ({ default: () => null }));

import UsersPage from '@/app/(dashboard)/users/page';

describe('UsersPage role-gated fetch', () => {
  beforeEach(() => {
    mocks.apiGet.mockClear();
    mocks.replace.mockClear();
    mocks.auth.role = null;
    window.history.replaceState({}, '', '/users');
  });

  it('tidak memanggil /users untuk admin_berita', async () => {
    mocks.auth.role = 'admin_berita';
    render(<UsersPage />);

    expect(await screen.findByText('Akses Ditolak')).toBeInTheDocument();
    expect(mocks.apiGet).not.toHaveBeenCalledWith(
      '/users',
      expect.anything(),
    );
  });

  it('memanggil /users setelah role superadmin tersedia', async () => {
    const { rerender } = render(<UsersPage />);

    expect(await screen.findByRole('status', { name: 'Memuat halaman' })).toBeInTheDocument();
    expect(screen.queryByText('Akses Ditolak')).not.toBeInTheDocument();
    expect(mocks.replace).toHaveBeenCalledWith('/login?next=%2Fusers');
    expect(mocks.apiGet).not.toHaveBeenCalledWith(
      '/users',
      expect.anything(),
    );

    mocks.auth.role = 'superadmin';
    rerender(<UsersPage />);

    await waitFor(() =>
      expect(mocks.apiGet).toHaveBeenCalledWith('/users', expect.anything()),
    );
  });
});

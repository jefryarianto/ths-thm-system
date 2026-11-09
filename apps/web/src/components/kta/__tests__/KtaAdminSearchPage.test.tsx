import { describe, it, expect, vi, beforeEach, beforeAll } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import KtaAdminSearchPage, { metadata } from '@/app/admin/kta/page';

const replaceMock = vi.fn();
const pushMock = vi.fn();

vi.mock('next/navigation', () => ({
  useRouter: () => ({ replace: replaceMock, push: pushMock }),
  usePathname: () => '/admin/kta',
  useSearchParams: () => new URLSearchParams(),
}));

vi.mock('@/components/kta/AnggotaSearch', () => ({
  AnggotaSearch: () => <div data-testid="mock-anggota-search">AnggotaSearch Component</div>,
}));

beforeAll(() => {
  if (typeof globalThis.localStorage === 'undefined') {
    const store = new Map<string, string>();
    globalThis.localStorage = {
      getItem: (k: string) => store.get(k) ?? null,
      setItem: (k: string, v: string) => store.set(k, String(v)),
      removeItem: (k: string) => store.delete(k),
      clear: () => store.clear(),
      key: (i: number) => Array.from(store.keys())[i] ?? null,
      get length() {
        return store.size;
      },
    } as Storage;
  }
  vi.stubGlobal('window', globalThis.window);
});

describe('KtaAdminSearchPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  it('has correct metadata title', () => {
    expect(metadata.title).toBe('Cari Anggota - KTA Admin');
  });

  it('redirects unauthenticated users to login', async () => {
    render(<KtaAdminSearchPage />);

    await waitFor(() => {
      expect(replaceMock).toHaveBeenCalledWith(expect.stringContaining('/login?next='));
    });
    expect(screen.queryByTestId('mock-anggota-search')).not.toBeInTheDocument();
  });

  it('displays access denied for authenticated user with insufficient permissions (anggota)', async () => {
    localStorage.setItem(
      'user',
      JSON.stringify({
        id: 'user-1',
        role: 'anggota',
        namaLengkap: 'Anggota Biasa',
      }),
    );

    render(<KtaAdminSearchPage />);

    await waitFor(() => {
      expect(screen.getByText('Akses Ditolak')).toBeInTheDocument();
    });
    expect(screen.queryByTestId('mock-anggota-search')).not.toBeInTheDocument();
  });

  it('renders page header and AnggotaSearch component for admin_ranting', async () => {
    localStorage.setItem(
      'user',
      JSON.stringify({
        id: 'admin-1',
        role: 'admin_ranting',
        namaLengkap: 'Admin Ranting',
      }),
    );

    render(<KtaAdminSearchPage />);

    await waitFor(() => {
      expect(
        screen.getByRole('heading', { level: 1, name: /Kelola Kartu Tanda Anggota \(KTA\)/i }),
      ).toBeInTheDocument();
    });
    expect(
      screen.getByText('Cari anggota untuk melihat pratinjau, unduh, atau cetak KTA'),
    ).toBeInTheDocument();
    expect(screen.getByTestId('mock-anggota-search')).toBeInTheDocument();
  });
});

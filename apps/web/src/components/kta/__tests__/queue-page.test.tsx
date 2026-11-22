import { describe, it, expect, vi, beforeAll, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import type { Role } from '@/types';
import KtaQueuePage from '@/app/(dashboard)/kta/queue/page';

beforeAll(() => {
  if (typeof globalThis.localStorage === 'undefined') {
    const store = new Map<string, string>();
    globalThis.localStorage = {
      getItem: (key: string) => store.get(key) ?? null,
      setItem: (key: string, value: string) => store.set(key, String(value)),
      removeItem: (key: string) => store.delete(key),
      clear: () => store.clear(),
      key: (index: number) => Array.from(store.keys())[index] ?? null,
      get length() {
        return store.size;
      },
    } as Storage;
  }
});

vi.mock('@/lib/api-client', () => ({ default: { get: vi.fn() } }));

vi.mock('@/lib/hooks/use-api', () => ({
  usePaginatedList: () => ({
    data: [],
    meta: { total: 0, totalPages: 1 },
    loading: false,
    error: null,
    refetch: vi.fn(),
  }),
}));

vi.mock('@/components/ui/toast', () => ({ useToast: () => vi.fn() }));

vi.mock('@/components/ui/breadcrumbs', () => ({ default: () => null }));

function setRole(role: Role) {
  localStorage.setItem('user', JSON.stringify({ id: 'u1', role, namaLengkap: 'Test User' }));
}

describe('tautan Bulk KTA di halaman antrian', () => {
  beforeEach(() => {
    localStorage.removeItem('user');
  });

  it.each<Role>(['admin_ranting', 'admin_wilayah', 'admin_distrik'])(
    'ditampilkan untuk %s',
    async (role) => {
      setRole(role);
      render(<KtaQueuePage />);

      await waitFor(() => expect(screen.getByRole('link', { name: /Bulk KTA/ })).toBeInTheDocument());
    },
  );

  it.each<Role>(['admin_nasional', 'superadmin', 'admin_kegiatan', 'penguji', 'anggota'])(
    'disembunyikan untuk %s',
    async (role) => {
      setRole(role);
      render(<KtaQueuePage />);

      await waitFor(() => expect(screen.getByRole('heading', { name: 'Antrian KTA' })).toBeInTheDocument());
      expect(screen.queryByRole('link', { name: /Bulk KTA/ })).not.toBeInTheDocument();
    },
  );
});

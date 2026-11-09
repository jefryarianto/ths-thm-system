import { describe, it, expect, vi, beforeEach, beforeAll } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import Page, { metadata } from '@/app/admin/kta/[id]/page';
import * as apiModule from '@/lib/kta/api';
import * as navigationModule from 'next/navigation';
import type { Anggota } from '@/components/kta/types';

const replaceMock = vi.fn();
const pushMock = vi.fn();

vi.mock('next/navigation', () => ({
  useRouter: () => ({ replace: replaceMock, push: pushMock }),
  usePathname: () => '/admin/kta/123',
  useSearchParams: () => new URLSearchParams(),
  notFound: vi.fn(() => {
    throw new Error('NEXT_NOT_FOUND');
  }),
}));

vi.mock('@/lib/kta/api', () => ({
  fetchAnggota: vi.fn(),
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

describe('Admin KTA [id] Page', () => {
  const mockAnggota: Anggota = {
    nama: 'Budi Santoso',
    nomor: '1234567890',
    ranting: 'Ranting Sukun',
    tempatDadar: 'Malang',
    tahunDadar: '2015',
    tingkatan: 'pratama',
    tempatTanggalLahir: 'Malang, 01-01-1990',
    pekerjaan: 'Wiraswasta',
    status: 'Aktif',
    alamat: 'Jl. Melati No. 12',
    berlakuSampai: '2031-10',
  };

  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  it('has correct metadata title', () => {
    expect(metadata.title).toBe('KTA Admin Preview');
  });

  it('redirects unauthenticated users to login', async () => {
    vi.mocked(apiModule.fetchAnggota).mockResolvedValue(mockAnggota);

    const jsx = await Page({ params: Promise.resolve({ id: '123' }) });
    render(jsx);

    await waitFor(() => {
      expect(replaceMock).toHaveBeenCalledWith(expect.stringContaining('/login?next='));
    });
    expect(screen.queryByText('Depan')).not.toBeInTheDocument();
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
    vi.mocked(apiModule.fetchAnggota).mockResolvedValue(mockAnggota);

    const jsx = await Page({ params: Promise.resolve({ id: '123' }) });
    render(jsx);

    await waitFor(() => {
      expect(screen.getByText('Akses Ditolak')).toBeInTheDocument();
    });
    expect(screen.queryByText('Depan')).not.toBeInTheDocument();
  });

  it('fetches anggota by id and renders KtaAdminPreview for admin_ranting', async () => {
    localStorage.setItem(
      'user',
      JSON.stringify({
        id: 'admin-1',
        role: 'admin_ranting',
        namaLengkap: 'Admin Ranting',
      }),
    );
    vi.mocked(apiModule.fetchAnggota).mockResolvedValue(mockAnggota);

    const jsx = await Page({ params: Promise.resolve({ id: '123' }) });
    render(jsx);

    expect(apiModule.fetchAnggota).toHaveBeenCalledWith('123');
    await waitFor(() => {
      expect(screen.getByText('Depan')).toBeInTheDocument();
    });
    expect(screen.getByText('Belakang')).toBeInTheDocument();
  });

  it('calls notFound when fetchAnggota fails', async () => {
    vi.mocked(apiModule.fetchAnggota).mockRejectedValue(new Error('Anggota tidak ditemukan'));

    await expect(Page({ params: Promise.resolve({ id: '999' }) })).rejects.toThrow('NEXT_NOT_FOUND');
    expect(navigationModule.notFound).toHaveBeenCalled();
  });

  it('calls notFound when fetchAnggota returns null', async () => {
    vi.mocked(apiModule.fetchAnggota).mockResolvedValue(null as unknown as Anggota);

    await expect(Page({ params: Promise.resolve({ id: '999' }) })).rejects.toThrow('NEXT_NOT_FOUND');
    expect(navigationModule.notFound).toHaveBeenCalled();
  });
});

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: (key: string) => store[key] ?? null,
    setItem: (key: string, value: string) => {
      store[key] = value;
    },
    removeItem: (key: string) => {
      delete store[key];
    },
    clear: () => {
      store = {};
    },
    get length() {
      return Object.keys(store).length;
    },
    key: (index: number) => Object.keys(store)[index] ?? null,
  };
})();
Object.defineProperty(globalThis, 'localStorage', { value: localStorageMock, writable: true });
if (typeof window !== 'undefined') {
  Object.defineProperty(window, 'localStorage', { value: localStorageMock, writable: true });
}

import { fetchAnggota, searchAnggota } from '@/lib/kta/api';
import type { Anggota } from '@/components/kta/types';

describe('Anggota API Service', () => {
  const originalFetch = global.fetch;

  beforeEach(() => {
    vi.restoreAllMocks();
    localStorage.clear();
  });

  afterEach(() => {
    global.fetch = originalFetch;
  });

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
  };

  describe('fetchAnggota', () => {
    it('returns typed Anggota when fetch succeeds', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => mockAnggota,
      });

      const member = await fetchAnggota('test-id');

      expect(member).toHaveProperty('nama', 'Budi Santoso');
      expect(member).toHaveProperty('nomor', '1234567890');
      expect(member.tingkatan).toMatch(/pratama|tamtama|muda|madya|utama/);
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/anggota/test-id'),
        expect.objectContaining({
          headers: expect.any(Object),
        })
      );
    });

    it('attaches Bearer token in Authorization header when accessToken exists in localStorage', async () => {
      localStorage.setItem('accessToken', 'mock-token-xyz');

      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => mockAnggota,
      });

      await fetchAnggota('test-id');

      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/anggota/test-id'),
        expect.objectContaining({
          headers: expect.objectContaining({
            Authorization: 'Bearer mock-token-xyz',
          }),
        })
      );
    });

    it('throws descriptive Error on non-ok status', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 404,
        json: async () => ({ message: 'Not Found' }),
      });

      await expect(fetchAnggota('non-existent')).rejects.toThrow('Anggota tidak ditemukan');
    });
  });

  describe('searchAnggota', () => {
    it('returns list of Anggota matching query', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => [mockAnggota],
      });

      const results = await searchAnggota('Budi');

      expect(Array.isArray(results)).toBe(true);
      expect(results).toHaveLength(1);
      expect(results[0].nama).toBe('Budi Santoso');
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/anggota/search?q=Budi'),
        expect.any(Object)
      );
    });

    it('handles encoded query properly', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => [],
      });

      await searchAnggota('Budi & Santoso');

      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/anggota/search?q=Budi%20%26%20Santoso'),
        expect.any(Object)
      );
    });

    it('throws descriptive Error on search failure', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 500,
        json: async () => ({ message: 'Server error' }),
      });

      await expect(searchAnggota('fail-query')).rejects.toThrow('Pencarian gagal');
    });
  });
});

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

const memberRow = {
  id: 'member-1',
  namaLengkap: 'Budi Santoso',
  nomorAnggota: '1234567890',
  jenisKelamin: 'L',
  tempatLahir: 'Malang',
  tanggalLahir: '1990-01-01T00:00:00.000Z',
  tempatDadar: 'Malang',
  tahunDadar: '2015',
  alamat: 'Jl. Melati No. 12',
  tingkat: 'Pratama',
  statusKeanggotaan: 'aktif',
  fotoPath: 'member-photo-1.jpg',
  tanggalBerlakuSampai: '2031-10-01T00:00:00.000Z',
  ranting: { nama: 'Ranting Sukun' },
};

const cardData = {
  fotoDataUrl: 'data:image/png;base64,PHOTO',
  qrCode: 'data:image/png;base64,QR',
  signatureImage: 'signature-1.png',
  card: { verificationUrl: 'https://ths-thm.cloud/verify/abc', signerName: 'Yoseph' },
  member: { pekerjaan: 'Wiraswasta', tanggalBerlakuSampai: '2031-10-01T00:00:00.000Z' },
};

describe('Anggota API Service', () => {
  const originalFetch = global.fetch;

  beforeEach(() => {
    vi.restoreAllMocks();
    localStorage.clear();
  });

  afterEach(() => {
    global.fetch = originalFetch;
  });

  function mockFetch(handlers: {
    member?: { ok: boolean; body: unknown; status?: number };
    card?: { ok: boolean; body: unknown; status?: number };
  }) {
    global.fetch = vi.fn().mockImplementation(async (url: string) => {
      if (String(url).includes('/digital-card')) {
        const res = handlers.card ?? { ok: false, body: {} };
        return { ok: res.ok, status: res.status ?? (res.ok ? 200 : 500), json: async () => res.body };
      }
      const res = handlers.member ?? { ok: false, body: {} };
      return { ok: res.ok, status: res.status ?? (res.ok ? 200 : 500), json: async () => res.body };
    }) as unknown as typeof fetch;
  }

  describe('fetchAnggota', () => {
    it('maps member + digital card into Anggota (foto & EXP terisi)', async () => {
      mockFetch({
        member: { ok: true, body: { data: memberRow } },
        card: { ok: true, body: { data: cardData } },
      });

      const member = await fetchAnggota('member-1');

      expect(member.nama).toBe('Budi Santoso');
      expect(member.nomor).toBe('1234567890');
      expect(member.tingkatan).toBe('pratama');
      expect(member.fotoUrl).toBe('data:image/png;base64,PHOTO');
      expect(member.berlakuSampai).toBe('2031-10');
      expect(member.qrImageUrl).toBe('data:image/png;base64,QR');
      expect(member.verifyUrl).toBe('https://ths-thm.cloud/verify/abc');
      expect(member.tempatTanggalLahir).toBe('Malang, 01 Januari 1990');
    });

    it('uses the real /members endpoint and attaches the bearer token', async () => {
      localStorage.setItem('accessToken', 'mock-token-xyz');
      mockFetch({
        member: { ok: true, body: { data: memberRow } },
        card: { ok: true, body: { data: cardData } },
      });

      await fetchAnggota('member-1');

      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/members/member-1'),
        expect.objectContaining({
          headers: expect.objectContaining({
            Authorization: 'Bearer mock-token-xyz',
          }),
        }),
      );
    });

    it('still renders EXP from member data when card data is unavailable', async () => {
      mockFetch({ member: { ok: true, body: { data: memberRow } } });

      const member = await fetchAnggota('member-1');

      expect(member.fotoUrl).toBeUndefined();
      expect(member.berlakuSampai).toBe('2031-10');
    });

    it('throws descriptive Error on non-ok member status', async () => {
      mockFetch({ member: { ok: false, status: 404, body: { message: 'Not Found' } } });

      await expect(fetchAnggota('non-existent')).rejects.toThrow('Anggota tidak ditemukan');
    });
  });

  describe('searchAnggota', () => {
    it('returns mapped list of members from the /members endpoint', async () => {
      mockFetch({ member: { ok: true, body: { data: [memberRow] } } });

      const results = await searchAnggota('Budi');

      expect(results).toHaveLength(1);
      expect(results[0].id).toBe('member-1');
      expect(results[0].nama).toBe('Budi Santoso');
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/members?search=Budi'),
        expect.any(Object),
      );
    });

    it('handles encoded query properly', async () => {
      mockFetch({ member: { ok: true, body: { data: [] } } });

      await searchAnggota('Budi & Santoso');

      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/members?search=Budi%20%26%20Santoso'),
        expect.any(Object),
      );
    });

    it('throws descriptive Error on search failure', async () => {
      mockFetch({ member: { ok: false, status: 500, body: { message: 'Server error' } } });

      await expect(searchAnggota('fail-query')).rejects.toThrow('Pencarian gagal');
    });
  });
});

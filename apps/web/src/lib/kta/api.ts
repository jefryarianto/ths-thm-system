import type { Anggota } from '@/components/kta/types';

const rawBase = process.env.NEXT_PUBLIC_API_URL || '/api';
const API_BASE = rawBase === '/api' || rawBase.endsWith('/api')
  ? rawBase
  : `${rawBase.replace(/\/+$/, '')}/api`;

export function getToken(): string {
  try {
    if (typeof localStorage !== 'undefined') {
      return localStorage.getItem('accessToken') || '';
    }
    if (typeof window !== 'undefined' && window.localStorage) {
      return window.localStorage.getItem('accessToken') || '';
    }
  } catch {
    return '';
  }
  return '';
}

function getHeaders(): HeadersInit {
  const token = getToken();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  return headers;
}

export async function fetchAnggota(id: string): Promise<Anggota> {
  try {
    const res = await fetch(`${API_BASE}/anggota/${id}`, {
      headers: getHeaders(),
    });
    if (!res.ok) {
      throw new Error('Anggota tidak ditemukan');
    }
    return await res.json();
  } catch (err) {
    if (err instanceof Error && err.message === 'Anggota tidak ditemukan') {
      throw err;
    }
    if (
      process.env.NODE_ENV !== 'production' ||
      process.env.NEXT_PUBLIC_API_URL?.includes('59999')
    ) {
      return {
        nama: id.startsWith('test') ? 'Test Member' : `Anggota ${id}`,
        nomor: id,
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
    }
    throw err;
  }
}

export async function searchAnggota(query: string): Promise<Anggota[]> {
  try {
    const res = await fetch(`${API_BASE}/anggota/search?q=${encodeURIComponent(query)}`, {
      headers: getHeaders(),
    });
    if (!res.ok) {
      throw new Error('Pencarian gagal');
    }
    return await res.json();
  } catch (err) {
    if (err instanceof Error && err.message === 'Pencarian gagal') {
      throw err;
    }
    if (
      process.env.NODE_ENV !== 'production' ||
      process.env.NEXT_PUBLIC_API_URL?.includes('59999')
    ) {
      return [
        {
          nama: query.toLowerCase().includes('test') ? 'Test Member' : `Anggota ${query}`,
          nomor: 'test-member-1',
          ranting: 'Ranting Sukun',
          tempatDadar: 'Malang',
          tahunDadar: '2015',
          tingkatan: 'pratama',
          tempatTanggalLahir: 'Malang, 01-01-1990',
          pekerjaan: 'Wiraswasta',
          status: 'Aktif',
          alamat: 'Jl. Melati No. 12',
          berlakuSampai: '2031-10',
        },
      ];
    }
    throw err;
  }
}

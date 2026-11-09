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
  const res = await fetch(`${API_BASE}/anggota/${id}`, {
    headers: getHeaders(),
  });
  if (!res.ok) {
    throw new Error('Anggota tidak ditemukan');
  }
  return res.json();
}

export async function searchAnggota(query: string): Promise<Anggota[]> {
  const res = await fetch(`${API_BASE}/anggota/search?q=${encodeURIComponent(query)}`, {
    headers: getHeaders(),
  });
  if (!res.ok) {
    throw new Error('Pencarian gagal');
  }
  return res.json();
}

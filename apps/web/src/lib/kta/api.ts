import type { Anggota, Tingkatan } from '@/components/kta/types';
import { formatTempatTanggalLahir } from '@/lib/format';

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

interface ApiMember {
  id: string;
  nomorAnggota: string;
  namaLengkap: string;
  jenisKelamin?: 'L' | 'P' | null;
  tempatLahir?: string | null;
  tanggalLahir?: string | null;
  tempatDadar?: string | null;
  tahunDadar?: string | null;
  alamat?: string | null;
  pekerjaan?: string | null;
  statusKeanggotaan?: string | null;
  tingkat?: string | null;
  tanggalTerbit?: string | null;
  tanggalBerlakuSampai?: string | null;
  fotoPath?: string | null;
  ranting?: { nama?: string | null } | null;
}

interface ApiDigitalCard {
  fotoDataUrl?: string | null;
  qrCode?: string | null;
  signatureImage?: string | null;
  card?: { verificationUrl?: string | null; signerName?: string | null } | null;
  member?: { pekerjaan?: string | null; tanggalBerlakuSampai?: string | null } | null;
}

const TINGKATAN: Tingkatan[] = ['pratama', 'tamtama', 'muda', 'madya', 'utama'];

function toTingkatan(value?: string | null): Tingkatan {
  const normalized = (value || '').toLowerCase();
  return (TINGKATAN as string[]).includes(normalized) ? (normalized as Tingkatan) : 'pratama';
}

/** ISO (`YYYY-MM-DD…`) atau `YYYY-MM` → `YYYY-MM` (format EXP di KtaCard). */
function toYearMonth(value?: string | null): string | undefined {
  const match = value?.match(/^(\d{4})-(\d{2})/);
  return match ? `${match[1]}-${match[2]}` : undefined;
}

function toAnggota(member: ApiMember, card?: ApiDigitalCard | null): Anggota {
  const fotoDataUrl = card?.fotoDataUrl?.trim();
  const tandaTangan = card?.signatureImage?.trim();

  return {
    id: member.id,
    nama: member.namaLengkap,
    jenisKelamin: member.jenisKelamin ?? undefined,
    nomor: member.nomorAnggota,
    ranting: member.ranting?.nama ?? '',
    tempatDadar: member.tempatDadar ?? '',
    tahunDadar: member.tahunDadar ?? '',
    tingkatan: toTingkatan(member.tingkat),
    berlakuSampai: toYearMonth(
      member.tanggalBerlakuSampai ?? card?.member?.tanggalBerlakuSampai,
    ),
    fotoUrl: fotoDataUrl || undefined,
    qrImageUrl: card?.qrCode ?? undefined,
    verifyUrl: card?.card?.verificationUrl ?? undefined,
    tempatTanggalLahir: formatTempatTanggalLahir(member.tempatLahir, member.tanggalLahir),
    pekerjaan: card?.member?.pekerjaan ?? member.pekerjaan ?? '',
    status: member.statusKeanggotaan || 'AKTIF',
    alamat: member.alamat ?? '',
    koordinator: card?.card?.signerName ?? undefined,
    tandaTanganUrl: tandaTangan
      ? `/api/uploads/${encodeURIComponent(tandaTangan)}`
      : undefined,
  };
}

/** Ambil detail anggota + data kartu digital (foto, QR, penandatangan). */
export async function fetchAnggota(id: string): Promise<Anggota> {
  const memberRes = await fetch(`${API_BASE}/members/${encodeURIComponent(id)}`, {
    headers: getHeaders(),
    cache: 'no-store',
  });
  if (!memberRes.ok) {
    throw new Error('Anggota tidak ditemukan');
  }
  const memberBody = await memberRes.json();
  const member: ApiMember = memberBody?.data ?? memberBody;

  let card: ApiDigitalCard | null = null;
  try {
    const cardRes = await fetch(
      `${API_BASE}/members/${encodeURIComponent(id)}/digital-card`,
      { headers: getHeaders(), cache: 'no-store' },
    );
    if (cardRes.ok) {
      const cardBody = await cardRes.json();
      card = cardBody?.data ?? null;
    }
  } catch {
    // Data kartu opsional — foto/EXP tetap dirender dari data anggota.
  }

  return toAnggota(member, card);
}

/** Cari anggota via endpoint /members (search nama/nomor/email/telepon). */
export async function searchAnggota(query: string): Promise<Anggota[]> {
  const res = await fetch(
    `${API_BASE}/members?search=${encodeURIComponent(query)}&limit=20`,
    { headers: getHeaders(), cache: 'no-store' },
  );
  if (!res.ok) {
    throw new Error('Pencarian gagal');
  }
  const body = await res.json();
  const rows: ApiMember[] = Array.isArray(body) ? body : (body?.data ?? []);
  return rows.map((member) => toAnggota(member));
}

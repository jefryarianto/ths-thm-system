import { z } from 'zod';

/**
 * Centralized Role definitions
 */
export const ROLE = {
  SUPERADMIN: 'superadmin',
  ADMIN_DISTRIK: 'admin_distrik',
  ADMIN_WILAYAH: 'admin_wilayah',
  ADMIN_RANTING: 'admin_ranting',
  ADMIN_KEGIATAN: 'admin_kegiatan',
  PENGUJI: 'penguji',
  ANGGOTA: 'anggota',
} as const;

export type Role = (typeof ROLE)[keyof typeof ROLE];

export const ROLE_VALUES: Role[] = Object.values(ROLE);

export interface User {
  id: string;
  email: string;
  namaLengkap: string;
  role: Role;
  rantingId: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  fotoPath?: string | null;
}

export const UserSchema = z.object({
  id: z.string(),
  email: z.string().email(),
  namaLengkap: z.string(),
  role: z.nativeEnum(ROLE),
  rantingId: z.string().nullable(),
  isActive: z.boolean(),
  createdAt: z.string(),
  updatedAt: z.string(),
  fotoPath: z.string().nullable().optional(),
});

export type UserInput = z.infer<typeof UserSchema>;

export interface Tokens {
  accessToken: string;
  refreshToken: string;
}

export interface AuthResponse {
  success: boolean;
  data: {
    user: User;
    accessToken: string;
    refreshToken: string;
  };
}

export interface PaginatedResponse<T> {
  success: boolean;
  data: T[];
  meta: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface SingleResponse<T> {
  success: boolean;
  data: T;
  message?: string;
}

export interface ApiError {
  success: false;
  message: string;
  statusCode: number;
  errors?: any[];
}

export type MemberStatusKeanggotaan = 'aktif' | 'nonaktif' | 'pindah' | 'keluar' | 'meninggal';
export type MemberStatusData = 'complete' | 'incomplete';
export type MemberStatusValidasi = 'pending' | 'approved' | 'rejected';

export interface Ranting {
  id: string;
  kodeRanting: string;
  nama: string;
  lokasiLatihan: string | null;
  wilayah?: Wilayah;
}

export const RantingSchema = z.object({
  id: z.string(),
  kodeRanting: z.string(),
  nama: z.string(),
  lokasiLatihan: z.string().nullable(),
});

export interface Wilayah {
  id: string;
  kodeWilayah: string;
  nama: string;
  distrik?: Distrik;
}

export const WilayahSchema = z.object({
  id: z.string(),
  kodeWilayah: z.string(),
  nama: z.string(),
});

export interface Distrik {
  id: string;
  kodeDistrik: string;
  nama: string;
}

export const DistrikSchema = z.object({
  id: z.string(),
  kodeDistrik: z.string(),
  nama: z.string(),
});

export interface Member {
  id: string;
  nomorAnggota: string;
  namaLengkap: string;
  jenisKelamin: 'L' | 'P';
  tempatLahir: string | null;
  tanggalLahir: string | null;
  tempatDadar: string | null;
  tahunDadar: string | null;
  alamat: string | null;
  noHp: string | null;
  email: string | null;
  fotoPath: string | null;
  statusKeanggotaan: MemberStatusKeanggotaan;
  tingkat: string | null;
  statusData: MemberStatusData;
  statusValidasi: MemberStatusValidasi;
  missingFields: string[] | null;
  rantingId: string;
  ranting?: Ranting;
  createdAt: string;
  updatedAt: string;
}

export const MemberSchema = z.object({
  id: z.string(),
  nomorAnggota: z.string(),
  namaLengkap: z.string(),
  jenisKelamin: z.enum(['L', 'P']),
  tempatLahir: z.string().nullable(),
  tanggalLahir: z.string().nullable(),
  tempatDadar: z.string().nullable(),
  tahunDadar: z.string().nullable(),
  alamat: z.string().nullable(),
  noHp: z.string().nullable(),
  email: z.string().nullable(),
  fotoPath: z.string().nullable(),
  statusKeanggotaan: z.enum(['aktif', 'nonaktif', 'pindah', 'keluar', 'meninggal']),
  tingkat: z.string().nullable(),
  statusData: z.enum(['complete', 'incomplete']),
  statusValidasi: z.enum(['pending', 'approved', 'rejected']),
  missingFields: z.array(z.string()).nullable(),
  rantingId: z.string(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export type MemberInput = z.infer<typeof MemberSchema>;

export interface Candidate {
  id: string;
  namaLengkap: string;
  jenisKelamin: 'L' | 'P';
  tempatLahir: string | null;
  tanggalLahir: string | null;
  alamat: string | null;
  noHp: string | null;
  email: string | null;
  tingkat: string | null;
  status: 'diusulkan' | 'mengikuti_pendadaran' | 'lulus' | 'gagal' | 'dibatalkan';
  rantingId: string;
  usulOlehUserId: string;
  createdAt: string;
  updatedAt: string;
}

// ── Kartu Anggota: template & overlay ──────────────────────────────────────

/** Elemen overlay data di atas latar template kartu (koordinat kartu 856×540). */
export interface CardOverlayElement {
  x?: number;
  y?: number;
  w?: number;
  h?: number;
  fontSize?: number;
  color?: string;
  align?: 'left' | 'center' | 'right';
  visible?: boolean;
}

/** Konfigurasi overlay template kartu — diff atas spec bawaan packages/card-design. */
export interface CardTemplateOverlayConfig {
  guilloche?: {
    enabledFront?: boolean;
    enabledBack?: boolean;
    strokeFront?: string;
    strokeBack?: string;
    opacity?: number;
  };
  watermark?: { enabledFront?: boolean; enabledBack?: boolean; opacity?: number };
  photo?: CardOverlayElement;
  nama?: CardOverlayElement;
  nomorAnggota?: CardOverlayElement;
  ttl?: CardOverlayElement;
  ranting?: CardOverlayElement;
  wilayah?: CardOverlayElement;
  tingkat?: CardOverlayElement;
  qr?: CardOverlayElement;
  ttd?: CardOverlayElement;
  [key: string]: unknown;
}

export interface CardTemplateDto {
  id: string;
  name: string;
  label: string;
  frontImage: string | null;
  backImage: string | null;
  overlayConfig: CardTemplateOverlayConfig;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

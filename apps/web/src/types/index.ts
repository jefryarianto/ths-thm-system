export type Role =
  | 'superadmin'
  | 'admin_distrik'
  | 'admin_wilayah'
  | 'admin_ranting'
  | 'admin_kegiatan'
  | 'penguji'
  | 'anggota';

export interface User {
  id: string;
  email: string;
  namaLengkap: string;
  role: Role;
  rantingId: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

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

export interface Member {
  id: string;
  nomorAnggota: string;
  namaLengkap: string;
  jenisKelamin: 'L' | 'P';
  tempatLahir: string | null;
  tanggalLahir: string | null;
  alamat: string | null;
  noHp: string | null;
  email: string | null;
  fotoPath: string | null;
  statusKeanggotaan: 'aktif' | 'nonaktif' | 'pindah' | 'keluar' | 'meninggal';
  tingkat: string | null;
  statusData: 'complete' | 'incomplete';
  statusValidasi: 'pending' | 'approved' | 'rejected';
  rantingId: string;
  ranting?: Ranting;
  createdAt: string;
  updatedAt: string;
}

export interface Candidate {
  id: string;
  namaLengkap: string;
  jenisKelamin: 'L' | 'P';
  tempatLahir: string | null;
  tanggalLahir: string | null;
  alamat: string | null;
  noHp: string | null;
  email: string | null;
  status: 'diusulkan' | 'mengikuti_pendadaran' | 'lulus' | 'gagal' | 'dibatalkan';
  rantingId: string;
  usulOlehUserId: string;
  createdAt: string;
  updatedAt: string;
}

export interface Ranting {
  id: string;
  kodeRanting: string;
  nama: string;
  lokasiLatihan: string | null;
  wilayah?: Wilayah;
}

export interface Wilayah {
  id: string;
  kodeWilayah: string;
  nama: string;
  distrik?: Distrik;
}

export interface Distrik {
  id: string;
  kodeDistrik: string;
  nama: string;
}

export interface ApiError {
  success: false;
  message: string;
  statusCode: number;
  errors?: any[];
}
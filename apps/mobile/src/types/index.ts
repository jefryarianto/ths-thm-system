export interface AssessmentsAspect {
  id: string;
  kodeAspek: string;
  namaAspek: string;
  deskripsi?: string;
  bobot: number | string;
  isActive?: boolean;
  kegiatanId?: string | null;
  createdAt?: string;
  updatedAt?: string;
  itemPenilaian?: AssessmentsItem[];
}

export interface AssessmentsItem {
  id: string;
  aspekId: string;
  kodeItem: string;
  namaItem: string;
  skorMaksimal: number | string;
  bobot: number | string;
  urutan?: number;
  isActive?: boolean;
  createdAt?: string;
  updatedAt?: string;
  aspek?: { kodeAspek: string; namaAspek: string; bobot: number | string };
}

export interface AssessmentsScore {
  id: string;
  aspekId: string;
  itemId: string;
  kegiatanId?: string;
  calonAnggotaId?: string;
  nilai: number;
  catatan?: string;
  tanggal?: string;
  calonAnggota?: { namaLengkap: string };
  penguji?: { id: string; namaLengkap: string };
  itemPenilaian?: AssessmentsItem;
}

export interface Graduation {
  id: string;
  nama: string;
  lokasi?: string;
  tanggalMulai: string;
  tanggalSelesai?: string;
  status: string;
  penguji?: { id: string; namaLengkap: string };
  createdAt?: string;
}

export interface GraduationParticipant {
  id: string;
  namaLengkap: string;
  status: string;
  ranting?: { id: string; nama: string };
}

export interface GraduationEvaluation {
  id: string;
  calonAnggotaId: string;
  skor: number;
  komentar?: string | null;
  calonAnggota?: { id: string; namaLengkap: string; ranting?: { nama: string } };
  itemPenilaian?: {
    namaItem: string;
    skorMaksimal: number;
    bobot: number;
    aspek?: { namaAspek: string };
  };
  penguji?: { id: string; namaLengkap: string };
}

export interface GraduationResult {
  id: string;
  calonAnggotaId: string;
  totalSkor: number;
  ranking: number | null;
  statusKelulusan: 'lulus' | 'gagal';
  statusValidasi: 'pending' | 'approved' | 'rejected';
  divalidasiAt?: string | null;
  calonAnggota?: {
    id: string;
    namaLengkap: string;
    email?: string | null;
    ranting?: { nama: string } | null;
  } | null;
}

export interface Dues {
  id: string;
  periode: string;
  jumlah: number;
  status: string;
  tanggalBayar?: string;
  tanggalJatuhTempo?: string;
  createdAt: string;
}

export interface DuesPayment {
  id: string;
  iuranId: string;
  jumlah: number;
  metode?: string;
  catatan?: string;
  buktiPembayaran?: string;
  status: string;
  createdAt: string;
}

export interface Document {
  id: string;
  nomorDokumen: string;
  tipe: string;
  anggota?: { namaLengkap: string };
  status: string;
  filePath?: string;
  qrCode?: string;
  verificationUrl?: string;
  createdAt: string;
  updatedAt?: string;
}

export interface ForumCategory {
  id: string;
  nama: string;
  deskripsi: string | null;
  order: number;
  _count?: { threads: number };
}

export interface ForumThread {
  id: string;
  categoryId: string;
  authorId: string;
  judul: string;
  konten: string;
  isPinned: boolean;
  isLocked: boolean;
  viewCount: number;
  createdAt: string;
  updatedAt: string;
  author: { id: string; namaLengkap: string; nomorAnggota: string };
  category?: { id: string; nama: string };
  _count?: { posts: number };
}

export interface ForumPost {
  id: string;
  threadId: string;
  authorId: string;
  konten: string;
  isSolution: boolean;
  createdAt: string;
  updatedAt: string;
  author: { id: string; namaLengkap: string; nomorAnggota: string };
}

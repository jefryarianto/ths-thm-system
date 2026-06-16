export interface AssessmentsAspect {
  id: string;
  nama: string;
  deskripsi?: string;
  status: string;
  itemCount?: number;
  createdAt?: string;
  updatedAt?: string;
}

export interface AssessmentsItem {
  id: string;
  aspekId: string;
  nama: string;
  bobot: number;
  tipe: string;
  aspek?: { nama: string };
}

export interface AssessmentsScore {
  id: string;
  aspekId: string;
  itemId: string;
  anggotaId: string;
  nilai: number;
  catatan?: string;
  tanggal?: string;
  anggota?: { namaLengkap: string };
  item?: { nama: string; bobot: number };
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
  graduasiId: string;
  anggotaId: string;
  statusKelulusan: string;
  anggota?: { namaLengkap: string; nomorAnggota?: string };
}

export interface GraduationEvaluation {
  id: string;
  graduasiId: string;
  anggotaId: string;
  aspekId: string;
  nilai: number;
  catatan?: string;
  anggota?: { namaLengkap: string };
  aspek?: { nama: string };
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
  createdAt: string;
  updatedAt?: string;
}
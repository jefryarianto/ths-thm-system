export type Tingkatan = 'pratama' | 'tamtama' | 'muda' | 'madya' | 'utama';
export type JenisKelamin = 'L' | 'P';
export interface Anggota {
  /** ID anggota (dipakai untuk pratinjau/unduh KTA). */
  id?: string;
  nama: string;
  jenisKelamin?: JenisKelamin;
  nomor: string;
  ranting: string;
  /** Nama distrik mentah dari API; dinormalisasi saat render. */
  distrik?: string;
  tempatDadar: string;
  tahunDadar: string;
  /** YYYY-MM, contoh 2031-10. Kosong: placeholder. */
  berlakuSampai?: string;
  tingkatan: Tingkatan;
  /** Data URI, blob URL, same-origin URL, atau URL dengan CORS diizinkan. */
  fotoUrl?: string;
  /** Gunakan QR gambar yang sudah bergaya + quiet zone. Prioritas di atas verifyUrl. */
  qrImageUrl?: string;
  /** Dibuat menjadi QR standar dengan ECC H; website/verifikasi disediakan pemilik. */
  verifyUrl?: string;
  tempatTanggalLahir: string;
  pekerjaan: string;
  status: string;
  tanggalPelantikan?: string;
  tahunPelantikan?: string;
  alamat: string;
  tanggalTerbit?: string;
  koordinator?: string;
  tandaTanganUrl?: string;
}

export interface KtaSnapshotNamedRef {
  id: string;
  nama: string;
}

export interface KtaSnapshotV1 {
  version: 1;
  submittedAt: string;
  submittedBy: { id: string; role: string };
  payload: unknown | null;
  anggota: {
    id: string;
    nomorAnggota: string | null;
    namaLengkap: string | null;
    jenisKelamin: string | null;
    tempatLahir: string | null;
    tanggalLahir: string | null;
    alamat: string | null;
    noHp: string | null;
    email: string | null;
    fotoPath: string | null;
    statusKeanggotaan: string | null;
    tingkat: string | null;
    tempatDadar: string | null;
    tahunDadar: string | null;
    pekerjaan: string | null;
    pelantikan?: string | null;
    ranting: KtaSnapshotNamedRef | null;
    wilayah: KtaSnapshotNamedRef | null;
    distrik: KtaSnapshotNamedRef | null;
    alamatDistrik: string | null;
  };
  missingFields: string[];
}

export interface KtaReviewHistory {
  id: string;
  level: string;
  action: string;
  actorRole: string;
  catatan: string | null;
  isSkipped: boolean;
  skippedReason: string | null;
  createdAt: string;
}

export interface KtaReviewApplication {
  id: string;
  nomorAnggota?: string | null;
  status: string;
  biaya: number | string | null;
  rekeningTujuan: string | null;
  statusPembayaran: string;
  catatanAdmin: string | null;
  createdAt: string;
  updatedAt?: string;
  submittedByRole?: string;
  buktiBayarPath: string | null;
  submittedSnapshot: KtaSnapshotV1 | null;
  anggota: {
    id?: string;
    namaLengkap: string;
    nomorAnggota?: string | null;
    ranting?: {
      id?: string;
      nama: string;
      wilayah?: {
        id?: string;
        nama: string;
        distrik?: { id?: string; nama: string } | null;
      } | null;
    } | null;
  };
  histories: KtaReviewHistory[];
}

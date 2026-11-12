export type Tingkatan = 'pratama' | 'tamtama' | 'muda' | 'madya' | 'utama';
export type JenisKelamin = 'L' | 'P';
export interface Anggota {
  /** ID anggota (dipakai untuk pratinjau/unduh KTA). */
  id?: string;
  nama: string;
  jenisKelamin?: JenisKelamin;
  nomor: string;
  ranting: string;
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

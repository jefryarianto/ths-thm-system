import type { PublicClaimFormValues } from './public-claim-payload';

export interface ClaimFormOrg {
  distrikId: string;
  wilayahId: string;
  rantingId: string;
}

export function validateClaimForm(
  form: PublicClaimFormValues,
  org: ClaimFormOrg,
  buktiFileCount: number,
): Record<string, string> {
  const errs: Record<string, string> = {};
  if (form.namaLengkap.trim().length < 3) errs.namaLengkap = 'Nama lengkap minimal 3 karakter';
  if (!org.distrikId) errs.distrikId = 'Pilih distrik';
  if (!org.wilayahId) errs.wilayahId = 'Pilih wilayah';
  if (!org.rantingId) errs.rantingId = 'Pilih ranting';
  if (!form.tempatLahir.trim()) errs.tempatLahir = 'Tempat lahir wajib diisi';
  if (!form.tanggalLahir) errs.tanggalLahir = 'Tanggal lahir wajib diisi';
  if (!form.tempatDadar.trim()) errs.tempatDadar = 'Tempat pendadaran wajib diisi';
  if (!form.tahunDadar.trim()) errs.tahunDadar = 'Tahun pendadaran wajib diisi';
  if (!form.alamat.trim()) errs.alamat = 'Alamat wajib diisi';
  if (!form.email.trim()) errs.email = 'Email wajib diisi';
  else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email))
    errs.email = 'Format email tidak valid';
  if (form.noHp && !/^(\+?62|0)\d{8,13}$/.test(form.noHp.replace(/[\s-]/g, '')))
    errs.noHp = 'Format No. HP tidak valid (mulai 0 atau +62, 9-14 digit)';
  if (form.modeBukti === 'unggah' && buktiFileCount === 0)
    errs.buktiFiles = 'Unggah minimal satu berkas bukti';
  if (form.modeBukti === 'cerita') {
    const panjang = form.ceritaHistori.trim().length;
    if (panjang < 20 || panjang > 1000)
      errs.ceritaHistori = 'Cerita histori harus antara 20 sampai 1000 karakter';
  }
  return errs;
}

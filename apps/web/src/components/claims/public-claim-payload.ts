export interface PublicClaimFormValues {
  namaLengkap: string;
  jenisKelamin: string;
  tempatLahir: string;
  tanggalLahir: string;
  tempatDadar: string;
  tahunDadar: string;
  alamat: string;
  noHp: string;
  email: string;
  catatan: string;
  modeBukti: string;
  ceritaHistori: string;
}

export interface PublicClaimFile {
  file: File;
}

const SKIPPED_TEXT_FIELDS = new Set(['modeBukti', 'ceritaHistori']);

export function buildPublicClaimFormData(
  form: PublicClaimFormValues,
  rantingId: string,
  buktiFiles: PublicClaimFile[],
): FormData {
  const data = new FormData();

  for (const [key, value] of Object.entries(form)) {
    if (SKIPPED_TEXT_FIELDS.has(key) || !value) continue;
    data.append(key, value);
  }

  data.append('modeBukti', form.modeBukti);

  if (form.modeBukti === 'cerita') {
    data.append('ceritaHistori', form.ceritaHistori.trim());
  }

  data.append('rantingId', rantingId);
  data.append('tipe', 'keanggotaan');

  if (form.modeBukti === 'unggah') {
    buktiFiles.forEach(({ file }) => data.append('buktiFiles', file));
  }

  return data;
}

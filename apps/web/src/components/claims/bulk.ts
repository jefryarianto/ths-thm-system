export type BulkJenisKelamin = 'L' | 'P' | '';

export interface BulkClaimRow {
  namaLengkap: string;
  email: string;
  jenisKelamin: BulkJenisKelamin;
  tempatDadar: string;
  tahunDadar: string;
  noHp: string;
  catatan: string;
}

export function validateBulkRows(rows: BulkClaimRow[]): string | null {
  for (const [index, row] of rows.entries()) {
    if (!row.namaLengkap.trim() || !row.email.trim() || !row.tempatDadar.trim() || !row.tahunDadar.trim()) {
      return `Baris ${index + 1}: nama, email, tempat dadar, dan tahun dadar wajib diisi`;
    }
    if (!row.jenisKelamin) {
      return `Baris ${index + 1}: jenis kelamin wajib diisi`;
    }
  }
  return null;
}

export function buildBulkPayload(rows: BulkClaimRow[], rantingId: string, batchName: string) {
  return {
    batchName,
    claims: rows.map((row) => ({
      ...row,
      tipe: 'keanggotaan',
      rantingId,
    })),
  };
}

export const MAX_BULK_KTA = 100;

export function validateBulkKtaSelection(anggotaIds: string[]): string | null {
  if (anggotaIds.length === 0) {
    return 'Pilih minimal satu anggota';
  }
  if (anggotaIds.length > MAX_BULK_KTA) {
    return 'Maksimal 100 anggota per batch';
  }
  return null;
}

export function buildBulkKtaPayload(
  anggotaIds: string[],
  batchName: string,
): { anggotaIds: string[]; batchName: string } {
  return {
    anggotaIds,
    batchName: batchName.trim(),
  };
}

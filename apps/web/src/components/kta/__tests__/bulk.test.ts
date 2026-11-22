import { describe, expect, it } from 'vitest';
import { buildBulkKtaPayload, validateBulkKtaSelection } from '../bulk';

describe('bulk kta payload', () => {
  it('menolak selected kosong', () => {
    expect(validateBulkKtaSelection([])).toBe('Pilih minimal satu anggota');
  });

  it('menolak lebih dari 100 anggota', () => {
    const ids = Array.from({ length: 101 }, (_, i) => `m${i + 1}`);
    expect(validateBulkKtaSelection(ids)).toBe('Maksimal 100 anggota per batch');
  });

  it('membuat payload dengan batchName ter-trim', () => {
    expect(buildBulkKtaPayload(['m1'], '  Batch A  ')).toEqual({
      anggotaIds: ['m1'],
      batchName: 'Batch A',
    });
  });
});

import { describe, it, expect } from 'vitest';
import { buildBulkPayload, validateBulkRows } from '../bulk';

const completeRow = {
  namaLengkap: 'Budi Santoso',
  email: 'budi@test.com',
  jenisKelamin: 'L' as const,
  tempatDadar: 'Bandung',
  tahunDadar: '2012',
  noHp: '081234567890',
  catatan: '',
};

describe('bulk claim payload', () => {
  it('rejects rows without jenisKelamin', () => {
    expect(validateBulkRows([{ ...completeRow, jenisKelamin: '' }])).toBe(
      'Baris 1: jenis kelamin wajib diisi',
    );
  });

  it('includes jenisKelamin and rantingId in the submitted payload', () => {
    const payload = buildBulkPayload([completeRow], 'r1', 'Batch test');

    expect(payload.batchName).toBe('Batch test');
    expect(payload.claims[0]).toEqual(
      expect.objectContaining({
        tipe: 'keanggotaan',
        rantingId: 'r1',
        jenisKelamin: 'L',
      }),
    );
  });
});

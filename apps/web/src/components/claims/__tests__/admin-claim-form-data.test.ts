import { describe, it, expect } from 'vitest';
import { buildAdminClaimFormData } from '../admin-claim-form-data';
import type { PublicClaimFormValues } from '../public-claim-payload';

const baseForm: PublicClaimFormValues = {
  namaLengkap: 'Andi Pratama',
  jenisKelamin: 'L',
  tempatLahir: 'Jakarta',
  tanggalLahir: '1990-01-01',
  tempatDadar: 'Jakarta',
  tahunDadar: '2012',
  pekerjaan: '',
  pelantikan: '',
  alamat: 'Jalan Contoh 1',
  noHp: '081234567890',
  email: 'andi@example.com',
  catatan: '',
  modeBukti: 'unggah',
  ceritaHistori: '',
};

const fileFixture = new File(['bukti'], 'bukti.pdf', { type: 'application/pdf' });

describe('buildAdminClaimFormData', () => {
  it('builds admin-shaped cerita mode with no files', () => {
    const data = buildAdminClaimFormData(
      { ...baseForm, modeBukti: 'cerita', ceritaHistori: 'Cerita histori anggota yang cukup panjang.' },
      'ranting-admin',
      [],
    );
    expect(data.getAll('modeBukti')).toEqual(['cerita']);
    expect(data.has('buktiFiles')).toBe(false);
    expect(data.get('ceritaHistori')).toContain('Cerita histori anggota');
  });

  it('builds admin-shaped unggah mode with files', () => {
    const data = buildAdminClaimFormData(
      { ...baseForm, modeBukti: 'unggah' },
      'ranting-admin',
      [{ file: fileFixture }],
    );
    expect(data.getAll('buktiFiles')).toHaveLength(1);
  });
});

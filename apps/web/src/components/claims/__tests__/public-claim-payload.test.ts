import { describe, it, expect } from 'vitest';
import {
  buildPublicClaimFormData,
  type PublicClaimFormValues,
} from '../public-claim-payload';

const baseForm: PublicClaimFormValues = {
  namaLengkap: 'Andi Pratama',
  jenisKelamin: 'L',
  tempatLahir: 'Jakarta',
  tanggalLahir: '1990-01-01',
  tempatDadar: 'Jakarta',
  tahunDadar: '2012',
  alamat: 'Jalan Contoh 1',
  noHp: '081234567890',
  email: 'andi@example.com',
  catatan: '',
  modeBukti: 'unggah',
  ceritaHistori: '',
};

describe('buildPublicClaimFormData', () => {
  it('sends upload-mode fields exactly once with evidence files', () => {
    const file = new File(['bukti'], 'bukti.pdf', { type: 'application/pdf' });
    const data = buildPublicClaimFormData(baseForm, 'ranting-1', [{ file }]);

    expect(data.getAll('modeBukti')).toEqual(['unggah']);
    expect(data.getAll('rantingId')).toEqual(['ranting-1']);
    expect(data.getAll('tipe')).toEqual(['keanggotaan']);
    expect(data.getAll('namaLengkap')).toEqual(['Andi Pratama']);
    expect(data.getAll('buktiFiles')).toEqual([file]);
    expect(data.has('ceritaHistori')).toBe(false);
  });

  it('sends story mode with ceritaHistori exactly once and no files', () => {
    const cerita = 'Saya berlatih sejak 2010 dan didadar pada 2012 di Jakarta.';
    const file = new File(['bukti'], 'bukti.pdf', { type: 'application/pdf' });
    const data = buildPublicClaimFormData(
      { ...baseForm, modeBukti: 'cerita', ceritaHistori: cerita },
      'ranting-1',
      [{ file }],
    );

    expect(data.getAll('modeBukti')).toEqual(['cerita']);
    expect(data.getAll('ceritaHistori')).toEqual([cerita]);
    expect(data.has('buktiFiles')).toBe(false);
  });

  it('does not leak stale ceritaHistori in upload mode', () => {
    const data = buildPublicClaimFormData(
      { ...baseForm, ceritaHistori: 'cerita lama' },
      'ranting-1',
      [],
    );

    expect(data.getAll('modeBukti')).toEqual(['unggah']);
    expect(data.has('ceritaHistori')).toBe(false);
  });

  it('omits empty optional fields and keeps required text fields single-valued', () => {
    const data = buildPublicClaimFormData(
      { ...baseForm, catatan: '', noHp: '' },
      'ranting-1',
      [],
    );

    expect(data.has('catatan')).toBe(false);
    expect(data.has('noHp')).toBe(false);
    expect(data.getAll('email')).toEqual(['andi@example.com']);
  });
});

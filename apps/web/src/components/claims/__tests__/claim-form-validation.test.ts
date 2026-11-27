import { describe, it, expect } from 'vitest';
import { validateClaimForm } from '../claim-form-validation';
import type { PublicClaimFormValues } from '../public-claim-payload';

const validForm: PublicClaimFormValues = {
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

const validOrg = {
  distrikId: 'distrik-1',
  wilayahId: 'wilayah-1',
  rantingId: 'ranting-1',
};

describe('validateClaimForm', () => {
  it('accepts a valid form', () => {
    expect(validateClaimForm(validForm, validOrg, 1)).toEqual({});
  });

  it('rejects a name shorter than three characters', () => {
    expect(validateClaimForm({ ...validForm, namaLengkap: 'Ab' }, validOrg, 1).namaLengkap)
      .toBe('Nama lengkap minimal 3 karakter');
  });

  it('requires an evidence file in upload mode', () => {
    expect(validateClaimForm({ ...validForm, modeBukti: 'unggah' }, validOrg, 0).buktiFiles)
      .toBe('Unggah minimal satu berkas bukti');
  });

  it('requires a story between 20 and 1000 characters in story mode', () => {
    expect(validateClaimForm({ ...validForm, modeBukti: 'cerita', ceritaHistori: 'pendek' }, validOrg, 0).ceritaHistori)
      .toBe('Cerita histori harus antara 20 sampai 1000 karakter');
  });

  it('rejects a malformed email', () => {
    expect(validateClaimForm({ ...validForm, email: 'bukan-email' }, validOrg, 1).email)
      .toBe('Format email tidak valid');
  });

  it('rejects a malformed phone number', () => {
    expect(validateClaimForm({ ...validForm, noHp: '123' }, validOrg, 1).noHp)
      .toBe('Format No. HP tidak valid (mulai 0 atau +62, 9-14 digit)');
  });

  it('requires every organization selection', () => {
    expect(validateClaimForm(validForm, { distrikId: '', wilayahId: '', rantingId: '' }, 0)).toMatchObject({
      distrikId: 'Pilih distrik',
      wilayahId: 'Pilih wilayah',
      rantingId: 'Pilih ranting',
    });
  });

  it('keeps the first error in public form insertion order', () => {
    const errors = validateClaimForm(
      { ...validForm, namaLengkap: 'Ab' },
      { distrikId: '', wilayahId: '', rantingId: '' },
      0,
    );

    expect(Object.values(errors)[0]).toBe('Nama lengkap minimal 3 karakter');
  });
});

import { describe, it, expect } from 'vitest';
import { FLAT_STATUS_LABELS } from '../constants';

describe('FLAT_STATUS_LABELS', () => {
  it('contains keanggotaan status labels', () => {
    expect(FLAT_STATUS_LABELS.aktif).toBe('Aktif');
    expect(FLAT_STATUS_LABELS.nonaktif).toBe('Nonaktif');
    expect(FLAT_STATUS_LABELS.pindah).toBe('Pindah');
    expect(FLAT_STATUS_LABELS.keluar).toBe('Keluar');
    expect(FLAT_STATUS_LABELS.meninggal).toBe('Meninggal');
  });

  it('contains validasi status labels', () => {
    expect(FLAT_STATUS_LABELS.pending).toBe('Pending');
    expect(FLAT_STATUS_LABELS.approved).toBe('Disetujui');
    expect(FLAT_STATUS_LABELS.rejected).toBe('Ditolak');
  });

  it('contains data status labels', () => {
    expect(FLAT_STATUS_LABELS.complete).toBe('Lengkap');
    expect(FLAT_STATUS_LABELS.incomplete).toBe('Belum Lengkap');
  });

  it('contains dues status labels', () => {
    expect(FLAT_STATUS_LABELS.lunas).toBe('Lunas');
    expect(FLAT_STATUS_LABELS.menunggak).toBe('Menunggak');
    expect(FLAT_STATUS_LABELS.belum_dibayar).toBe('Belum Dibayar');
  });

  it('has all expected keys', () => {
    const expectedKeys = [
      'aktif',
      'nonaktif',
      'pindah',
      'keluar',
      'meninggal',
      'pending',
      'approved',
      'rejected',
      'complete',
      'incomplete',
      'lunas',
      'menunggak',
      'belum_dibayar',
    ];
    expect(Object.keys(FLAT_STATUS_LABELS).sort()).toEqual(expectedKeys.sort());
  });
});

import { getSelectiveResetDeletePlan } from './sample-data-reset-plan';

const EXPECTED_MODELS = [
  'iuranReminder',
  'riskFlag',
  'dokumenVersion',
  'documentJob',
  'kepengurusan',
  'calonAnggota',
  'latihan',
  'tandaTangan',
  'dokumenOrganisasi',
  'disposisi',
  'notifikasi',
  'deviceToken',
  'kegiatanPeserta',
  'presensiKegiatan',
  'checkIn',
  'dokumenKegiatan',
  'aspekPenilaian',
  'penugasanPenguji',
  'nilaiPendadaran',
  'hasilPendadaran',
  'ujianPraktek',
  'pesertaPendadaran',
  'undanganPendadaran',
  'kegiatan',
  'anggota',
  'iuran',
  'jabatan',
  'periode',
  'user',
];

const EXPECTED_PHASES = [
  'stale',
  'stale',
  'stale',
  'stale',
  'kepengurusan',
  'user-blocker',
  'user-blocker',
  'user-blocker',
  'user-blocker',
  'user-blocker',
  'user-blocker',
  'user-blocker',
  'kegiatan-child',
  'kegiatan-child',
  'kegiatan-child',
  'kegiatan-child',
  'kegiatan-child',
  'kegiatan-child',
  'kegiatan-child',
  'kegiatan-child',
  'kegiatan-child',
  'kegiatan-child',
  'kegiatan-child',
  'kegiatan',
  'anggota',
  'iuran',
  'jabatan',
  'periode',
  'users',
];

describe('getSelectiveResetDeletePlan', () => {
  it('deletes stale rows, blockers, children, then parents in the exact safe order', () => {
    const plan = getSelectiveResetDeletePlan();

    expect(plan.map((step) => step.model)).toEqual(EXPECTED_MODELS);
    expect(plan.map((step) => step.phase)).toEqual(EXPECTED_PHASES);
    expect(new Set(plan.map((step) => step.model)).size).toBe(29);
  });

  it('places every user blocker and kegiatan child before its parent', () => {
    const models = getSelectiveResetDeletePlan().map((step) => step.model);
    const userIndex = models.indexOf('user');
    const kegiatanIndex = models.indexOf('kegiatan');

    for (const blocker of [
      'calonAnggota',
      'latihan',
      'tandaTangan',
      'dokumenOrganisasi',
      'disposisi',
      'notifikasi',
      'deviceToken',
    ]) {
      expect(models.indexOf(blocker)).toBeLessThan(userIndex);
    }

    for (const child of [
      'kegiatanPeserta',
      'presensiKegiatan',
      'checkIn',
      'dokumenKegiatan',
      'aspekPenilaian',
      'penugasanPenguji',
      'nilaiPendadaran',
      'hasilPendadaran',
      'ujianPraktek',
      'pesertaPendadaran',
      'undanganPendadaran',
    ]) {
      expect(models.indexOf(child)).toBeLessThan(kegiatanIndex);
    }

    expect(models.indexOf('anggota')).toBeGreaterThan(kegiatanIndex);
    expect(models.indexOf('iuran')).toBeGreaterThan(models.indexOf('anggota'));
    expect(models.indexOf('jabatan')).toBeGreaterThan(models.indexOf('iuran'));
    expect(models.indexOf('periode')).toBeGreaterThan(models.indexOf('jabatan'));
    expect(userIndex).toBe(28);
  });
});

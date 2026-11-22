import { buildKtaSeedData } from './seed-kta-data';

describe('buildKtaSeedData', () => {
  const createdAt = new Date('2026-01-02T03:04:05.000Z');
  const updatedAt = new Date('2026-01-03T04:05:06.000Z');

  it('builds kartu_anggota document and CARD_GENERATED KTA with literal fields', () => {
    const result = buildKtaSeedData({
      anggotaId: 'agg-1',
      nomorAnggota: '0114-0101-001-1993',
      createdById: 'user-7',
      dokumenCreatedAt: createdAt,
      dokumenUpdatedAt: updatedAt,
    });

    expect(result.dokumen).toEqual({
      anggotaId: 'agg-1',
      tipe: 'kartu_anggota',
      nomorDokumen: 'KTA-0114-0101-001-1993',
      status: 'generated',
      createdAt,
    });

    expect(result.ktaApplication).toEqual({
      anggotaId: 'agg-1',
      nomorAnggota: '0114-0101-001-1993',
      status: 'CARD_GENERATED',
      biaya: null,
      rekeningTujuan: null,
      buktiBayarPath: null,
      statusPembayaran: 'LUNAS',
      diterbitkanOleh: null,
      diterbitkanAt: createdAt,
      submittedById: 'user-7',
      submittedByRole: 'member',
      batchId: null,
      catatanAdmin: 'Seeded from kartu_anggota document',
      createdAt,
      updatedAt,
    });

    expect(result.histories).toEqual([
      {
        level: 'RANTING',
        action: 'SKIPPED',
        actorId: 'system',
        actorRole: 'system',
        catatan: 'Level RANTING auto-approved during seed (KTA already existed)',
        isSkipped: true,
        skippedReason: 'Seed sample KTA',
        createdAt,
      },
      {
        level: 'WILAYAH',
        action: 'SKIPPED',
        actorId: 'system',
        actorRole: 'system',
        catatan: 'Level WILAYAH auto-approved during seed (KTA already existed)',
        isSkipped: true,
        skippedReason: 'Seed sample KTA',
        createdAt,
      },
      {
        level: 'DISTRIK',
        action: 'SKIPPED',
        actorId: 'system',
        actorRole: 'system',
        catatan: 'Level DISTRIK auto-approved during seed (KTA already existed)',
        isSkipped: true,
        skippedReason: 'Seed sample KTA',
        createdAt,
      },
      {
        level: 'NASIONAL',
        action: 'SKIPPED',
        actorId: 'system',
        actorRole: 'system',
        catatan: 'Level NASIONAL auto-approved during seed (KTA already existed)',
        isSkipped: true,
        skippedReason: 'Seed sample KTA',
        createdAt,
      },
      {
        level: 'DISTRIK',
        action: 'CARD_GENERATED',
        actorId: 'user-7',
        actorRole: 'admin_distrik',
        catatan: 'KTA generated for 0114-0101-001-1993',
        isSkipped: false,
        skippedReason: null,
        createdAt: updatedAt,
      },
    ]);
  });

  it('falls back to system when the member has no creator', () => {
    const result = buildKtaSeedData({
      anggotaId: 'agg-2',
      nomorAnggota: '0114-0101-002-2020',
      createdById: null,
      dokumenCreatedAt: createdAt,
    });

    expect(result.ktaApplication.submittedById).toBe('system');
    expect(result.ktaApplication.submittedByRole).toBe('member');
    expect(result.ktaApplication.diterbitkanAt).toBe(createdAt);
    expect(result.ktaApplication.updatedAt).toBe(createdAt);
    expect(result.dokumen.nomorDokumen).toBe('KTA-0114-0101-002-2020');
    expect(result.histories[4]).toEqual({
      level: 'DISTRIK',
      action: 'CARD_GENERATED',
      actorId: 'system',
      actorRole: 'admin_distrik',
      catatan: 'KTA generated for 0114-0101-002-2020',
      isSkipped: false,
      skippedReason: null,
      createdAt,
    });
  });
});

export interface SeedKtaSource {
  anggotaId: string;
  nomorAnggota: string;
  createdById?: string | null;
  dokumenCreatedAt: Date;
  dokumenUpdatedAt?: Date;
}

export function buildKtaSeedData(source: SeedKtaSource) {
  const nomorDokumen = `KTA-${source.nomorAnggota}`;
  const submittedById = source.createdById || 'system';
  const updatedAt = source.dokumenUpdatedAt ?? source.dokumenCreatedAt;
  const levels = ['RANTING', 'WILAYAH', 'DISTRIK', 'NASIONAL'] as const;

  return {
    dokumen: {
      anggotaId: source.anggotaId,
      tipe: 'kartu_anggota' as const,
      nomorDokumen,
      status: 'generated' as const,
      createdAt: source.dokumenCreatedAt,
    },
    ktaApplication: {
      anggotaId: source.anggotaId,
      nomorAnggota: source.nomorAnggota,
      status: 'CARD_GENERATED' as const,
      biaya: null,
      rekeningTujuan: null,
      buktiBayarPath: null,
      statusPembayaran: 'LUNAS' as const,
      diterbitkanOleh: null,
      diterbitkanAt: source.dokumenCreatedAt,
      submittedById,
      submittedByRole: 'member' as const,
      batchId: null,
      catatanAdmin: 'Seeded from kartu_anggota document',
      createdAt: source.dokumenCreatedAt,
      updatedAt,
    },
    histories: [
      ...levels.map((level) => ({
        level,
        action: 'SKIPPED' as const,
        actorId: 'system',
        actorRole: 'system',
        catatan: `Level ${level} auto-approved during seed (KTA already existed)`,
        isSkipped: true,
        skippedReason: 'Seed sample KTA',
        createdAt: source.dokumenCreatedAt,
      })),
      {
        level: 'DISTRIK' as const,
        action: 'CARD_GENERATED' as const,
        actorId: submittedById,
        actorRole: 'admin_distrik',
        catatan: `KTA generated for ${source.nomorAnggota}`,
        isSkipped: false,
        skippedReason: null,
        createdAt: updatedAt,
      },
    ],
  };
}

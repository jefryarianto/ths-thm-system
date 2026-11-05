import { PrismaClient, KtaAppStatus, KtaAppLevel, KtaAppAction } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Starting KTA data migration...');

  // Find all existing kartu_anggota documents
  const existingCards = await prisma.dokumen.findMany({
    where: { tipe: 'kartu_anggota' },
    include: {
      anggota: { include: { ranting: { include: { wilayah: { include: { distrik: true } } } } } },
      qrValidations: { orderBy: { createdAt: 'asc' } },
    },
  });

  console.log(`Found ${existingCards.length} existing KTA documents`);

  let migrated = 0;
  let skipped = 0;

  for (const doc of existingCards) {
    // Check if already migrated
    const existingApp = await prisma.ktaApplication.findFirst({
      where: { anggotaId: doc.anggotaId, nomorAnggota: doc.nomorDokumen.replace('KTA-', '') },
    });

    if (existingApp) {
      console.log(`Skipping ${doc.anggotaId} - already migrated`);
      skipped++;
      continue;
    }

    // Determine status based on document status
    let status: KtaAppStatus = 'CARD_GENERATED';
    if (doc.status === 'revoked') status = 'REJECTED';

    // Get member's nomorAnggota
    const nomorAnggota = doc.anggota?.nomorAnggota || doc.nomorDokumen.replace('KTA-', '');

    // Create KtaApplication
    const app = await prisma.ktaApplication.create({
      data: {
        anggotaId: doc.anggotaId,
        nomorAnggota,
        status,
        biaya: null,
        rekeningTujuan: null,
        buktiBayarPath: null,
        statusPembayaran: 'LUNAS',
        diterbitkanOleh: null,
        diterbitkanAt: doc.createdAt,
        submittedById: doc.anggota?.createdById || 'system',
        submittedByRole: 'member',
        batchId: null,
        catatanAdmin: 'Migrated from existing KTA document',
        createdAt: doc.createdAt,
        updatedAt: doc.updatedAt,
      },
    });

    // Create history entries for each level (all skipped/approved since card already exists)
    const levels: KtaAppLevel[] = ['RANTING', 'WILAYAH', 'DISTRIK', 'NASIONAL'];
    const now = new Date();

    for (const level of levels) {
      await prisma.ktaAppHistory.create({
        data: {
          ktaApplicationId: app.id,
          level,
          action: 'SKIPPED',
          actorId: 'system',
          actorRole: 'system',
          catatan: `Level ${level} auto-approved during migration (KTA already existed)`,
          isSkipped: true,
          skippedReason: 'Migration from existing KTA',
          createdAt: doc.createdAt,
        },
      });
    }

    // Add final history for card generation
    await prisma.ktaAppHistory.create({
      data: {
        ktaApplicationId: app.id,
        level: 'DISTRIK',
        action: 'CARD_GENERATED',
        actorId: doc.anggota?.createdById || 'system',
        actorRole: 'admin_distrik',
        catatan: `KTA generated (migrated from existing document ${doc.id})`,
        isSkipped: false,
        createdAt: doc.updatedAt,
      },
    });

    // Update QR validation records to link to the new application
    if (doc.qrValidations.length > 0) {
      // The QR validations already exist and are linked to the dokumen
      // We just need to ensure they're accessible
      console.log(`  ${doc.qrValidations.length} QR validations found for ${doc.anggotaId}`);
    }

    migrated++;
    console.log(`Migrated ${doc.anggotaId} (${nomorAnggota}) - status: ${status}`);
  }

  console.log(`Migration complete: ${migrated} migrated, ${skipped} skipped`);
}

main()
  .catch((e) => {
    console.error('Migration failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

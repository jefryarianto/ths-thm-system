import { PrismaClient } from '@prisma/client';
import { backupBerita } from './backup-berita';
import { getSelectiveResetDeletePlan } from '../src/common/utils/sample-data-reset-plan';

type DeleteDelegate = { deleteMany: () => Promise<{ count: number }> };

export async function executeSelectiveReset(prisma: PrismaClient): Promise<Record<string, number>> {
  const result: Record<string, number> = {};

  for (const step of getSelectiveResetDeletePlan()) {
    const delegate = (prisma as unknown as Record<string, DeleteDelegate>)[step.model];
    if (!delegate || typeof delegate.deleteMany !== 'function') {
      throw new Error(`Delegate Prisma tidak ditemukan untuk model ${step.model}`);
    }
    const deleted = await delegate.deleteMany();
    result[step.model] = deleted.count;
  }

  return result;
}

async function main(): Promise<void> {
  if (!process.env.DATABASE_URL) {
    throw new Error('DATABASE_URL belum diset');
  }

  const confirmed = process.argv.includes('--yes');
  const prisma = new PrismaClient();

  try {
    console.log('Backup berita terlebih dahulu...');
    const backup = await backupBerita({ prisma });
    console.log(`✅ Backup berita berhasil: ${backup.manifestPath}`);

    if (!confirmed) {
      console.log('Mode DRY-RUN — tidak ada data yang dihapus.');
      for (const step of getSelectiveResetDeletePlan()) {
        console.log(`  ${step.phase.padEnd(14)} ${step.model}`);
      }
      console.log('Untuk menghapus data sample, jalankan dengan --yes');
      return;
    }

    const result = await executeSelectiveReset(prisma);
    for (const [model, count] of Object.entries(result)) {
      console.log(`  ${model.padEnd(24)} ${count}`);
    }
    console.log('✅ Reset sample data selesai.');
  } finally {
    await prisma.$disconnect();
  }
}

if (require.main === module) {
  main().catch((error) => {
    console.error('❌ Reset sample data gagal:', error instanceof Error ? error.message : error);
    process.exit(1);
  });
}

const { PrismaClient } = require('@prisma/client');
const fs = require('fs');
const path = require('path');
const {
  RESET_DELETE_PLAN,
  collectFilePaths,
  resolveStoredFilePath,
} = require('./lib/members-claims-reset');

const CONFIRM_FLAG = '--yes';
const KEEP_FILES_FLAG = '--keep-files';

async function main() {
  if (!process.env.DATABASE_URL) {
    throw new Error('DATABASE_URL belum diset');
  }

  const target = new URL(process.env.DATABASE_URL);
  const uploadDir = process.env.UPLOAD_DIR || './uploads';
  const storageRoot = process.env.STORAGE_ROOT || path.dirname(path.resolve(uploadDir));
  const confirmed = process.argv.includes(CONFIRM_FLAG);
  const keepFiles = process.argv.includes(KEEP_FILES_FLAG);
  const prisma = new PrismaClient();

  try {
    const sources = {
      anggota: await prisma.anggota.findMany({ select: { fotoPath: true } }),
      buktiKeanggotaan: await prisma.buktiKeanggotaan.findMany({ select: { filePath: true } }),
      dokumenPendukung: await prisma.dokumenPendukung.findMany({ select: { filePath: true } }),
      dokumen: await prisma.dokumen.findMany({ select: { filePath: true } }),
      dokumenVersion: await prisma.dokumenVersion.findMany({ select: { filePath: true } }),
      ktaApplication: await prisma.ktaApplication.findMany({ select: { buktiBayarPath: true } }),
    };
    const filePaths = collectFilePaths(sources);
    const counts = {
      anggota: await prisma.anggota.count(),
      klaim: await prisma.klaim.count(),
      klaimUnlinked: await prisma.klaim.count({ where: { anggotaId: null } }),
      iuranReminder: await prisma.iuranReminder.count(),
      dokumenVersion: await prisma.dokumenVersion.count(),
    };

    console.log('==========================================================');
    console.log(' RESET MEMBERS + CLAIMS');
    console.log('==========================================================');
    console.log(`Target DB : ${target.hostname}:${target.port || '5432'}${target.pathname}`);
    console.log(`UploadDir : ${uploadDir}`);
    console.log(`StorageRoot: ${storageRoot}`);
    console.log(`anggota=${counts.anggota} klaim=${counts.klaim} klaimUnlinked=${counts.klaimUnlinked} iuranReminder=${counts.iuranReminder} dokumenVersion=${counts.dokumenVersion}`);
    console.log(`File path terkumpul: ${filePaths.length}`);
    console.log(`Urutan hapus: ${RESET_DELETE_PLAN.join(' -> ')}`);

    if (!confirmed) {
      console.log('Mode DRY-RUN — tidak ada data yang diubah.');
      console.log(`Untuk eksekusi, jalankan dengan ${CONFIRM_FLAG}`);
      return;
    }

    const deleted = await prisma.$transaction(
      async (tx) => {
        const result = {};
        for (const model of RESET_DELETE_PLAN) {
          result[model] = await tx[model].deleteMany();
        }
        return result;
      },
      { timeout: 120000, maxWait: 10000 },
    );

    for (const [model, result] of Object.entries(deleted)) {
      console.log(`  ${model.padEnd(20)} ${result.count}`);
    }

    if (!keepFiles) {
      let removed = 0;
      let missing = 0;
      let invalid = 0;
      const candidates = [...filePaths];
      for (const row of sources.anggota) {
        if (row.fotoPath) candidates.push(`${row.fotoPath}.bg.png`);
      }
      for (const rel of candidates) {
        const full = resolveStoredFilePath(uploadDir, storageRoot, rel);
        if (!full) {
          invalid += 1;
          continue;
        }
        try {
          if (fs.existsSync(full)) {
            fs.unlinkSync(full);
            removed += 1;
          } else {
            missing += 1;
          }
        } catch (error) {
          console.error(`Gagal hapus file ${rel}:`, error instanceof Error ? error.message : error);
        }
      }
      console.log(`File dihapus: ${removed}, tidak ditemukan: ${missing}, path invalid: ${invalid}`);
    }

    console.log('Reset members + claims selesai.');
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error) => {
  console.error('Reset gagal:', error instanceof Error ? error.message : error);
  process.exit(1);
});
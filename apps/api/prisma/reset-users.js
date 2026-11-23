const { PrismaClient } = require('@prisma/client');
const { USER_RESET_DELETE_PLAN, USER_RESET_ITEM_PENILAIAN_WHERE } = require('./lib/members-claims-reset');

const CONFIRM_FLAG = '--yes';

async function main() {
  if (!process.env.DATABASE_URL) {
    throw new Error('DATABASE_URL belum diset');
  }

  const target = new URL(process.env.DATABASE_URL);
  const confirmed = process.argv.includes(CONFIRM_FLAG);
  const prisma = new PrismaClient();

  try {
    const counts = {
      user: await prisma.user.count(),
      kegiatan: await prisma.kegiatan.count(),
      kepengurusan: await prisma.kepengurusan.count(),
      notifikasi: await prisma.notifikasi.count(),
      deviceToken: await prisma.deviceToken.count(),
      tandaTangan: await prisma.tandaTangan.count(),
    };

    console.log('==========================================================');
    console.log(' RESET USERS');
    console.log('==========================================================');
    console.log(`Target DB : ${target.hostname}:${target.port || '5432'}${target.pathname}`);
    console.log(`user=${counts.user} kegiatan=${counts.kegiatan} kepengurusan=${counts.kepengurusan} notifikasi=${counts.notifikasi} deviceToken=${counts.deviceToken} tandaTangan=${counts.tandaTangan}`);
    console.log(`Urutan hapus: ${USER_RESET_DELETE_PLAN.join(' -> ')}`);

    if (!confirmed) {
      console.log('Mode DRY-RUN — tidak ada data yang diubah.');
      console.log(`Untuk eksekusi, jalankan dengan ${CONFIRM_FLAG}`);
      return;
    }

    const deleted = await prisma.$transaction(
      async (tx) => {
        const result = {};
        for (const model of USER_RESET_DELETE_PLAN) {
          if (model === 'kepengurusan') {
            await tx.$executeRawUnsafe('UPDATE "kepengurusan" SET "parent_id" = NULL');
          }
          if (model === 'itemPenilaian') {
            result[model] = await tx[model].deleteMany({ where: USER_RESET_ITEM_PENILAIAN_WHERE });
            continue;
          }
          result[model] = await tx[model].deleteMany();
        }
        return result;
      },
      { timeout: 120000, maxWait: 10000 },
    );

    for (const [model, result] of Object.entries(deleted)) {
      if (result.count > 0) {
        console.log(`  ${model.padEnd(20)} ${result.count}`);
      }
    }

    console.log('Reset users selesai.');
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error) => {
  console.error('Reset gagal:', error instanceof Error ? error.message : error);
  process.exit(1);
});

/**
 * CLI wrapper untuk seed template global aspek penilaian.
 * Logika & data ada di src/modules/assessments/seed-aspek-template.ts
 * agar idempotensinya bisa diverifikasi lewat unit test.
 *
 * Jalankan: pnpm --filter @ths-thm/api prisma:seed:aspek-template
 */
import { PrismaClient } from '@prisma/client';
import { seedAspekTemplate } from '../src/modules/assessments/seed-aspek-template';

const prisma = new PrismaClient();

async function main() {
  const r = await seedAspekTemplate(prisma);
  console.log(
    `[aspek-template] selesai: ${r.aspekBaru} aspek & ${r.itemBaru} item dibuat, ` +
      `${r.aspekSkip} aspek & ${r.itemSkip} item dilewati (sudah ada). ` +
      `Total aspek template aktif: ${r.totalAktif}`,
  );

  if (r.totalAktif === 0) {
    throw new Error('Template aspek penilaian masih kosong setelah seed — periksa data yang ada');
  }
}

main()
  .catch((e) => {
    console.error('[aspek-template] gagal:', e);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

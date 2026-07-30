import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding tingkatan anggota THS-THM...');

  const tingkatanData = [
    {
      kodeTingkat: 'YUNIOR',
      namaTingkat: 'Anggota Yunior',
      urutan: 1,
      warnaSabuk: 'putih',
      statusAktif: true,
    },
    {
      kodeTingkat: 'PRATAMA',
      namaTingkat: 'Pratama',
      urutan: 2,
      warnaSabuk: 'biru',
      statusAktif: true,
    },
    {
      kodeTingkat: 'TAMTAMA',
      namaTingkat: 'Tamtama',
      urutan: 3,
      warnaSabuk: 'biru',
      statusAktif: true,
    },
    {
      kodeTingkat: 'MUDA',
      namaTingkat: 'Muda',
      urutan: 4,
      warnaSabuk: 'kuning',
      statusAktif: true,
    },
    {
      kodeTingkat: 'MADYA',
      namaTingkat: 'Madya',
      urutan: 5,
      warnaSabuk: 'kuning',
      statusAktif: true,
    },
    {
      kodeTingkat: 'UTAMA',
      namaTingkat: 'Utama',
      urutan: 6,
      warnaSabuk: 'kuning',
      statusAktif: true,
    },
  ];

  for (const data of tingkatanData) {
    const created = await prisma.tingkatan.upsert({
      where: { kodeTingkat: data.kodeTingkat },
      update: data,
      create: data,
    });
    console.log(`✓ Created/Updated: ${created.namaTingkat} (${created.kodeTingkat})`);
  }

  console.log('✅ Seeding tingkatan completed!');
}

main()
  .catch((e) => {
    console.error('❌ Error seeding tingkatan:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

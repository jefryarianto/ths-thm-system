import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

// ── Jabatan definitions ────────────────────────────────────
// Setiap kepengurusan (Wilayah, Ranting):
//   Koordinator, Wakil Koordinator, Sekretaris, Bendahara,
//   Komisi Pengembangan Mental Spiritual, Komisi Kepelatihan,
//   Komisi Organisasi, Komisi Pengabdian Gereja dan Masyarakat,
//   Komisi Penelitian dan Pengembangan, Komisi Ekonomi dan Kewirasusahaan
// Khusus Distrik: + Pastor Moderator
const JABATAN_LIST = [
  { nama: 'Koordinator', urutan: 1 },
  { nama: 'Wakil Koordinator', urutan: 2 },
  { nama: 'Sekretaris', urutan: 3 },
  { nama: 'Bendahara', urutan: 4 },
  { nama: 'Komisi Pengembangan Mental Spiritual', urutan: 5 },
  { nama: 'Komisi Kepelatihan', urutan: 6 },
  { nama: 'Komisi Organisasi', urutan: 7 },
  { nama: 'Komisi Pengabdian Gereja dan Masyarakat', urutan: 8 },
  { nama: 'Komisi Penelitian dan Pengembangan', urutan: 9 },
  { nama: 'Komisi Ekonomi dan Kewirasusahaan', urutan: 10 },
  { nama: 'Pastor Moderator', urutan: 0 }, // Khusus Distrik, urutan paling atas
];

// Sample user names for kepengurusan
const USER_NAMES = [
  'Fransiskus Xaverius Bharata',
  'Yohanes Darius Palmeo',
  'Maria Theresia Goreti Lau',
  'Ignatiusmanuel Bataona',
  'Paulus Helmy Tukan',
  'Yosef Rikardus Wolor',
  'Bernadus Geradus Soge',
  'Cornelis Xaverius Karo',
  'Ambrosius Yosef Medo',
  'Theresia Dewi Anggraeni',
  'Dominikus Sili Nongtawas',
  'Marianus Urut Lewang',
  'Anastasia Kursor Lakus',
  'Filipus Lomi Blikololong',
  'Hortensia Bala Ngongo',
  'Ignasius Lando Wungu',
  'Katarina Laku Dopo',
  'Lambertus Niron Beding',
  'Monika Lopo Pora',
  'Nikolaus Tukung Muda',
  'Ottilia Lena Ulu',
];

async function main() {
  console.log('=== Seeding Kepengurusan Data ===\n');

  // ── 1. Ensure Jabatan exist ──────────────────────────────
  console.log('--- Jabatan ---');
  const jabatans: Record<string, { id: string }> = {};
  for (const j of JABATAN_LIST) {
    const existing = await prisma.jabatan.findUnique({ where: { nama: j.nama } });
    if (existing) {
      jabatans[j.nama] = existing;
      console.log(`  "${j.nama}" already exists`);
    } else {
      const created = await prisma.jabatan.create({ data: j });
      jabatans[j.nama] = created;
      console.log(`  "${j.nama}" created`);
    }
  }

  // ── 2. Ensure Periode exist ──────────────────────────────
  console.log('\n--- Periode ---');
  let periode = await prisma.periode.findFirst({ where: { nama: '2025-2028' } });
  if (!periode) {
    periode = await prisma.periode.create({
      data: {
        nama: '2025-2028',
        tglMulai: new Date('2025-01-01'),
        tglSelesai: new Date('2028-12-31'),
        isActive: true,
      },
    });
    console.log('  "2025-2028" created');
  } else {
    console.log('  "2025-2028" already exists');
  }

  let oldPeriode = await prisma.periode.findFirst({ where: { nama: '2022-2025' } });
  if (!oldPeriode) {
    oldPeriode = await prisma.periode.create({
      data: {
        nama: '2022-2025',
        tglMulai: new Date('2022-01-01'),
        tglSelesai: new Date('2025-12-31'),
        isActive: false,
      },
    });
    console.log('  "2022-2025" created');
  } else {
    console.log('  "2022-2025" already exists');
  }

  // ── 3. Get existing org structure ────────────────────────
  const distriks = await prisma.distrik.findMany({ where: { isVisible: true } });
  console.log(`\n--- Org Structure ---`);
  console.log(`  Found ${distriks.length} distrik(s)`);

  if (distriks.length === 0) {
    console.log('  No distrik found. Skipping kepengurusan seed.');
    return;
  }

  const distrik = distriks[0];
  console.log(`  Using distrik: ${distrik.nama}`);

  const wilayahs = await prisma.wilayah.findMany({
    where: { distrikId: distrik.id, isVisible: true },
  });
  console.log(`  Found ${wilayahs.length} wilayah(s)`);

  // ── 4. Create sample users ───────────────────────────────
  console.log('\n--- Users ---');
  const passwordHash = await bcrypt.hash('password123', 12);
  const users: { id: string; namaLengkap: string }[] = [];

  for (let i = 0; i < USER_NAMES.length; i++) {
    const email = `pengurus${i + 1}@test.ths-thm.org`;
    let user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      user = await prisma.user.create({
        data: {
          email,
          passwordHash,
          namaLengkap: USER_NAMES[i],
          role: 'anggota',
          isActive: true,
        },
      });
      console.log(`  Created: ${USER_NAMES[i]}`);
    } else {
      console.log(`  Exists:  ${USER_NAMES[i]}`);
    }
    users.push({ id: user.id, namaLengkap: user.namaLengkap });
  }

  // ── Helper: create kepengurusan if not exists ────────────
  async function createKepengurusan(opts: {
    userIdx: number;
    jabatan: string;
    periodeId: string;
    distrikId?: string;
    wilayahId?: string;
    rantingId?: string;
    parentId?: string | null;
  }): Promise<string | null> {
    const userId = users[opts.userIdx % users.length].id;

    // Check if already exists
    const where: Record<string, unknown> = {
      userId,
      periodeId: opts.periodeId,
    };
    if (opts.distrikId) where.distrikId = opts.distrikId;
    if (opts.wilayahId) where.wilayahId = opts.wilayahId;
    if (opts.rantingId) where.rantingId = opts.rantingId;

    const existing = await prisma.kepengurusan.findFirst({ where });
    if (existing) {
      console.log(`    ${opts.jabatan}: already exists, skipping`);
      return existing.id;
    }

    const created = await prisma.kepengurusan.create({
      data: {
        userId,
        jabatanId: jabatans[opts.jabatan].id,
        periodeId: opts.periodeId,
        distrikId: opts.distrikId,
        wilayahId: opts.wilayahId,
        rantingId: opts.rantingId,
        parentId: opts.parentId,
      },
    });

    console.log(`    ${opts.jabatan}: ${users[opts.userIdx % users.length].namaLengkap}`);
    return created.id;
  }

  // ── 5. Create Kepengurusan Distrik ───────────────────────
  console.log(`\n--- Kepengurusan Distrik: ${distrik.nama} ---`);
  let userOffset = 0;

  // Pastor Moderator (khusus Distrik, urutan paling atas, root)
  const pastorId = await createKepengurusan({
    userIdx: userOffset++,
    jabatan: 'Pastor Moderator',
    periodeId: periode.id,
    distrikId: distrik.id,
    parentId: null,
  });

  // Koordinator (bawahan Pastor Moderator)
  const koordDistrikId = await createKepengurusan({
    userIdx: userOffset++,
    jabatan: 'Koordinator',
    periodeId: periode.id,
    distrikId: distrik.id,
    parentId: pastorId,
  });

  // Wakil Koordinator
  await createKepengurusan({
    userIdx: userOffset++,
    jabatan: 'Wakil Koordinator',
    periodeId: periode.id,
    distrikId: distrik.id,
    parentId: koordDistrikId,
  });

  // Sekretaris
  await createKepengurusan({
    userIdx: userOffset++,
    jabatan: 'Sekretaris',
    periodeId: periode.id,
    distrikId: distrik.id,
    parentId: koordDistrikId,
  });

  // Bendahara
  await createKepengurusan({
    userIdx: userOffset++,
    jabatan: 'Bendahara',
    periodeId: periode.id,
    distrikId: distrik.id,
    parentId: koordDistrikId,
  });

  // Komisi-komisi
  const komisiDistrik = [
    'Komisi Pengembangan Mental Spiritual',
    'Komisi Kepelatihan',
    'Komisi Organisasi',
    'Komisi Pengabdian Gereja dan Masyarakat',
    'Komisi Penelitian dan Pengembangan',
    'Komisi Ekonomi dan Kewirasusahaan',
  ];

  for (const komisi of komisiDistrik) {
    await createKepengurusan({
      userIdx: userOffset++,
      jabatan: komisi,
      periodeId: periode.id,
      distrikId: distrik.id,
      parentId: koordDistrikId,
    });
  }

  // ── 6. Create Kepengurusan Wilayah ───────────────────────
  for (let wi = 0; wi < Math.min(wilayahs.length, 3); wi++) {
    const wilayah = wilayahs[wi];
    console.log(`\n--- Kepengurusan Wilayah: ${wilayah.nama} ---`);

    // Koordinator (root, no parent)
    const koordWilayahId = await createKepengurusan({
      userIdx: userOffset++,
      jabatan: 'Koordinator',
      periodeId: periode.id,
      wilayahId: wilayah.id,
      parentId: null,
    });

    // Wakil Koordinator
    await createKepengurusan({
      userIdx: userOffset++,
      jabatan: 'Wakil Koordinator',
      periodeId: periode.id,
      wilayahId: wilayah.id,
      parentId: koordWilayahId,
    });

    // Sekretaris
    await createKepengurusan({
      userIdx: userOffset++,
      jabatan: 'Sekretaris',
      periodeId: periode.id,
      wilayahId: wilayah.id,
      parentId: koordWilayahId,
    });

    // Bendahara
    await createKepengurusan({
      userIdx: userOffset++,
      jabatan: 'Bendahara',
      periodeId: periode.id,
      wilayahId: wilayah.id,
      parentId: koordWilayahId,
    });

    // Komisi-komisi
    for (const komisi of komisiDistrik) {
      await createKepengurusan({
        userIdx: userOffset++,
        jabatan: komisi,
        periodeId: periode.id,
        wilayahId: wilayah.id,
        parentId: koordWilayahId,
      });
    }

    // ── 7. Create Kepengurusan Ranting ─────────────────────
    const rantings = await prisma.ranting.findMany({
      where: { wilayahId: wilayah.id, isVisible: true },
      take: 2,
    });

    for (let ri = 0; ri < rantings.length; ri++) {
      const ranting = rantings[ri];
      console.log(`\n  --- Kepengurusan Ranting: ${ranting.nama} ---`);

      // Koordinator (root)
      const koordRantingId = await createKepengurusan({
        userIdx: userOffset++,
        jabatan: 'Koordinator',
        periodeId: periode.id,
        rantingId: ranting.id,
        parentId: null,
      });

      // Wakil Koordinator
      await createKepengurusan({
        userIdx: userOffset++,
        jabatan: 'Wakil Koordinator',
        periodeId: periode.id,
        rantingId: ranting.id,
        parentId: koordRantingId,
      });

      // Sekretaris
      await createKepengurusan({
        userIdx: userOffset++,
        jabatan: 'Sekretaris',
        periodeId: periode.id,
        rantingId: ranting.id,
        parentId: koordRantingId,
      });

      // Bendahara
      await createKepengurusan({
        userIdx: userOffset++,
        jabatan: 'Bendahara',
        periodeId: periode.id,
        rantingId: ranting.id,
        parentId: koordRantingId,
      });

      // Komisi-komisi
      for (const komisi of komisiDistrik) {
        await createKepengurusan({
          userIdx: userOffset++,
          jabatan: komisi,
          periodeId: periode.id,
          rantingId: ranting.id,
          parentId: koordRantingId,
        });
      }
    }
  }

  // ── Summary ──────────────────────────────────────────────
  const total = await prisma.kepengurusan.count();
  const distrikCount = await prisma.kepengurusan.count({ where: { distrikId: distrik.id } });
  const wilayahCount = await prisma.kepengurusan.count({ where: { distrikId: null, wilayahId: { not: null } } });
  const rantingCount = await prisma.kepengurusan.count({ where: { rantingId: { not: null } } });

  console.log(`\n=== Seeding Complete! ===`);
  console.log(`  Total kepengurusan: ${total}`);
  console.log(`  Distrik: ${distrikCount}`);
  console.log(`  Wilayah: ${wilayahCount}`);
  console.log(`  Ranting: ${rantingCount}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('=== Seeding Kepengurusan Data ===\n');

  // ── 1. Ensure Jabatan exist ──────────────────────────────
  const jabatanNames = [
    { nama: 'Ketua', urutan: 1 },
    { nama: 'Wakil Ketua', urutan: 2 },
    { nama: 'Sekretaris', urutan: 3 },
    { nama: 'Bendahara', urutan: 4 },
    { nama: 'Ketua Bidang Organisasi', urutan: 5 },
    { nama: 'Ketua Bidang Kaderisasi', urutan: 6 },
    { nama: 'Koordinator', urutan: 7 },
    { nama: 'Seksi', urutan: 8 },
    { nama: 'Anggota', urutan: 9 },
  ];

  const jabatans: Record<string, { id: string }> = {};
  for (const j of jabatanNames) {
    const existing = await prisma.jabatan.findUnique({ where: { nama: j.nama } });
    if (existing) {
      jabatans[j.nama] = existing;
      console.log(`  Jabatan "${j.nama}" already exists`);
    } else {
      const created = await prisma.jabatan.create({ data: j });
      jabatans[j.nama] = created;
      console.log(`  Jabatan "${j.nama}" created`);
    }
  }

  // ── 2. Ensure Periode exist ──────────────────────────────
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
    console.log('  Periode "2025-2028" created');
  } else {
    console.log('  Periode "2025-2028" already exists');
  }

  // Also create old periode for history
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
    console.log('  Periode "2022-2025" created');
  } else {
    console.log('  Periode "2022-2025" already exists');
  }

  // ── 3. Get existing org structure ────────────────────────
  const distriks = await prisma.distrik.findMany({ where: { isVisible: true } });
  console.log(`\n  Found ${distriks.length} distrik(s)`);

  if (distriks.length === 0) {
    console.log('  No distrik found. Skipping kepengurusan seed.');
    return;
  }

  const distrik = distriks[0]; // Use first distrik
  console.log(`  Using distrik: ${distrik.nama} (${distrik.id})`);

  const wilayahs = await prisma.wilayah.findMany({
    where: { distrikId: distrik.id, isVisible: true },
  });
  console.log(`  Found ${wilayahs.length} wilayah(s) in ${distrik.nama}`);

  // ── 4. Create sample users for kepengurusan ──────────────
  const passwordHash = await bcrypt.hash('password123', 12);

  const sampleUsers = [
    { nama: 'Fransiskus Xaverius Bharata', email: 'fransiskus.bharata@test.ths-thm.org' },
    { nama: 'Yohanes Darius Palmeo', email: 'yohanes.palmeo@test.ths-thm.org' },
    { nama: 'Maria Theresia Goreti Lau', email: 'maria.lau@test.ths-thm.org' },
    { nama: 'Ignatiusmanuel Bataona', email: 'ignatius.bataona@test.ths-thm.org' },
    { nama: 'Paulus Helmy Tukan', email: 'paulus.tukan@test.ths-thm.org' },
    { nama: 'Yosef Rikardus Wolor', email: 'yosef.wolor@test.ths-thm.org' },
    { nama: 'Bernadus Geradus Soge', email: 'bernadus.soge@test.ths-thm.org' },
    { nama: 'Cornelis Xaverius Karo', email: 'cornelis.karo@test.ths-thm.org' },
    { nama: 'Ambrosius Yosef Medo', email: 'ambrosius.medo@test.ths-thm.org' },
    { nama: 'Theresia Dewi Anggraeni', email: 'theresia.anggraeni@test.ths-thm.org' },
    { nama: 'Dominikus Sili Nongtawas', email: 'dominikus.nongtawas@test.ths-thm.org' },
    { nama: 'Marianus Urut Lewang', email: 'marianus.lewang@test.ths-thm.org' },
  ];

  const users: { id: string; namaLengkap: string }[] = [];
  for (const u of sampleUsers) {
    let user = await prisma.user.findUnique({ where: { email: u.email } });
    if (!user) {
      user = await prisma.user.create({
        data: {
          email: u.email,
          passwordHash,
          namaLengkap: u.nama,
          role: 'anggota',
          isActive: true,
        },
      });
      console.log(`  User "${u.nama}" created`);
    } else {
      console.log(`  User "${u.nama}" already exists`);
    }
    users.push({ id: user.id, namaLengkap: user.namaLengkap });
  }

  // ── 5. Create Kepengurusan — Distrik level ───────────────
  console.log('\n--- Creating Kepengurusan Distrik ---');
  const distrikKepengurusan = [
    { userIdx: 0, jabatan: 'Ketua', parentId: null as string | null },
    { userIdx: 1, jabatan: 'Wakil Ketua', parentId: '_ketua_distrik' },
    { userIdx: 2, jabatan: 'Sekretaris', parentId: '_ketua_distrik' },
    { userIdx: 3, jabatan: 'Bendahara', parentId: '_ketua_distrik' },
    { userIdx: 4, jabatan: 'Ketua Bidang Organisasi', parentId: '_ketua_distrik' },
    { userIdx: 5, jabatan: 'Ketua Bidang Kaderisasi', parentId: '_ketua_distrik' },
  ];

  const distrikIds: Record<string, string> = {};

  for (const k of distrikKepengurusan) {
    // Check if already exists
    const existing = await prisma.kepengurusan.findFirst({
      where: {
        userId: users[k.userIdx].id,
        periodeId: periode.id,
        distrikId: distrik.id,
      },
    });

    if (existing) {
      console.log(`  ${k.jabatan} already exists, skipping`);
      distrikIds[k.jabatan] = existing.id;
      continue;
    }

    const parentId = k.parentId ? distrikIds[k.parentId] || null : null;

    const created = await prisma.kepengurusan.create({
      data: {
        userId: users[k.userIdx].id,
        jabatanId: jabatans[k.jabatan].id,
        periodeId: periode.id,
        distrikId: distrik.id,
        parentId,
      },
    });

    distrikIds[k.jabatan] = created.id;
    console.log(`  ${k.jabatan}: ${users[k.userIdx].namaLengkap}`);
  }

  // ── 6. Create Kepengurusan — Wilayah level (per wilayah) ─
  console.log('\n--- Creating Kepengurusan Wilayah ---');
  for (let wi = 0; wi < Math.min(wilayahs.length, 3); wi++) {
    const wilayah = wilayahs[wi];
    console.log(`\n  Wilayah: ${wilayah.nama}`);

    const wilayahKepengurusan = [
      { userIdx: 6 + wi * 2, jabatan: 'Ketua', parentId: null as string | null },
      { userIdx: 7 + wi * 2, jabatan: 'Sekretaris', parentId: '_ketua_wilayah' },
      { userIdx: 0, jabatan: 'Bendahara', parentId: '_ketua_wilayah' },
    ];

    const wilayahIds: Record<string, string> = {};

    for (const k of wilayahKepengurusan) {
      const userIdx = k.userIdx % users.length;
      const existing = await prisma.kepengurusan.findFirst({
        where: {
          userId: users[userIdx].id,
          periodeId: periode.id,
          wilayahId: wilayah.id,
        },
      });

      if (existing) {
        console.log(`    ${k.jabatan} already exists, skipping`);
        wilayahIds[k.jabatan] = existing.id;
        continue;
      }

      const parentId = k.parentId ? wilayahIds[k.parentId] || null : null;

      const created = await prisma.kepengurusan.create({
        data: {
          userId: users[userIdx].id,
          jabatanId: jabatans[k.jabatan].id,
          periodeId: periode.id,
          wilayahId: wilayah.id,
          parentId,
        },
      });

      wilayahIds[k.jabatan] = created.id;
      console.log(`    ${k.jabatan}: ${users[userIdx].namaLengkap}`);
    }

    // ── 7. Create Kepengurusan — Ranting level (first ranting per wilayah) ─
    const rantings = await prisma.ranting.findMany({
      where: { wilayahId: wilayah.id, isVisible: true },
      take: 2,
    });

    for (const ranting of rantings) {
      console.log(`\n    Ranting: ${ranting.nama}`);

      const rantingKepengurusan = [
        { userIdx: (wi * 3 + rantings.indexOf(ranting)) % users.length, jabatan: 'Ketua', parentId: null as string | null },
        { userIdx: (wi * 3 + rantings.indexOf(ranting) + 1) % users.length, jabatan: 'Sekretaris', parentId: '_ketua_ranting' },
        { userIdx: (wi * 3 + rantings.indexOf(ranting) + 2) % users.length, jabatan: 'Bendahara', parentId: '_ketua_ranting' },
      ];

      const rantingIds: Record<string, string> = {};

      for (const k of rantingKepengurusan) {
        const userIdx = k.userIdx % users.length;
        const existing = await prisma.kepengurusan.findFirst({
          where: {
            userId: users[userIdx].id,
            periodeId: periode.id,
            rantingId: ranting.id,
          },
        });

        if (existing) {
          console.log(`      ${k.jabatan} already exists, skipping`);
          rantingIds[k.jabatan] = existing.id;
          continue;
        }

        const parentId = k.parentId ? rantingIds[k.parentId] || null : null;

        const created = await prisma.kepengurusan.create({
          data: {
            userId: users[userIdx].id,
            jabatanId: jabatans[k.jabatan].id,
            periodeId: periode.id,
            rantingId: ranting.id,
            parentId,
          },
        });

        rantingIds[k.jabatan] = created.id;
        console.log(`      ${k.jabatan}: ${users[userIdx].namaLengkap}`);
      }
    }
  }

  // ── Summary ──────────────────────────────────────────────
  const total = await prisma.kepengurusan.count();
  console.log(`\n=== Seeding Complete! Total kepengurusan: ${total} ===`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

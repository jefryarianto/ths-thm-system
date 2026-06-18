import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding database...');

  // Create admin user
  const passwordHash = await bcrypt.hash('password123', 12);

  const admin = await prisma.user.upsert({
    where: { email: 'superadmin@ths-thm.org' },
    update: {},
    create: {
      email: 'superadmin@ths-thm.org',
      passwordHash,
      namaLengkap: 'Super Admin',
      role: 'superadmin',
      isActive: true,
    },
  });
  console.log(`Admin user created: ${admin.email}`);

  // Create approval levels
  const levels = [
    { name: 'Admin Ranting', roleName: 'admin_ranting', order: 1 },
    { name: 'Admin Wilayah', roleName: 'admin_wilayah', order: 2 },
    { name: 'Admin Distrik', roleName: 'admin_distrik', order: 3 },
  ];

  for (const level of levels) {
    await prisma.approvalLevel.upsert({
      where: { id: level.name },
      update: {},
      create: {
        id: level.name,
        name: level.name,
        roleName: level.roleName,
        order: level.order,
        isActive: true,
      },
    });
  }
  console.log('Approval levels created');

  // Create default organization structure
  const nasional = await prisma.nasional.upsert({
    where: { kode: 'THS-NAS' },
    update: {},
    create: { kode: 'THS-NAS', nama: 'THS-THM Nasional' },
  });

  const distrik = await prisma.distrik.upsert({
    where: { kodeDistrik: 'THS-DST-01' },
    update: {},
    create: {
      nasionalId: nasional.id,
      kodeDistrik: 'THS-DST-01',
      nama: 'Distrik Example',
    },
  });

  const wilayah = await prisma.wilayah.upsert({
    where: { kodeWilayah: 'THS-WLY-01' },
    update: {},
    create: {
      distrikId: distrik.id,
      kodeWilayah: 'THS-WLY-01',
      nama: 'Wilayah Example',
    },
  });

  const ranting = await prisma.ranting.upsert({
    where: { kodeRanting: 'THS-RTG-01' },
    update: {},
    create: {
      wilayahId: wilayah.id,
      kodeRanting: 'THS-RTG-01',
      nama: 'Ranting Example',
    },
  });
  console.log('Organization structure created');

  // Create sample member
  const member = await prisma.anggota.upsert({
    where: { nomorAnggota: 'THS-2026-0001' },
    update: {},
    create: {
      rantingId: ranting.id,
      nomorAnggota: 'THS-2026-0001',
      namaLengkap: 'Anggota Contoh',
      jenisKelamin: 'L',
      statusKeanggotaan: 'aktif',
      statusData: 'complete',
      statusValidasi: 'approved',
    },
  });
  console.log(`Sample member created: ${member.namaLengkap}`);

  console.log('Seeding completed!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
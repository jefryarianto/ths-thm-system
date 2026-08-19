import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding database...');

  // Create admin user — password matches E2E smoke test login
  const passwordHash = await bcrypt.hash('admin123', 12);

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

  // Create approval levels (reference data untuk workflow approvals — tidak ada UI CRUD)
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
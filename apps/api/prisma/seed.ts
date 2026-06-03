import { PrismaClient, Role } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding database...');

  // 1. Create Nasional
  const nasional = await prisma.nasional.upsert({
    where: { kode: 'NAS-001' },
    update: {},
    create: {
      kode: 'NAS-001',
      nama: 'Nasional Indonesia',
    },
  });
  console.log('✓ Nasional created');

  // 2. Create Distrik
  const distrikJakarta = await prisma.distrik.upsert({
    where: { kodeDistrik: 'DIST-JKT' },
    update: {},
    create: {
      nasionalId: nasional.id,
      kodeDistrik: 'DIST-JKT',
      nama: 'Distrik Jakarta',
      alamat: 'Jl. Merdeka No. 1, Jakarta Pusat',
    },
  });
  console.log('✓ Distrik created');

  // 3. Create Wilayah
  const wilayahJakartaPusat = await prisma.wilayah.upsert({
    where: { kodeWilayah: 'WIL-JKT-PST' },
    update: {},
    create: {
      distrikId: distrikJakarta.id,
      kodeWilayah: 'WIL-JKT-PST',
      nama: 'Wilayah Jakarta Pusat',
    },
  });
  console.log('✓ Wilayah created');

  // 4. Create Ranting
  const rantingMenteng = await prisma.ranting.upsert({
    where: { kodeRanting: 'RAN-MTG' },
    update: {},
    create: {
      wilayahId: wilayahJakartaPusat.id,
      kodeRanting: 'RAN-MTG',
      nama: 'Ranting Menteng',
      lokasiLatihan: 'Gedung Serbaguna Menteng, Jl. Diponegoro No. 10',
    },
  });
  const rantingSenen = await prisma.ranting.upsert({
    where: { kodeRanting: 'RAN-SNN' },
    update: {},
    create: {
      wilayahId: wilayahJakartaPusat.id,
      kodeRanting: 'RAN-SNN',
      nama: 'Ranting Senen',
      lokasiLatihan: 'Aula Kecamatan Senen, Jl. Kramat Raya',
    },
  });
  console.log('✓ Ranting created');

  // 5. Create Admin Users
  const passwordHash = await bcrypt.hash('password123', 12);

  const superadmin = await prisma.user.upsert({
    where: { email: 'superadmin@ths-thm.org' },
    update: {},
    create: {
      email: 'superadmin@ths-thm.org',
      passwordHash,
      namaLengkap: 'Super Admin',
      role: 'superadmin',
    },
  });

  const adminDistrik = await prisma.user.upsert({
    where: { email: 'distrik.jkt@ths-thm.org' },
    update: {},
    create: {
      email: 'distrik.jkt@ths-thm.org',
      passwordHash,
      namaLengkap: 'Admin Distrik Jakarta',
      role: 'admin_distrik',
    },
  });

  const adminWilayah = await prisma.user.upsert({
    where: { email: 'wilayah.jktpst@ths-thm.org' },
    update: {},
    create: {
      email: 'wilayah.jktpst@ths-thm.org',
      passwordHash,
      namaLengkap: 'Admin Wilayah Jakarta Pusat',
      role: 'admin_wilayah',
    },
  });

  const adminRanting = await prisma.user.upsert({
    where: { email: 'ranting.menteng@ths-thm.org' },
    update: {},
    create: {
      email: 'ranting.menteng@ths-thm.org',
      passwordHash,
      namaLengkap: 'Admin Ranting Menteng',
      role: 'admin_ranting',
      rantingId: rantingMenteng.id,
    },
  });

  const adminKegiatan = await prisma.user.upsert({
    where: { email: 'kegiatan@ths-thm.org' },
    update: {},
    create: {
      email: 'kegiatan@ths-thm.org',
      passwordHash,
      namaLengkap: 'Admin Kegiatan',
      role: 'admin_kegiatan',
    },
  });

  const penguji = await prisma.user.upsert({
    where: { email: 'penguji1@ths-thm.org' },
    update: {},
    create: {
      email: 'penguji1@ths-thm.org',
      passwordHash,
      namaLengkap: 'Penguji 1',
      role: 'penguji',
    },
  });

  const anggota = await prisma.user.upsert({
    where: { email: 'anggota1@ths-thm.org' },
    update: {},
    create: {
      email: 'anggota1@ths-thm.org',
      passwordHash,
      namaLengkap: 'Anggota 1',
      role: 'anggota',
      rantingId: rantingMenteng.id,
    },
  });

  console.log('✓ Users created (7 roles)');
  console.log('  Login: superadmin@ths-thm.org / password123');
  console.log('  Login: anggota1@ths-thm.org / password123');

  // 6. Create Sample Members
  const member1 = await prisma.anggota.create({
    data: {
      rantingId: rantingMenteng.id,
      nomorAnggota: 'THS-2025-0001',
      namaLengkap: 'Budi Santoso',
      jenisKelamin: 'L',
      tempatLahir: 'Jakarta',
      tanggalLahir: new Date('2000-03-15'),
      alamat: 'Jl. Teuku Umar No. 5, Menteng',
      noHp: '081234567890',
      email: 'budi@example.com',
      statusKeanggotaan: 'aktif',
      tingkat: 'Dasar II',
      statusData: 'complete',
      statusValidasi: 'approved',
    },
  });

  const member2 = await prisma.anggota.create({
    data: {
      rantingId: rantingMenteng.id,
      nomorAnggota: 'THS-2025-0002',
      namaLengkap: 'Siti Rahayu',
      jenisKelamin: 'P',
      tempatLahir: 'Bandung',
      tanggalLahir: new Date('2001-07-22'),
      alamat: 'Jl. Diponegoro No. 15, Menteng',
      noHp: '081234567891',
      email: 'siti@example.com',
      statusKeanggotaan: 'aktif',
      tingkat: 'Dasar I',
      statusData: 'incomplete',
      statusValidasi: 'pending',
      missingFields: ['tempat_lahir'],
    },
  });

  console.log('✓ Sample members created');

  // 7. Create Aspek Penilaian
  const aspekFisik = await prisma.aspekPenilaian.create({
    data: {
      kodeAspek: 'ASP-FIS',
      namaAspek: 'Fisik',
      deskripsi: 'Penilaian aspek fisik (kebugaran, postur, kesehatan)',
      bobot: 0.3,
      itemPenilaian: {
        create: [
          { kodeItem: 'ITM-FIS-01', namaItem: 'Kebugaran Jasmani', skorMaksimal: 100, bobot: 1, urutan: 1 },
          { kodeItem: 'ITM-FIS-02', namaItem: 'Postur Tubuh', skorMaksimal: 100, bobot: 0.5, urutan: 2 },
          { kodeItem: 'ITM-FIS-03', namaItem: 'Ketahanan Fisik', skorMaksimal: 100, bobot: 1, urutan: 3 },
        ],
      },
    },
  });

  const aspekMental = await prisma.aspekPenilaian.create({
    data: {
      kodeAspek: 'ASP-MEN',
      namaAspek: 'Mental',
      deskripsi: 'Penilaian aspek mental (disiplin, tanggung jawab, leadership)',
      bobot: 0.4,
      itemPenilaian: {
        create: [
          { kodeItem: 'ITM-MEN-01', namaItem: 'Kedisiplinan', skorMaksimal: 100, bobot: 1.5, urutan: 1 },
          { kodeItem: 'ITM-MEN-02', namaItem: 'Tanggung Jawab', skorMaksimal: 100, bobot: 1, urutan: 2 },
          { kodeItem: 'ITM-MEN-03', namaItem: 'Leadership', skorMaksimal: 100, bobot: 1, urutan: 3 },
        ],
      },
    },
  });

  const aspekAkademik = await prisma.aspekPenilaian.create({
    data: {
      kodeAspek: 'ASP-AKA',
      namaAspek: 'Akademik',
      deskripsi: 'Penilaian aspek akademik (pengetahuan teori, hafalan, ujian tulis)',
      bobot: 0.3,
      itemPenilaian: {
        create: [
          { kodeItem: 'ITM-AKA-01', namaItem: 'Pengetahuan Teori', skorMaksimal: 100, bobot: 1, urutan: 1 },
          { kodeItem: 'ITM-AKA-02', namaItem: 'Hafalan', skorMaksimal: 100, bobot: 1, urutan: 2 },
          { kodeItem: 'ITM-AKA-03', namaItem: 'Ujian Tulis', skorMaksimal: 100, bobot: 1.5, urutan: 3 },
        ],
      },
    },
  });

  console.log('✓ Assessment aspects & items created (3 aspects, 9 items)');

  // 8. Create Sample Iuran
  await prisma.iuran.create({
    data: {
      anggotaId: member1.id,
      periode: '2025-01',
      jumlah: 50000,
      tanggalBayar: new Date('2025-01-10'),
      metodeBayar: 'manual',
      status: 'lunas',
    },
  });

  await prisma.iuran.create({
    data: {
      anggotaId: member1.id,
      periode: '2025-02',
      jumlah: 50000,
      status: 'menunggak',
    },
  });

  await prisma.iuran.create({
    data: {
      anggotaId: member2.id,
      periode: '2025-01',
      jumlah: 50000,
      tanggalBayar: new Date('2025-01-15'),
      metodeBayar: 'transfer',
      status: 'lunas',
    },
  });

  console.log('✓ Sample dues created');

  // 9. Create Kategori Dokumen Organisasi
  await prisma.kategoriDokumen.createMany({
    data: [
      { nama: 'AD/ART', deskripsi: 'Anggaran Dasar & Anggaran Rumah Tangga' },
      { nama: 'SK', deskripsi: 'Surat Keputusan' },
      { nama: 'Kurikulum', deskripsi: 'Kurikulum & Silabus' },
      { nama: 'Struktur Organisasi', deskripsi: 'Bagan struktur organisasi' },
      { nama: 'Notulen', deskripsi: 'Notulen rapat' },
      { nama: 'Proposal', deskripsi: 'Proposal kegiatan' },
      { nama: 'Laporan', deskripsi: 'Laporan kegiatan' },
    ],
  });

  console.log('✓ Document categories created');

  // 10. Create Settings
  await prisma.setting.createMany({
    data: [
      {
        key: 'organization',
        value: {
          name: 'THS-THM Indonesia',
          shortName: 'THS-THM',
          founded: '2020',
          motto: 'Disiplin, Tangguh, Berprestasi',
        },
      },
      {
        key: 'dues_default',
        value: { amount: 50000, currency: 'IDR', period: 'monthly' },
      },
    ],
  });

  console.log('✓ Settings created');
  console.log('\n✅ Seed completed successfully!');
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
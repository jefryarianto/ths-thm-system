#!/usr/bin/env node
/**
 * Seed minimal untuk produksi.
 *
 * Mengisi HANYA data referensi dasar yang dibutuhkan agar aplikasi bisa
 * dipakai setelah database dikosongkan (lihat reset-produksi.js):
 *   - jabatan        (11 jabatan global, distrikId = null)
 *   - tingkatan      (6 tingkat + visual strip kartu anggota)
 *   - kategori_dokumen (6 kategori bawaan)
 *   - card_templates (1 template klasik aktif)
 *
 * Tidak membuat user, anggota, kepengurusan, atau data transaksional lain.
 * Idempoten: baris yang sudah ada tidak diduplikasi, aman dijalankan berulang.
 *
 * Pemakaian:
 *   node prisma/seed-produksi.js
 */

const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

// Jabatan global (distrikId null → dipakai semua distrik sebagai fallback).
const JABATAN = [
  { nama: 'Pastor Moderator', urutan: 0 },
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
];

// Selaras dengan DEFAULT_TINGKATAN di modules/tingkatan/tingkatan.service.ts
const TINGKATAN = [
  { nama: 'Anggota', stripCount: 0, stripWarna: '#94a3b8', urutan: 0 },
  { nama: 'Pratama', stripCount: 1, stripWarna: '#1d4ed8', urutan: 1 },
  { nama: 'Tamtama', stripCount: 2, stripWarna: '#1d4ed8', urutan: 2 },
  { nama: 'Muda', stripCount: 1, stripWarna: '#ca8a04', urutan: 3 },
  { nama: 'Madya', stripCount: 2, stripWarna: '#ca8a04', urutan: 4 },
  { nama: 'Utama', stripCount: 3, stripWarna: '#ca8a04', urutan: 5 },
];

// Selaras dengan prisma/seed.ts
const KATEGORI_DOKUMEN = [
  { nama: 'AD/ART', deskripsi: 'Anggaran Dasar dan Rumah Tangga' },
  { nama: 'Surat Keputusan', deskripsi: 'Surat keputusan pengurus dan kepanitiaan' },
  { nama: 'Notulensi Rapat', deskripsi: 'Catatan hasil rapat pengurus' },
  { nama: 'Laporan Kegiatan', deskripsi: 'Laporan pelaksanaan kegiatan organisasi' },
  { nama: 'Sertifikat', deskripsi: 'Sertifikat dan piagam penghargaan' },
  { nama: 'Dokumen Umum', deskripsi: 'Dokumen organisasi lainnya' },
];

const CARD_TEMPLATE = {
  name: 'classic',
  label: 'Desain Bawaan (Klasik)',
  overlayConfig: {},
  isActive: true,
};

function slugify(value) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

async function seedJabatan() {
  let created = 0;
  for (const jabatan of JABATAN) {
    // Index unik parsial (nama, COALESCE(distrik_id,'GLOBAL')) tidak bisa
    // dipakai di upsert Prisma, jadi cek manual per scope global.
    const existing = await prisma.jabatan.findFirst({
      where: { nama: jabatan.nama, distrikId: null },
      select: { id: true },
    });
    if (existing) continue;
    await prisma.jabatan.create({ data: { ...jabatan, distrikId: null } });
    created += 1;
  }
  return created;
}

async function seedTingkatan() {
  let created = 0;
  for (const tingkatan of TINGKATAN) {
    const existing = await prisma.tingkatan.findUnique({
      where: { nama: tingkatan.nama },
      select: { id: true },
    });
    if (existing) continue;
    await prisma.tingkatan.create({ data: tingkatan });
    created += 1;
  }
  return created;
}

async function seedKategoriDokumen() {
  let created = 0;
  for (const kategori of KATEGORI_DOKUMEN) {
    const id = `kategori-dokumen-${slugify(kategori.nama)}`;
    const existing = await prisma.kategoriDokumen.findUnique({
      where: { id },
      select: { id: true },
    });
    if (existing) continue;
    await prisma.kategoriDokumen.create({ data: { id, ...kategori } });
    created += 1;
  }
  return created;
}

async function seedCardTemplate() {
  const existing = await prisma.cardTemplate.findFirst({
    where: { name: CARD_TEMPLATE.name, distrikId: null },
    select: { id: true },
  });
  if (existing) return 0;
  await prisma.cardTemplate.create({ data: { ...CARD_TEMPLATE, distrikId: null } });
  return 1;
}

async function main() {
  if (!process.env.DATABASE_URL) {
    console.error('❌ DATABASE_URL belum diset.');
    process.exit(1);
  }

  console.log('Seeding data referensi produksi...');

  const jabatan = await seedJabatan();
  console.log(`  jabatan          : +${jabatan} (total ${await prisma.jabatan.count()})`);

  const tingkatan = await seedTingkatan();
  console.log(`  tingkatan        : +${tingkatan} (total ${await prisma.tingkatan.count()})`);

  const kategori = await seedKategoriDokumen();
  console.log(
    `  kategori_dokumen : +${kategori} (total ${await prisma.kategoriDokumen.count()})`,
  );

  const card = await seedCardTemplate();
  console.log(`  card_templates   : +${card} (total ${await prisma.cardTemplate.count()})`);

  console.log('Seeding selesai.');
}

main()
  .catch((error) => {
    console.error('❌ Seeding gagal:', error instanceof Error ? error.message : error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

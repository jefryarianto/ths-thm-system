/**
 * NRA Migration Script
 *
 * Updates existing anggota NRAs to the new format:
 *   [kode_distrik]-[kode_wilayah][kode_ranting]-[3digit_urut]-[tahun_dadar]
 *   Example: 0114-0101-001-1993
 *
 * Usage:
 *   npx ts-node prisma/migrate-nra.ts
 *
 * The new format regex pattern: /^\d{3,4}-\d{2,4}-\d{3}-\d{4}$/
 *   (e.g., "0114-0101-001-1993")
 *
 * Old format (will be migrated):
 *   /^\d{3,4}-\d{3}-\d{4}$/
 *   (e.g., "0114-001-1993")
 *
 * Members whose NRA already matches the new format are skipped.
 * Members without a valid rantingId are skipped.
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const NEW_NRA_PATTERN = /^\d{3,4}-\d{2,4}-\d{3}-\d{4}$/;

async function main() {
  console.log('=== NRA Migration Script ===\n');

  // 1. Fetch all non-deleted members
  const members = await prisma.anggota.findMany({
    where: { deletedAt: null },
    select: {
      id: true,
      nomorAnggota: true,
      tahunDadar: true,
      rantingId: true,
    },
  });

  console.log(`Total anggota aktif: ${members.length}\n`);

  // 2. Filter members that need migration (don't match new format)
  const toMigrate = members.filter((m) => !NEW_NRA_PATTERN.test(m.nomorAnggota || ''));
  console.log(`Anggota dengan NRA lama (perlu migrasi): ${toMigrate.length}\n`);

  if (toMigrate.length === 0) {
    console.log('✅ Semua anggota sudah menggunakan format NRA baru.');
    return;
  }

  // 3. Process migration
  let success = 0;
  let skipped = 0;
  let errors = 0;

  // Group by rantingId for efficient sequence calculation
  const byRanting = new Map<string, typeof toMigrate>();
  for (const m of toMigrate) {
    if (!m.rantingId) {
      console.warn(`  ⚠️  Anggota ${m.id} (${m.nomorAnggota}) tidak memiliki rantingId — dilewati`);
      skipped++;
      continue;
    }
    const group = byRanting.get(m.rantingId) || [];
    group.push(m);
    byRanting.set(m.rantingId, group);
  }

  console.log(`Memproses ${byRanting.size} ranting...\n`);

  for (const [rantingId, groupMembers] of byRanting) {
    // Fetch ranting with org structure
    const ranting = await prisma.ranting.findUnique({
      where: { id: rantingId },
      include: { wilayah: { include: { distrik: true } } },
    });

    if (!ranting) {
      console.warn(`  ⚠️  Ranting ${rantingId} tidak ditemukan — ${groupMembers.length} anggota dilewati`);
      skipped += groupMembers.length;
      continue;
    }

    const kodeDistrik = ranting.wilayah?.distrik?.kodeDistrik?.replace(/^\D+/g, '') || '0000';
    const kodeWilayah = ranting.wilayah?.kodeWilayah?.split('-').pop() || '00';
    const kodeRanting = ranting.kodeRanting?.split('-').pop() || '00';

    // Find max existing sequence in this ranting (from members with new format NRAs)
    const existingInRanting = await prisma.anggota.findMany({
      where: { rantingId, deletedAt: null },
      select: { nomorAnggota: true },
    });

    let maxSeq = 0;
    for (const m of existingInRanting) {
      if (!m.nomorAnggota) continue;
      const parts = m.nomorAnggota.split('-');
      const seq = parseInt(parts[parts.length - 2] || '0', 10);
      if (!isNaN(seq) && seq > maxSeq) maxSeq = seq;
    }

    let rantingSeq = maxSeq;

    for (const m of groupMembers) {
      try {
        rantingSeq++;
        const tahun = m.tahunDadar || String(new Date().getFullYear());
        const newNra = `${kodeDistrik}-${kodeWilayah}${kodeRanting}-${String(rantingSeq).padStart(3, '0')}-${tahun}`;

        await prisma.anggota.update({
          where: { id: m.id },
          data: { nomorAnggota: newNra },
        });

        console.log(`  ✅ ${m.nomorAnggota} → ${newNra}`);
        success++;
      } catch (error) {
        console.error(`  ❌ ${m.nomorAnggota} — ${(error as Error).message}`);
        errors++;
      }
    }
  }

  // 4. Summary
  console.log(`\n=== Selesai ===`);
  console.log(`   Berhasil: ${success}`);
  console.log(`   Dilewati: ${skipped}`);
  console.log(`   Gagal: ${errors}`);
}

main()
  .catch((e) => {
    console.error('Fatal error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

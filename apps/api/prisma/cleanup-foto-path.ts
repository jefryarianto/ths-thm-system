/**
 * Script to clean up invalid fotoPath values from the anggota table.
 *
 * Members may have fotoPath set to a filename (e.g. "Agus Susilo.png")
 * but the actual file doesn't exist in the uploads directory. This script:
 * 1. Checks every member with a non-null fotoPath
 * 2. Verifies whether the corresponding file exists in the uploads dir
 * 3. Sets fotoPath to null for members whose files are missing
 *
 * Usage:
 *   cd apps/api && npx ts-node prisma/cleanup-foto-path.ts
 */

import { PrismaClient } from '@prisma/client';
import * as fs from 'fs';
import * as path from 'path';

const prisma = new PrismaClient();

const UPLOAD_DIR = path.resolve(process.env.UPLOAD_DIR || './uploads');

async function main() {
  console.log('🔍 Checking for members with invalid fotoPath...\n');

  // Get all members with fotoPath set
  const members = await prisma.anggota.findMany({
    where: {
      fotoPath: { not: null },
    },
    select: {
      id: true,
      namaLengkap: true,
      nomorAnggota: true,
      fotoPath: true,
    },
  });

  console.log(`📊 Found ${members.length} members with fotoPath set.\n`);

  if (members.length === 0) {
    console.log('✅ No members with fotoPath — nothing to clean up.');
    return;
  }

  // Build a set of all files that exist in the uploads directory.
  // The upload controller saves files directly to UPLOAD_DIR (not a subdirectory),
  // and fotoPath stores just the filename (e.g. "Agus Susilo.png").
  // So the file path is UPLOAD_DIR/fotoPath on disk.
  let existingFiles: Set<string>;
  
  try {
    const files = fs.readdirSync(UPLOAD_DIR);
    existingFiles = new Set(files);
    console.log(`📁 Uploads directory has ${existingFiles.size} file(s).\n`);
  } catch {
    console.log('⚠️  Uploads directory not found — treating all fotoPath as invalid.\n');
    existingFiles = new Set();
  }

  let cleanedCount = 0;
  let validCount = 0;

  for (const member of members) {
    if (!member.fotoPath) continue;

    const fileExists = existingFiles.has(member.fotoPath);

    if (!fileExists) {
      console.log(`  ❌ ${member.namaLengkap} (${member.nomorAnggota}) → fotoPath "${member.fotoPath}" not found`);
      
      await prisma.anggota.update({
        where: { id: member.id },
        data: { fotoPath: null },
      });

      cleanedCount++;
    } else {
      console.log(`  ✅ ${member.namaLengkap} → file exists`);
      validCount++;
    }
  }

  console.log(`\n📋 Summary:`);
  console.log(`  Total checked: ${members.length}`);
  console.log(`  Cleaned (set to null): ${cleanedCount}`);
  console.log(`  Kept (file exists): ${validCount}`);
  console.log(`\n✅ Done.`);
}

main()
  .catch((e) => {
    console.error('❌ Error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

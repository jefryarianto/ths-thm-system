import { PrismaClient } from '@prisma/client';
import { copyFileSync, existsSync, mkdirSync, readFileSync } from 'fs';
import { dirname, join, resolve } from 'path';
import {
  BeritaBackupManifest,
  buildBeritaRestoreArgs,
  planBeritaImageRestore,
} from '../src/common/utils/berita-backup';

export interface RestoreBeritaOptions {
  prisma: PrismaClient;
  backupDir: string;
  uploadDir?: string;
}

export interface RestoreBeritaResult {
  created: number;
  imagesCopied: number;
  manifestPath: string;
}

export async function restoreBerita(options: RestoreBeritaOptions): Promise<RestoreBeritaResult> {
  const backupDir = resolve(options.backupDir);
  const uploadDir = resolve(options.uploadDir ?? process.env.UPLOAD_DIR ?? './uploads');
  const manifestPath = join(backupDir, 'berita.json');
  const manifest = JSON.parse(readFileSync(manifestPath, 'utf8')) as BeritaBackupManifest;

  const args = buildBeritaRestoreArgs(manifest.berita);
  const result = await options.prisma.berita.createMany({
    data: args.data,
    skipDuplicates: args.skipDuplicates,
  });

  let imagesCopied = 0;
  for (const copy of planBeritaImageRestore(manifest.images, uploadDir)) {
    if (!existsSync(copy.source)) continue;
    mkdirSync(dirname(copy.destination), { recursive: true });
    copyFileSync(copy.source, copy.destination);
    imagesCopied++;
  }

  return { created: result.count, imagesCopied, manifestPath };
}

async function main(): Promise<void> {
  const backupDir = process.argv[2] ?? process.env.BERITA_BACKUP_DIR;
  if (!backupDir) {
    throw new Error('Berikan folder backup: ts-node prisma/restore-berita.ts <folder-backup>');
  }

  const prisma = new PrismaClient();
  try {
    const result = await restoreBerita({ prisma, backupDir });
    console.log(`✅ Restore berita: ${result.created} baris baru (duplikat dilewati)`);
    console.log(`   gambar   : ${result.imagesCopied} file`);
    console.log(`   manifest : ${result.manifestPath}`);
  } finally {
    await prisma.$disconnect();
  }
}

if (require.main === module) {
  main().catch((error) => {
    console.error('❌ Restore berita gagal:', error instanceof Error ? error.message : error);
    process.exit(1);
  });
}

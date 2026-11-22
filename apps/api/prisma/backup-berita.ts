import { PrismaClient } from '@prisma/client';
import { copyFileSync, existsSync, mkdirSync, readdirSync, writeFileSync } from 'fs';
import { join, resolve } from 'path';
import {
  BeritaFileCopy,
  BeritaRow,
  buildBeritaBackupManifest,
  planBeritaImageCopies,
} from '../src/common/utils/berita-backup';

export interface BackupBeritaOptions {
  prisma: PrismaClient;
  uploadDir?: string;
  backupRoot?: string;
  now?: Date;
}

export interface BackupBeritaResult {
  backupDir: string;
  manifestPath: string;
  manifest: ReturnType<typeof buildBeritaBackupManifest>;
  imagesCopied: number;
}

function listFiles(dir: string): string[] {
  if (!existsSync(dir)) return [];
  return readdirSync(dir, { withFileTypes: true })
    .filter((entry) => entry.isFile())
    .map((entry) => entry.name);
}

export async function backupBerita(options: BackupBeritaOptions): Promise<BackupBeritaResult> {
  const uploadDir = resolve(options.uploadDir ?? process.env.UPLOAD_DIR ?? './uploads');
  const backupRoot = resolve(
    options.backupRoot ?? process.env.BERITA_BACKUP_DIR ?? join(uploadDir, '..', 'backups'),
  );
  const now = options.now ?? new Date();
  const timestamp = now.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}Z$/, '');
  const backupDir = join(backupRoot, `berita-${timestamp}`);
  const imagesDir = join(backupDir, 'images');

  const rows = (await options.prisma.berita.findMany({
    orderBy: { id: 'asc' },
  })) as BeritaRow[];

  const rootFiles = listFiles(uploadDir);
  const manifest = buildBeritaBackupManifest(
    rows,
    uploadDir,
    backupDir,
    now.toISOString(),
    rootFiles,
  );

  const dedicatedDir = join(uploadDir, 'berita');
  const dedicatedCopies = planBeritaImageCopies(
    rows,
    dedicatedDir,
    backupDir,
    listFiles(dedicatedDir),
  );
  const byDestination = new Map<string, BeritaFileCopy>();
  for (const copy of [...manifest.images, ...dedicatedCopies]) {
    byDestination.set(copy.destination, copy);
  }
  manifest.images = [...byDestination.values()];

  mkdirSync(imagesDir, { recursive: true });
  const manifestPath = join(backupDir, 'berita.json');
  writeFileSync(manifestPath, JSON.stringify(manifest, null, 2), 'utf8');

  let imagesCopied = 0;
  for (const copy of manifest.images) {
    if (!existsSync(copy.source)) continue;
    copyFileSync(copy.source, copy.destination);
    imagesCopied++;
  }

  return { backupDir, manifestPath, manifest, imagesCopied };
}

async function main(): Promise<void> {
  const prisma = new PrismaClient();
  try {
    const result = await backupBerita({ prisma });
    console.log(`✅ Backup berita: ${result.manifest.berita.length} baris`);
    console.log(`   manifest : ${result.manifestPath}`);
    console.log(`   gambar   : ${result.imagesCopied} file`);
    console.log(`   folder   : ${result.backupDir}`);
  } finally {
    await prisma.$disconnect();
  }
}

if (require.main === module) {
  main().catch((error) => {
    console.error('❌ Backup berita gagal:', error instanceof Error ? error.message : error);
    process.exit(1);
  });
}

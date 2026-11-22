import { join } from 'path';

export const BERITA_IMAGE_PREFIX = 'berita-';

export interface BeritaRow {
  id: string;
  judul: string;
  ringkasan: string;
  konten: string;
  gambar: string | null | undefined;
  tanggal: Date | string;
  slug: string;
  isVisible: boolean;
  createdAt: Date | string;
  updatedAt: Date | string;
}

export interface BeritaBackupRecord {
  id: string;
  judul: string;
  ringkasan: string;
  konten: string;
  gambar: string | null;
  tanggal: string;
  slug: string;
  isVisible: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface BeritaFileCopy {
  source: string;
  destination: string;
}

export interface BeritaBackupManifest {
  version: 1;
  createdAt: string;
  berita: BeritaBackupRecord[];
  images: BeritaFileCopy[];
}

function toIso(value: Date | string): string {
  return value instanceof Date ? value.toISOString() : new Date(value).toISOString();
}

function basenameOf(value: string | null | undefined): string | null {
  if (!value) return null;
  const parts = value.replace(/\\/g, '/').split('/');
  return parts[parts.length - 1] || null;
}

export function mapBeritaRowsForBackup(rows: readonly BeritaRow[]): BeritaBackupRecord[] {
  return rows.map((row) => ({
    id: row.id,
    judul: row.judul,
    ringkasan: row.ringkasan,
    konten: row.konten,
    gambar: basenameOf(row.gambar),
    tanggal: toIso(row.tanggal),
    slug: row.slug,
    isVisible: row.isVisible,
    createdAt: toIso(row.createdAt),
    updatedAt: toIso(row.updatedAt),
  }));
}

export function planBeritaImageCopies(
  rows: readonly BeritaRow[],
  uploadDir: string,
  backupDir: string,
  availableFileNames: readonly string[],
): BeritaFileCopy[] {
  const referenced = new Set(
    rows.map((row) => basenameOf(row.gambar)).filter((name): name is string => name !== null),
  );
  const names = availableFileNames
    .map((name) => basenameOf(name))
    .filter((name): name is string => name !== null)
    .filter((name) => name.startsWith(BERITA_IMAGE_PREFIX) || referenced.has(name));

  return [...new Set(names)]
    .sort()
    .map((name) => ({
      source: join(uploadDir, name),
      destination: join(backupDir, 'images', name),
    }));
}

export function buildBeritaBackupManifest(
  rows: readonly BeritaRow[],
  uploadDir: string,
  backupDir: string,
  timestamp: string,
  availableFileNames: readonly string[],
): BeritaBackupManifest {
  return {
    version: 1,
    createdAt: timestamp,
    berita: mapBeritaRowsForBackup(rows),
    images: planBeritaImageCopies(rows, uploadDir, backupDir, availableFileNames),
  };
}

export function buildBeritaRestoreArgs(records: readonly BeritaBackupRecord[]) {
  return {
    skipDuplicates: true,
    data: records.map((record) => ({
      id: record.id,
      judul: record.judul,
      ringkasan: record.ringkasan,
      konten: record.konten,
      gambar: record.gambar,
      tanggal: new Date(record.tanggal),
      slug: record.slug,
      isVisible: record.isVisible,
      createdAt: new Date(record.createdAt),
      updatedAt: new Date(record.updatedAt),
    })),
  };
}

export function planBeritaImageRestore(
  copies: readonly BeritaFileCopy[],
  uploadDir: string,
): BeritaFileCopy[] {
  return copies.map((copy) => ({
    source: copy.destination,
    destination: join(uploadDir, basenameOf(copy.destination) ?? ''),
  }));
}

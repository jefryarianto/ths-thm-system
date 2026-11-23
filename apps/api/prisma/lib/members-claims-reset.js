const path = require('path');

const RESET_DELETE_PLAN = ['iuranReminder', 'dokumenVersion', 'klaim', 'anggota'];

const USER_RESET_DELETE_PLAN = [
  'hasilPendadaran',
  'nilaiPendadaran',
  'pesertaPendadaran',
  'sesiUjianPeserta',
  'calonAnggota',
  'ujianPraktekPenilai',
  'ujianPraktekItem',
  'itemPenilaian',
  'ujianPraktek',
  'dokumenKegiatan',
  'kegiatanPeserta',
  'presensiKegiatan',
  'undanganPendadaran',
  'penugasanPenguji',
  'latihan',
  'kegiatan',
  'deviceToken',
  'disposisi',
  'dokumenOrganisasi',
  'notifikasi',
  'tandaTangan',
  'kepengurusan',
  'user',
];

const USER_RESET_ITEM_PENILAIAN_WHERE = { aspek: { kegiatanId: { not: null } } };

const FILE_SOURCES = [
  ['anggota', 'fotoPath'],
  ['buktiKeanggotaan', 'filePath'],
  ['dokumenPendukung', 'filePath'],
  ['dokumen', 'filePath'],
  ['dokumenVersion', 'filePath'],
  ['ktaApplication', 'buktiBayarPath'],
];

function collectFilePaths(sources) {
  const seen = new Set();
  for (const [key, field] of FILE_SOURCES) {
    const rows = sources[key] || [];
    for (const row of rows) {
      const value = row && row[field];
      if (typeof value === 'string' && value.trim() !== '') {
        seen.add(value);
      }
    }
  }
  return [...seen];
}

function resolveUploadPath(uploadDir, relativePath) {
  if (typeof relativePath !== 'string' || relativePath.trim() === '') return null;
  if (path.isAbsolute(relativePath)) return null;
  if (relativePath.split(/[\\/]+/).includes('..')) return null;

  const base = path.resolve(uploadDir);
  const full = path.resolve(uploadDir, relativePath);
  if (full !== base && !full.startsWith(base + path.sep)) return null;

  return path.join(uploadDir, relativePath);
}

function resolveStoredFilePath(uploadDir, storageRoot, candidate) {
  if (typeof candidate !== 'string' || candidate.trim() === '') return null;
  if (!path.isAbsolute(candidate)) {
    return resolveUploadPath(uploadDir, candidate);
  }

  const root = path.resolve(storageRoot || path.dirname(uploadDir));
  const full = path.resolve(candidate);
  if (full !== root && !full.startsWith(root + path.sep)) return null;
  return candidate;
}

module.exports = {
  RESET_DELETE_PLAN,
  USER_RESET_DELETE_PLAN,
  USER_RESET_ITEM_PENILAIAN_WHERE,
  collectFilePaths,
  resolveUploadPath,
  resolveStoredFilePath,
};
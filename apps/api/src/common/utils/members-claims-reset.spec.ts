import * as path from 'path';

const {
  RESET_DELETE_PLAN,
  USER_RESET_DELETE_PLAN,
  USER_RESET_ITEM_PENILAIAN_WHERE,
  collectFilePaths,
  resolveUploadPath,
  resolveStoredFilePath,
} = require('../../../prisma/lib/members-claims-reset.js');

describe('members-claims reset helpers', () => {
  it('orders deletes so orphan tables and claims go before anggota', () => {
    expect(RESET_DELETE_PLAN).toEqual(['iuranReminder', 'dokumenVersion', 'klaim', 'anggota']);
  });

  it('orders user deletes so RESTRICT dependencies go before user', () => {
    expect(USER_RESET_DELETE_PLAN).toEqual([
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
    ]);
  });

  it('scopes itemPenilaian deletion to aspek tied to kegiatan', () => {
    expect(USER_RESET_ITEM_PENILAIAN_WHERE).toEqual({ aspek: { kegiatanId: { not: null } } });
  });

  it('collects unique non-empty file paths from member and claim sources', () => {
    const paths = collectFilePaths({
      anggota: [{ fotoPath: 'a.jpg' }, { fotoPath: null }, { fotoPath: 'a.jpg' }],
      buktiKeanggotaan: [{ filePath: 'claims/b.pdf' }],
      dokumenPendukung: [{ filePath: 'claims/c.pdf' }, { filePath: '' }],
      dokumen: [{ filePath: 'docs/d.pdf' }],
      dokumenVersion: [{ filePath: 'docs/d-v2.pdf' }],
      ktaApplication: [{ buktiBayarPath: 'kta/e.jpg' }],
    });

    expect(paths.sort()).toEqual(
      ['a.jpg', 'claims/b.pdf', 'claims/c.pdf', 'docs/d-v2.pdf', 'docs/d.pdf', 'kta/e.jpg'].sort(),
    );
  });

  it('resolves safe upload paths and rejects traversal', () => {
    const base = '/app/storage/uploads';
    expect(resolveUploadPath(base, 'claims/a.pdf')).toBe(path.join(base, 'claims/a.pdf'));
    expect(resolveUploadPath(base, '../secret')).toBeNull();
    expect(resolveUploadPath(base, '/etc/passwd')).toBeNull();
    expect(resolveUploadPath(base, '')).toBeNull();
  });

  it('resolves absolute storage paths for member documents', () => {
    const uploadDir = '/app/storage/uploads';
    const storageRoot = '/app/storage';
    expect(resolveStoredFilePath(uploadDir, storageRoot, '/app/storage/documents/DOC.pdf')).toBe(
      '/app/storage/documents/DOC.pdf',
    );
    expect(resolveStoredFilePath(uploadDir, storageRoot, '/etc/passwd')).toBeNull();
    expect(resolveStoredFilePath(uploadDir, storageRoot, 'claims/a.pdf')).toBe(
      path.join(uploadDir, 'claims/a.pdf'),
    );
  });
});
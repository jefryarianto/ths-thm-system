import {
  buildBeritaBackupManifest,
  buildBeritaRestoreArgs,
  mapBeritaRowsForBackup,
  planBeritaImageCopies,
  planBeritaImageRestore,
} from './berita-backup';

const rows = [
  {
    id: 'b-1',
    judul: 'Judul Satu',
    ringkasan: 'Ringkasan satu',
    konten: 'Konten satu',
    gambar: 'berita-image-1700000000000-123.png',
    tanggal: new Date('2026-01-02T03:04:05.000Z'),
    slug: 'judul-satu',
    isVisible: true,
    createdAt: new Date('2026-01-02T03:10:00.000Z'),
    updatedAt: new Date('2026-01-03T04:05:06.000Z'),
  },
  {
    id: 'b-2',
    judul: 'Judul Dua',
    ringkasan: 'Ringkasan dua',
    konten: 'Konten dua',
    gambar: null,
    tanggal: new Date('2026-02-03T01:02:03.000Z'),
    slug: 'judul-dua',
    isVisible: false,
    createdAt: new Date('2026-02-03T01:02:03.000Z'),
    updatedAt: new Date('2026-02-04T05:06:07.000Z'),
  },
];

const norm = (value: string): string => value.replace(/\\/g, '/');

describe('berita backup mapping', () => {
  it('preserves berita id, slug and gambar and serializes dates', () => {
    expect(mapBeritaRowsForBackup(rows)).toEqual([
      {
        id: 'b-1',
        judul: 'Judul Satu',
        ringkasan: 'Ringkasan satu',
        konten: 'Konten satu',
        gambar: 'berita-image-1700000000000-123.png',
        tanggal: '2026-01-02T03:04:05.000Z',
        slug: 'judul-satu',
        isVisible: true,
        createdAt: '2026-01-02T03:10:00.000Z',
        updatedAt: '2026-01-03T04:05:06.000Z',
      },
      {
        id: 'b-2',
        judul: 'Judul Dua',
        ringkasan: 'Ringkasan dua',
        konten: 'Konten dua',
        gambar: null,
        tanggal: '2026-02-03T01:02:03.000Z',
        slug: 'judul-dua',
        isVisible: false,
        createdAt: '2026-02-03T01:02:03.000Z',
        updatedAt: '2026-02-04T05:06:07.000Z',
      },
    ]);
  });

  it('plans copies of berita images only, into the timestamped backup folder', () => {
    const copies = planBeritaImageCopies(
      rows,
      '/api/uploads',
      '/api/backups/berita-20260102T030405',
      [
        'berita-image-1700000000000-123.png',
        'berita-image-999.png',
        'member-photo-1.png',
        'uploads/berita-image-legacy.jpg',
      ],
    );

    expect(copies.map((copy) => norm(copy.source))).toEqual([
      '/api/uploads/berita-image-1700000000000-123.png',
      '/api/uploads/berita-image-999.png',
      '/api/uploads/berita-image-legacy.jpg',
    ]);
    expect(copies.map((copy) => norm(copy.destination))).toEqual([
      '/api/backups/berita-20260102T030405/images/berita-image-1700000000000-123.png',
      '/api/backups/berita-20260102T030405/images/berita-image-999.png',
      '/api/backups/berita-20260102T030405/images/berita-image-legacy.jpg',
    ]);
  });

  it('builds a manifest from serialized rows and copy plan', () => {
    const manifest = buildBeritaBackupManifest(
      rows,
      '/api/uploads',
      '/api/backups/berita-20260102T030405',
      '2026-01-02T03:04:05.000Z',
      ['berita-image-1700000000000-123.png', 'berita-image-999.png'],
    );

    expect(manifest.version).toBe(1);
    expect(manifest.createdAt).toBe('2026-01-02T03:04:05.000Z');
    expect(manifest.berita.map((row) => [row.id, row.slug, row.gambar])).toEqual([
      ['b-1', 'judul-satu', 'berita-image-1700000000000-123.png'],
      ['b-2', 'judul-dua', null],
    ]);
    expect(manifest.images).toHaveLength(2);
  });
});

describe('berita restore mapping', () => {
  const manifest = buildBeritaBackupManifest(
    rows,
    '/api/uploads',
    '/api/backups/berita-20260102T030405',
    '2026-01-02T03:04:05.000Z',
    ['berita-image-1700000000000-123.png'],
  );

  it('builds createMany args that skip duplicates and preserve ids', () => {
    expect(buildBeritaRestoreArgs(manifest.berita)).toEqual({
      skipDuplicates: true,
      data: [
        {
          id: 'b-1',
          judul: 'Judul Satu',
          ringkasan: 'Ringkasan satu',
          konten: 'Konten satu',
          gambar: 'berita-image-1700000000000-123.png',
          tanggal: new Date('2026-01-02T03:04:05.000Z'),
          slug: 'judul-satu',
          isVisible: true,
          createdAt: new Date('2026-01-02T03:10:00.000Z'),
          updatedAt: new Date('2026-01-03T04:05:06.000Z'),
        },
        {
          id: 'b-2',
          judul: 'Judul Dua',
          ringkasan: 'Ringkasan dua',
          konten: 'Konten dua',
          gambar: null,
          tanggal: new Date('2026-02-03T01:02:03.000Z'),
          slug: 'judul-dua',
          isVisible: false,
          createdAt: new Date('2026-02-03T01:02:03.000Z'),
          updatedAt: new Date('2026-02-04T05:06:07.000Z'),
        },
      ],
    });
  });

  it('plans image copies from the backup folder back to uploads', () => {
    expect(planBeritaImageRestore(manifest.images, '/api/uploads').map((copy) => [norm(copy.source), norm(copy.destination)])).toEqual([
      [
        '/api/backups/berita-20260102T030405/images/berita-image-1700000000000-123.png',
        '/api/uploads/berita-image-1700000000000-123.png',
      ],
    ]);
  });
});

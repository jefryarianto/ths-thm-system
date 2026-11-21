import { BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { GaleriService } from './galeri.service';
import { PrismaService } from '../../prisma/prisma.service';
import { EventsGateway } from '../notifications/events.gateway';
import { NotificationsService } from '../notifications/notifications.service';

/**
 * Byte awal berkas HEIC/HEIF: box `ftyp` di offset 4 dengan brand khas HEIF.
 * Dipakai untuk memastikan penolakan terjadi karena format, bukan karena
 * dekoder sharp (yang di build server ini tidak punya dukungan HEIF).
 */
function heicBuffer(brand: string): Buffer {
  const header = Buffer.concat([
    Buffer.from([0x00, 0x00, 0x00, 0x18]),
    Buffer.from('ftyp', 'ascii'),
    Buffer.from(brand.padEnd(4, ' ').slice(0, 4), 'ascii'),
    Buffer.from([0x00, 0x00, 0x00, 0x00]),
    Buffer.from('mif1', 'ascii'),
    Buffer.from('heic', 'ascii'),
  ]);
  return Buffer.concat([header, Buffer.alloc(64)]);
}

function fakeFile(buffer: Buffer, mimetype: string): Express.Multer.File {
  return {
    fieldname: 'file',
    originalname: 'foto.heic',
    encoding: '7bit',
    mimetype,
    size: buffer.length,
    buffer,
    destination: '',
    filename: '',
    path: '',
    stream: undefined as never,
  } as unknown as Express.Multer.File;
}

const FORMAT_MESSAGE = 'Format foto harus JPEG, PNG, atau WebP';

describe('GaleriService upload — format foto', () => {
  let service: GaleriService;

  const mockPrisma = {
    galeri: {
      create: jest.fn(),
      findUnique: jest.fn(),
      delete: jest.fn(),
      groupBy: jest.fn().mockResolvedValue([]),
    },
    galeriDeletionLog: {
      create: jest.fn(),
    },
    $transaction: jest.fn((ops: Promise<unknown>[]): Promise<unknown[]> => Promise.all(ops)),
  };

  const mockEvents = {
    sendToRoles: jest.fn(),
  };

  const mockNotifications = { send: jest.fn() };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GaleriService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: EventsGateway, useValue: mockEvents },
        { provide: NotificationsService, useValue: mockNotifications },
      ],
    }).compile();

    service = module.get<GaleriService>(GaleriService);
    jest.clearAllMocks();
  });

  it('menolak unggahan image/heic dengan pesan format', async () => {
    const file = fakeFile(heicBuffer('heic'), 'image/heic');

    await expect(service.upload(file, 'Foto HEIC', 'user-1')).rejects.toThrow(BadRequestException);
    await expect(service.upload(file, 'Foto HEIC', 'user-1')).rejects.toThrow(FORMAT_MESSAGE);
    expect(mockPrisma.galeri.create).not.toHaveBeenCalled();
  });

  it('menolak unggahan image/heif dengan pesan format', async () => {
    const file = fakeFile(heicBuffer('mif1'), 'image/heif');

    await expect(service.upload(file, 'Foto HEIF', 'user-1')).rejects.toThrow(FORMAT_MESSAGE);
    expect(mockPrisma.galeri.create).not.toHaveBeenCalled();
  });

  it('menolak image/heic walau brand-nya lain (hev1)', async () => {
    const file = fakeFile(heicBuffer('hev1'), 'image/heic');

    await expect(service.upload(file, 'Foto HEIC', 'user-1')).rejects.toThrow(FORMAT_MESSAGE);
  });

  it('menolak HEIC yang menyamar sebagai image/jpeg (signature tidak cocok)', async () => {
    const file = fakeFile(heicBuffer('heic'), 'image/jpeg');

    await expect(service.upload(file, 'Foto palsu', 'user-1')).rejects.toThrow(FORMAT_MESSAGE);
    expect(mockPrisma.galeri.create).not.toHaveBeenCalled();
  });

  it('menolak format lain di luar JPEG/PNG/WebP', async () => {
    const file = fakeFile(Buffer.from('GIF89a', 'ascii'), 'image/gif');

    await expect(service.upload(file, 'Foto GIF', 'user-1')).rejects.toThrow(FORMAT_MESSAGE);
  });
});

describe('GaleriService delete — jejak audit', () => {
  let service: GaleriService;

  const foto = {
    id: 'g1',
    judul: 'Foto Kegiatan',
    kategori: 'Kegiatan',
    status: 'APPROVED',
    uploaderId: 'pemilik-1',
    storageKey: 'g1.jpg',
    thumbKey: 'g1-thumb.jpg',
    ukuranBytes: 12345,
    createdAt: new Date('2026-11-01T08:00:00Z'),
  };

  const mockPrisma = {
    galeri: {
      create: jest.fn(),
      findUnique: jest.fn(),
      delete: jest.fn().mockResolvedValue({ id: 'g1' }),
      groupBy: jest.fn().mockResolvedValue([]),
    },
    galeriDeletionLog: {
      create: jest.fn().mockResolvedValue({ id: 'log-1' }),
    },
    user: { findUnique: jest.fn().mockResolvedValue(null) },
    $transaction: jest.fn((ops: Promise<unknown>[]): Promise<unknown[]> => Promise.all(ops)),
  };

  const mockEvents = { sendToRoles: jest.fn() };
  const mockNotifications = { send: jest.fn() };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GaleriService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: EventsGateway, useValue: mockEvents },
        { provide: NotificationsService, useValue: mockNotifications },
      ],
    }).compile();

    service = module.get<GaleriService>(GaleriService);
    jest.clearAllMocks();
    mockPrisma.galeri.findUnique.mockResolvedValue(foto);
    mockPrisma.galeri.delete.mockResolvedValue({ id: 'g1' });
    mockPrisma.galeriDeletionLog.create.mockResolvedValue({ id: 'log-1' });
    mockPrisma.$transaction.mockImplementation((ops: Promise<unknown>[]) => Promise.all(ops));
  });

  it('mencatat siapa, kapan, foto mana, dan alasannya saat moderator menghapus', async () => {
    const result = await service.delete(
      'g1',
      { id: 'mod-1', role: 'admin_berita', namaLengkap: 'Mod Satu' },
      'Duplikat foto',
    );

    expect(result).toEqual({ success: true });
    expect(mockPrisma.galeriDeletionLog.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        galeriId: 'g1',
        actorId: 'mod-1',
        actorNama: 'Mod Satu',
        actorRole: 'admin_berita',
        reason: 'Duplikat foto',
        judul: 'Foto Kegiatan',
        uploaderId: 'pemilik-1',
        kategori: 'Kegiatan',
        status: 'APPROVED',
        storageKey: 'g1.jpg',
        thumbKey: 'g1-thumb.jpg',
        ukuranBytes: 12345,
        fotoCreatedAt: foto.createdAt,
      }),
    });
    expect(mockPrisma.galeri.delete).toHaveBeenCalledWith({ where: { id: 'g1' } });
  });

  it('mengambil nama pelaku dari tabel user bila tidak ada di request', async () => {
    mockPrisma.user.findUnique.mockResolvedValueOnce({ namaLengkap: 'Mod Dari DB' });

    await service.delete('g1', { id: 'mod-1', role: 'superadmin' });

    expect(mockPrisma.user.findUnique).toHaveBeenCalledWith({
      where: { id: 'mod-1' },
      select: { namaLengkap: true },
    });
    expect(mockPrisma.galeriDeletionLog.create).toHaveBeenCalledWith({
      data: expect.objectContaining({ actorNama: 'Mod Dari DB' }),
    });
  });

  it('tetap menghapus walau nama pelaku tidak bisa dibaca', async () => {
    mockPrisma.user.findUnique.mockRejectedValueOnce(new Error('db sibuk'));

    await expect(service.delete('g1', { id: 'mod-1', role: 'superadmin' })).resolves.toEqual({
      success: true,
    });
    expect(mockPrisma.galeriDeletionLog.create).toHaveBeenCalledWith({
      data: expect.objectContaining({ actorNama: null }),
    });
  });

  it('mengirim pencatatan log dan penghapusan sebagai satu transaksi', async () => {
    await service.delete('g1', { id: 'super-1', role: 'superadmin' });

    expect(mockPrisma.$transaction).toHaveBeenCalledTimes(1);
    expect(mockPrisma.$transaction.mock.calls[0][0]).toHaveLength(2);
    expect(mockPrisma.galeriDeletionLog.create).toHaveBeenCalledTimes(1);
    expect(mockPrisma.galeri.delete).toHaveBeenCalledTimes(1);
    // log dikirim lebih dulu di dalam batch
    expect(mockPrisma.galeriDeletionLog.create.mock.invocationCallOrder[0]).toBeLessThan(
      mockPrisma.galeri.delete.mock.invocationCallOrder[0],
    );
  });

  it('mengizinkan pemilik menghapus tanpa alasan (reason null)', async () => {
    await service.delete('g1', { id: 'pemilik-1', role: 'anggota' });

    expect(mockPrisma.galeriDeletionLog.create).toHaveBeenCalledWith({
      data: expect.objectContaining({ actorRole: 'anggota', reason: null }),
    });
  });

  it('menormalkan alasan: dipangkas, maksimal 500 karakter, kosong jadi null', async () => {
    await service.delete('g1', { id: 'mod-1', role: 'admin_berita' }, '   ');
    expect(mockPrisma.galeriDeletionLog.create).toHaveBeenLastCalledWith({
      data: expect.objectContaining({ reason: null }),
    });

    mockPrisma.galeriDeletionLog.create.mockClear();
    await service.delete('g1', { id: 'mod-1', role: 'admin_berita' }, `  ${'x'.repeat(600)}  `);
    const data = mockPrisma.galeriDeletionLog.create.mock.calls[0][0].data;
    expect(data.reason).toHaveLength(500);
  });

  it('menolak penghapusan oleh peran lain tanpa mencatat apa pun', async () => {
    await expect(service.delete('g1', { id: 'user-lain', role: 'admin_kegiatan' })).rejects.toThrow(
      ForbiddenException,
    );

    expect(mockPrisma.galeriDeletionLog.create).not.toHaveBeenCalled();
    expect(mockPrisma.galeri.delete).not.toHaveBeenCalled();
  });

  it('tidak mencatat apa pun bila fotonya tidak ada', async () => {
    mockPrisma.galeri.findUnique.mockResolvedValue(null);

    await expect(service.delete('hilang', { id: 'mod-1', role: 'superadmin' })).rejects.toThrow(
      NotFoundException,
    );
    expect(mockPrisma.galeriDeletionLog.create).not.toHaveBeenCalled();
  });

  it('meneruskan kegagalan pencatatan log ke pemanggil', async () => {
    mockPrisma.galeriDeletionLog.create.mockRejectedValue(new Error('log gagal'));

    await expect(service.delete('g1', { id: 'mod-1', role: 'superadmin' })).rejects.toThrow(
      'log gagal',
    );
    // penghapusan hanya pernah dikirim lewat $transaction, jadi kegagalan log
    // ikut membatalkan penghapusan di database.
    expect(mockPrisma.galeri.delete).toHaveBeenCalledTimes(1);
    expect(mockPrisma.$transaction).toHaveBeenCalledTimes(1);
  });
});

describe('GaleriService moderasi', () => {
  let service: GaleriService;

  const mockPrisma = {
    galeri: {
      create: jest.fn(),
      findUnique: jest.fn(),
      findMany: jest.fn().mockResolvedValue([]),
      count: jest.fn().mockResolvedValue(0),
      groupBy: jest.fn().mockResolvedValue([]),
      update: jest.fn(),
      delete: jest.fn().mockResolvedValue({ id: 'g1' }),
    },
    galeriModerationLog: {
      create: jest.fn(),
      findMany: jest.fn().mockResolvedValue([]),
    },
    galeriDeletionLog: {
      create: jest.fn(),
      findMany: jest.fn().mockResolvedValue([]),
      count: jest.fn().mockResolvedValue(0),
    },
    user: { findUnique: jest.fn().mockResolvedValue(null) },
    $transaction: jest.fn(),
  };

  const mockEvents = { sendToRoles: jest.fn() };
  const mockNotifications = { send: jest.fn() };

  const foto = (over: Record<string, unknown> = {}) => ({
    id: 'g1',
    judul: 'Foto 1',
    status: 'PENDING',
    uploaderId: 'pemilik-1',
    ...over,
  });

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GaleriService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: EventsGateway, useValue: mockEvents },
        { provide: NotificationsService, useValue: mockNotifications },
      ],
    }).compile();

    service = module.get<GaleriService>(GaleriService);
    jest.clearAllMocks();
    mockNotifications.send.mockResolvedValue(undefined);
    mockPrisma.$transaction.mockImplementation((ops: Promise<unknown>[]) => Promise.all(ops));
    mockPrisma.galeri.update.mockImplementation((args: { where: { id: string }; data: object }) =>
      Promise.resolve({ id: args.where.id, ...args.data }),
    );
    mockPrisma.galeriModerationLog.create.mockResolvedValue({ id: 'log-1' });
    mockPrisma.galeriDeletionLog.create.mockResolvedValue({ id: 'del-1' });
    mockPrisma.galeri.findMany.mockResolvedValue([]);
    mockPrisma.galeri.count.mockResolvedValue(0);
    mockPrisma.galeri.groupBy.mockResolvedValue([
      { status: 'PENDING', _count: { _all: 3 } },
      { status: 'APPROVED', _count: { _all: 5 } },
    ]);
  });

  describe('review', () => {
    it('menyetujui foto: APPROVED, terlihat, dan log REVIEW tercatat', async () => {
      mockPrisma.galeri.findUnique.mockResolvedValue(foto());

      const result = await service.review('g1', 'APPROVED', undefined, 'mod-1');

      expect(result.status).toBe('APPROVED');
      expect(mockPrisma.galeri.update).toHaveBeenCalledWith({
        where: { id: 'g1' },
        data: expect.objectContaining({
          status: 'APPROVED',
          isVisible: true,
          reviewerId: 'mod-1',
          rejectedReason: null,
          reviewedAt: expect.any(Date),
        }),
      });
      expect(mockPrisma.galeriModerationLog.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          galeriId: 'g1',
          actorId: 'mod-1',
          action: 'REVIEW',
          fromStatus: 'PENDING',
          toStatus: 'APPROVED',
          reason: null,
        }),
      });
    });

    it('menyimpan snapshot judul foto dan nama peninjau di log', async () => {
      mockPrisma.galeri.findUnique.mockResolvedValue(foto());

      await service.review('g1', 'APPROVED', undefined, 'mod-1', 'Mod Satu');

      expect(mockPrisma.galeriModerationLog.create).toHaveBeenCalledWith({
        data: expect.objectContaining({ judulFoto: 'Foto 1', actorNama: 'Mod Satu' }),
      });
      // nama dari request dipakai, jadi tidak perlu lookup user tambahan
      expect(mockPrisma.user.findUnique).not.toHaveBeenCalled();
    });

    it('menolak tanpa alasan harus gagal sebelum menyentuh database', async () => {
      mockPrisma.galeri.findUnique.mockResolvedValue(foto());

      await expect(service.review('g1', 'REJECTED', '   ', 'mod-1')).rejects.toThrow(
        'Alasan penolakan wajib diisi',
      );
      expect(mockPrisma.galeri.update).not.toHaveBeenCalled();
      expect(mockPrisma.galeriModerationLog.create).not.toHaveBeenCalled();
    });

    it('menolak foto: tidak terlihat dan alasan disimpan (dipangkas)', async () => {
      mockPrisma.galeri.findUnique.mockResolvedValue(foto());

      const result = await service.review('g1', 'REJECTED', '  Buram  ', 'mod-1');

      expect(result.status).toBe('REJECTED');
      expect(mockPrisma.galeri.update).toHaveBeenCalledWith({
        where: { id: 'g1' },
        data: expect.objectContaining({ isVisible: false, rejectedReason: 'Buram' }),
      });
      expect(mockPrisma.galeriModerationLog.create).toHaveBeenCalledWith({
        data: expect.objectContaining({ toStatus: 'REJECTED', reason: 'Buram' }),
      });
    });

    it('membatasi alasan penolakan maksimal 2000 karakter', async () => {
      mockPrisma.galeri.findUnique.mockResolvedValue(foto());

      await service.review('g1', 'REJECTED', 'x'.repeat(2100), 'mod-1');

      const data = mockPrisma.galeri.update.mock.calls[0][0].data;
      expect(data.rejectedReason).toHaveLength(2000);
    });

    it('melarang meninjau unggahan sendiri', async () => {
      mockPrisma.galeri.findUnique.mockResolvedValue(foto({ uploaderId: 'mod-1' }));

      await expect(service.review('g1', 'APPROVED', undefined, 'mod-1')).rejects.toThrow(
        ForbiddenException,
      );
      await expect(service.review('g1', 'APPROVED', undefined, 'mod-1')).rejects.toThrow(
        'Tidak dapat meninjau unggahan sendiri',
      );
      expect(mockPrisma.galeri.update).not.toHaveBeenCalled();
      expect(mockPrisma.galeriModerationLog.create).not.toHaveBeenCalled();
    });

    it('foto yang tidak ada → NotFound tanpa menulis apa pun', async () => {
      mockPrisma.galeri.findUnique.mockResolvedValue(null);

      await expect(service.review('hilang', 'APPROVED', undefined, 'mod-1')).rejects.toThrow(
        NotFoundException,
      );
      expect(mockPrisma.galeri.update).not.toHaveBeenCalled();
    });

    it('status di luar APPROVED/REJECTED ditolak', async () => {
      await expect(service.review('g1', 'PENDING' as never, undefined, 'mod-1')).rejects.toThrow(
        'Status moderasi tidak valid',
      );
      expect(mockPrisma.galeri.findUnique).not.toHaveBeenCalled();
    });

    it('mengirim badge antrian hanya ke peran moderator', async () => {
      mockPrisma.galeri.findUnique.mockResolvedValue(foto());

      await service.review('g1', 'APPROVED', undefined, 'mod-1');

      expect(mockEvents.sendToRoles).toHaveBeenCalledWith(
        ['superadmin', 'admin_berita'],
        'galeri:queue',
        { pending: 3 },
      );
    });

    it('mengabari pengunggah saat fotonya disetujui', async () => {
      mockPrisma.galeri.findUnique.mockResolvedValue(foto());

      await service.review('g1', 'APPROVED', undefined, 'mod-1');

      expect(mockNotifications.send).toHaveBeenCalledWith(
        'pemilik-1',
        expect.objectContaining({
          judul: 'Foto galeri disetujui',
          isi: expect.stringContaining('Foto "Foto 1" telah disetujui'),
          data: expect.objectContaining({ module: 'galeri', galeriId: 'g1', status: 'APPROVED' }),
        }),
      );
    });

    it('menyampaikan alasan penolakan ke pengunggah', async () => {
      mockPrisma.galeri.findUnique.mockResolvedValue(foto());

      await service.review('g1', 'REJECTED', 'Buram', 'mod-1');

      expect(mockNotifications.send).toHaveBeenCalledWith(
        'pemilik-1',
        expect.objectContaining({
          judul: 'Foto galeri ditolak',
          isi: 'Foto "Foto 1" ditolak. Alasan: Buram',
          data: expect.objectContaining({ status: 'REJECTED', reason: 'Buram' }),
        }),
      );
    });

    it('tidak mengirim notifikasi bila unggahan tidak punya pengunggah', async () => {
      mockPrisma.galeri.findUnique.mockResolvedValue(foto({ uploaderId: null }));

      await service.review('g1', 'APPROVED', undefined, 'mod-1');

      expect(mockNotifications.send).not.toHaveBeenCalled();
    });

    it('kegagalan notifikasi tidak menggagalkan keputusan moderasi', async () => {
      mockPrisma.galeri.findUnique.mockResolvedValue(foto());
      mockNotifications.send.mockRejectedValue(new Error('smtp mati'));

      await expect(service.review('g1', 'APPROVED', undefined, 'mod-1')).resolves.toEqual(
        expect.objectContaining({ status: 'APPROVED' }),
      );
    });
  });

  describe('reviewBulk', () => {
    const duaFoto = [
      { id: 'g1', judul: 'Foto 1', status: 'PENDING', uploaderId: 'u1' },
      { id: 'g2', judul: 'Foto 2', status: 'PENDING', uploaderId: 'u2' },
    ];

    it('menyetujui banyak foto sekaligus dan mengirim event sekali', async () => {
      mockPrisma.galeri.findMany.mockResolvedValue(duaFoto);

      const result = await service.reviewBulk(['g1', 'g2'], 'APPROVED', undefined, 'mod-1');

      expect(result).toEqual({ updated: 2, failed: [] });
      expect(mockPrisma.galeri.update).toHaveBeenCalledTimes(2);
      expect(mockPrisma.galeriModerationLog.create).toHaveBeenCalledTimes(2);
      expect(mockEvents.sendToRoles).toHaveBeenCalledTimes(1);
      expect(mockPrisma.galeriModerationLog.create).toHaveBeenCalledWith({
        data: expect.objectContaining({ galeriId: 'g1', judulFoto: 'Foto 1' }),
      });
      expect(mockPrisma.galeriModerationLog.create).toHaveBeenCalledWith({
        data: expect.objectContaining({ galeriId: 'g2', judulFoto: 'Foto 2' }),
      });
      // nama peninjau diresolusi sekali untuk seluruh batch
      expect(mockPrisma.user.findUnique).toHaveBeenCalledTimes(1);
    });

    it('melewati unggahan sendiri dan tetap memproses sisanya', async () => {
      mockPrisma.galeri.findMany.mockResolvedValue([
        { id: 'g1', judul: 'Foto 1', status: 'PENDING', uploaderId: 'mod-1' },
        { id: 'g2', judul: 'Foto 2', status: 'PENDING', uploaderId: 'u2' },
      ]);

      const result = await service.reviewBulk(['g1', 'g2'], 'APPROVED', undefined, 'mod-1');

      expect(result).toEqual({
        updated: 1,
        failed: [{ id: 'g1', reason: 'Tidak dapat meninjau unggahan sendiri' }],
      });
      expect(mockPrisma.galeri.update).toHaveBeenCalledTimes(1);
    });

    it('melaporkan id yang tidak ditemukan tanpa menggagalkan yang lain', async () => {
      mockPrisma.galeri.findMany.mockResolvedValue([duaFoto[0]]);

      const result = await service.reviewBulk(['g1', 'hilang'], 'APPROVED', undefined, 'mod-1');

      expect(result).toEqual({
        updated: 1,
        failed: [{ id: 'hilang', reason: 'Foto tidak ditemukan' }],
      });
    });

    it('menghapus id duplikat sebelum query', async () => {
      mockPrisma.galeri.findMany.mockResolvedValue([duaFoto[0]]);

      await service.reviewBulk(['g1', 'g1', ' g1 '], 'APPROVED', undefined, 'mod-1');

      expect(mockPrisma.galeri.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: { id: { in: ['g1'] } } }),
      );
      expect(mockPrisma.galeri.update).toHaveBeenCalledTimes(1);
    });

    it('menolak daftar kosong', async () => {
      await expect(service.reviewBulk([], 'APPROVED', undefined, 'mod-1')).rejects.toThrow(
        'Pilih minimal satu foto',
      );
      await expect(service.reviewBulk(['  '], 'APPROVED', undefined, 'mod-1')).rejects.toThrow(
        'Pilih minimal satu foto',
      );
    });

    it('menolak lebih dari 100 foto per aksi', async () => {
      const ids = Array.from({ length: 101 }, (_, i) => `g${i}`);

      await expect(service.reviewBulk(ids, 'APPROVED', undefined, 'mod-1')).rejects.toThrow(
        'Maksimal 100 foto per aksi',
      );
      expect(mockPrisma.galeri.findMany).not.toHaveBeenCalled();
    });

    it('bulk REJECTED tetap mewajibkan alasan', async () => {
      await expect(service.reviewBulk(['g1'], 'REJECTED', '', 'mod-1')).rejects.toThrow(
        'Alasan penolakan wajib diisi',
      );
      expect(mockPrisma.galeri.findMany).not.toHaveBeenCalled();
    });

    it('tidak mengirim event bila tidak ada keputusan yang tersimpan', async () => {
      mockPrisma.galeri.findMany.mockResolvedValue([
        { id: 'g1', status: 'PENDING', uploaderId: 'mod-1' },
      ]);

      const result = await service.reviewBulk(['g1'], 'APPROVED', undefined, 'mod-1');

      expect(result.updated).toBe(0);
      expect(mockEvents.sendToRoles).not.toHaveBeenCalled();
    });

    it('mengabari tiap pengunggah yang diputuskan (sekali per foto)', async () => {
      mockPrisma.galeri.findMany.mockResolvedValue(duaFoto);

      await service.reviewBulk(['g1', 'g2'], 'REJECTED', 'Buram', 'mod-1');

      expect(mockNotifications.send).toHaveBeenCalledTimes(2);
      expect(mockNotifications.send).toHaveBeenCalledWith(
        'u1',
        expect.objectContaining({ isi: 'Foto "Foto 1" ditolak. Alasan: Buram' }),
      );
      expect(mockNotifications.send).toHaveBeenCalledWith(
        'u2',
        expect.objectContaining({ isi: 'Foto "Foto 2" ditolak. Alasan: Buram' }),
      );
    });

    it('tidak mengabari unggahan sendiri yang dilewati', async () => {
      mockPrisma.galeri.findMany.mockResolvedValue([
        { id: 'g1', judul: 'Foto 1', status: 'PENDING', uploaderId: 'mod-1' },
        { id: 'g2', judul: 'Foto 2', status: 'PENDING', uploaderId: 'u2' },
      ]);

      await service.reviewBulk(['g1', 'g2'], 'APPROVED', undefined, 'mod-1');

      expect(mockNotifications.send).toHaveBeenCalledTimes(1);
      expect(mockNotifications.send).toHaveBeenCalledWith('u2', expect.anything());
    });

    it('kegagalan notifikasi tidak mengubah hasil bulk', async () => {
      mockPrisma.galeri.findMany.mockResolvedValue(duaFoto);
      mockNotifications.send.mockRejectedValue(new Error('smtp mati'));

      await expect(
        service.reviewBulk(['g1', 'g2'], 'APPROVED', undefined, 'mod-1'),
      ).resolves.toEqual({ updated: 2, failed: [] });
    });
  });

  describe('listAdmin — FIFO & hitungan status', () => {
    it('PENDING tampil terlama dulu (FIFO)', async () => {
      mockPrisma.galeri.findMany.mockResolvedValue([{ id: 'g1' }]);
      mockPrisma.galeri.count.mockResolvedValue(1);

      await service.listAdmin({ status: 'pending' });

      expect(mockPrisma.galeri.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { status: 'PENDING' },
          orderBy: { createdAt: 'asc' },
          skip: 0,
          take: 20,
        }),
      );
    });

    it('status lain dan tanpa filter diurutkan terbaru dulu', async () => {
      await service.listAdmin({ status: 'approved' });
      expect(mockPrisma.galeri.findMany.mock.calls[0][0].orderBy).toEqual({ createdAt: 'desc' });

      mockPrisma.galeri.findMany.mockClear();
      await service.listAdmin();
      expect(mockPrisma.galeri.findMany.mock.calls[0][0]).toEqual(
        expect.objectContaining({ where: {}, orderBy: { createdAt: 'desc' } }),
      );
    });

    it('mengirim hitungan per status di metadata', async () => {
      mockPrisma.galeri.findMany.mockResolvedValue([{ id: 'g1' }, { id: 'g2' }]);
      mockPrisma.galeri.count.mockResolvedValue(12);

      const result = await service.listAdmin({ page: '2', limit: '5' });

      expect(result.meta).toEqual({
        total: 12,
        page: 2,
        limit: 5,
        totalPages: 3,
        counts: { PENDING: 3, APPROVED: 5, REJECTED: 0 },
      });
      expect(mockPrisma.galeri.findMany.mock.calls[0][0]).toEqual(
        expect.objectContaining({ skip: 5, take: 5 }),
      );
    });

    it('membatasi limit maksimal 100 dan memakai fallback untuk nilai tidak valid', async () => {
      await service.listAdmin({ page: '0', limit: '500' });

      expect(mockPrisma.galeri.findMany.mock.calls[0][0]).toEqual(
        expect.objectContaining({ skip: 0, take: 100 }),
      );
    });

    it('mengabaikan status yang tidak dikenal', async () => {
      await service.listAdmin({ status: 'draft' });

      expect(mockPrisma.galeri.findMany.mock.calls[0][0].where).toEqual({});
    });
  });

  describe('history — riwayat review', () => {
    it('membaca log per foto tanpa join (tetap ada setelah foto dihapus)', async () => {
      const logs = [
        {
          id: 'log-2',
          galeriId: 'g1',
          judulFoto: 'Foto 1',
          actorId: 'mod-1',
          actorNama: 'Mod Satu',
          action: 'REVIEW',
          fromStatus: 'PENDING',
          toStatus: 'APPROVED',
          reason: null,
          createdAt: new Date('2026-11-02T00:00:00Z'),
        },
      ];
      mockPrisma.galeriModerationLog.findMany.mockResolvedValue(logs);

      const result = await service.history('g1');

      expect(mockPrisma.galeriModerationLog.findMany).toHaveBeenCalledWith({
        where: { galeriId: 'g1' },
        orderBy: { createdAt: 'desc' },
      });
      expect(result).toEqual(logs);
    });
  });

  describe('listDeletions — riwayat hapus', () => {
    it('default: terbaru dulu, halaman 1, 20 per halaman', async () => {
      mockPrisma.galeriDeletionLog.findMany.mockResolvedValue([{ id: 'del-1' }]);
      mockPrisma.galeriDeletionLog.count.mockResolvedValue(1);

      const result = await service.listDeletions();

      expect(mockPrisma.galeriDeletionLog.findMany).toHaveBeenCalledWith({
        where: {},
        orderBy: { deletedAt: 'desc' },
        skip: 0,
        take: 20,
      });
      expect(result.meta).toEqual({ total: 1, page: 1, limit: 20, totalPages: 1 });
    });

    it('memfilter pelaku dan rentang tanggal', async () => {
      await service.listDeletions({
        actorId: ' mod-1 ',
        from: '2026-11-01T00:00:00Z',
        to: '2026-11-30T23:59:59Z',
      });

      const args = mockPrisma.galeriDeletionLog.findMany.mock.calls[0][0];
      expect(args.where).toEqual({
        actorId: 'mod-1',
        deletedAt: { gte: new Date('2026-11-01T00:00:00Z'), lte: new Date('2026-11-30T23:59:59Z') },
      });
      expect(mockPrisma.galeriDeletionLog.count).toHaveBeenCalledWith({ where: args.where });
    });

    it('hanya batas awal atau hanya batas akhir', async () => {
      await service.listDeletions({ from: '2026-11-01' });
      expect(mockPrisma.galeriDeletionLog.findMany.mock.calls[0][0].where).toEqual({
        deletedAt: { gte: new Date('2026-11-01') },
      });

      mockPrisma.galeriDeletionLog.findMany.mockClear();
      await service.listDeletions({ to: '2026-11-30' });
      // tanggal tanpa jam pada `to` mencakup seluruh hari itu
      expect(mockPrisma.galeriDeletionLog.findMany.mock.calls[0][0].where).toEqual({
        deletedAt: { lte: new Date('2026-11-30T23:59:59.999Z') },
      });
    });

    it('mengabaikan tanggal/actor yang tidak valid alih-alih error', async () => {
      await service.listDeletions({ from: 'kemarin', to: '', actorId: '   ' });

      expect(mockPrisma.galeriDeletionLog.findMany.mock.calls[0][0].where).toEqual({});
    });

    it('paginasi: skip dihitung dari halaman dan limit dibatasi 100', async () => {
      mockPrisma.galeriDeletionLog.count.mockResolvedValue(51);

      const result = await service.listDeletions({ page: '3', limit: '25' });
      expect(mockPrisma.galeriDeletionLog.findMany.mock.calls[0][0]).toEqual(
        expect.objectContaining({ skip: 50, take: 25 }),
      );
      expect(result.meta).toEqual({ total: 51, page: 3, limit: 25, totalPages: 3 });

      mockPrisma.galeriDeletionLog.findMany.mockClear();
      await service.listDeletions({ page: '0', limit: '500' });
      expect(mockPrisma.galeriDeletionLog.findMany.mock.calls[0][0]).toEqual(
        expect.objectContaining({ skip: 0, take: 100 }),
      );
    });
  });

  describe('otorisasi hapus', () => {
    beforeEach(() => {
      mockPrisma.galeri.findUnique.mockResolvedValue(
        foto({ status: 'APPROVED', storageKey: 'g1.jpg', thumbKey: 'g1-thumb.jpg' }),
      );
    });

    it('pemilik boleh menghapus unggahannya sendiri', async () => {
      await expect(service.delete('g1', { id: 'pemilik-1', role: 'anggota' })).resolves.toEqual({
        success: true,
      });
    });

    it('superadmin boleh menghapus dan tercatat sebagai superadmin', async () => {
      await service.delete('g1', { id: 'super-1', role: 'superadmin' });

      expect(mockPrisma.galeriDeletionLog.create).toHaveBeenCalledWith({
        data: expect.objectContaining({ actorId: 'super-1', actorRole: 'superadmin' }),
      });
    });

    it('admin_berita boleh menghapus foto orang lain', async () => {
      await expect(service.delete('g1', { id: 'mod-1', role: 'admin_berita' })).resolves.toEqual({
        success: true,
      });
    });

    it.each([
      'admin_nasional',
      'admin_distrik',
      'admin_wilayah',
      'admin_ranting',
      'admin_kegiatan',
    ])('peran %s tidak boleh menghapus foto orang lain', async (role) => {
      await expect(service.delete('g1', { id: 'lain-1', role: role as never })).rejects.toThrow(
        ForbiddenException,
      );
      expect(mockPrisma.galeriDeletionLog.create).not.toHaveBeenCalled();
      expect(mockPrisma.galeri.delete).not.toHaveBeenCalled();
    });
  });
});

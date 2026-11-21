import { BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { GaleriService } from './galeri.service';
import { PrismaService } from '../../prisma/prisma.service';
import { EventsGateway } from '../notifications/events.gateway';

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

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GaleriService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: EventsGateway, useValue: mockEvents },
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
    $transaction: jest.fn((ops: Promise<unknown>[]): Promise<unknown[]> => Promise.all(ops)),
  };

  const mockEvents = { sendToRoles: jest.fn() };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GaleriService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: EventsGateway, useValue: mockEvents },
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
      { id: 'mod-1', role: 'admin_berita' },
      'Duplikat foto',
    );

    expect(result).toEqual({ success: true });
    expect(mockPrisma.galeriDeletionLog.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        galeriId: 'g1',
        actorId: 'mod-1',
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

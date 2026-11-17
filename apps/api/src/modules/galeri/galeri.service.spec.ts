import { BadRequestException } from '@nestjs/common';
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
      groupBy: jest.fn().mockResolvedValue([]),
    },
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

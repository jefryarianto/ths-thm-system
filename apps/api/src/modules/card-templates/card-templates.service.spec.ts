import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { CardTemplatesService } from './card-templates.service';
import { PrismaService } from '../../prisma/prisma.service';
import { validateImageUploadSecurity } from '../../common/utils/image-upload.util';

// Mock validasi keamanan gambar (biarkan lolos, diuji terpisah di util spec)
jest.mock('../../common/utils/image-upload.util', () => ({
  validateImageUploadSecurity: jest.fn().mockResolvedValue(undefined),
}));

// Mock sharp - biarkan metadata 856×540 sepanjang rasio kartu
jest.mock('sharp', () => () => ({ metadata: jest.fn().mockResolvedValue({ width: 856, height: 540 }) }));

// Mock fs PARSIAL — hanya existsSync & unlinkSync; method lain (untuk Prisma client)
// tetap memakai fs asli agar modul service bisa dimuat dengan aman.
jest.mock('fs', () => {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const actual = jest.requireActual('fs');
  return { ...actual, unlinkSync: jest.fn(), existsSync: jest.fn(() => true) };
});

import * as fsMocked from 'fs';
const mockUnlink = (fsMocked as unknown as { unlinkSync: jest.Mock }).unlinkSync;

describe('CardTemplatesService', () => {
  let service: CardTemplatesService;

  const mockPrisma = {
    cardTemplate: {
      findFirst: jest.fn(),
      findUnique: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      updateMany: jest.fn(),
      delete: jest.fn(),
    },
    $transaction: jest.fn(),
  };

  const mockFile = (name: string): Express.Multer.File =>
    ({
      filename: name,
      originalname: name,
      path: '/tmp/' + name,
      mimetype: 'image/png',
    }) as Express.Multer.File;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [CardTemplatesService, { provide: PrismaService, useValue: mockPrisma }],
    }).compile();
    service = module.get<CardTemplatesService>(CardTemplatesService);
    jest.clearAllMocks();
    (validateImageUploadSecurity as jest.Mock).mockResolvedValue(undefined);
  });

  describe('resolveActive', () => {
    it('mengembalikan template aktif', async () => {
      const tpl = { id: 't1', name: 'classic' };
      mockPrisma.cardTemplate.findFirst.mockResolvedValue(tpl);
      await expect(service.resolveActive()).resolves.toEqual(tpl);
    });

    it('mengembalikan null saat tabel belum dimigrasi (fallback desain bawaan)', async () => {
      mockPrisma.cardTemplate.findFirst.mockRejectedValue(new Error('relation does not exist'));
      await expect(service.resolveActive()).resolves.toBeNull();
    });
  });

  describe('create', () => {
    it('menolak nama template tidak valid', async () => {
      await expect(service.create({ name: 'My Template!' })).rejects.toThrow(BadRequestException);
      expect(mockPrisma.cardTemplate.create).not.toHaveBeenCalled();
    });

    it('menolak nama duplicate', async () => {
      mockPrisma.cardTemplate.findUnique.mockResolvedValue({ id: 'x', name: 'classic' });
      await expect(service.create({ name: 'classic' })).rejects.toThrow(/sudah dipakai/);
    });

    it('membuat template dengan overlayConfig disanitasi & gambar divalidasi', async () => {
      mockPrisma.cardTemplate.findUnique.mockResolvedValue(null);
      mockPrisma.cardTemplate.create.mockImplementation(async ({ data }: any) => ({ id: 't1', ...data }));

      const result = await service.create(
        { name: 'kta-new', label: 'KTA Baru', overlayConfig: JSON.stringify({ guilloche: { strokeFront: '#fff' }, unknown: 'dropped' }) },
        { front: mockFile('front.png') },
      );

      expect(result.id).toBe('t1');
      expect(result.frontImage).toBe('front.png');
      expect(result.isActive).toBe(false);
      expect(result.overlayConfig).toEqual({ guilloche: { strokeFront: '#fff' } });
      expect((validateImageUploadSecurity as jest.Mock)).toHaveBeenCalled();
    });

    it('menolak overlayConfig yang bukan objek', async () => {
      mockPrisma.cardTemplate.findUnique.mockResolvedValue(null);
      await expect(service.create({ name: 'kta-x', overlayConfig: '[1,2]' })).rejects.toThrow(BadRequestException);
    });
  });

  describe('activate', () => {
    it('menonaktifkan semua lalu mengaktifkan satu (atomik)', async () => {
      mockPrisma.cardTemplate.findUnique.mockResolvedValue({ id: 't1' });
      mockPrisma.$transaction.mockResolvedValue([]);
      mockPrisma.cardTemplate.update.mockResolvedValue({ id: 't1', isActive: true });
      mockPrisma.cardTemplate.findUnique.mockResolvedValue({ id: 't1', isActive: true });

      const result = await service.activate('t1');

      expect(mockPrisma.$transaction).toHaveBeenCalled();
      const txArgs = mockPrisma.$transaction.mock.calls[0][0];
      expect(Array.isArray(txArgs)).toBe(true);
      expect(txArgs).toHaveLength(2); // deaktivasi semua + aktivasi satu
      expect(result.isActive).toBe(true);
    });

    it('NotFound bila template tidak ada', async () => {
      mockPrisma.cardTemplate.findUnique.mockResolvedValue(null);
      await expect(service.activate('missing')).rejects.toThrow(NotFoundException);
    });
  });

  describe('remove', () => {
    it('menolak hapus template aktif', async () => {
      mockPrisma.cardTemplate.findUnique.mockResolvedValue({ id: 't1', isActive: true, frontImage: 'a.png' });
      await expect(service.remove('t1')).rejects.toThrow(BadRequestException);
    });

    it('menghapus template non-aktif + file gambarnya', async () => {
      mockPrisma.cardTemplate.findUnique.mockResolvedValue({ id: 't1', isActive: false, frontImage: 'a.png', backImage: 'b.png' });
      mockPrisma.cardTemplate.delete.mockResolvedValue({});
      const result = await service.remove('t1');
      expect(result.deleted).toBe(true);
      expect(mockUnlink).toHaveBeenCalledTimes(2);
    });
  });
});
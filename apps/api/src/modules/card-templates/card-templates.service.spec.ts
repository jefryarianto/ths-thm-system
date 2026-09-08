import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { CardTemplatesService } from './card-templates.service';
import { PrismaService } from '../../prisma/prisma.service';
import { validateImageUploadSecurity } from '../../common/utils/image-upload.util';
import { CacheService } from '../../common/services/cache.service';

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

  const mockCacheService = {
    get: jest.fn(),
    set: jest.fn(),
    invalidatePrefix: jest.fn(),
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
      providers: [
        CardTemplatesService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: CacheService, useValue: mockCacheService },
      ],
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

    it('memprioritaskan template aktif distrik, fallback ke global', async () => {
      const scopedTpl = { id: 't-d', name: 'kta-lrt', isActive: true, distrikId: 'd-lrt' };
      const globalTpl = { id: 't-g', name: 'classic', isActive: true, distrikId: null };
      mockPrisma.cardTemplate.findFirst
        .mockResolvedValueOnce(scopedTpl);

      await expect(service.resolveActive('d-lrt')).resolves.toEqual(scopedTpl);
      expect(mockPrisma.cardTemplate.findFirst).toHaveBeenCalledWith(
        expect.objectContaining({ where: { isActive: true, distrikId: 'd-lrt' } }),
      );

      // Tanpa template distrik → global
      mockPrisma.cardTemplate.findFirst
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce(globalTpl);
      await expect(service.resolveActive('d-lrt')).resolves.toEqual(globalTpl);
      expect(mockPrisma.cardTemplate.findFirst).toHaveBeenLastCalledWith(
        expect.objectContaining({ where: { isActive: true, distrikId: null } }),
      );
    });

    it('global langsung tanpa distrikId', async () => {
      const tpl = { id: 't1', name: 'classic' };
      mockPrisma.cardTemplate.findFirst.mockResolvedValue(tpl);
      await expect(service.resolveActive()).resolves.toEqual(tpl);
      expect(mockPrisma.cardTemplate.findFirst).toHaveBeenCalledTimes(1);
    });
  });

  describe('findAll (scoping)', () => {
    it('superadmin melihat semua template', async () => {
      mockPrisma.cardTemplate.findMany.mockResolvedValue([]);
      await service.findAll({ role: 'superadmin', distrikId: undefined });
      expect(mockPrisma.cardTemplate.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: undefined }),
      );
    });

    it('admin_distrik melihat template distriknya + global', async () => {
      mockPrisma.cardTemplate.findMany.mockResolvedValue([]);
      await service.findAll({ role: 'admin_distrik', distrikId: 'd-lrt' });
      expect(mockPrisma.cardTemplate.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { OR: [{ distrikId: 'd-lrt' }, { distrikId: null }] },
        }),
      );
    });

    it('tanpa scope → semua template (API key / panggilan internal)', async () => {
      mockPrisma.cardTemplate.findMany.mockResolvedValue([]);
      await service.findAll();
      expect(mockPrisma.cardTemplate.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: undefined }),
      );
    });
  });

  describe('create', () => {
    it('menolak nama template tidak valid', async () => {
      await expect(service.create({ name: 'My Template!' })).rejects.toThrow(BadRequestException);
      expect(mockPrisma.cardTemplate.create).not.toHaveBeenCalled();
    });

    it('menolak nama duplicate pada scope yang sama', async () => {
      mockPrisma.cardTemplate.findFirst.mockResolvedValue({ id: 'x', name: 'classic', distrikId: null });
      await expect(service.create({ name: 'classic' })).rejects.toThrow(/sudah dipakai/);
      expect(mockPrisma.cardTemplate.findFirst).toHaveBeenCalledWith(
        expect.objectContaining({ where: { name: 'classic', distrikId: null } }),
      );
    });

    it('nama yang sama di distrik berbeda diperbolehkan (unik per scope)', async () => {
      mockPrisma.cardTemplate.findFirst.mockResolvedValue(null);
      mockPrisma.cardTemplate.create.mockImplementation(async ({ data }: any) => ({ id: 't2', ...data }));
      const result = await service.create({ name: 'kta-new' }, undefined, 'd-lrt');
      expect(result.name).toBe('kta-new');
      expect(result.distrikId).toBe('d-lrt');
      expect(mockPrisma.cardTemplate.create).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ distrikId: 'd-lrt', isActive: false }) }),
      );
    });

    it('membuat template dengan overlayConfig disanitasi & gambar divalidasi', async () => {
      mockPrisma.cardTemplate.findFirst.mockResolvedValue(null);
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
      mockPrisma.cardTemplate.findFirst.mockResolvedValue(null);
      await expect(service.create({ name: 'kta-x', overlayConfig: '[1,2]' })).rejects.toThrow(BadRequestException);
    });
  });

  describe('activate', () => {
    it('menonaktifkan semua pada scope yg sama lalu mengaktifkan satu (atomik)', async () => {
      mockPrisma.cardTemplate.findUnique.mockResolvedValue({ id: 't1', distrikId: 'd-lrt' });
      mockPrisma.$transaction.mockResolvedValue([]);
      mockPrisma.cardTemplate.update.mockResolvedValue({ id: 't1', isActive: true });
      mockPrisma.cardTemplate.findUnique.mockResolvedValue({ id: 't1', isActive: true, distrikId: 'd-lrt' });

      const result = await service.activate('t1', { role: 'admin_distrik', distrikId: 'd-lrt' });

      expect(mockPrisma.$transaction).toHaveBeenCalled();
      const txArgs = mockPrisma.$transaction.mock.calls[0][0];
      expect(Array.isArray(txArgs)).toBe(true);
      expect(txArgs).toHaveLength(2); // deaktivasi scope + aktivasi satu
      // Deaktivasi dibatasi ke scope yang sama (distrik d-lrt), bukan semua global
      expect(mockPrisma.cardTemplate.updateMany).toHaveBeenCalledWith({
        where: { distrikId: 'd-lrt' },
        data: { isActive: false },
      });
      expect(result.isActive).toBe(true);
    });

    it('deaktivasi scope global memakai distrikId null', async () => {
      mockPrisma.cardTemplate.findUnique.mockResolvedValue({ id: 't1', distrikId: null });
      mockPrisma.$transaction.mockResolvedValue([]);
      mockPrisma.cardTemplate.update.mockResolvedValue({ id: 't1', isActive: true });
      mockPrisma.cardTemplate.findUnique.mockResolvedValue({ id: 't1', isActive: true, distrikId: null });

      await service.activate('t1', { role: 'superadmin', distrikId: undefined });
      expect(mockPrisma.cardTemplate.updateMany).toHaveBeenCalledWith({
        where: { distrikId: null },
        data: { isActive: false },
      });
    });

    it('admin_distrik tidak bisa mengaktifkan template global', async () => {
      mockPrisma.cardTemplate.findUnique.mockResolvedValue({ id: 't-global', distrikId: null });
      await expect(service.activate('t-global', { role: 'admin_distrik', distrikId: 'd-lrt' })).rejects.toThrow(
        /distrik Anda sendiri/,
      );
      expect(mockPrisma.$transaction).not.toHaveBeenCalled();
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

    it('admin_distrik tidak bisa menghapus template distrik lain', async () => {
      mockPrisma.cardTemplate.findUnique.mockResolvedValue({ id: 't-lain', isActive: false, distrikId: 'd-lain' });
      await expect(service.remove('t-lain', { role: 'admin_distrik', distrikId: 'd-lrt' })).rejects.toThrow(
        /distrik Anda sendiri/,
      );
      expect(mockPrisma.cardTemplate.delete).not.toHaveBeenCalled();
    });

    it('admin_distrik boleh menghapus template distriknya sendiri', async () => {
      mockPrisma.cardTemplate.findUnique.mockResolvedValue({ id: 't-sendiri', isActive: false, distrikId: 'd-lrt' });
      mockPrisma.cardTemplate.delete.mockResolvedValue({});
      const result = await service.remove('t-sendiri', { role: 'admin_distrik', distrikId: 'd-lrt' });
      expect(result.deleted).toBe(true);
      expect(mockPrisma.cardTemplate.delete).toHaveBeenCalledWith({ where: { id: 't-sendiri' } });
    });
  });
});
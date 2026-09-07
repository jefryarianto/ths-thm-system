// @ts-nocheck
import { Test, TestingModule } from '@nestjs/testing';
import { AspectService } from './aspect.service';
import { PrismaService } from '../../prisma/prisma.service';
import { ScopeHelper } from '../../common/utils/scope-helpers';
import { CacheService } from '../../common/services/cache.service';

describe('AspectService', () => {
  let service: AspectService;

  const mockPrisma = {
    aspekPenilaian: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      findFirst: jest.fn(),
      count: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      updateMany: jest.fn(),
    },
    itemPenilaian: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      findFirst: jest.fn(),
      count: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      updateMany: jest.fn(),
    },
  };

  const mockCache = {
    get: jest.fn(),
    set: jest.fn(),
    getOrSet: jest.fn(),
    invalidatePrefix: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AspectService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: ScopeHelper, useValue: {} },
        { provide: CacheService, useValue: mockCache },
      ],
    }).compile();

    service = module.get<AspectService>(AspectService);
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('remove', () => {
    it('should soft-disable the aspect AND cascade-disable all its active items', async () => {
      mockPrisma.aspekPenilaian.update.mockResolvedValue({ id: 'a1', isActive: false });
      mockPrisma.itemPenilaian.updateMany.mockResolvedValue({ count: 3 });

      const result = await service.remove('a1');

      // Aspek otomatis disembunyikan (soft-disable, bukan hard delete)
      expect(mockPrisma.aspekPenilaian.update).toHaveBeenCalledWith({
        where: { id: 'a1' },
        data: { isActive: false },
      });

      // Cascade: semua item aktif aspek tsb juga disembunyikan supaya
      // tidak ada item orfan yang masih tampil di daftar item.
      expect(mockPrisma.itemPenilaian.updateMany).toHaveBeenCalledWith({
        where: { aspekId: 'a1', isActive: true },
        data: { isActive: false },
      });

      expect(mockCache.invalidatePrefix).toHaveBeenCalledWith('aspects:');
      expect(result.message).toContain('dinonaktifkan');
    });

    it('should not crash when the aspect has no items', async () => {
      mockPrisma.aspekPenilaian.update.mockResolvedValue({ id: 'a1', isActive: false });
      mockPrisma.itemPenilaian.updateMany.mockResolvedValue({ count: 0 });

      const result = await service.remove('a1');

      expect(mockPrisma.itemPenilaian.updateMany).toHaveBeenCalled();
      expect(result).toBeDefined();
    });
  });

  describe('restore', () => {
    it('should set isActive back to true', async () => {
      mockPrisma.aspekPenilaian.update.mockResolvedValue({ id: 'a1', isActive: true });

      const result = await service.restore('a1');

      expect(mockPrisma.aspekPenilaian.update).toHaveBeenCalledWith({
        where: { id: 'a1' },
        data: { isActive: true },
      });
      expect(result.isActive).toBe(true);
      expect(mockCache.invalidatePrefix).toHaveBeenCalledWith('aspects:');
    });
  });
});
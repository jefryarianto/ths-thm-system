// @ts-nocheck
import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { AssessmentsService } from './assessments.service';
import { AspectService } from './aspect.service';
import { PrismaService } from '../../prisma/prisma.service';
import { ScopeHelper } from '../../common/utils/scope-helpers';
import { CacheService } from '../../common/services/cache.service';

describe('AssessmentsService', () => {
  let service: AssessmentsService;

  const mockPrisma = {
    aspekPenilaian: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
    itemPenilaian: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      count: jest.fn(),
    },
    nilaiPendadaran: {
      findMany: jest.fn(),
      count: jest.fn(),
      create: jest.fn(),
    },
    kegiatan: {
      findUnique: jest.fn(),
    },
  };

  const mockScopeHelper = {
    buildScopeFilter: jest.fn().mockReturnValue({}),
    buildIndirectScopeFilter: jest.fn().mockReturnValue({}),
    hasAccessToResource: jest.fn().mockReturnValue(true),
    hasAccessToResourceAsync: jest.fn().mockResolvedValue(true),
    verifyKegiatanScope: jest.fn(),
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
        AssessmentsService,
        AspectService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: ScopeHelper, useValue: mockScopeHelper },
        { provide: CacheService, useValue: mockCache },
      ],
    }).compile();

    service = module.get<AssessmentsService>(AssessmentsService);
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('getItems', () => {
    it('should return paginated items', async () => {
      mockPrisma.itemPenilaian.findMany.mockResolvedValue([{ id: 'i1', nama: 'Tendangan' }]);
      mockPrisma.itemPenilaian.count.mockResolvedValue(1);
      const result = await service.getItems({});
      expect(result.data).toHaveLength(1);
      expect(result.meta.total).toBe(1);
    });
  });

  describe('getItem', () => {
    it('should return a single item', async () => {
      mockPrisma.itemPenilaian.findUnique.mockResolvedValue({ id: 'i1', nama: 'Tendangan' });
      const result = await service.getItem('i1');
      expect(result).toBeDefined();
    });

    it('should throw NotFoundException', async () => {
      mockPrisma.itemPenilaian.findUnique.mockResolvedValue(null);
      await expect(service.getItem('i1')).rejects.toThrow(NotFoundException);
    });
  });

  describe('createItem', () => {
    it('should create an item', async () => {
      mockPrisma.itemPenilaian.create.mockResolvedValue({ id: 'i1', namaItem: 'Tendangan' });
      const result = await service.createItem({ namaItem: 'Tendangan', skorMaksimal: 100 } as any);
      expect(result).toBeDefined();
    });
  });

  describe('getScores', () => {
    it('should return scores', async () => {
      mockPrisma.nilaiPendadaran.findMany.mockResolvedValue([{ id: 's1', skor: 85 }]);
      mockPrisma.nilaiPendadaran.count.mockResolvedValue(1);
      const result = await service.getScores({ page: 1, limit: 20 });
      expect(result.data).toHaveLength(1);
    });
  });

  describe('createScore', () => {
    it('should create a score', async () => {
      mockPrisma.nilaiPendadaran.create.mockResolvedValue({ id: 's1', skor: 85 });
      const result = await service.createScore({
        kegiatanId: 'k1',
        calonAnggotaId: 'c1',
        itemPenilaianId: 'i1',
        pengujiUserId: 'u1',
        skor: 85,
      } as any);
      expect(result).toBeDefined();
    });
  });
});

// @ts-nocheck
import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { AssessmentsService } from './assessments.service';
import { PrismaService } from '../../prisma/prisma.service';
import { ScopeHelper } from '../../common/utils/scope-helpers';

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
    },
    nilaiPendadaran: {
      findMany: jest.fn(),
      count: jest.fn(),
      create: jest.fn(),
    },
  };

  const mockScopeHelper = {
    buildScopeFilter: jest.fn().mockReturnValue({}),
    buildIndirectScopeFilter: jest.fn().mockReturnValue({}),
    hasAccessToResource: jest.fn().mockReturnValue(true),
    hasAccessToResourceAsync: jest.fn().mockResolvedValue(true),
    verifyKegiatanScope: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AssessmentsService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: ScopeHelper, useValue: mockScopeHelper },
      ],
    }).compile();

    service = module.get<AssessmentsService>(AssessmentsService);
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('getAspects', () => {
    it('should return all aspects', async () => {
      mockPrisma.aspekPenilaian.findMany.mockResolvedValue([{ id: 'a1', nama: 'Teknik' }]);
      const result = await service.getAspects({});
      expect(result.success).toBe(true);
      expect(result.data).toHaveLength(1);
    });
  });

  describe('getAspect', () => {
    it('should return a single aspect', async () => {
      mockPrisma.aspekPenilaian.findUnique.mockResolvedValue({ id: 'a1', nama: 'Teknik' });
      const result = await service.getAspect('a1');
      expect(result.success).toBe(true);
    });

    it('should throw NotFoundException', async () => {
      mockPrisma.aspekPenilaian.findUnique.mockResolvedValue(null);
      await expect(service.getAspect('a1')).rejects.toThrow(NotFoundException);
    });
  });

  describe('createAspect', () => {
    it('should create an aspect', async () => {
      mockPrisma.aspekPenilaian.create.mockResolvedValue({ id: 'a1', nama: 'Teknik' });
      const result = await service.createAspect({ nama: 'Teknik', deskripsi: 'Desc' } as any);
      expect(result.success).toBe(true);
    });
  });

  describe('getItems', () => {
    it('should return items', async () => {
      mockPrisma.itemPenilaian.findMany.mockResolvedValue([{ id: 'i1', nama: 'Tendangan' }]);
      const result = await service.getItems({});
      expect(result.success).toBe(true);
    });
  });

  describe('getScores', () => {
    it('should return scores', async () => {
      mockPrisma.nilaiPendadaran.findMany.mockResolvedValue([{ id: 's1', skor: 85 }]);
      mockPrisma.nilaiPendadaran.count.mockResolvedValue(1);
      const result = await service.getScores({ page: 1, limit: 20 });
      expect(result.success).toBe(true);
      expect(result.data).toHaveLength(1);
    });
  });

  describe('createScore', () => {
    it('should create a score', async () => {
      mockPrisma.nilaiPendadaran.create.mockResolvedValue({ id: 's1', skor: 85 });
      const result = await service.createScore({ kegiatanId: 'k1', calonAnggotaId: 'c1', itemPenilaianId: 'i1', pengujiUserId: 'u1', skor: 85 } as any);
      expect(result.success).toBe(true);
    });
  });
});

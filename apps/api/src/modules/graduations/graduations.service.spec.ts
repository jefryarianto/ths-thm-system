// @ts-nocheck
import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { GraduationsService } from './graduations.service';
import { PrismaService } from '../../prisma/prisma.service';
import { ScopeHelper } from '../../common/utils/scope-helpers';

describe('GraduationsService', () => {
  let service: GraduationsService;

  const mockPrisma = {
    kegiatan: {
      findMany: jest.fn(),
      count: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
    calonAnggota: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    hasilPendadaran: {
      create: jest.fn(),
      findMany: jest.fn(),
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
        GraduationsService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: ScopeHelper, useValue: mockScopeHelper },
      ],
    }).compile();

    service = module.get<GraduationsService>(GraduationsService);
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('findAll', () => {
    it('should return paginated graduations', async () => {
      mockPrisma.kegiatan.findMany.mockResolvedValue([{ id: 'g1', tipe: 'pendadaran' }]);
      mockPrisma.kegiatan.count.mockResolvedValue(1);
      const result = await service.findAll({ page: 1, limit: 10 });
      expect(result.success).toBe(true);
      expect(result.data).toHaveLength(1);
      expect(result.meta.total).toBe(1);
    });
  });

  describe('findOne', () => {
    it('should return a single graduation', async () => {
      mockPrisma.kegiatan.findUnique.mockResolvedValue({ id: 'g1', tipe: 'pendadaran' });
      const result = await service.findOne('g1');
      expect(result.success).toBe(true);
      expect(result.data.id).toBe('g1');
    });

    it('should throw NotFoundException when not found', async () => {
      mockPrisma.kegiatan.findUnique.mockResolvedValue(null);
      await expect(service.findOne('g1')).rejects.toThrow(NotFoundException);
    });
  });

  describe('create', () => {
    it('should create a graduation', async () => {
      mockPrisma.kegiatan.create.mockResolvedValue({ id: 'g1', tipe: 'pendadaran' });
      const result = await service.create({ nama: 'Pendadaran 1', lokasi: 'Jakarta', tanggalMulai: '2026-01-01' } as any);
      expect(result.success).toBe(true);
    });
  });

  describe('getParticipants', () => {
    it('should return participants', async () => {
      mockPrisma.calonAnggota.findMany.mockResolvedValue([{ id: 'c1', status: 'mengikuti_pendadaran' }]);
      const result = await service.getParticipants('g1');
      expect(result.success).toBe(true);
    });
  });

  describe('graduate', () => {
    it('should process graduation results', async () => {
      mockPrisma.hasilPendadaran.create.mockResolvedValue({ id: 'h1' });
      mockPrisma.calonAnggota.update.mockResolvedValue({ id: 'c1' });
      const result = await service.graduate('g1', { results: [{ candidateId: 'c1', totalSkor: 85, ranking: 1, lulus: true }] } as any);
      expect(result.success).toBe(true);
    });
  });
});

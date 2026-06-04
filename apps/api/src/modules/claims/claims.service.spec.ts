// @ts-nocheck
import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException, ForbiddenException } from '@nestjs/common';
import { ClaimsService } from './claims.service';
import { PrismaService } from '../../prisma/prisma.service';
import { ScopeHelper } from '../../common/utils/scope-helpers';

describe('ClaimsService', () => {
  let service: ClaimsService;

  const mockPrisma = {
    klaim: {
      findMany: jest.fn(),
      count: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
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
        ClaimsService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: ScopeHelper, useValue: mockScopeHelper },
      ],
    }).compile();

    service = module.get<ClaimsService>(ClaimsService);
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('findAll', () => {
    it('should return paginated claims', async () => {
      mockPrisma.klaim.findMany.mockResolvedValue([{ id: 'cl1', status: 'pending' }]);
      mockPrisma.klaim.count.mockResolvedValue(1);
      const result = await service.findAll({ page: 1, limit: 10 });
      expect(result.success).toBe(true);
      expect(result.data).toHaveLength(1);
    });

    it('should apply scope filter', async () => {
      mockPrisma.klaim.findMany.mockResolvedValue([]);
      mockPrisma.klaim.count.mockResolvedValue(0);
      mockScopeHelper.buildIndirectScopeFilter.mockReturnValue({ anggota: { rantingId: 'r1' } });
      await service.findAll({ page: 1, limit: 10 }, { rantingId: 'r1' });
      expect(mockScopeHelper.buildIndirectScopeFilter).toHaveBeenCalledWith({ rantingId: 'r1' }, 'anggota');
    });
  });

  describe('findOne', () => {
    it('should return a single claim', async () => {
      mockPrisma.klaim.findUnique.mockResolvedValue({ id: 'cl1', status: 'pending' });
      const result = await service.findOne('cl1');
      expect(result.success).toBe(true);
    });

    it('should throw NotFoundException when not found', async () => {
      mockPrisma.klaim.findUnique.mockResolvedValue(null);
      await expect(service.findOne('cl1')).rejects.toThrow(NotFoundException);
    });

    it('should throw ForbiddenException for out-of-scope resource', async () => {
      mockPrisma.klaim.findUnique.mockResolvedValue({ id: 'cl1', anggota: { rantingId: 'r-other' } });
      mockScopeHelper.hasAccessToResourceAsync.mockResolvedValue(false);
      await expect(service.findOne('cl1', { rantingId: 'r1' })).rejects.toThrow(ForbiddenException);
    });
  });

  describe('create', () => {
    it('should create a claim with pending status', async () => {
      mockPrisma.klaim.create.mockResolvedValue({ id: 'cl1', status: 'pending' });
      const result = await service.create({ tipe: 'asuransi', anggotaId: 'a1' });
      expect(result.success).toBe(true);
      expect(result.data.status).toBe('pending');
    });
  });

  describe('update', () => {
    it('should update a claim', async () => {
      mockPrisma.klaim.update.mockResolvedValue({ id: 'cl1', tipe: 'asuransi' });
      const result = await service.update('cl1', { tipe: 'asuransi' });
      expect(result.success).toBe(true);
    });

    it('should throw ForbiddenException for out-of-scope resource', async () => {
      mockPrisma.klaim.findUnique.mockResolvedValue({ id: 'cl1', anggota: { rantingId: 'r-other' } });
      mockScopeHelper.hasAccessToResourceAsync.mockResolvedValue(false);
      await expect(service.update('cl1', { catatan: 'test' }, { rantingId: 'r1' })).rejects.toThrow(ForbiddenException);
    });
  });

  describe('remove', () => {
    it('should delete a claim', async () => {
      await service.remove('cl1');
      expect(mockPrisma.klaim.delete).toHaveBeenCalledWith({ where: { id: 'cl1' } });
    });
  });

  describe('approve', () => {
    it('should approve a claim', async () => {
      await service.approve('cl1');
      expect(mockPrisma.klaim.update).toHaveBeenCalledWith({
        where: { id: 'cl1' },
        data: { status: 'disetujui' },
      });
    });
  });

  describe('reject', () => {
    it('should reject a claim with reason', async () => {
      await service.reject('cl1', 'Tidak memenuhi syarat');
      expect(mockPrisma.klaim.update).toHaveBeenCalled();
    });
  });

  describe('process', () => {
    it('should set claim status to diproses', async () => {
      mockPrisma.klaim.update.mockResolvedValue({ id: 'cl1', status: 'diproses' });
      const result = await service.process('cl1');
      expect(result.success).toBe(true);
      expect(result.data.status).toBe('diproses');
    });
  });
});

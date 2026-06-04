// @ts-nocheck
import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { DuesService } from './dues.service';
import { PrismaService } from '../../prisma/prisma.service';
import { ScopeHelper } from '../../common/utils/scope-helpers';

describe('DuesService', () => {
  let service: DuesService;

  const mockPrisma = {
    iuran: {
      findMany: jest.fn(),
      count: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      aggregate: jest.fn(),
      groupBy: jest.fn(),
    },
    anggota: {
      count: jest.fn(),
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
        DuesService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: ScopeHelper, useValue: mockScopeHelper },
      ],
    }).compile();

    service = module.get<DuesService>(DuesService);
    jest.clearAllMocks();
    mockScopeHelper.buildIndirectScopeFilter.mockReturnValue({});
    mockScopeHelper.hasAccessToResourceAsync.mockResolvedValue(true);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('findAll', () => {
    it('should return paginated dues', async () => {
      mockPrisma.iuran.findMany.mockResolvedValue([{ id: 'd1', jumlah: 100000 }]);
      mockPrisma.iuran.count.mockResolvedValue(1);
      const result = await service.findAll({ page: 1, limit: 10 });
      expect(result.success).toBe(true);
      expect(result.data).toHaveLength(1);
      expect(result.meta.total).toBe(1);
    });

    it('should filter by status and periode', async () => {
      mockPrisma.iuran.findMany.mockResolvedValue([]);
      mockPrisma.iuran.count.mockResolvedValue(0);
      await service.findAll({ status: 'lunas', periode: '2026-01' });
      expect(mockPrisma.iuran.findMany).toHaveBeenCalled();
    });
  });

  describe('create', () => {
    it('should create a due record', async () => {
      mockPrisma.iuran.create.mockResolvedValue({ id: 'd1', jumlah: 100000 });
      const result = await service.create({ anggotaId: 'a1', jumlah: 100000, periode: '2026-01' });
      expect(result.success).toBe(true);
    });
  });

  describe('findOne', () => {
    it('should return a single due', async () => {
      mockPrisma.iuran.findUnique.mockResolvedValue({ id: 'd1', jumlah: 100000 });
      const result = await service.findOne('d1');
      expect(result.success).toBe(true);
    });

    it('should throw NotFoundException when not found', async () => {
      mockPrisma.iuran.findUnique.mockResolvedValue(null);
      await expect(service.findOne('d1')).rejects.toThrow(NotFoundException);
    });
  });

  describe('update', () => {
    it('should update a due record', async () => {
      mockPrisma.iuran.update.mockResolvedValue({ id: 'd1', jumlah: 200000 });
      const result = await service.update('d1', { jumlah: 200000 });
      expect(result.success).toBe(true);
    });
  });

  describe('remove', () => {
    it('should delete a due record', async () => {
      await service.remove('d1');
      expect(mockPrisma.iuran.delete).toHaveBeenCalledWith({ where: { id: 'd1' } });
    });
  });

  describe('getMemberDues', () => {
    it('should return dues for a member', async () => {
      mockPrisma.iuran.findMany.mockResolvedValue([{ id: 'd1', jumlah: 100000 }]);
      const result = await service.getMemberDues('a1');
      expect(result.success).toBe(true);
      expect(result.data).toHaveLength(1);
    });
  });

  describe('getArrears', () => {
    it('should return arrears data', async () => {
      mockPrisma.iuran.findMany.mockResolvedValue([
        { id: 'd1', jumlah: 100000, status: 'menunggak' },
        { id: 'd2', jumlah: 200000, status: 'menunggak' },
      ]);
      const result = await service.getArrears({});
      expect(result.success).toBe(true);
      expect(result.data.count).toBe(2);
      expect(result.data.totalArrears).toBe(300000);
    });
  });

  describe('getDashboardStats', () => {
    it('should return dashboard statistics', async () => {
      mockPrisma.iuran.aggregate
        .mockResolvedValueOnce({ _sum: { jumlah: 5000000 }, _count: 50 })
        .mockResolvedValueOnce({ _sum: { jumlah: 3000000 } })
        .mockResolvedValueOnce({ _sum: { jumlah: 2000000 } });
      mockPrisma.iuran.findMany.mockResolvedValue([
        { jumlah: 100000, status: 'lunas' },
        { jumlah: 50000, status: 'lunas' },
      ]);
      mockPrisma.anggota.count.mockResolvedValue(100);
      const result = await service.getDashboardStats();
      expect(result.success).toBe(true);
      expect(result.data.totalIuran).toBe(5000000);
      expect(result.data.anggotaAktif).toBe(100);
    });
  });

  describe('importDues', () => {
    it('should import dues and count successes', async () => {
      mockPrisma.iuran.create.mockResolvedValue({ id: 'd1' });
      const result = await service.importDues([
        { anggota_id: 'a1', periode: '2026-01', jumlah: '100000' },
      ]);
      expect(result.success).toBe(true);
      expect(result.data.imported).toBe(1);
    });

    it('should count failures on error', async () => {
      mockPrisma.iuran.create.mockRejectedValue(new Error('DB error'));
      const result = await service.importDues([{ anggota_id: 'a1', periode: '2026-01', jumlah: '100000' }]);
      expect(result.data.imported).toBe(0);
      expect(result.data.failed).toBe(1);
    });
  });

  describe('batchPayment', () => {
    it('should process batch payment', async () => {
      mockPrisma.iuran.create.mockResolvedValue({ id: 'd1' });
      const result = await service.batchPayment({ memberIds: ['a1', 'a2'], periode: '2026-01', jumlah: 100000 });
      expect(result.success).toBe(true);
      expect(mockPrisma.iuran.create).toHaveBeenCalledTimes(2);
    });
  });
});

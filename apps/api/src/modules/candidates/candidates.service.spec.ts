// @ts-nocheck
import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { CandidatesService } from './candidates.service';
import { MailService } from '../../mail/mail.service';
import { PrismaService } from '../../prisma/prisma.service';
import { ScopeHelper } from '../../common/utils/scope-helpers';
import { CacheService } from '../../common/services/cache.service';

describe('CandidatesService', () => {
  let service: CandidatesService;

  const mockPrisma = {
    calonAnggota: {
      findMany: jest.fn(),
      count: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
    anggota: {
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

  const mockCache = {
    get: jest.fn().mockReturnValue(undefined),
    set: jest.fn(),
    del: jest.fn(),
    invalidatePrefix: jest.fn(),
    getOrSet: jest.fn().mockImplementation((_key: string, factory: () => Promise<unknown>) => factory()),
    clear: jest.fn(),
    getStats: jest.fn().mockReturnValue({ size: 0, keys: [] }),
  };

  const mockMailService = {
    sendMail: jest.fn().mockResolvedValue(true),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CandidatesService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: ScopeHelper, useValue: mockScopeHelper },
        { provide: CacheService, useValue: mockCache },
        { provide: MailService, useValue: mockMailService },
      ],
    }).compile();

    service = module.get<CandidatesService>(CandidatesService);
    jest.clearAllMocks();
    mockScopeHelper.buildScopeFilter.mockReturnValue({});
    mockScopeHelper.hasAccessToResourceAsync.mockResolvedValue(true);
    mockCache.invalidatePrefix.mockClear();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('findAll', () => {
    it('should return paginated candidates', async () => {
      mockPrisma.calonAnggota.findMany.mockResolvedValue([{ id: 'c1', namaLengkap: 'Budi' }]);
      mockPrisma.calonAnggota.count.mockResolvedValue(1);
      const result = await service.findAll({ page: 1, limit: 10 });
      expect(result.success).toBe(true);
      expect(result.data).toHaveLength(1);
      expect(result.meta.total).toBe(1);
    });
  });

  describe('findOne', () => {
    it('should return a single candidate', async () => {
      mockPrisma.calonAnggota.findUnique.mockResolvedValue({ id: 'c1', namaLengkap: 'Budi' });
      const result = await service.findOne('c1');
      expect(result.success).toBe(true);
      expect(result.data.namaLengkap).toBe('Budi');
    });

    it('should throw NotFoundException when not found', async () => {
      mockPrisma.calonAnggota.findUnique.mockResolvedValue(null);
      await expect(service.findOne('c1')).rejects.toThrow(NotFoundException);
    });
  });

  describe('create', () => {
    it('should create a candidate', async () => {
      mockPrisma.calonAnggota.create.mockResolvedValue({ id: 'c1', status: 'diusulkan' });
      const result = await service.create({ namaLengkap: 'Budi' } as any);
      expect(result.success).toBe(true);
      expect(result.data.status).toBe('diusulkan');
    });
  });

  describe('update', () => {
    it('should update a candidate', async () => {
      mockPrisma.calonAnggota.update.mockResolvedValue({ id: 'c1', namaLengkap: 'Updated' });
      const result = await service.update('c1', { namaLengkap: 'Updated' } as any);
      expect(result.success).toBe(true);
    });
  });

  describe('remove', () => {
    it('should delete a candidate', async () => {
      await service.remove('c1');
      expect(mockPrisma.calonAnggota.delete).toHaveBeenCalledWith({ where: { id: 'c1' } });
    });
  });

  describe('approve', () => {
    it('should approve candidate and create member', async () => {
      mockPrisma.calonAnggota.findUnique.mockResolvedValue({
        id: 'c1', namaLengkap: 'Budi', jenisKelamin: 'L',
        tempatLahir: 'Jakarta', tanggalLahir: new Date('1990-01-01'),
        alamat: 'Jl. A', noHp: '0812', email: 'budi@test.com', rantingId: 'r1',
      });
      mockPrisma.anggota.count.mockResolvedValue(10);
      mockPrisma.anggota.create.mockResolvedValue({ id: 'm1' });
      mockPrisma.calonAnggota.update.mockResolvedValue({ id: 'c1', status: 'lulus' });
      const result = await service.approve('c1');
      expect(result.success).toBe(true);
    });

    it('should throw NotFoundException when not found', async () => {
      mockPrisma.calonAnggota.findUnique.mockResolvedValue(null);
      await expect(service.approve('c1')).rejects.toThrow(NotFoundException);
    });
  });

  describe('reject', () => {
    it('should reject candidate', async () => {
      mockPrisma.calonAnggota.findUnique.mockResolvedValue({ id: 'c1' });
      await service.reject('c1', 'Tidak memenuhi syarat');
      expect(mockPrisma.calonAnggota.update).toHaveBeenCalled();
    });
  });

  describe('validate', () => {
    it('should return valid true when candidate exists', async () => {
      mockPrisma.calonAnggota.findUnique.mockResolvedValue({ id: 'c1' });
      const result = await service.validate('c1');
      expect(result.success).toBe(true);
      expect(result.data.valid).toBe(true);
    });

    it('should throw NotFoundException when not found', async () => {
      mockPrisma.calonAnggota.findUnique.mockResolvedValue(null);
      await expect(service.validate('c1')).rejects.toThrow(NotFoundException);
    });
  });

  describe('exportCsv', () => {
    it('should return candidates for export', async () => {
      mockPrisma.calonAnggota.findMany.mockResolvedValue([{ namaLengkap: 'Budi' }]);
      const result = await service.exportCsv({});
      expect(result.success).toBe(true);
    });
  });
});

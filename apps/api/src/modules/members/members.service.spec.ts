// @ts-nocheck
import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { MembersService } from './members.service';
import { PrismaService } from '../../prisma/prisma.service';
import { ScopeHelper } from '../../common/utils/scope-helpers';
import { CacheService } from '../../common/services/cache.service';
import { MailService } from '../../mail/mail.service';

describe('MembersService', () => {
  let service: MembersService;

  const mockPrisma = {
    anggota: {
      findMany: jest.fn(),
      count: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
    dokumen: {
      findMany: jest.fn(),
    },
    iuran: {
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
        MembersService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: ScopeHelper, useValue: mockScopeHelper },
        { provide: CacheService, useValue: mockCache },
        { provide: MailService, useValue: mockMailService },
      ],
    }).compile();

    service = module.get<MembersService>(MembersService);
    jest.clearAllMocks();
    // Reset default mock return values after clearAllMocks
    mockScopeHelper.buildScopeFilter.mockReturnValue({});
    mockScopeHelper.hasAccessToResourceAsync.mockResolvedValue(true);
    mockCache.invalidatePrefix.mockClear();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('findAll', () => {
    it('should return paginated members', async () => {
      mockPrisma.anggota.findMany.mockResolvedValue([{ id: 'm1', namaLengkap: 'Budi' }]);
      mockPrisma.anggota.count.mockResolvedValue(1);

      const result = await service.findAll({ page: 1, limit: 10 });
      expect(result.success).toBe(true);
      expect(result.data).toHaveLength(1);
      expect(result.meta.total).toBe(1);
    });

    it('should filter by search, rantingId, statusKeanggotaan', async () => {
      mockPrisma.anggota.findMany.mockResolvedValue([]);
      mockPrisma.anggota.count.mockResolvedValue(0);

      await service.findAll({
        search: 'Budi',
        rantingId: 'r1',
        statusKeanggotaan: 'aktif',
        statusValidasi: 'approved',
      });
      expect(mockPrisma.anggota.findMany).toHaveBeenCalled();
    });
  });

  describe('findOne', () => {
    it('should return a single member', async () => {
      mockPrisma.anggota.findUnique.mockResolvedValue({ id: 'm1', namaLengkap: 'Budi' });
      const result = await service.findOne('m1');
      expect(result.success).toBe(true);
      expect(result.data.namaLengkap).toBe('Budi');
    });

    it('should throw NotFoundException when not found', async () => {
      mockPrisma.anggota.findUnique.mockResolvedValue(null);
      await expect(service.findOne('m1')).rejects.toThrow(NotFoundException);
    });
  });

  describe('create', () => {
    it('should create a member with generated member number', async () => {
      mockPrisma.anggota.count.mockResolvedValue(10);
      mockPrisma.anggota.create.mockResolvedValue({ id: 'm1', nomorAnggota: 'THS-2026-0011' });
      const result = await service.create({ namaLengkap: 'Budi' });
      expect(result.success).toBe(true);
      expect(result.data.nomorAnggota).toBe('THS-2026-0011');
    });
  });

  describe('update', () => {
    it('should update a member', async () => {
      mockPrisma.anggota.update.mockResolvedValue({ id: 'm1', namaLengkap: 'Updated' });
      const result = await service.update('m1', { namaLengkap: 'Updated' });
      expect(result.success).toBe(true);
    });
  });

  describe('remove', () => {
    it('should soft-delete a member', async () => {
      await service.remove('m1');
      expect(mockPrisma.anggota.update).toHaveBeenCalled();
    });
  });

  describe('validate', () => {
    it('should return valid true when member is complete', async () => {
      mockPrisma.anggota.findUnique.mockResolvedValue({
        id: 'm1', namaLengkap: 'Budi', jenisKelamin: 'L',
      });
      mockPrisma.anggota.update.mockResolvedValue({ id: 'm1' });
      const result = await service.validate('m1');
      expect(result.success).toBe(true);
      expect(result.data.valid).toBe(true);
    });

    it('should throw NotFoundException when not found', async () => {
      mockPrisma.anggota.findUnique.mockResolvedValue(null);
      await expect(service.validate('m1')).rejects.toThrow(NotFoundException);
    });
  });

  describe('approve', () => {
    it('should approve a member', async () => {
      await service.approve('m1');
      expect(mockPrisma.anggota.update).toHaveBeenCalled();
    });
  });

  describe('suspend', () => {
    it('should suspend a member', async () => {
      await service.suspend('m1');
      expect(mockPrisma.anggota.update).toHaveBeenCalled();
    });
  });

  describe('reactivate', () => {
    it('should reactivate a member', async () => {
      await service.reactivate('m1');
      expect(mockPrisma.anggota.update).toHaveBeenCalled();
    });
  });

  describe('getDocuments', () => {
    it('should return documents for a member', async () => {
      mockPrisma.dokumen.findMany.mockResolvedValue([{ id: 'd1' }]);
      const result = await service.getDocuments('m1');
      expect(result.success).toBe(true);
    });
  });

  describe('getDues', () => {
    it('should return dues for a member', async () => {
      mockPrisma.iuran.findMany.mockResolvedValue([{ id: 'i1', jumlah: 100000 }]);
      const result = await service.getDues('m1');
      expect(result.success).toBe(true);
    });
  });
});

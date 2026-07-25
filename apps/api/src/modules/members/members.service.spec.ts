// @ts-nocheck
import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { MembersService } from './members.service';
import { PrismaService } from '../../prisma/prisma.service';
import { ScopeHelper } from '../../common/utils/scope-helpers';
import { CacheService } from '../../common/services/cache.service';
import { CsvImportService } from '../../common/services/csv-import.service';
import { MemberMailService } from '../../common/services/member-mail.service';
import { NraService } from '../../common/services/nra.service';

describe('MembersService', () => {
  let service: MembersService;

  const mockRanting = {
    id: 'r1',
    kodeRanting: 'RTG-0114-01',
    nama: 'Ranting Test',
    wilayah: {
      id: 'w1',
      kodeWilayah: 'WLY-0114-01',
      nama: 'Wilayah Test',
      distrik: {
        id: 'd1',
        kodeDistrik: 'DST-0114',
        nama: 'Distrik Test',
      },
    },
  };

  const mockPrisma = {
    anggota: {
      findMany: jest.fn(),
      count: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
    ranting: {
      findUnique: jest.fn().mockResolvedValue(mockRanting),
    },
    dokumen: {
      findMany: jest.fn(),
    },
    iuran: {
      findMany: jest.fn(),
    },
    importLog: {
      create: jest.fn().mockResolvedValue(undefined),
    },
  };

  const mockNraService = {
    generateMemberNumber: jest
      .fn()
      .mockImplementation((_rantingId: string, _tahunDadar?: string) =>
        Promise.resolve('0114-0101-001-2026'),
      ),
  };

  const mockScopeHelper = {
    buildScopeFilter: jest.fn().mockReturnValue({}),
    buildIndirectScopeFilter: jest.fn().mockReturnValue({}),
    hasAccessToResource: jest.fn().mockReturnValue(true),
    hasAccessToResourceAsync: jest.fn().mockResolvedValue(true),
    verifyResourceAccess: jest.fn().mockResolvedValue(undefined),
    verifyKegiatanScope: jest.fn(),
  };

  const mockCache = {
    get: jest.fn().mockReturnValue(undefined),
    set: jest.fn(),
    del: jest.fn(),
    invalidatePrefix: jest.fn(),
    getOrSet: jest
      .fn()
      .mockImplementation((_key: string, factory: () => Promise<unknown>) => factory()),
    clear: jest.fn(),
    getStats: jest.fn().mockReturnValue({ size: 0, keys: [] }),
  };

  const mockCsvImportService = {
    importRows: jest.fn(),
    parseDateField: jest.fn().mockImplementation((value) => {
      if (!value) return null;
      const date = new Date(value);
      return isNaN(date.getTime()) ? null : date;
    }),
  };

  const mockMemberMailService = {
    sendToMember: jest.fn().mockResolvedValue(undefined),
    sendToMemberWithArgs: jest.fn().mockResolvedValue(undefined),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MembersService,
        { provide: CsvImportService, useValue: mockCsvImportService },
        { provide: PrismaService, useValue: mockPrisma },
        { provide: ScopeHelper, useValue: mockScopeHelper },
        { provide: CacheService, useValue: mockCache },
        { provide: MemberMailService, useValue: mockMemberMailService },
        { provide: NraService, useValue: mockNraService },
      ],
    }).compile();

    service = module.get<MembersService>(MembersService);
    jest.clearAllMocks();
    // Reset default mock return values after clearAllMocks
    mockScopeHelper.buildScopeFilter.mockReturnValue({});
    mockScopeHelper.hasAccessToResourceAsync.mockResolvedValue(true);
    mockCache.invalidatePrefix.mockClear();
    mockPrisma.ranting.findUnique.mockResolvedValue(mockRanting);
    mockNraService.generateMemberNumber.mockResolvedValue('0114-0101-001-2026');
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
    it('should call NraService.generateMemberNumber and create a member', async () => {
      mockNraService.generateMemberNumber.mockResolvedValue('0114-0101-004-2026');
      mockPrisma.anggota.create.mockResolvedValue({
        id: 'm1',
        nomorAnggota: '0114-0101-004-2026',
        email: 'budi@test.com',
        namaLengkap: 'Budi',
        rantingId: 'r1',
      });

      const result = await service.create({
        namaLengkap: 'Budi',
        rantingId: 'r1',
        email: 'budi@test.com',
      });

      expect(result.success).toBe(true);
      expect(mockNraService.generateMemberNumber).toHaveBeenCalledWith('r1');
      expect(result.data.nomorAnggota).toBe('0114-0101-004-2026');
      expect(mockMemberMailService.sendToMember).toHaveBeenCalledTimes(1);
    });

    it('should not send welcome email when email is missing', async () => {
      mockPrisma.anggota.create.mockResolvedValue({
        id: 'm1',
        nomorAnggota: '0114-0101-001-2026',
      });

      const result = await service.create({
        namaLengkap: 'Budi',
        rantingId: 'r1',
      });
      expect(result.success).toBe(true);
      expect(mockNraService.generateMemberNumber).toHaveBeenCalledWith('r1');
      expect(mockMemberMailService.sendToMember).not.toHaveBeenCalled();
    });

    it('should auto-assign rantingId from scope when not provided', async () => {
      mockNraService.generateMemberNumber.mockResolvedValue('0114-0101-001-2026');
      mockPrisma.anggota.create.mockResolvedValue({
        id: 'm2',
        nomorAnggota: '0114-0101-001-2026',
      });

      const result = await service.create(
        { namaLengkap: 'Test' },
        { rantingId: 'r1', role: 'admin_ranting' } as any,
      );

      expect(result.success).toBe(true);
      expect(mockNraService.generateMemberNumber).toHaveBeenCalledWith('r1');
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

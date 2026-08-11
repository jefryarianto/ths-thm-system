// @ts-nocheck
import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException, ForbiddenException } from '@nestjs/common';
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
      findFirst: jest.fn(),
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
    user: {
      findUnique: jest.fn().mockResolvedValue(null),
      create: jest.fn().mockResolvedValue({ id: 'u1', email: 'test@test.com' }),
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
      expect(result.namaLengkap).toBe('Budi');
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

      expect(mockNraService.generateMemberNumber).toHaveBeenCalledWith('r1', undefined);
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
      expect(mockNraService.generateMemberNumber).toHaveBeenCalledWith('r1', undefined);
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

      expect(mockNraService.generateMemberNumber).toHaveBeenCalledWith('r1', undefined);
    });
  });

  describe('importCsv', () => {
    // Mock importRows to actually execute the provided rowProcessor, so we can
    // assert per-row behavior (ranting validation, NRA conversion, errors).
    const runImport = async (rows: any[], scope?: any) => {
      let capturedProcessor: any = null;
      mockCsvImportService.importRows.mockImplementation(
        async (_data: any[], options: any) => {
          capturedProcessor = options.rowProcessor;
          const result: any = { success: 0, incomplete: 0, errors: 0, details: [] };
          for (const row of _data) {
            const helpers: any = {
              email: row.email?.toString().trim().toLowerCase(),
              namaLengkap: (row.nama_lengkap || row.nama || '').toString().trim().toLowerCase(),
              addIntraCsv: jest.fn(),
            };
            const processed = await options.rowProcessor(row, helpers);
            if (processed.skip) {
              result.incomplete++;
            } else if (processed.success) {
              result.success++;
            } else {
              result.errors++;
              result.details.push({ row, error: processed.error });
            }
          }
          return result;
        },
      );
      const result = await service.importCsv(rows, scope);
      return { result, processor: capturedProcessor };
    };

    beforeEach(() => {
      mockPrisma.anggota.create.mockResolvedValue({ id: 'm1', email: 'x@y.com' });
      mockMemberMailService.sendToMember.mockResolvedValue(undefined);
    });

    it('should reject rows without ranting_id (struktur organisasi belum ada)', async () => {
      const { result } = await runImport([{ nama_lengkap: 'Tanpa Ranting', jenis_kelamin: 'L' }]);
      expect(result.success).toBe(0);
      expect(result.errors).toBe(1);
      expect(result.details[0].error).toContain('ranting_id wajib diisi');
    });

    it('should reject rows when ranting is not found in DB', async () => {
      mockPrisma.ranting.findUnique.mockResolvedValue(null);
      const { result } = await runImport([
        { nama_lengkap: 'Ranting Hilang', jenis_kelamin: 'L', ranting_id: 'missing-1' },
      ]);
      expect(result.success).toBe(0);
      expect(result.errors).toBe(1);
      expect(result.details[0].error).toContain('tidak ditemukan');
    });

    it('should reject rows when ranting has incomplete org structure', async () => {
      mockPrisma.ranting.findUnique.mockResolvedValue({
        id: 'r9',
        nama: 'Ranting Tanpa Struktur',
        kodeRanting: '',
        wilayah: null,
      });
      const { result } = await runImport([
        { nama_lengkap: 'Struktur Kurang', jenis_kelamin: 'L', ranting_id: 'r9' },
      ]);
      expect(result.success).toBe(0);
      expect(result.errors).toBe(1);
      expect(result.details[0].error).toContain('belum lengkap');
    });

    it('should import member with converted NRA from legacy number', async () => {
      mockPrisma.ranting.findUnique.mockResolvedValue(mockRanting);
      let createdData: any = null;
      mockPrisma.anggota.create.mockImplementation(async ({ data }: any) => {
        createdData = data;
        return { id: 'm1', email: data.email, namaLengkap: data.namaLengkap, rantingId: data.rantingId };
      });

      const { result } = await runImport([
        {
          nama_lengkap: 'Jefry',
          jenis_kelamin: 'L',
          ranting_id: 'r1',
          nomor_anggota: '001-1994',
          tahun_dadar: '1994',
          email: 'jefry@test.com',
          tempat_lahir: 'Jakarta',
          tanggal_lahir: '1990-01-15',
          tempat_dadar: 'Bandung',
          alamat: 'Jl. Test No. 1',
          no_hp: '081234567890',
          tingkat: 'Pratama',
        },
      ]);

      expect(result.success).toBe(1);
      expect(result.errors).toBe(0);
      expect(createdData.nomorAnggota).toBe('0114-0101-001-1994');
      expect(createdData.rantingId).toBe('r1');
    });

    it('should import member with auto-generated NRA when no legacy number', async () => {
      mockPrisma.ranting.findUnique.mockResolvedValue(mockRanting);
      mockNraService.generateMemberNumber.mockResolvedValue('0114-0101-001-2026');
      let createdData: any = null;
      mockPrisma.anggota.create.mockImplementation(async ({ data }: any) => {
        createdData = data;
        return { id: 'm2', email: data.email, namaLengkap: data.namaLengkap, rantingId: data.rantingId };
      });

      const { result } = await runImport([
        {
          nama_lengkap: 'Auto NRA',
          jenis_kelamin: 'P',
          ranting_id: 'r1',
          tahun_dadar: '2026',
          email: 'auto@test.com',
          tempat_lahir: 'Jakarta',
          tanggal_lahir: '1990-01-15',
          tempat_dadar: 'Bandung',
          alamat: 'Jl. Test No. 1',
          no_hp: '081234567890',
          tingkat: 'Pratama',
        },
      ]);

      expect(result.success).toBe(1);
      expect(createdData.nomorAnggota).toBe('0114-0101-001-2026');
      expect(mockNraService.generateMemberNumber).toHaveBeenCalledWith('r1', '2026');
    });

    it('should use ranting_id from scope when CSV row has none', async () => {
      mockPrisma.ranting.findUnique.mockResolvedValue(mockRanting);
      let createdData: any = null;
      mockPrisma.anggota.create.mockImplementation(async ({ data }: any) => {
        createdData = data;
        return { id: 'm3', email: data.email, namaLengkap: data.namaLengkap, rantingId: data.rantingId };
      });

      const { result } = await runImport([
        {
          nama_lengkap: 'Scope Ranting',
          jenis_kelamin: 'L',
          email: 'scope@test.com',
          tempat_lahir: 'Jakarta',
          tanggal_lahir: '1990-01-15',
          tempat_dadar: 'Bandung',
          tahun_dadar: '2020',
          alamat: 'Jl. Test No. 1',
          no_hp: '081234567890',
          tingkat: 'Pratama',
        },
      ], {
        rantingId: 'r1',
        role: 'admin_ranting',
      });

      expect(result.success).toBe(1);
      expect(createdData.rantingId).toBe('r1');
    });
  });

  describe('update', () => {
    it('should update a member', async () => {
      mockPrisma.anggota.update.mockResolvedValue({ id: 'm1', namaLengkap: 'Updated' });
      const result = await service.update('m1', { namaLengkap: 'Updated' });
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
    });

    it('should throw ForbiddenException when anggota requests another member\'s documents', async () => {
      mockPrisma.anggota.findFirst.mockResolvedValue({ id: 'm1' });
      mockPrisma.anggota.findMany.mockResolvedValue([]);
      await expect(
        service.getDocuments('m2', { email: 'jefry@gmail.com', namaLengkap: 'Jefry Arianto Baba', role: 'anggota' }),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  describe('getDues', () => {
    it('should return dues for a member', async () => {
      mockPrisma.iuran.findMany.mockResolvedValue([{ id: 'i1', jumlah: 100000 }]);
      const result = await service.getDues('m1');
    });

    it('should allow anggota to access their own dues (self-scope)', async () => {
      mockPrisma.anggota.findFirst.mockResolvedValue({ id: 'm1' });
      mockPrisma.anggota.findMany.mockResolvedValue([]);
      mockPrisma.iuran.findMany.mockResolvedValue([{ id: 'i1', jumlah: 100000 }]);
      const result = await service.getDues('m1', { email: 'jefry@gmail.com', namaLengkap: 'Jefry Arianto Baba', role: 'anggota' });
      expect(result).toHaveLength(1);
    });
  });

  describe('findByEmail', () => {
    const member = {
      id: 'm1',
      nomorAnggota: '001-1994',
      namaLengkap: 'Jefry Arianto Baba',
      email: null,
      ranting: { nama: 'Ranting Test', wilayah: { nama: 'Wilayah Test', distrik: { nama: 'Distrik Test' } } },
    };

    it('should return member by exact email match', async () => {
      mockPrisma.anggota.findFirst.mockResolvedValue(member);
      const result = await service.findByEmail('jefry@example.com', 'Jefry Arianto Baba');
      expect(result).toBe(member);
      // Fallback nama tidak perlu dicoba bila email cocok
      expect(mockPrisma.anggota.findMany).not.toHaveBeenCalled();
    });

    it('should fallback to unique nama match when email kosong', async () => {
      mockPrisma.anggota.findFirst.mockResolvedValue(null);
      mockPrisma.anggota.findMany.mockResolvedValue([member]);

      const result = await service.findByEmail('akun@example.com', 'Jefry Arianto Baba');
      expect(result).toBe(member);
      // Filter fallback: nama insensitive + hanya anggota ber-email kosong
      expect(mockPrisma.anggota.findMany).toHaveBeenCalledWith({
        where: {
          namaLengkap: { equals: 'Jefry Arianto Baba', mode: 'insensitive' },
          OR: [{ email: null }, { email: '' }],
          deletedAt: null,
        },
        include: expect.any(Object),
      });
    });

    it('should throw NotFoundException when nama match ambiguous (nama kembar)', async () => {
      mockPrisma.anggota.findFirst.mockResolvedValue(null);
      mockPrisma.anggota.findMany.mockResolvedValue([member, { ...member, id: 'm2' }]);

      await expect(service.findByEmail('akun@example.com', 'Jefry Arianto Baba')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw NotFoundException when no match at all', async () => {
      mockPrisma.anggota.findFirst.mockResolvedValue(null);
      mockPrisma.anggota.findMany.mockResolvedValue([]);

      await expect(service.findByEmail('tidak.ada@example.com', 'Orang Asing')).rejects.toThrow(
        NotFoundException,
      );
    });
  });
});

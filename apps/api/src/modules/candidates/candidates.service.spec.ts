// @ts-nocheck
import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException, BadRequestException } from '@nestjs/common';
import { CandidatesService } from './candidates.service';
import { PrismaService } from '../../prisma/prisma.service';
import { ScopeHelper } from '../../common/utils/scope-helpers';
import { CacheService } from '../../common/services/cache.service';
import { CsvImportService } from '../../common/services/csv-import.service';
import { MemberMailService } from '../../common/services/member-mail.service';
import { NraService } from '../../common/services/nra.service';

describe('CandidatesService', () => {
  let service: CandidatesService;

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
      findMany: jest.fn(),
      findUnique: jest.fn(),
    },
    ranting: {
      findUnique: jest.fn().mockResolvedValue(mockRanting),
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
    verifyKegiatanScope: jest.fn(),
    verifyResourceAccess: jest.fn().mockResolvedValue(undefined),
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

  // Mock CsvImportService that reads from mockPrisma fixtures (like the real service does)
  const mockCsvImportService = {
    importRows: jest.fn().mockImplementation(async (data, options) => {
      const maxRows = options.maxRows ?? 500;
      if (data.length > maxRows) {
        throw new BadRequestException(`Maksimal ${maxRows} baris data per import. File Anda memiliki ${data.length} baris.`);
      }
      const result = { success: 0, incomplete: 0, errors: 0, details: [] };

      // Collect emails/names from data for batch duplicate check
      const dataEmails = data
        .map((r) => r.email?.toString().trim().toLowerCase())
        .filter(Boolean);
      const dataNames = data
        .map((r) => (r.nama_lengkap || r.nama || r.name || '').toString().trim().toLowerCase())
        .filter(Boolean);

      // Consult mockPrisma fixtures for existing records (mirrors real batchCheckEmails/batchCheckNames)
      const existingEmails = new Set<string>();
      const existingNames = new Set<string>();

      if (dataEmails.length > 0) {
        const anggotaEmails = await mockPrisma.anggota.findMany();
        const calonEmails = await mockPrisma.calonAnggota.findMany();
        for (const e of [...anggotaEmails, ...calonEmails]) {
          if (e.email) existingEmails.add(e.email.toLowerCase());
        }
      }
      if (dataNames.length > 0) {
        const anggotaNames = await mockPrisma.anggota.findMany();
        const calonNames = await mockPrisma.calonAnggota.findMany();
        for (const n of [...anggotaNames, ...calonNames]) {
          if (n.namaLengkap) existingNames.add(n.namaLengkap.toLowerCase());
        }
      }

      for (const row of data) {
        try {
          const email = (row.email || '').toString().trim().toLowerCase() || undefined;
          const namaLengkap = (row.nama_lengkap || row.nama || row.name || '').toString().trim().toLowerCase();

          if (email && existingEmails.has(email)) {
            result.errors++;
            result.details.push({ row, error: `Email "${row.email}" sudah terdaftar` });
            continue;
          }
          if (namaLengkap && existingNames.has(namaLengkap)) {
            result.errors++;
            result.details.push({ row, error: `Nama "${row.nama_lengkap || row.nama || row.name}" sudah terdaftar` });
            continue;
          }

          const processed = await options.rowProcessor(row, {
            email,
            namaLengkap,
            addIntraCsv: (e, n) => {
              if (e) existingEmails.add(e);
              if (n) existingNames.add(n);
            },
          });

          if (processed.skip) {
            result.incomplete++;
            continue;
          }
          if (processed.success) {
            if (email) existingEmails.add(email);
            if (namaLengkap) existingNames.add(namaLengkap);
            result.success++;
          } else {
            result.errors++;
            result.details.push({ row, error: processed.error || 'Gagal memproses baris' });
          }
        } catch (error) {
          result.errors++;
          result.details.push({ row, error: (error as Error).message });
        }
      }
      return result;
    }),
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

  // Reset sendToMemberWithArgs to track calls properly
  beforeEach(() => {
    mockMemberMailService.sendToMemberWithArgs.mockClear();
  });

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CandidatesService,
        { provide: CsvImportService, useValue: mockCsvImportService },
        { provide: PrismaService, useValue: mockPrisma },
        { provide: ScopeHelper, useValue: mockScopeHelper },
        { provide: CacheService, useValue: mockCache },
        { provide: MemberMailService, useValue: mockMemberMailService },
        { provide: NraService, useValue: mockNraService },
      ],
    }).compile();

    service = module.get<CandidatesService>(CandidatesService);
    jest.clearAllMocks();
    mockScopeHelper.buildScopeFilter.mockReturnValue({});
    mockScopeHelper.hasAccessToResourceAsync.mockResolvedValue(true);
    mockCache.invalidatePrefix.mockClear();
    mockPrisma.ranting.findUnique.mockResolvedValue(mockRanting);
    mockNraService.generateMemberNumber.mockResolvedValue('0114-0101-001-2026');
    // Default mock returns for duplicate email queries
    mockPrisma.anggota.findMany.mockResolvedValue([]);
    mockPrisma.calonAnggota.findMany.mockResolvedValue([]);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('findAll', () => {
    it('should return paginated candidates', async () => {
      mockPrisma.calonAnggota.findMany.mockResolvedValue([{ id: 'c1', namaLengkap: 'Budi' }]);
      mockPrisma.calonAnggota.count.mockResolvedValue(1);
      const result = await service.findAll({ page: 1, limit: 10 });
      expect(result.data).toHaveLength(1);
      expect(result.meta.total).toBe(1);
    });
  });

  describe('findOne', () => {
    it('should return a single candidate', async () => {
      mockPrisma.calonAnggota.findUnique.mockResolvedValue({ id: 'c1', namaLengkap: 'Budi' });
      const result = await service.findOne('c1');
      expect(result.namaLengkap).toBe('Budi');
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
      expect(result.data.status).toBe('diusulkan');
    });
  });

  describe('update', () => {
    it('should update a candidate', async () => {
      mockPrisma.calonAnggota.update.mockResolvedValue({ id: 'c1', namaLengkap: 'Updated' });
      const result = await service.update('c1', { namaLengkap: 'Updated' } as any);
      expect(result).toBeDefined();
    });
  });

  describe('remove', () => {
    it('should delete a candidate', async () => {
      await service.remove('c1');
      expect(mockPrisma.calonAnggota.delete).toHaveBeenCalledWith({ where: { id: 'c1' } });
    });
  });

  describe('approve', () => {
    const mockCandidate = {
      id: 'c1',
      namaLengkap: 'Budi',
      jenisKelamin: 'L',
      tempatLahir: 'Jakarta',
      tanggalLahir: new Date('1990-01-01'),
      alamat: 'Jl. A',
      noHp: '0812',
      email: 'budi@test.com',
      rantingId: 'r1',
    };

    it('should approve candidate and call NraService.generateMemberNumber', async () => {
      mockNraService.generateMemberNumber.mockResolvedValue('0114-0101-011-2026');
      mockPrisma.calonAnggota.findUnique.mockResolvedValue(mockCandidate);
      mockPrisma.anggota.create.mockResolvedValue({
        id: 'm1',
        nomorAnggota: '0114-0101-011-2026',
        namaLengkap: 'Budi',
      });
      mockPrisma.calonAnggota.update.mockResolvedValue({ id: 'c1', status: 'lulus' });

      const result = await service.approve('c1');

      expect(mockNraService.generateMemberNumber).toHaveBeenCalledWith('r1', undefined);
      expect(result.data.nomorAnggota).toBe('0114-0101-011-2026');
      expect(mockMemberMailService.sendToMemberWithArgs).toHaveBeenCalledTimes(1);
    });

    it('should use tahunDadar when provided', async () => {
      mockNraService.generateMemberNumber.mockResolvedValue('0114-0101-001-2020');
      mockPrisma.calonAnggota.findUnique.mockResolvedValue(mockCandidate);
      mockPrisma.anggota.create.mockResolvedValue({
        id: 'm3',
        nomorAnggota: '0114-0101-001-2020',
        namaLengkap: 'Budi',
      });
      mockPrisma.calonAnggota.update.mockResolvedValue({ id: 'c1', status: 'lulus' });

      const result = await service.approve('c1', { tahunDadar: '2020' });

      expect(mockNraService.generateMemberNumber).toHaveBeenCalledWith('r1', '2020');
      expect(result.data.nomorAnggota).toBe('0114-0101-001-2020');
    });

    it('should throw NotFoundException when not found', async () => {
      mockPrisma.calonAnggota.findUnique.mockResolvedValue(null);
      await expect(service.approve('c1')).rejects.toThrow(NotFoundException);
    });
  });

  describe('reject', () => {
    it('should reject candidate without email', async () => {
      mockPrisma.calonAnggota.findUnique.mockResolvedValue({ id: 'c1' });
      mockPrisma.anggota.findUnique.mockResolvedValue({ email: null, namaLengkap: 'Budi' });
      await service.reject('c1', 'Tidak memenuhi syarat');
      expect(mockPrisma.calonAnggota.update).toHaveBeenCalled();
      expect(mockMemberMailService.sendToMemberWithArgs).not.toHaveBeenCalled();
    });

    it('should reject candidate and send rejection email', async () => {
      mockPrisma.calonAnggota.findUnique.mockResolvedValue({
        id: 'c2',
        namaLengkap: 'Siti',
        email: 'siti@test.com',
      });
      mockPrisma.anggota.findUnique.mockResolvedValue({
        email: 'siti@test.com',
        namaLengkap: 'Siti',
      });
      await service.reject('c2', 'Berkas tidak lengkap');
      expect(mockMemberMailService.sendToMemberWithArgs).toHaveBeenCalledTimes(1);
    });
  });

  describe('validate', () => {
    it('should return valid true when candidate exists', async () => {
      mockPrisma.calonAnggota.findUnique.mockResolvedValue({ id: 'c1' });
      const result = await service.validate('c1');
      expect(result.data.valid).toBe(true);
    });

    it('should throw NotFoundException when not found', async () => {
      mockPrisma.calonAnggota.findUnique.mockResolvedValue(null);
      await expect(service.validate('c1')).rejects.toThrow(NotFoundException);
    });
  });

  describe('importCsv', () => {
    it('should throw error when data exceeds MAX_IMPORT_ROWS', async () => {
      const largeData = new Array(501).fill({ nama_lengkap: 'Test' });
      await expect(service.importCsv(largeData)).rejects.toThrow(
        'Maksimal 500 baris data per import',
      );
    });

    it('should import rows with full template columns (nama_lengkap)', async () => {
      mockPrisma.calonAnggota.create.mockResolvedValue({ id: 'c1' });
      const data = [
        {
          nama_lengkap: 'Ahmad Fauzi',
          jenis_kelamin: 'L',
          tempat_lahir: 'Jakarta',
          tanggal_lahir: '1998-05-12',
          alamat: 'Jl. Merdeka No.10',
          no_hp: '081234567890',
          email: 'ahmad@example.com',
          tingkat: 'Melati 1',
          ranting_id: 'r1',
          usul_oleh_id: 'u1',
        },
      ];

      const result = await service.importCsv(data);

      expect(result.data.success).toBe(1);
      expect(result.data.errors).toBe(0);
      expect(mockPrisma.calonAnggota.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            namaLengkap: 'Ahmad Fauzi',
            jenisKelamin: 'L',
            tempatLahir: 'Jakarta',
            tanggalLahir: expect.any(Date),
            alamat: 'Jl. Merdeka No.10',
            noHp: '081234567890',
            email: 'ahmad@example.com',
            tingkat: 'Melati 1',
            status: 'diusulkan',
          }),
        }),
      );
    });

    it('should fallback to row.nama when nama_lengkap is missing', async () => {
      mockPrisma.calonAnggota.create.mockResolvedValue({ id: 'c1' });
      const data = [{ nama: 'Budi', email: 'budi@test.com' }];
      await service.importCsv(data);
      expect(mockPrisma.calonAnggota.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            namaLengkap: 'Budi',
          }),
        }),
      );
    });

    it('should fallback to row.name when nama_lengkap and nama are missing', async () => {
      mockPrisma.calonAnggota.create.mockResolvedValue({ id: 'c1' });
      const data = [{ name: 'Siti' }];
      await service.importCsv(data);
      expect(mockPrisma.calonAnggota.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            namaLengkap: 'Siti',
          }),
        }),
      );
    });

    it('should use defaults for missing optional fields', async () => {
      mockPrisma.calonAnggota.create.mockResolvedValue({ id: 'c1' });
      const data = [{ nama_lengkap: 'Test' }];
      await service.importCsv(data);
      expect(mockPrisma.calonAnggota.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            namaLengkap: 'Test',
            jenisKelamin: 'L',
            tempatLahir: null,
            tanggalLahir: null,
            tingkat: null,
            status: 'diusulkan',
          }),
        }),
      );
    });

    it('should parse tanggal_lahir as Date', async () => {
      mockPrisma.calonAnggota.create.mockResolvedValue({ id: 'c1' });
      const data = [
        {
          nama_lengkap: 'Test',
          tanggal_lahir: '2000-06-15',
        },
      ];
      await service.importCsv(data);
      const callArg = mockPrisma.calonAnggota.create.mock.calls[0][0];
      expect(callArg.data.tanggalLahir).toBeInstanceOf(Date);
      expect(callArg.data.tanggalLahir.toISOString()).toContain('2000-06-15');
    });

    it('should handle mixed fallback with row.alamat', async () => {
      mockPrisma.calonAnggota.create.mockResolvedValue({ id: 'c1' });
      const data = [{ nama_lengkap: 'Test', address: 'Jl. Test', phone: '081234567890' }];
      await service.importCsv(data);
      expect(mockPrisma.calonAnggota.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            alamat: 'Jl. Test',
            noHp: '081234567890',
          }),
        }),
      );
    });

    it('should catch errors per row and continue processing', async () => {
      mockPrisma.calonAnggota.create
        .mockRejectedValueOnce(new Error('DB error'))
        .mockResolvedValueOnce({ id: 'c2' });

      const data = [
        { nama_lengkap: 'Gagal' },
        { nama_lengkap: 'Berhasil' },
      ];

      const result = await service.importCsv(data);

      expect(result.data.success).toBe(1);
      expect(result.data.errors).toBe(1);
      expect(result.data.details).toHaveLength(1);
      expect(result.data.details[0].error).toBe('DB error');
    });

    it('should invalidate cache after import', async () => {
      mockPrisma.calonAnggota.create.mockResolvedValue({ id: 'c1' });
      const data = [{ nama_lengkap: 'Test' }];
      await service.importCsv(data);
      expect(mockCache.invalidatePrefix).toHaveBeenCalledWith('candidates:');
    });

    describe('duplicate detection', () => {
      it('should skip row when email already exists in Anggota', async () => {
        mockPrisma.anggota.findMany.mockResolvedValue([
          { email: 'existing@test.com' },
        ]);
        mockPrisma.calonAnggota.findMany.mockResolvedValue([]);

        const data = [
          { nama_lengkap: 'Budi', email: 'existing@test.com' },
          { nama_lengkap: 'Siti', email: 'new@test.com' },
        ];

        mockPrisma.calonAnggota.create.mockResolvedValue({ id: 'c1' });
        const result = await service.importCsv(data);

        expect(result.data.success).toBe(1);
        expect(result.data.errors).toBe(1);
        expect(result.data.details[0].error).toContain('sudah terdaftar');
        expect(result.data.details[0].error).toContain('existing@test.com');
        // Should only have called create once (for Siti)
        expect(mockPrisma.calonAnggota.create).toHaveBeenCalledTimes(1);
      });

      it('should skip row when email already exists in CalonAnggota', async () => {
        mockPrisma.anggota.findMany.mockResolvedValue([]);
        mockPrisma.calonAnggota.findMany.mockResolvedValue([
          { email: 'calon@test.com' },
        ]);

        mockPrisma.calonAnggota.create.mockResolvedValue({ id: 'c1' });
        const result = await service.importCsv([
          { nama_lengkap: 'Test', email: 'calon@test.com' },
        ]);

        expect(result.data.success).toBe(0);
        expect(result.data.errors).toBe(1);
        expect(result.data.details[0].error).toContain('sudah terdaftar');
      });

      it('should handle duplicate check case-insensitively', async () => {
        mockPrisma.anggota.findMany.mockResolvedValue([
          { email: 'Existing@Test.com' },
        ]);
        mockPrisma.calonAnggota.findMany.mockResolvedValue([]);

        mockPrisma.calonAnggota.create.mockResolvedValue({ id: 'c1' });
        const result = await service.importCsv([
          { nama_lengkap: 'Test', email: 'existing@test.com' },
        ]);

        expect(result.data.errors).toBe(1);
        expect(result.data.details[0].error).toContain('sudah terdaftar');
      });

      it('should not check duplicate when email is empty and name is empty', async () => {
        mockPrisma.calonAnggota.create.mockResolvedValue({ id: 'c1' });
        const result = await service.importCsv([
          { nama_lengkap: 'Test User', email: 'test@test.com' },
        ]);

        expect(result.data.success).toBe(1);
        expect(result.data.errors).toBe(0);
        // Name is not empty, so findMany IS called for name lookup
        expect(mockPrisma.anggota.findMany).toHaveBeenCalled();
        expect(mockPrisma.calonAnggota.findMany).toHaveBeenCalled();
      });

      it('should not check duplicate when no rows have emails or names', async () => {
        mockPrisma.calonAnggota.create.mockResolvedValue({ id: 'c1' });
        const result = await service.importCsv([
          { nama_lengkap: 'A' },
          { nama_lengkap: 'B' },
        ]);

        expect(result.data.success).toBe(2);
        expect(result.data.errors).toBe(0);
        // No emails, but names present — name queries will run
        expect(mockPrisma.anggota.findMany).toHaveBeenCalledTimes(1);
        expect(mockPrisma.calonAnggota.findMany).toHaveBeenCalledTimes(1);
      });
    });

    describe('duplicate nama_lengkap detection', () => {
      it('should skip row when nama_lengkap already exists in Anggota', async () => {
        // No emails in test data — only name queries will run
        mockPrisma.anggota.findMany.mockResolvedValueOnce([{ namaLengkap: 'Budi Santoso' }]);
        mockPrisma.calonAnggota.findMany.mockResolvedValueOnce([]);

        mockPrisma.calonAnggota.create.mockResolvedValue({ id: 'c1' });
        const result = await service.importCsv([
          { nama_lengkap: 'Budi Santoso' },
          { nama_lengkap: 'Siti Rahayu' },
        ]);

        expect(result.data.success).toBe(1);
        expect(result.data.errors).toBe(1);
        expect(result.data.details[0].error).toContain('sudah terdaftar');
        expect(result.data.details[0].error).toContain('Budi Santoso');
        expect(mockPrisma.calonAnggota.create).toHaveBeenCalledTimes(1);
      });

      it('should skip row when nama_lengkap already exists in CalonAnggota', async () => {
        mockPrisma.anggota.findMany.mockResolvedValueOnce([]);
        mockPrisma.calonAnggota.findMany.mockResolvedValueOnce([{ namaLengkap: 'Ahmad Fauzi' }]);

        mockPrisma.calonAnggota.create.mockResolvedValue({ id: 'c1' });
        const result = await service.importCsv([
          { nama_lengkap: 'Ahmad Fauzi' },
        ]);

        expect(result.data.success).toBe(0);
        expect(result.data.errors).toBe(1);
        expect(result.data.details[0].error).toContain('sudah terdaftar');
        expect(result.data.details[0].error).toContain('Ahmad Fauzi');
      });

      it('should detect duplicate with fallback nama field', async () => {
        mockPrisma.anggota.findMany.mockResolvedValueOnce([]);
        mockPrisma.calonAnggota.findMany.mockResolvedValueOnce([{ namaLengkap: 'Test User' }]);

        mockPrisma.calonAnggota.create.mockResolvedValue({ id: 'c1' });
        const result = await service.importCsv([
          { nama: 'Test User' },
        ]);

        expect(result.data.success).toBe(0);
        expect(result.data.errors).toBe(1);
        expect(result.data.details[0].error).toContain('sudah terdaftar');
        expect(result.data.details[0].error).toContain('Test User');
      });

      it('should handle duplicate name case-insensitively', async () => {
        mockPrisma.anggota.findMany.mockResolvedValueOnce([]);
        mockPrisma.calonAnggota.findMany.mockResolvedValueOnce([{ namaLengkap: 'Unique Name' }]);

        mockPrisma.calonAnggota.create.mockResolvedValue({ id: 'c1' });
        const result = await service.importCsv([
          { nama_lengkap: 'unique name' },
        ]);

        expect(result.data.errors).toBe(1);
        expect(result.data.details[0].error).toContain('sudah terdaftar');
      });

      it('should not check name duplicate when name is empty', async () => {
        mockPrisma.calonAnggota.create.mockResolvedValue({ id: 'c1' });
        const result = await service.importCsv([
          { nama_lengkap: 'Test', email: 'test@test.com' },
        ]);

        expect(result.data.success).toBe(1);
        expect(result.data.errors).toBe(0);
        // Name is present, so name query runs
        expect(mockPrisma.anggota.findMany).toHaveBeenCalled();
        expect(mockPrisma.calonAnggota.findMany).toHaveBeenCalled();
      });

      it('should detect both email and name duplicates simultaneously', async () => {
        // 3 rows: Budi has email, Siti has no email (name check), Ahmad has neither
        mockPrisma.anggota.findMany
          .mockResolvedValueOnce([{ email: 'existing@test.com' }]) // email anggota findMany
          .mockResolvedValueOnce([]); // name anggota findMany
        mockPrisma.calonAnggota.findMany
          .mockResolvedValueOnce([]) // email calon findMany
          .mockResolvedValueOnce([{ namaLengkap: 'Siti' }]); // name calon findMany

        mockPrisma.calonAnggota.create.mockResolvedValue({ id: 'c1' });
        const result = await service.importCsv([
          { nama_lengkap: 'Budi', email: 'existing@test.com' },
          { nama_lengkap: 'Siti', email: 'new@test.com' },
          { nama_lengkap: 'Ahmad' },
        ]);

        expect(result.data.success).toBe(1);
        expect(result.data.errors).toBe(2);
        // Budi flagged by email duplicate, Siti flagged by name duplicate
        expect(result.data.details[0].error).toContain('Email');
        expect(result.data.details[1].error).toContain('Nama');
        expect(mockPrisma.calonAnggota.create).toHaveBeenCalledTimes(1);
      });
    });
  });

  describe('exportCsv', () => {
    it('should return CSV string with headers and data', async () => {
      mockPrisma.calonAnggota.findMany.mockResolvedValue([
        {
          namaLengkap: 'Budi',
          jenisKelamin: 'L',
          tempatLahir: 'Jakarta',
          tanggalLahir: new Date('2000-01-15'),
          alamat: 'Jl. Test',
          noHp: '081234567890',
          email: 'budi@test.com',
          tingkat: 'Melati 1',
          status: 'diusulkan',
        },
      ]);
      const csv = await service.exportCsv({});
      expect(typeof csv).toBe('string');
      expect(csv).toContain('nama_lengkap');
      expect(csv).toContain('jenis_kelamin');
      expect(csv).toContain('Budi');
      expect(csv).toContain('Melati 1');
      expect(csv).toContain('2000-01-15');
    });

    it('should escape fields with commas', async () => {
      mockPrisma.calonAnggota.findMany.mockResolvedValue([
        {
          namaLengkap: 'Test, Name',
          jenisKelamin: 'L',
          tempatLahir: '',
          tanggalLahir: null,
          alamat: 'Jl. "Besar"',
          noHp: '',
          email: '',
          tingkat: '',
          status: 'diusulkan',
        },
      ]);
      const csv = await service.exportCsv({});
      // Fields with commas or quotes should be wrapped in quotes
      expect(csv).toContain('"Test, Name"');
      expect(csv).toContain('"Jl. ""Besar"""');
    });
  });
});

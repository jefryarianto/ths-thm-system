// @ts-nocheck
import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { SettingsService } from './settings.service';
import { PrismaService } from '../../prisma/prisma.service';

describe('SettingsService', () => {
  let service: SettingsService;

  const mockPrisma = {
    $transaction: jest.fn((cb: (tx: unknown) => unknown) =>
      cb({
        tandaTangan: {
          updateMany: jest.fn(),
          create: jest.fn(),
        },
        stempel: {
          updateMany: jest.fn(),
          create: jest.fn(),
        },
      } as never),
    ),
    setting: {
      findMany: jest.fn(),
      upsert: jest.fn(),
      findUnique: jest.fn(),
    },
    periode: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
    tandaTangan: {
      create: jest.fn(),
      findMany: jest.fn(),
      updateMany: jest.fn(),
      delete: jest.fn(),
    },
    stempel: {
      create: jest.fn(),
      updateMany: jest.fn(),
      findFirst: jest.fn(),
    },
    kepengurusan: {
      findMany: jest.fn(),
    },
    organisasi: {
      findFirst: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
  };

  const mockCache = {
    getOrSet: jest.fn().mockImplementation((_key, factory) => factory()),
    invalidatePrefix: jest.fn(),
  };
  const mockScopeHelper = {
    buildScopeFilter: jest.fn().mockReturnValue({}),
    hasAccessToResourceAsync: jest.fn().mockResolvedValue(true),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SettingsService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: require('../../common/utils/scope-helpers').ScopeHelper, useValue: mockScopeHelper },
        { provide: require('../../common/services/cache.service').CacheService, useValue: mockCache },
      ],
    }).compile();

    service = module.get<SettingsService>(SettingsService);
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('getSettings', () => {
    it('should return all settings', async () => {
      const mockSettings = [{ key: 'app_name', value: 'THS-THM' }];
      mockPrisma.setting.findMany.mockResolvedValue(mockSettings);

      const result = await service.getSettings();
      expect(result).toEqual(mockSettings);
    });
  });

  describe('updateSettings', () => {
    it('should upsert multiple settings', async () => {
      mockPrisma.setting.upsert.mockResolvedValue({ key: 'app_name', value: 'New' });

      const result = await service.updateSettings({ app_name: 'New', app_desc: 'Desc' });
      expect(mockPrisma.setting.upsert).toHaveBeenCalledTimes(2);
    });
  });

  describe('getPeriods', () => {
    it('should return periods ordered by start date desc', async () => {
      const mockPeriods = [{ id: '1', nama: '2026' }];
      mockPrisma.periode.findMany.mockResolvedValue(mockPeriods);

      const result = await service.getPeriods();
      expect(result).toEqual(mockPeriods);
    });
  });

  describe('getPeriod', () => {
    it('should return a single period', async () => {
      mockPrisma.periode.findUnique.mockResolvedValue({ id: '1', nama: '2026' });

      const result = await service.getPeriod('1');
    });

    it('should throw NotFoundException', async () => {
      mockPrisma.periode.findUnique.mockResolvedValue(null);
      await expect(service.getPeriod('nonexistent')).rejects.toThrow(NotFoundException);
    });
  });

  describe('createPeriod', () => {
    it('should create a period', async () => {
      const dto = { nama: '2026' };
      mockPrisma.periode.create.mockResolvedValue({ id: '1', ...dto });

      const result = await service.createPeriod(dto);
    });
  });

  describe('updatePeriod', () => {
    it('should update a period', async () => {
      mockPrisma.periode.update.mockResolvedValue({ id: '1', nama: 'Updated' });

      const result = await service.updatePeriod('1', { nama: 'Updated' });
    });
  });

  describe('deletePeriod', () => {
    it('should delete a period', async () => {
      mockPrisma.periode.delete.mockResolvedValue({});

      const result = await service.deletePeriod('1');
    });
  });

  describe('getRoles', () => {
    it('should return all predefined roles', async () => {
      const result = await service.getRoles();
      expect(result).toHaveLength(7);
      expect(result[0].role).toBe('superadmin');
    });
  });

  describe('uploadSignature', () => {
    it('should upload a signature via transaction', async () => {
      const dto = { filePath: '/storage/sig.png', userId: 'u1' };

      const result = await service.uploadSignature(dto);
      expect(mockPrisma.$transaction).toHaveBeenCalled();
    });
  });

  describe('getSignatures', () => {
    it('should return signatures with user info', async () => {
      const mockSigs = [{ id: '1', user: { namaLengkap: 'Admin' } }];
      mockPrisma.tandaTangan.findMany.mockResolvedValue(mockSigs);

      const result = await service.getSignatures();
      expect(result).toEqual(mockSigs);
    });
  });

  describe('deleteSignature', () => {
    it('should delete a signature', async () => {
      mockPrisma.tandaTangan.delete.mockResolvedValue({});

      const result = await service.deleteSignature('1');
    });
  });

  describe('uploadStamp', () => {
    it('should upload a stamp via transaction', async () => {
      const dto = { filePath: '/storage/stamp.png' };

      const result = await service.uploadStamp(dto);
      expect(mockPrisma.$transaction).toHaveBeenCalled();
    });
  });

  describe('getStamp', () => {
    it('should return active stamp', async () => {
      mockPrisma.stempel.findFirst.mockResolvedValue({ id: '1', isActive: true });

      const result = await service.getStamp();
      expect(result?.isActive).toBe(true);
    });

    it('should return null when no active stamp', async () => {
      mockPrisma.stempel.findFirst.mockResolvedValue(null);

      const result = await service.getStamp();
      expect(result).toBeNull();
    });
  });

  describe('getOrganisasi', () => {
    it('should create a default organisasi record when none exists', async () => {
      mockPrisma.organisasi.findFirst.mockResolvedValue(null);
      mockPrisma.organisasi.create.mockResolvedValue({ id: '1', struktur: [], isVisible: true });

      const result = await service.getOrganisasi();
      expect(mockPrisma.organisasi.create).toHaveBeenCalled();
      expect(result.struktur).toEqual([]);
    });
  });

  describe('getKepengurusanPreview', () => {
    it('should fetch active national kepengurusan and map to organisasi items', async () => {
      mockPrisma.kepengurusan.findMany.mockResolvedValue([
        {
          id: 'k1',
          user: { namaLengkap: 'Budi' },
          jabatan: { nama: 'Ketua Umum', urutan: 1 },
          periode: { nama: '2026-2028' },
        },
        {
          id: 'k2',
          user: { namaLengkap: 'Sari' },
          jabatan: { nama: 'Sekretaris', urutan: 2 },
          periode: { nama: '2026-2028' },
        },
      ]);

      const result = await service.getKepengurusanPreview();

      expect(mockPrisma.kepengurusan.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            nasionalId: { not: null },
            distrikId: null,
            wilayahId: null,
            rantingId: null,
            periode: { isActive: true },
          }),
        }),
      );
      expect(result).toEqual([
        { jabatan: 'Ketua Umum', nama: 'Budi', deskripsi: 'Periode 2026-2028' },
        { jabatan: 'Sekretaris', nama: 'Sari', deskripsi: 'Periode 2026-2028' },
      ]);
    });

    it('should return empty array when no active national kepengurusan', async () => {
      mockPrisma.kepengurusan.findMany.mockResolvedValue([]);
      const result = await service.getKepengurusanPreview();
      expect(result).toEqual([]);
    });
  });

  describe('syncFromKepengurusan', () => {
    const previewItems = [
      { jabatan: 'Ketua Umum', nama: 'Budi', deskripsi: 'Periode 2026-2028' },
    ];

    beforeEach(() => {
      jest.spyOn(service, 'getKepengurusanPreview').mockResolvedValue(previewItems);
    });

    it('should return failure when no kepengurusan data', async () => {
      jest.spyOn(service, 'getKepengurusanPreview').mockResolvedValue([]);
      const result = await service.syncFromKepengurusan('replace');
      expect(result.success).toBe(false);
      expect(result.count).toBe(0);
    });

    it('should replace struktur when mode is replace', async () => {
      mockPrisma.organisasi.findFirst.mockResolvedValue({ id: '1', struktur: [], isVisible: true });
      mockPrisma.organisasi.update.mockResolvedValue({ id: '1', struktur: previewItems, isVisible: true });

      const result = await service.syncFromKepengurusan('replace');
      expect(result.success).toBe(true);
      expect(result.struktur).toEqual(previewItems);
      expect(mockPrisma.organisasi.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ struktur: previewItems }),
        }),
      );
    });

    it('should append unique items and deduplicate when mode is append', async () => {
      mockPrisma.organisasi.findFirst.mockResolvedValue({
        id: '1',
        struktur: [{ jabatan: 'Ketua Umum', nama: 'Budi', deskripsi: 'lama' }],
        isVisible: true,
      });
      mockPrisma.organisasi.update.mockResolvedValue({
        id: '1',
        struktur: [{ jabatan: 'Ketua Umum', nama: 'Budi', deskripsi: 'lama' }],
        isVisible: true,
      });

      const result = await service.syncFromKepengurusan('append');
      expect(result.success).toBe(true);
      // Duplicate entry (same jabatan+nama) is not re-added
      expect(result.struktur).toHaveLength(1);
      expect(result.struktur[0].deskripsi).toBe('lama');
    });
  });
});

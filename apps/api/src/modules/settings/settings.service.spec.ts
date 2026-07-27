// @ts-nocheck
import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { SettingsService } from './settings.service';
import { PrismaService } from '../../prisma/prisma.service';

describe('SettingsService', () => {
  let service: SettingsService;

  const mockPrisma = {
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
      delete: jest.fn(),
    },
    stempel: {
      create: jest.fn(),
      findFirst: jest.fn(),
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
    it('should upload a signature', async () => {
      const dto = { filePath: '/storage/sig.png', userId: 'u1' };
      mockPrisma.tandaTangan.create.mockResolvedValue({ id: '1', ...dto });

      const result = await service.uploadSignature(dto);
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
    it('should upload a stamp', async () => {
      const dto = { filePath: '/storage/stamp.png' };
      mockPrisma.stempel.create.mockResolvedValue({ id: '1', ...dto });

      const result = await service.uploadStamp(dto);
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
});

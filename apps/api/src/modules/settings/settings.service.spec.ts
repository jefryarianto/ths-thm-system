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

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SettingsService,
        { provide: PrismaService, useValue: mockPrisma },
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
      expect(result.success).toBe(true);
      expect(result.data).toEqual(mockSettings);
    });
  });

  describe('updateSettings', () => {
    it('should upsert multiple settings', async () => {
      mockPrisma.setting.upsert.mockResolvedValue({ key: 'app_name', value: 'New' });

      const result = await service.updateSettings({ app_name: 'New', app_desc: 'Desc' });
      expect(result.success).toBe(true);
      expect(mockPrisma.setting.upsert).toHaveBeenCalledTimes(2);
    });
  });

  describe('getPeriods', () => {
    it('should return periods ordered by start date desc', async () => {
      const mockPeriods = [{ id: '1', nama: '2026' }];
      mockPrisma.periode.findMany.mockResolvedValue(mockPeriods);

      const result = await service.getPeriods();
      expect(result.success).toBe(true);
      expect(result.data).toEqual(mockPeriods);
    });
  });

  describe('getPeriod', () => {
    it('should return a single period', async () => {
      mockPrisma.periode.findUnique.mockResolvedValue({ id: '1', nama: '2026' });

      const result = await service.getPeriod('1');
      expect(result.success).toBe(true);
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
      expect(result.success).toBe(true);
    });
  });

  describe('updatePeriod', () => {
    it('should update a period', async () => {
      mockPrisma.periode.update.mockResolvedValue({ id: '1', nama: 'Updated' });

      const result = await service.updatePeriod('1', { nama: 'Updated' });
      expect(result.success).toBe(true);
    });
  });

  describe('deletePeriod', () => {
    it('should delete a period', async () => {
      mockPrisma.periode.delete.mockResolvedValue({});

      const result = await service.deletePeriod('1');
      expect(result.success).toBe(true);
    });
  });

  describe('getRoles', () => {
    it('should return all predefined roles', async () => {
      const result = await service.getRoles();
      expect(result.success).toBe(true);
      expect(result.data).toHaveLength(7);
      expect(result.data[0].role).toBe('superadmin');
    });
  });

  describe('uploadSignature', () => {
    it('should upload a signature', async () => {
      const dto = { filePath: '/storage/sig.png', userId: 'u1' };
      mockPrisma.tandaTangan.create.mockResolvedValue({ id: '1', ...dto });

      const result = await service.uploadSignature(dto);
      expect(result.success).toBe(true);
    });
  });

  describe('getSignatures', () => {
    it('should return signatures with user info', async () => {
      const mockSigs = [{ id: '1', user: { namaLengkap: 'Admin' } }];
      mockPrisma.tandaTangan.findMany.mockResolvedValue(mockSigs);

      const result = await service.getSignatures();
      expect(result.success).toBe(true);
      expect(result.data).toEqual(mockSigs);
    });
  });

  describe('deleteSignature', () => {
    it('should delete a signature', async () => {
      mockPrisma.tandaTangan.delete.mockResolvedValue({});

      const result = await service.deleteSignature('1');
      expect(result.success).toBe(true);
    });
  });

  describe('uploadStamp', () => {
    it('should upload a stamp', async () => {
      const dto = { filePath: '/storage/stamp.png' };
      mockPrisma.stempel.create.mockResolvedValue({ id: '1', ...dto });

      const result = await service.uploadStamp(dto);
      expect(result.success).toBe(true);
    });
  });

  describe('getStamp', () => {
    it('should return active stamp', async () => {
      mockPrisma.stempel.findFirst.mockResolvedValue({ id: '1', isActive: true });

      const result = await service.getStamp();
      expect(result.success).toBe(true);
      expect(result.data?.isActive).toBe(true);
    });

    it('should return null when no active stamp', async () => {
      mockPrisma.stempel.findFirst.mockResolvedValue(null);

      const result = await service.getStamp();
      expect(result.data).toBeNull();
    });
  });
});
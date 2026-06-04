// @ts-nocheck
import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { ActivitiesService } from './activities.service';
import { PrismaService } from '../../prisma/prisma.service';
import { ScopeHelper } from '../../common/utils/scope-helpers';

describe('ActivitiesService', () => {
  let service: ActivitiesService;

  const mockPrisma = {
    kegiatan: {
      findMany: jest.fn(),
      count: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
    kegiatanPeserta: {
      create: jest.fn(),
      delete: jest.fn(),
      findFirst: jest.fn(),
    },
    presensiKegiatan: {
      findMany: jest.fn(),
      create: jest.fn(),
    },
    dokumenKegiatan: {
      findMany: jest.fn(),
      create: jest.fn(),
    },
  };

  const mockScopeHelper = {
    buildScopeFilter: jest.fn().mockReturnValue({}),
    buildIndirectScopeFilter: jest.fn().mockReturnValue({}),
    hasAccessToResource: jest.fn().mockReturnValue(true),
    hasAccessToResourceAsync: jest.fn().mockResolvedValue(true),
    extractScope: jest.fn().mockReturnValue({}),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ActivitiesService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: ScopeHelper, useValue: mockScopeHelper },
      ],
    }).compile();

    service = module.get<ActivitiesService>(ActivitiesService);
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('findAll', () => {
    it('should return paginated activities', async () => {
      mockPrisma.kegiatan.findMany.mockResolvedValue([{ id: 'k1', nama: 'Latihan' }]);
      mockPrisma.kegiatan.count.mockResolvedValue(1);
      const result = await service.findAll({ page: 1, limit: 10 });
      expect(result.success).toBe(true);
      expect(result.data).toHaveLength(1);
    });
  });

  describe('findOne', () => {
    it('should return a single activity', async () => {
      mockPrisma.kegiatan.findUnique.mockResolvedValue({ id: 'k1', nama: 'Latihan' });
      const result = await service.findOne('k1');
      expect(result.success).toBe(true);
    });

    it('should throw NotFoundException when not found', async () => {
      mockPrisma.kegiatan.findUnique.mockResolvedValue(null);
      await expect(service.findOne('k1')).rejects.toThrow(NotFoundException);
    });
  });

  describe('create', () => {
    it('should create an activity', async () => {
      mockPrisma.kegiatan.create.mockResolvedValue({ id: 'k1', nama: 'Latihan' });
      const result = await service.create({ nama: 'Latihan' });
      expect(result.success).toBe(true);
    });
  });

  describe('update', () => {
    it('should update an activity', async () => {
      mockPrisma.kegiatan.update.mockResolvedValue({ id: 'k1', nama: 'Updated' });
      const result = await service.update('k1', { nama: 'Updated' });
      expect(result.success).toBe(true);
    });
  });

  describe('remove', () => {
    it('should cancel an activity', async () => {
      await service.remove('k1');
      expect(mockPrisma.kegiatan.update).toHaveBeenCalled();
    });
  });

  describe('addParticipant', () => {
    it('should add a participant', async () => {
      mockPrisma.kegiatan.findUnique.mockResolvedValue({ id: 'k1' });
      mockPrisma.kegiatanPeserta.create.mockResolvedValue({ id: 'p1' });
      const result = await service.addParticipant('k1', { anggotaId: 'a1' });
      expect(result.success).toBe(true);
    });

    it('should throw NotFoundException when activity not found', async () => {
      mockPrisma.kegiatan.findUnique.mockResolvedValue(null);
      await expect(service.addParticipant('k1', { anggotaId: 'a1' })).rejects.toThrow(NotFoundException);
    });
  });

  describe('removeParticipant', () => {
    it('should remove a participant', async () => {
      await service.removeParticipant('k1', 'p1');
      expect(mockPrisma.kegiatanPeserta.delete).toHaveBeenCalled();
    });
  });

  describe('getPresence', () => {
    it('should return presence list', async () => {
      mockPrisma.presensiKegiatan.findMany.mockResolvedValue([{ id: 'pr1', hadir: true }]);
      const result = await service.getPresence('k1');
      expect(result.success).toBe(true);
    });
  });

  describe('recordPresence', () => {
    it('should record presence', async () => {
      mockPrisma.kegiatan.findUnique.mockResolvedValue({ id: 'k1' });
      mockPrisma.presensiKegiatan.create.mockResolvedValue({ id: 'pr1', hadir: true });
      const result = await service.recordPresence('k1', { anggotaId: 'a1', hadir: true });
      expect(result.success).toBe(true);
    });
  });

  describe('getDocuments', () => {
    it('should return documents list', async () => {
      mockPrisma.dokumenKegiatan.findMany.mockResolvedValue([{ id: 'd1' }]);
      const result = await service.getDocuments('k1');
      expect(result.success).toBe(true);
    });
  });

  describe('uploadDocument', () => {
    it('should upload a document', async () => {
      mockPrisma.dokumenKegiatan.create.mockResolvedValue({ id: 'd1', nama: 'file.pdf' });
      const result = await service.uploadDocument('k1', { nama: 'file.pdf', filePath: '/path' });
      expect(result.success).toBe(true);
    });
  });
});

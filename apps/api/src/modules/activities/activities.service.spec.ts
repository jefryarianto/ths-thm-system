import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { ActivitiesService } from './activities.service';
import { PrismaService } from '../../prisma/prisma.service';

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

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ActivitiesService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    service = module.get<ActivitiesService>(ActivitiesService);
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('findAll', () => {
    it('should return paginated activities excluding pendadaran', async () => {
      mockPrisma.kegiatan.findMany.mockResolvedValue([{ id: 'k1', nama: 'Latihan' }]);
      mockPrisma.kegiatan.count.mockResolvedValue(1);

      const result = await service.findAll({ page: '1', limit: '10' });
      expect(result.success).toBe(true);
      expect(result.data).toHaveLength(1);
      expect(result.meta).toEqual({ page: 1, limit: 10, total: 1, totalPages: 1 });
      expect(mockPrisma.kegiatan.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: { tipe: { not: 'pendadaran' } } }),
      );
    });

    it('should filter by tipe, status, and scopeType', async () => {
      mockPrisma.kegiatan.findMany.mockResolvedValue([]);
      mockPrisma.kegiatan.count.mockResolvedValue(0);

      await service.findAll({ tipe: 'latihan', status: 'aktif', scopeType: 'ranting' });
      const expectedWhere = { tipe: 'latihan', status: 'aktif', scopeType: 'ranting' };
      expect(mockPrisma.kegiatan.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: { ...expectedWhere, tipe: { not: 'pendadaran' } } }),
      );
    });
  });

  describe('findOne', () => {
    it('should return a single activity', async () => {
      mockPrisma.kegiatan.findUnique.mockResolvedValue({ id: 'k1', nama: 'Latihan' });
      const result = await service.findOne('k1');
      expect(result.success).toBe(true);
      expect(result.data.id).toBe('k1');
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
      expect(result.data.id).toBe('k1');
      expect(result.message).toContain('berhasil dibuat');
    });
  });

  describe('update', () => {
    it('should update an activity', async () => {
      mockPrisma.kegiatan.update.mockResolvedValue({ id: 'k1', nama: 'Updated' });
      const result = await service.update('k1', { nama: 'Updated' });
      expect(result.success).toBe(true);
      expect(result.data.nama).toBe('Updated');
    });
  });

  describe('remove', () => {
    it('should cancel an activity', async () => {
      await service.remove('k1');
      expect(mockPrisma.kegiatan.update).toHaveBeenCalledWith({
        where: { id: 'k1' },
        data: { status: 'cancelled' },
      });
    });
  });

  describe('addParticipant', () => {
    it('should add a participant', async () => {
      mockPrisma.kegiatan.findUnique.mockResolvedValue({ id: 'k1' });
      mockPrisma.kegiatanPeserta.create.mockResolvedValue({ id: 'p1', kegiatanId: 'k1', anggotaId: 'a1' });
      const result = await service.addParticipant('k1', { anggotaId: 'a1' });
      expect(result.success).toBe(true);
      expect(result.data.kegiatanId).toBe('k1');
    });

    it('should throw NotFoundException when activity not found', async () => {
      mockPrisma.kegiatan.findUnique.mockResolvedValue(null);
      await expect(service.addParticipant('k1', { anggotaId: 'a1' })).rejects.toThrow(NotFoundException);
    });
  });

  describe('removeParticipant', () => {
    it('should remove a participant', async () => {
      await service.removeParticipant('k1', 'p1');
      expect(mockPrisma.kegiatanPeserta.delete).toHaveBeenCalledWith({ where: { id: 'p1' } });
    });
  });

  describe('importParticipants', () => {
    it('should import participants skipping duplicates', async () => {
      mockPrisma.kegiatan.findUnique.mockResolvedValue({ id: 'k1' });
      mockPrisma.kegiatanPeserta.findFirst
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce({ id: 'existing' });
      mockPrisma.kegiatanPeserta.create.mockResolvedValue({ id: 'p1' });

      const result = await service.importParticipants('k1', [
        { anggotaId: 'a1' },
        { anggotaId: 'a2' },
      ]);
      expect(result.success).toBe(true);
      expect(result.data.imported).toBe(1);
    });

    it('should throw NotFoundException when activity not found', async () => {
      mockPrisma.kegiatan.findUnique.mockResolvedValue(null);
      await expect(service.importParticipants('k1', [])).rejects.toThrow(NotFoundException);
    });
  });

  describe('getPresence', () => {
    it('should return presence list', async () => {
      mockPrisma.presensiKegiatan.findMany.mockResolvedValue([{ id: 'pr1', hadir: true }]);
      const result = await service.getPresence('k1');
      expect(result.success).toBe(true);
      expect(result.data).toHaveLength(1);
    });
  });

  describe('recordPresence', () => {
    it('should record presence', async () => {
      mockPrisma.kegiatan.findUnique.mockResolvedValue({ id: 'k1' });
      mockPrisma.presensiKegiatan.create.mockResolvedValue({ id: 'pr1', hadir: true });
      const result = await service.recordPresence('k1', { anggotaId: 'a1', hadir: true });
      expect(result.success).toBe(true);
      expect(result.data.hadir).toBe(true);
    });
  });

  describe('getDocuments', () => {
    it('should return documents list', async () => {
      mockPrisma.dokumenKegiatan.findMany.mockResolvedValue([{ id: 'd1', nama: 'file.pdf' }]);
      const result = await service.getDocuments('k1');
      expect(result.success).toBe(true);
      expect(result.data).toHaveLength(1);
    });
  });

  describe('uploadDocument', () => {
    it('should upload a document', async () => {
      mockPrisma.dokumenKegiatan.create.mockResolvedValue({ id: 'd1', nama: 'file.pdf' });
      const result = await service.uploadDocument('k1', { nama: 'file.pdf', filePath: '/path' });
      expect(result.success).toBe(true);
      expect(result.data.nama).toBe('file.pdf');
    });
  });
});
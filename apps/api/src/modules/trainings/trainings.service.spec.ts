// @ts-nocheck
import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { TrainingsService } from './trainings.service';
import { PrismaService } from '../../prisma/prisma.service';

describe('TrainingsService', () => {
  let service: TrainingsService;

  const mockPrisma = {
    latihan: {
      findMany: jest.fn(),
      count: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
    absensiLatihan: {
      findMany: jest.fn(),
      findFirst: jest.fn(),
      upsert: jest.fn(),
      create: jest.fn(),
    },
    evaluasiLatihan: {
      findMany: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TrainingsService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    service = module.get<TrainingsService>(TrainingsService);
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('findAll', () => {
    it('should return paginated trainings', async () => {
      const mockData = [{ id: '1', jenisMateri: 'Tendangan' }];
      mockPrisma.latihan.findMany.mockResolvedValue(mockData);
      mockPrisma.latihan.count.mockResolvedValue(1);

      const result = await service.findAll({ page: 1, limit: 10 });
      expect(result.success).toBe(true);
      expect(result.data).toEqual(mockData);
      expect(result.meta.total).toBe(1);
    });

    it('should filter by rantingId', async () => {
      mockPrisma.latihan.findMany.mockResolvedValue([]);
      mockPrisma.latihan.count.mockResolvedValue(0);

      await service.findAll({ rantingId: 'r1' });
      expect(mockPrisma.latihan.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: { rantingId: 'r1' } }),
      );
    });
  });

  describe('findOne', () => {
    it('should return a training with relations', async () => {
      mockPrisma.latihan.findUnique.mockResolvedValue({ id: '1', jenisMateri: 'Tendangan' });

      const result = await service.findOne('1');
      expect(result.success).toBe(true);
      expect(result.data.id).toBe('1');
    });

    it('should throw NotFoundException', async () => {
      mockPrisma.latihan.findUnique.mockResolvedValue(null);
      await expect(service.findOne('nonexistent')).rejects.toThrow(NotFoundException);
    });
  });

  describe('create', () => {
    it('should create a training', async () => {
      const dto = { jenisMateri: 'Tendangan', rantingId: 'r1' };
      mockPrisma.latihan.create.mockResolvedValue({ id: '1', ...dto });

      const result = await service.create(dto);
      expect(result.success).toBe(true);
    });
  });

  describe('update', () => {
    it('should update a training', async () => {
      mockPrisma.latihan.update.mockResolvedValue({ id: '1', jenisMateri: 'Updated' });

      const result = await service.update('1', { jenisMateri: 'Updated' });
      expect(result.success).toBe(true);
    });
  });

  describe('remove', () => {
    it('should delete a training', async () => {
      mockPrisma.latihan.delete.mockResolvedValue({});

      const result = await service.remove('1');
      expect(result.success).toBe(true);
    });
  });

  describe('getAttendances', () => {
    it('should return attendances for a training', async () => {
      const mockAttendances = [{ id: 'a1', hadir: true }];
      mockPrisma.absensiLatihan.findMany.mockResolvedValue(mockAttendances);

      const result = await service.getAttendances('t1');
      expect(result.success).toBe(true);
      expect(result.data).toEqual(mockAttendances);
    });
  });

  describe('recordAttendance', () => {
    it('should upsert attendance record', async () => {
      mockPrisma.latihan.findUnique.mockResolvedValue({ id: 't1' });
      mockPrisma.absensiLatihan.upsert.mockResolvedValue({ id: 'a1', hadir: true });

      const result = await service.recordAttendance('t1', {
        anggotaId: 'ang1',
        hadir: true,
      });
      expect(result.success).toBe(true);
      expect(result.data.hadir).toBe(true);
    });

    it('should throw NotFoundException when training not found', async () => {
      mockPrisma.latihan.findUnique.mockResolvedValue(null);
      await expect(
        service.recordAttendance('nonexistent', { anggotaId: 'ang1' }),
      ).rejects.toThrow(NotFoundException);
    });

    it('should default hadir to true when undefined', async () => {
      mockPrisma.latihan.findUnique.mockResolvedValue({ id: 't1' });
      mockPrisma.absensiLatihan.upsert.mockResolvedValue({ id: 'a1', hadir: true });

      await service.recordAttendance('t1', { anggotaId: 'ang1' });
      expect(mockPrisma.absensiLatihan.upsert).toHaveBeenCalledWith(
        expect.objectContaining({ create: expect.objectContaining({ hadir: true }) }),
      );
    });

    it('should pass hadir as given when explicitly false', async () => {
      mockPrisma.latihan.findUnique.mockResolvedValue({ id: 't1' });
      mockPrisma.absensiLatihan.upsert.mockResolvedValue({ id: 'a1', hadir: false });

      await service.recordAttendance('t1', { anggotaId: 'ang1', hadir: false });
      expect(mockPrisma.absensiLatihan.upsert).toHaveBeenCalledWith(
        expect.objectContaining({ create: expect.objectContaining({ hadir: false }) }),
      );
    });
  });

  describe('importAttendance', () => {
    it('should import attendance records', async () => {
      mockPrisma.latihan.findUnique.mockResolvedValue({ id: 't1' });
      mockPrisma.absensiLatihan.findFirst.mockResolvedValue(null);
      mockPrisma.absensiLatihan.create.mockResolvedValue({});

      const data = [
        { anggotaId: 'ang1', hadir: true },
        { anggotaId: 'ang2', hadir: false },
      ];
      const result = await service.importAttendance('t1', data);
      expect(result.success).toBe(true);
      expect(result.data.imported).toBe(2);
    });

    it('should skip existing attendance records', async () => {
      mockPrisma.latihan.findUnique.mockResolvedValue({ id: 't1' });
      mockPrisma.absensiLatihan.findFirst
        .mockResolvedValueOnce({ id: 'existing' })
        .mockResolvedValueOnce(null);
      mockPrisma.absensiLatihan.create.mockResolvedValue({});

      const data = [{ anggotaId: 'ang1' }, { anggotaId: 'ang2' }];
      const result = await service.importAttendance('t1', data);
      expect(result.data.imported).toBe(1);
    });

    it('should throw NotFoundException when training not found', async () => {
      mockPrisma.latihan.findUnique.mockResolvedValue(null);
      await expect(service.importAttendance('nonexistent', [])).rejects.toThrow(NotFoundException);
    });
  });

  describe('getEvaluations', () => {
    it('should return evaluations for a training', async () => {
      const mockEvals = [{ id: 'e1', nilai: 85 }];
      mockPrisma.evaluasiLatihan.findMany.mockResolvedValue(mockEvals);

      const result = await service.getEvaluations('t1');
      expect(result.success).toBe(true);
      expect(result.data).toEqual(mockEvals);
    });
  });

  describe('createEvaluation', () => {
    it('should create an evaluation', async () => {
      mockPrisma.latihan.findUnique.mockResolvedValue({ id: 't1' });
      mockPrisma.evaluasiLatihan.create.mockResolvedValue({ id: 'e1', nilai: 85 });

      const result = await service.createEvaluation('t1', {
        anggotaId: 'ang1',
        nilai: 85,
      });
      expect(result.success).toBe(true);
    });

    it('should throw NotFoundException when training not found', async () => {
      mockPrisma.latihan.findUnique.mockResolvedValue(null);
      await expect(
        service.createEvaluation('nonexistent', { anggotaId: 'ang1' }),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('updateEvaluation', () => {
    it('should update an evaluation', async () => {
      mockPrisma.evaluasiLatihan.update.mockResolvedValue({ id: 'e1', nilai: 90 });

      const result = await service.updateEvaluation('t1', 'e1', { nilai: 90 });
      expect(result.success).toBe(true);
    });
  });

  describe('removeEvaluation', () => {
    it('should delete an evaluation', async () => {
      mockPrisma.evaluasiLatihan.delete.mockResolvedValue({});

      const result = await service.removeEvaluation('t1', 'e1');
      expect(result.success).toBe(true);
    });
  });
});
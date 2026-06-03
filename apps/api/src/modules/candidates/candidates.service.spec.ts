import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { CandidatesService } from './candidates.service';
import { PrismaService } from '../../prisma/prisma.service';

describe('CandidatesService', () => {
  let service: CandidatesService;

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
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CandidatesService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    service = module.get<CandidatesService>(CandidatesService);
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('findAll', () => {
    it('should return paginated candidates', async () => {
      mockPrisma.calonAnggota.findMany.mockResolvedValue([{ id: 'c1', namaLengkap: 'Budi' }]);
      mockPrisma.calonAnggota.count.mockResolvedValue(1);

      const result = await service.findAll({ page: 1, limit: 10 });
      expect(result.success).toBe(true);
      expect(result.data).toHaveLength(1);
      expect(result.meta.total).toBe(1);
    });

    it('should filter by search, rantingId, and status', async () => {
      mockPrisma.calonAnggota.findMany.mockResolvedValue([]);
      mockPrisma.calonAnggota.count.mockResolvedValue(0);

      await service.findAll({ search: 'Budi', rantingId: 'r1', status: 'diusulkan' });
      expect(mockPrisma.calonAnggota.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            OR: [
              { namaLengkap: { contains: 'Budi' } },
              { email: { contains: 'Budi' } },
            ],
            rantingId: 'r1',
            status: 'diusulkan',
          },
        }),
      );
    });
  });

  describe('findOne', () => {
    it('should return a single candidate', async () => {
      mockPrisma.calonAnggota.findUnique.mockResolvedValue({ id: 'c1', namaLengkap: 'Budi' });
      const result = await service.findOne('c1');
      expect(result.success).toBe(true);
      expect(result.data.namaLengkap).toBe('Budi');
    });

    it('should throw NotFoundException when not found', async () => {
      mockPrisma.calonAnggota.findUnique.mockResolvedValue(null);
      await expect(service.findOne('c1')).rejects.toThrow(NotFoundException);
    });
  });

  describe('create', () => {
    it('should create a candidate with status diusulkan', async () => {
      mockPrisma.calonAnggota.create.mockResolvedValue({ id: 'c1', status: 'diusulkan' });
      const result = await service.create({ namaLengkap: 'Budi', email: 'budi@test.com' } as any);
      expect(result.success).toBe(true);
      expect(result.data.status).toBe('diusulkan');
    });
  });

  describe('update', () => {
    it('should update a candidate', async () => {
      mockPrisma.calonAnggota.update.mockResolvedValue({ id: 'c1', namaLengkap: 'Updated' });
      const result = await service.update('c1', { namaLengkap: 'Updated' } as any);
      expect(result.success).toBe(true);
      expect(result.data.namaLengkap).toBe('Updated');
    });
  });

  describe('remove', () => {
    it('should delete a candidate', async () => {
      await service.remove('c1');
      expect(mockPrisma.calonAnggota.delete).toHaveBeenCalledWith({ where: { id: 'c1' } });
    });
  });

  describe('importCsv', () => {
    it('should import csv data and count successes', async () => {
      mockPrisma.calonAnggota.create.mockResolvedValue({ id: 'c1' });
      const result = await service.importCsv([
        { nama: 'Budi', email: 'budi@test.com' },
      ]);
      expect(result.success).toBe(true);
      expect(result.data.success).toBe(1);
      expect(result.data.errors).toBe(0);
    });

    it('should count errors on failed rows', async () => {
      mockPrisma.calonAnggota.create.mockRejectedValue(new Error('DB error'));
      const result = await service.importCsv([{ nama: 'Budi' }]);
      expect(result.data.errors).toBe(1);
      expect(result.data.details).toHaveLength(1);
    });
  });

  describe('validate', () => {
    it('should return valid true when candidate exists', async () => {
      mockPrisma.calonAnggota.findUnique.mockResolvedValue({ id: 'c1' });
      const result = await service.validate('c1');
      expect(result.success).toBe(true);
      expect(result.data.valid).toBe(true);
    });

    it('should throw NotFoundException when not found', async () => {
      mockPrisma.calonAnggota.findUnique.mockResolvedValue(null);
      await expect(service.validate('c1')).rejects.toThrow(NotFoundException);
    });
  });

  describe('approve', () => {
    it('should approve candidate and create member', async () => {
      mockPrisma.calonAnggota.findUnique.mockResolvedValue({
        id: 'c1',
        namaLengkap: 'Budi',
        jenisKelamin: 'L',
        tempatLahir: 'Jakarta',
        tanggalLahir: new Date('1990-01-01'),
        alamat: 'Jl. A',
        noHp: '0812',
        email: 'budi@test.com',
        rantingId: 'r1',
      });
      mockPrisma.anggota.count.mockResolvedValue(10);
      mockPrisma.anggota.create.mockResolvedValue({ id: 'm1', nomorAnggota: 'THS-2026-0011' });
      mockPrisma.calonAnggota.update.mockResolvedValue({ id: 'c1', status: 'lulus' });

      const result = await service.approve('c1');
      expect(result.success).toBe(true);
      expect(result.message).toContain('disetujui');
      expect(mockPrisma.calonAnggota.update).toHaveBeenCalledWith(
        expect.objectContaining({ data: { status: 'lulus' } }),
      );
    });

    it('should throw NotFoundException when not found', async () => {
      mockPrisma.calonAnggota.findUnique.mockResolvedValue(null);
      await expect(service.approve('c1')).rejects.toThrow(NotFoundException);
    });
  });

  describe('reject', () => {
    it('should reject candidate with reason', async () => {
      mockPrisma.calonAnggota.findUnique.mockResolvedValue({ id: 'c1' });
      await service.reject('c1', 'Tidak memenuhi syarat');
      expect(mockPrisma.calonAnggota.update).toHaveBeenCalledWith(
        expect.objectContaining({ data: { status: 'dibatalkan' } }),
      );
    });
  });

  describe('exportCsv', () => {
    it('should return candidates for export', async () => {
      mockPrisma.calonAnggota.findMany.mockResolvedValue([{ namaLengkap: 'Budi' }]);
      const result = await service.exportCsv({});
      expect(result.success).toBe(true);
      expect(result.data).toHaveLength(1);
    });
  });
});
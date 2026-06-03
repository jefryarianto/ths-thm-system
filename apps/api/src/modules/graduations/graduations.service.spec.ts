import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { GraduationsService } from './graduations.service';
import { PrismaService } from '../../prisma/prisma.service';

describe('GraduationsService', () => {
  let service: GraduationsService;

  const mockPrisma = {
    kegiatan: {
      findMany: jest.fn(),
      count: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
    },
    calonAnggota: {
      update: jest.fn(),
      findMany: jest.fn(),
      findUnique: jest.fn(),
    },
    hasilPendadaran: {
      create: jest.fn(),
      findMany: jest.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GraduationsService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    service = module.get<GraduationsService>(GraduationsService);
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('findAll', () => {
    it('should return paginated pendadaran activities', async () => {
      mockPrisma.kegiatan.findMany.mockResolvedValue([{ id: 'k1', tipe: 'pendadaran' }]);
      mockPrisma.kegiatan.count.mockResolvedValue(1);

      const result = await service.findAll({ page: '1', limit: '10' });
      expect(result.success).toBe(true);
      expect(result.data).toHaveLength(1);
      expect(mockPrisma.kegiatan.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: { tipe: 'pendadaran' } }),
      );
    });

    it('should filter by status', async () => {
      mockPrisma.kegiatan.findMany.mockResolvedValue([]);
      mockPrisma.kegiatan.count.mockResolvedValue(0);

      await service.findAll({ status: 'aktif' });
      expect(mockPrisma.kegiatan.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: { status: 'aktif', tipe: 'pendadaran' } }),
      );
    });
  });

  describe('findOne', () => {
    it('should return a single graduation', async () => {
      mockPrisma.kegiatan.findUnique.mockResolvedValue({ id: 'k1', tipe: 'pendadaran' });
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
    it('should create a pendadaran', async () => {
      mockPrisma.kegiatan.create.mockResolvedValue({ id: 'k1', tipe: 'pendadaran' });
      const result = await service.create({ nama: 'Pendadaran 2026' });
      expect(result.success).toBe(true);
      expect(result.data.tipe).toBe('pendadaran');
    });
  });

  describe('registerParticipant', () => {
    it('should register a candidate to pendadaran', async () => {
      mockPrisma.calonAnggota.update.mockResolvedValue({ id: 'c1', status: 'mengikuti_pendadaran' });
      const result = await service.registerParticipant('k1', { candidateId: 'c1' });
      expect(result.success).toBe(true);
      expect(mockPrisma.calonAnggota.update).toHaveBeenCalledWith(
        expect.objectContaining({ data: { status: 'mengikuti_pendadaran' } }),
      );
    });
  });

  describe('unregisterParticipant', () => {
    it('should unregister a candidate', async () => {
      await service.unregisterParticipant('k1', { candidateId: 'c1' });
      expect(mockPrisma.calonAnggota.update).toHaveBeenCalledWith(
        expect.objectContaining({ data: { status: 'diusulkan' } }),
      );
    });
  });

  describe('getParticipants', () => {
    it('should return participants with status mengikuti_pendadaran', async () => {
      mockPrisma.calonAnggota.findMany.mockResolvedValue([{ id: 'c1', status: 'mengikuti_pendadaran' }]);
      const result = await service.getParticipants('k1');
      expect(result.success).toBe(true);
      expect(result.data).toHaveLength(1);
    });
  });

  describe('importParticipants', () => {
    it('should import diusulkan candidates', async () => {
      mockPrisma.kegiatan.findUnique.mockResolvedValue({ id: 'k1' });
      mockPrisma.calonAnggota.findUnique.mockResolvedValue({ id: 'c1', status: 'diusulkan' });
      mockPrisma.calonAnggota.update.mockResolvedValue({ id: 'c1', status: 'mengikuti_pendadaran' });

      const result = await service.importParticipants('k1', [
        { candidateId: 'c1' },
      ]);
      expect(result.success).toBe(true);
      expect(result.data.imported).toBe(1);
    });

    it('should skip candidates not in diusulkan status', async () => {
      mockPrisma.kegiatan.findUnique.mockResolvedValue({ id: 'k1' });
      mockPrisma.calonAnggota.findUnique.mockResolvedValue({ id: 'c1', status: 'lulus' });

      const result = await service.importParticipants('k1', [{ candidateId: 'c1' }]);
      expect(result.data.imported).toBe(0);
    });
  });

  describe('graduate', () => {
    it('should process graduation results', async () => {
      mockPrisma.hasilPendadaran.create.mockResolvedValue({ id: 'h1' });
      mockPrisma.calonAnggota.update.mockResolvedValue({ id: 'c1' });

      const result = await service.graduate('k1', {
        results: [
          { candidateId: 'c1', totalSkor: 85, ranking: 1, lulus: true },
          { candidateId: 'c2', totalSkor: 40, ranking: 2, lulus: false },
        ],
      });
      expect(result.success).toBe(true);
      expect(mockPrisma.hasilPendadaran.create).toHaveBeenCalledTimes(2);
      expect(mockPrisma.calonAnggota.update).toHaveBeenCalledTimes(2);
    });
  });

  describe('generateDocuments', () => {
    it('should return count of graduates', async () => {
      mockPrisma.hasilPendadaran.findMany.mockResolvedValue([{ id: 'h1' }, { id: 'h2' }]);
      const result = await service.generateDocuments('k1');
      expect(result.success).toBe(true);
      expect(result.data.totalGraduates).toBe(2);
    });
  });
});
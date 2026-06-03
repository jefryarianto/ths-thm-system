import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { MembersService } from './members.service';
import { PrismaService } from '../../prisma/prisma.service';

describe('MembersService', () => {
  let service: MembersService;

  const mockPrisma = {
    anggota: {
      findMany: jest.fn(),
      count: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
    dokumen: {
      findMany: jest.fn(),
    },
    iuran: {
      findMany: jest.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MembersService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    service = module.get<MembersService>(MembersService);
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('findAll', () => {
    it('should return paginated members with deletedAt: null', async () => {
      mockPrisma.anggota.findMany.mockResolvedValue([{ id: 'm1', namaLengkap: 'Budi' }]);
      mockPrisma.anggota.count.mockResolvedValue(1);

      const result = await service.findAll({ page: 1, limit: 10 });
      expect(result.success).toBe(true);
      expect(result.data).toHaveLength(1);
      expect(result.meta.total).toBe(1);
      expect(mockPrisma.anggota.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: { deletedAt: null } }),
      );
    });

    it('should filter by search, rantingId, statusKeanggotaan, and statusValidasi', async () => {
      mockPrisma.anggota.findMany.mockResolvedValue([]);
      mockPrisma.anggota.count.mockResolvedValue(0);

      await service.findAll({
        search: 'Budi',
        rantingId: 'r1',
        statusKeanggotaan: 'aktif',
        statusValidasi: 'approved',
      });
      expect(mockPrisma.anggota.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            deletedAt: null,
            OR: [
              { namaLengkap: { contains: 'Budi' } },
              { nomorAnggota: { contains: 'Budi' } },
              { email: { contains: 'Budi' } },
            ],
            rantingId: 'r1',
            statusKeanggotaan: 'aktif',
            statusValidasi: 'approved',
          },
        }),
      );
    });
  });

  describe('findOne', () => {
    it('should return a single member with includes', async () => {
      mockPrisma.anggota.findUnique.mockResolvedValue({ id: 'm1', namaLengkap: 'Budi' });
      const result = await service.findOne('m1');
      expect(result.success).toBe(true);
      expect(result.data.namaLengkap).toBe('Budi');
    });

    it('should throw NotFoundException when not found', async () => {
      mockPrisma.anggota.findUnique.mockResolvedValue(null);
      await expect(service.findOne('m1')).rejects.toThrow(NotFoundException);
    });
  });

  describe('create', () => {
    it('should create a member with generated member number', async () => {
      mockPrisma.anggota.count.mockResolvedValue(10);
      mockPrisma.anggota.create.mockResolvedValue({ id: 'm1', nomorAnggota: 'THS-2026-0011' });
      const result = await service.create({ namaLengkap: 'Budi' } as any);
      expect(result.success).toBe(true);
      expect(result.data.nomorAnggota).toBe('THS-2026-0011');
    });
  });

  describe('update', () => {
    it('should update a member', async () => {
      mockPrisma.anggota.update.mockResolvedValue({ id: 'm1', namaLengkap: 'Updated' });
      const result = await service.update('m1', { namaLengkap: 'Updated' } as any);
      expect(result.success).toBe(true);
      expect(result.data.namaLengkap).toBe('Updated');
    });
  });

  describe('remove', () => {
    it('should soft-delete a member', async () => {
      await service.remove('m1');
      expect(mockPrisma.anggota.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'm1' },
          data: expect.objectContaining({ deletedAt: expect.any(Date) }),
        }),
      );
    });
  });

  describe('importCsv', () => {
    it('should import csv and count successes and incompletes', async () => {
      mockPrisma.anggota.count.mockResolvedValue(0);
      mockPrisma.anggota.create.mockResolvedValue({ id: 'm1' });

      const result = await service.importCsv([
        { nama: 'Budi', jenis_kelamin: 'L', email: 'budi@test.com', alamat: 'Jl. A' },
      ]);
      expect(result.success).toBe(true);
      expect(result.data.success).toBe(1);
    });

    it('should mark incomplete when missing required fields', async () => {
      mockPrisma.anggota.count.mockResolvedValue(0);
      mockPrisma.anggota.create.mockResolvedValue({ id: 'm1' });

      const result = await service.importCsv([
        { nama: 'Budi' },
      ]);
      expect(result.data.incomplete).toBe(1);
    });

    it('should count errors on failed rows', async () => {
      mockPrisma.anggota.count.mockResolvedValue(0);
      mockPrisma.anggota.create.mockRejectedValue(new Error('DB error'));

      const result = await service.importCsv([{ nama: 'Budi' }]);
      expect(result.data.errors).toBe(1);
    });
  });

  describe('exportCsv', () => {
    it('should export members', async () => {
      mockPrisma.anggota.findMany.mockResolvedValue([{ nomorAnggota: 'THS-001' }]);
      const result = await service.exportCsv({});
      expect(result.success).toBe(true);
      expect(result.data).toHaveLength(1);
    });
  });

  describe('validate', () => {
    it('should return valid true when member is complete', async () => {
      mockPrisma.anggota.findUnique.mockResolvedValue({
        id: 'm1',
        namaLengkap: 'Budi',
        jenisKelamin: 'L',
      });
      mockPrisma.anggota.update.mockResolvedValue({ id: 'm1' });

      const result = await service.validate('m1');
      expect(result.success).toBe(true);
      expect(result.data.valid).toBe(true);
    });

    it('should return valid false when fields are missing', async () => {
      mockPrisma.anggota.findUnique.mockResolvedValue({
        id: 'm1',
        namaLengkap: null,
        jenisKelamin: null,
      });
      mockPrisma.anggota.update.mockResolvedValue({ id: 'm1' });

      const result = await service.validate('m1');
      expect(result.data.valid).toBe(false);
      expect(result.data.missingFields).toContain('nama_lengkap');
    });

    it('should throw NotFoundException when not found', async () => {
      mockPrisma.anggota.findUnique.mockResolvedValue(null);
      await expect(service.validate('m1')).rejects.toThrow(NotFoundException);
    });
  });

  describe('approve', () => {
    it('should approve a member', async () => {
      await service.approve('m1');
      expect(mockPrisma.anggota.update).toHaveBeenCalledWith({
        where: { id: 'm1' },
        data: { statusValidasi: 'approved', statusKeanggotaan: 'aktif' },
      });
    });
  });

  describe('suspend', () => {
    it('should suspend a member', async () => {
      await service.suspend('m1');
      expect(mockPrisma.anggota.update).toHaveBeenCalledWith({
        where: { id: 'm1' },
        data: { statusKeanggotaan: 'nonaktif' },
      });
    });
  });

  describe('reactivate', () => {
    it('should reactivate a member', async () => {
      await service.reactivate('m1');
      expect(mockPrisma.anggota.update).toHaveBeenCalledWith({
        where: { id: 'm1' },
        data: { statusKeanggotaan: 'aktif' },
      });
    });
  });

  describe('getDocuments', () => {
    it('should return documents for a member', async () => {
      mockPrisma.dokumen.findMany.mockResolvedValue([{ id: 'd1', nama: 'file.pdf' }]);
      const result = await service.getDocuments('m1');
      expect(result.success).toBe(true);
      expect(result.data).toHaveLength(1);
    });
  });

  describe('getDues', () => {
    it('should return dues for a member', async () => {
      mockPrisma.iuran.findMany.mockResolvedValue([{ id: 'i1', jumlah: 100000 }]);
      const result = await service.getDues('m1');
      expect(result.success).toBe(true);
      expect(result.data).toHaveLength(1);
    });
  });
});
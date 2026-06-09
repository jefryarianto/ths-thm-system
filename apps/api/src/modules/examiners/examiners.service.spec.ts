// @ts-nocheck
import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException, ForbiddenException } from '@nestjs/common';
import { ExaminersService } from './examiners.service';
import { PrismaService } from '../../prisma/prisma.service';
import { MailService } from '../../mail/mail.service';
import { ScopeHelper } from '../../common/utils/scope-helpers';

jest.mock('bcryptjs', () => ({
  hash: jest.fn().mockResolvedValue('hashed-password'),
}));

describe('ExaminersService', () => {
  let service: ExaminersService;

  const mockPrisma = {
    user: {
      findMany: jest.fn(),
      count: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
    kegiatan: {
      findUnique: jest.fn(),
    },
    penugasanPenguji: {
      create: jest.fn(),
      findMany: jest.fn(),
    },
  };

  const mockMailService = {
    sendMail: jest.fn().mockResolvedValue(true),
  };

  const mockScopeHelper = {
    buildScopeFilter: jest.fn().mockReturnValue({}),
    buildIndirectScopeFilter: jest.fn().mockReturnValue({}),
    hasAccessToResource: jest.fn().mockReturnValue(true),
    hasAccessToResourceAsync: jest.fn().mockResolvedValue(true),
    verifyKegiatanScope: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ExaminersService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: MailService, useValue: mockMailService },
        { provide: ScopeHelper, useValue: mockScopeHelper },
      ],
    }).compile();

    service = module.get<ExaminersService>(ExaminersService);
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('findAll', () => {
    it('should return paginated active penguji users', async () => {
      mockPrisma.user.findMany.mockResolvedValue([{ id: 'u1', email: 'penguji@test.com' }]);
      mockPrisma.user.count.mockResolvedValue(1);

      const result = await service.findAll({ page: '1', limit: '10' });
      expect(result.success).toBe(true);
      expect(result.data).toHaveLength(1);
      expect(mockPrisma.user.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { role: 'penguji', isActive: true },
        }),
      );
    });

    it('should filter by search', async () => {
      mockPrisma.user.findMany.mockResolvedValue([]);
      mockPrisma.user.count.mockResolvedValue(0);

      await service.findAll({ search: 'Budi' });
      expect(mockPrisma.user.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { role: 'penguji', isActive: true, namaLengkap: { contains: 'Budi' } },
        }),
      );
    });
  });

  describe('findOne', () => {
    it('should return a single examiner', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({ id: 'u1', role: 'penguji' });
      const result = await service.findOne('u1');
      expect(result.success).toBe(true);
      expect(result.data.id).toBe('u1');
    });

    it('should throw NotFoundException when not found', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);
      await expect(service.findOne('u1')).rejects.toThrow(NotFoundException);
    });
  });

  describe('create', () => {
    it('should create an examiner with hashed password', async () => {
      mockPrisma.user.create.mockResolvedValue({ id: 'u1', role: 'penguji' });
      const result = await service.create({ email: 'penguji@test.com', namaLengkap: 'Budi' });
      expect(result.success).toBe(true);
      expect(result.data.role).toBe('penguji');
    });
  });

  describe('update', () => {
    it('should update an examiner', async () => {
      mockPrisma.user.update.mockResolvedValue({ id: 'u1', namaLengkap: 'Updated' });
      const result = await service.update('u1', { namaLengkap: 'Updated' });
      expect(result.success).toBe(true);
      expect(result.data.namaLengkap).toBe('Updated');
    });
  });

  describe('remove', () => {
    it('should soft-delete by setting isActive false', async () => {
      await service.remove('u1');
      expect(mockPrisma.user.update).toHaveBeenCalledWith({
        where: { id: 'u1' },
        data: { isActive: false },
      });
    });
  });

  describe('assign', () => {
    it('should assign examiner to kegiatan', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({ id: 'u1', role: 'penguji' });
      mockPrisma.kegiatan.findUnique.mockResolvedValue({ id: 'k1' });
      mockPrisma.penugasanPenguji.create.mockResolvedValue({ id: 'a1', pengujiUserId: 'u1', kegiatanId: 'k1' });

      const result = await service.assign('u1', { kegiatanId: 'k1', peran: 'penguji' });
      expect(result.success).toBe(true);
      expect(result.data.kegiatanId).toBe('k1');
    });

    it('should throw NotFoundException when examiner not found', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);
      await expect(service.assign('u1', { kegiatanId: 'k1' })).rejects.toThrow(NotFoundException);
    });

    it('should throw NotFoundException when kegiatan not found', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({ id: 'u1', role: 'penguji' });
      mockPrisma.kegiatan.findUnique.mockResolvedValue(null);
      await expect(service.assign('u1', { kegiatanId: 'k1' })).rejects.toThrow(NotFoundException);
    });

    it('should verify kegiatan scope when scope is provided', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({ id: 'u1', role: 'penguji' });
      mockPrisma.kegiatan.findUnique.mockResolvedValue({ id: 'k1', scopeType: 'ranting', scopeId: 'r1' });
      mockPrisma.penugasanPenguji.create.mockResolvedValue({ id: 'a1' });

      await service.assign('u1', { kegiatanId: 'k1' }, { rantingId: 'r1' });
      expect(mockScopeHelper.verifyKegiatanScope).toHaveBeenCalledWith({ rantingId: 'r1' }, 'ranting', 'r1');
    });
  });

  describe('getAssignments', () => {
    it('should return assignments for an examiner', async () => {
      mockPrisma.penugasanPenguji.findMany.mockResolvedValue([{ id: 'a1', kegiatanId: 'k1' }]);
      const result = await service.getAssignments('u1');
      expect(result.success).toBe(true);
      expect(result.data).toHaveLength(1);
    });
  });

  describe('getSchedules', () => {
    it('should return future schedules', async () => {
      const futureDate = new Date();
      futureDate.setFullYear(futureDate.getFullYear() + 1);
      mockPrisma.penugasanPenguji.findMany.mockResolvedValue([
        { id: 'a1', kegiatan: { id: 'k1', nama: 'Pendadaran', tipe: 'pendadaran', tanggalMulai: futureDate, tanggalSelesai: futureDate, lokasi: 'Aula' } },
      ]);
      const result = await service.getSchedules('u1');
      expect(result.success).toBe(true);
      expect(result.data).toHaveLength(1);
    });

    it('should filter out past schedules', async () => {
      const pastDate = new Date('2020-01-01');
      mockPrisma.penugasanPenguji.findMany.mockResolvedValue([
        { id: 'a1', kegiatan: { id: 'k1', nama: 'Old', tipe: 'pendadaran', tanggalMulai: pastDate, tanggalSelesai: pastDate, lokasi: 'Aula' } },
      ]);
      const result = await service.getSchedules('u1');
      expect(result.data).toHaveLength(0);
    });
  });
});

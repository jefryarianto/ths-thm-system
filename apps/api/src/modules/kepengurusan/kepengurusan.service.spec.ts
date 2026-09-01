import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException } from '@nestjs/common';
import { KepengurusanService } from './kepengurusan.service';
import { PrismaService } from '../../prisma/prisma.service';

describe('KepengurusanService', () => {
  let service: KepengurusanService;

  const mockPrisma = {
    anggota: {
      findUnique: jest.fn(),
      findFirst: jest.fn(),
    },
    user: {
      findUnique: jest.fn(),
      findFirst: jest.fn(),
      create: jest.fn(),
    },
    jabatan: {
      findUnique: jest.fn(),
    },
    periode: {
      findUnique: jest.fn(),
    },
    kepengurusan: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      findFirst: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
    wilayah: {
      findUnique: jest.fn(),
    },
    ranting: {
      findUnique: jest.fn(),
    },
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        KepengurusanService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    service = module.get<KepengurusanService>(KepengurusanService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create with anggotaId', () => {
    it('should resolve existing user matching member email', async () => {
      mockPrisma.anggota.findUnique.mockResolvedValue({
        id: 'member-1',
        namaLengkap: 'Test Member',
        email: 'member@test.com',
        rantingId: 'r1',
      });
      mockPrisma.user.findUnique
        .mockResolvedValueOnce({ id: 'user-1', email: 'member@test.com' }) // user lookup by email
        .mockResolvedValueOnce({ id: 'user-1', namaLengkap: 'Test Member' }); // user validation
      mockPrisma.jabatan.findUnique.mockResolvedValue({ id: 'jab-1', nama: 'Ketua' });
      mockPrisma.periode.findUnique.mockResolvedValue({ id: 'per-1', nama: '2025-2027' });
      mockPrisma.kepengurusan.findFirst.mockResolvedValue(null);
      mockPrisma.kepengurusan.create.mockResolvedValue({
        id: 'kep-1',
        userId: 'user-1',
        jabatanId: 'jab-1',
        periodeId: 'per-1',
        user: { namaLengkap: 'Test Member' },
        jabatan: { nama: 'Ketua' },
        periode: { nama: '2025-2027' },
      });

      const result = await service.create({
        anggotaId: 'member-1',
        jabatanId: 'jab-1',
        periodeId: 'per-1',
        rantingId: 'r1',
      });

      expect(result.id).toBe('kep-1');
      expect(mockPrisma.kepengurusan.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            userId: 'user-1',
            jabatanId: 'jab-1',
            periodeId: 'per-1',
          }),
        }),
      );
    });

    it('should auto-create user when no user account exists for the member', async () => {
      mockPrisma.anggota.findUnique.mockResolvedValue({
        id: 'member-2',
        namaLengkap: 'New Member',
        email: null,
        noHp: '081234567890',
        rantingId: 'r1',
      });
      mockPrisma.user.findFirst.mockResolvedValue(null);
      mockPrisma.user.findUnique
        .mockResolvedValueOnce(null) // lookup synthetic email
        .mockResolvedValueOnce({ id: 'user-new', namaLengkap: 'New Member' }); // validation lookup
      mockPrisma.user.create.mockResolvedValue({
        id: 'user-new',
        email: '081234567890@noemail.ths-thm.org',
        namaLengkap: 'New Member',
      });
      mockPrisma.jabatan.findUnique.mockResolvedValue({ id: 'jab-1', nama: 'Ketua' });
      mockPrisma.periode.findUnique.mockResolvedValue({ id: 'per-1', nama: '2025-2027' });
      mockPrisma.kepengurusan.findFirst.mockResolvedValue(null);
      mockPrisma.kepengurusan.create.mockResolvedValue({
        id: 'kep-2',
        userId: 'user-new',
        jabatanId: 'jab-1',
        periodeId: 'per-1',
      });

      const result = await service.create({
        anggotaId: 'member-2',
        jabatanId: 'jab-1',
        periodeId: 'per-1',
      });

      expect(mockPrisma.user.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            namaLengkap: 'New Member',
            phone: '081234567890',
          }),
        }),
      );
      expect(result.id).toBe('kep-2');
    });

    it('should throw BadRequestException if member does not exist', async () => {
      mockPrisma.anggota.findUnique.mockResolvedValue(null);

      await expect(
        service.create({
          anggotaId: 'invalid-id',
          jabatanId: 'j1',
          periodeId: 'p1',
        }),
      ).rejects.toThrow(BadRequestException);
    });
  });
});

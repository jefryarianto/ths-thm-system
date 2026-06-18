import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException, ForbiddenException } from '@nestjs/common';
import { PaymentsService } from './payments.service';
import { PrismaService } from '../../prisma/prisma.service';
import { ScopeHelper } from '../../common/utils/scope-helpers';
import { CacheService } from '../../common/services/cache.service';

describe('PaymentsService', () => {
  let service: PaymentsService;

  const mockBankInfo = [
    {
      id: 'b1',
      bankName: 'BCA',
      accountNumber: '123456',
      accountName: 'THS-THM',
      qrisImageUrl: null,
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
  ];

  const mockPrisma = {
    iuran: {
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    bankInfo: {
      findMany: jest.fn().mockResolvedValue(mockBankInfo),
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
  };

  const mockScopeHelper = {
    hasAccessToResourceAsync: jest.fn().mockResolvedValue(true),
  };

  const mockCache = {
    getOrSet: jest.fn(),
    get: jest.fn(),
    set: jest.fn(),
    invalidatePrefix: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PaymentsService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: ScopeHelper, useValue: mockScopeHelper },
        { provide: CacheService, useValue: mockCache },
      ],
    }).compile();

    service = module.get<PaymentsService>(PaymentsService);
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('getBankInfo', () => {
    it('should return active bank info from database', async () => {
      mockCache.get.mockReturnValue(null); // no cache
      mockPrisma.bankInfo.findMany.mockResolvedValue(mockBankInfo);

      const result = await service.getBankInfo();
      expect(Array.isArray(result)).toBe(true);
      expect(result[0].bankName).toBe('BCA');
      expect(result[0].accountNumber).toBe('123456');
      expect(result[0].accountName).toBe('THS-THM');
      expect(mockPrisma.bankInfo.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: { isActive: true } }),
      );
    });

    it('should return cached bank info if available', async () => {
      const cachedData = [
        { bankName: 'BNI', accountNumber: '789', accountName: 'THS', qrisImageUrl: null },
      ];
      mockCache.get.mockReturnValue(cachedData);

      const result = await service.getBankInfo();
      expect(result).toEqual(cachedData);
      expect(mockPrisma.bankInfo.findMany).not.toHaveBeenCalled();
    });
  });

  describe('getAllBankInfo', () => {
    it('should return all bank info from database', async () => {
      mockPrisma.bankInfo.findMany.mockResolvedValue(mockBankInfo);

      const result = await service.getAllBankInfo();
      expect(Array.isArray(result)).toBe(true);
      expect(result[0].bankName).toBe('BCA');
      expect(mockPrisma.bankInfo.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ orderBy: { createdAt: 'asc' } }),
      );
    });
  });

  describe('createBankInfo', () => {
    it('should create new bank info', async () => {
      const dto = { bankName: 'Mandiri', accountNumber: '111', accountName: 'THS' };
      const created = {
        id: 'b2',
        ...dto,
        qrisImageUrl: null,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      mockPrisma.bankInfo.create.mockResolvedValue(created);

      const result = await service.createBankInfo(dto);
      expect(result.bankName).toBe('Mandiri');
      expect(mockPrisma.bankInfo.create).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining(dto) }),
      );
    });
  });

  describe('updateBankInfo', () => {
    it('should update existing bank info', async () => {
      const existing = mockBankInfo[0];
      mockPrisma.bankInfo.findUnique.mockResolvedValue(existing);
      mockPrisma.bankInfo.update.mockResolvedValue({
        ...existing,
        bankName: 'BNI',
      });

      const result = await service.updateBankInfo('b1', { bankName: 'BNI' });
      expect(result.bankName).toBe('BNI');
      expect(mockPrisma.bankInfo.update).toHaveBeenCalled();
    });

    it('should throw NotFoundException for non-existent bank info', async () => {
      mockPrisma.bankInfo.findUnique.mockResolvedValue(null);
      await expect(service.updateBankInfo('x', { bankName: 'BNI' })).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('deleteBankInfo', () => {
    it('should delete existing bank info', async () => {
      mockPrisma.bankInfo.findUnique.mockResolvedValue(mockBankInfo[0]);
      mockPrisma.bankInfo.delete.mockResolvedValue(mockBankInfo[0]);

      await expect(service.deleteBankInfo('b1')).resolves.toBeUndefined();
      expect(mockPrisma.bankInfo.delete).toHaveBeenCalledWith(
        expect.objectContaining({ where: { id: 'b1' } }),
      );
    });

    it('should throw NotFoundException for non-existent bank info', async () => {
      mockPrisma.bankInfo.findUnique.mockResolvedValue(null);
      await expect(service.deleteBankInfo('x')).rejects.toThrow(NotFoundException);
    });
  });

  describe('uploadProof', () => {
    it('should upload proof and update iuran status', async () => {
      const mockIuran = { id: '1', status: 'belum_dibayar', anggota: { rantingId: 'r1' } };
      mockPrisma.iuran.findUnique.mockResolvedValue(mockIuran);
      mockPrisma.iuran.update.mockResolvedValue({ ...mockIuran, status: 'menunggu_verifikasi' });

      const result = await service.uploadProof('1', { catatan: 'Transfer BCA' });
      expect(result.success).toBe(true);
      expect(mockPrisma.iuran.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ status: 'menunggu_verifikasi' }),
        }),
      );
    });

    it('should throw NotFoundException for non-existent iuran', async () => {
      mockPrisma.iuran.findUnique.mockResolvedValue(null);
      await expect(service.uploadProof('1', { catatan: 'test' })).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw ForbiddenException for already paid iuran', async () => {
      mockPrisma.iuran.findUnique.mockResolvedValue({
        id: '1',
        status: 'lunas',
        anggota: { rantingId: 'r1' },
      });
      await expect(service.uploadProof('1', { catatan: 'test' })).rejects.toThrow(
        ForbiddenException,
      );
    });
  });

  describe('verifyPayment', () => {
    it('should verify payment and set status to lunas', async () => {
      const mockIuran = {
        id: '1',
        status: 'menunggu_verifikasi',
        anggota: { id: 'm1', rantingId: 'r1' },
      };
      mockPrisma.iuran.findUnique.mockResolvedValue(mockIuran);
      mockPrisma.iuran.update.mockResolvedValue({ ...mockIuran, status: 'lunas' });

      const result = await service.verifyPayment('1', 'u1');
      expect(result.success).toBe(true);
      expect(mockPrisma.iuran.update).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ status: 'lunas' }) }),
      );
    });

    it('should throw NotFoundException for non-existent iuran', async () => {
      mockPrisma.iuran.findUnique.mockResolvedValue(null);
      await expect(service.verifyPayment('1', 'u1')).rejects.toThrow(NotFoundException);
    });
  });

  describe('rejectPayment', () => {
    it('should reject payment and reset status', async () => {
      const mockIuran = { id: '1', status: 'menunggu_verifikasi', anggota: { rantingId: 'r1' } };
      mockPrisma.iuran.findUnique.mockResolvedValue(mockIuran);
      mockPrisma.iuran.update.mockResolvedValue({ ...mockIuran, status: 'belum_dibayar' });

      const result = await service.rejectPayment('1');
      expect(result.success).toBe(true);
      expect(mockPrisma.iuran.update).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ status: 'belum_dibayar' }) }),
      );
    });
  });
});
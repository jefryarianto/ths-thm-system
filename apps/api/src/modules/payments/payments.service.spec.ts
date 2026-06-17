import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException, ForbiddenException } from '@nestjs/common';
import { PaymentsService } from './payments.service';
import { PrismaService } from '../../prisma/prisma.service';
import { ScopeHelper } from '../../common/utils/scope-helpers';
import { CacheService } from '../../common/services/cache.service';

describe('PaymentsService', () => {
  let service: PaymentsService;

  const mockPrisma = {
    iuran: {
      findUnique: jest.fn(),
      update: jest.fn(),
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
    it('should return bank info from env', () => {
      process.env.BANK_NAME = 'BCA';
      process.env.BANK_ACCOUNT_NUMBER = '123456';
      process.env.BANK_ACCOUNT_NAME = 'THS-THM';

      const result = service.getBankInfo();
      expect(result.bankName).toBe('BCA');
      expect(result.accountNumber).toBe('123456');
      expect(result.accountName).toBe('THS-THM');
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

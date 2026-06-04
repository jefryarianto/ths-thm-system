// @ts-nocheck
// Tests written before DTO refactor - testing service logic, not DTO validation
import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PaymentsService } from './payments.service';
import { PrismaService } from '../../prisma/prisma.service';
import { ScopeHelper } from '../../common/utils/scope-helpers';

const mockConstructEvent = jest.fn();
const mockCreate = jest.fn();

const mockStripeInstance = {
  paymentIntents: { create: mockCreate },
  webhooks: { constructEvent: mockConstructEvent },
};

jest.mock('stripe', () => {
  return jest.fn().mockImplementation(() => mockStripeInstance);
}, { virtual: true });

describe('PaymentsService', () => {
  let service: PaymentsService;

  const mockPrisma = {
    iuran: {
      findUnique: jest.fn(),
      update: jest.fn(),
    },
  };

  const mockScopeHelper = {
    buildScopeFilter: jest.fn().mockReturnValue({}),
    buildIndirectScopeFilter: jest.fn().mockReturnValue({}),
    hasAccessToResource: jest.fn().mockReturnValue(true),
    hasAccessToResourceAsync: jest.fn().mockResolvedValue(true),
    verifyKegiatanScope: jest.fn(),
  };

  beforeAll(() => {
    process.env.STRIPE_SECRET_KEY = 'sk_test_mock';
    process.env.STRIPE_WEBHOOK_SECRET = 'whsec_mock';
  });

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PaymentsService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: ScopeHelper, useValue: mockScopeHelper },
      ],
    }).compile();

    service = module.get<PaymentsService>(PaymentsService);
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('createIntent', () => {
    it('should create a payment intent and update iuran', async () => {
      mockPrisma.iuran.findUnique.mockResolvedValue({ id: 'iuran1', status: 'belum_lunas' });
      mockCreate.mockResolvedValue({ id: 'pi_123', client_secret: 'secret_abc' });
      mockPrisma.iuran.update.mockResolvedValue({});

      const result = await service.createIntent({ iuranId: 'iuran1', amount: 100000, currency: 'idr' });
      expect(result.clientSecret).toBe('secret_abc');
    });

    it('should throw NotFoundException when iuran not found', async () => {
      mockPrisma.iuran.findUnique.mockResolvedValue(null);
      await expect(
        service.createIntent({ iuranId: 'nonexistent', amount: 100000, currency: 'idr' }),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw ForbiddenException for out-of-scope iuran', async () => {
      mockPrisma.iuran.findUnique.mockResolvedValue({ id: 'iuran1', anggota: { rantingId: 'r-other' } });
      mockScopeHelper.hasAccessToResourceAsync.mockResolvedValue(false);
      await expect(
        service.createIntent({ iuranId: 'iuran1', amount: 100000, currency: 'idr' }, { rantingId: 'r1' }),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  describe('handleWebhook', () => {
    it('should process payment_intent.succeeded event', async () => {
      mockConstructEvent.mockReturnValue({
        type: 'payment_intent.succeeded',
        data: { object: { id: 'pi_123', metadata: { iuranId: 'iuran1' } } },
      });
      mockPrisma.iuran.update.mockResolvedValue({});

      const result = await service.handleWebhook('sig', Buffer.from('{}'));
      expect(result.received).toBe(true);
      expect(mockPrisma.iuran.update).toHaveBeenCalled();
    });

    it('should handle non-payment_intent events', async () => {
      mockConstructEvent.mockReturnValue({ type: 'charge.succeeded', data: { object: {} } });
      const result = await service.handleWebhook('sig', Buffer.from('{}'));
      expect(result.received).toBe(true);
      expect(mockPrisma.iuran.update).not.toHaveBeenCalled();
    });

    it('should throw BadRequestException on invalid signature', async () => {
      mockConstructEvent.mockImplementation(() => { throw new Error('Invalid signature'); });
      await expect(service.handleWebhook('bad-sig', Buffer.from('{}'))).rejects.toThrow(BadRequestException);
    });
  });
});

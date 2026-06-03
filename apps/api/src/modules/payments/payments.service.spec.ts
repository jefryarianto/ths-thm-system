import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { PaymentsService } from './payments.service';
import { PrismaService } from '../../prisma/prisma.service';

const mockConstructEvent = jest.fn();
const mockCreate = jest.fn();

const mockStripeInstance = {
  paymentIntents: { create: mockCreate },
  webhooks: { constructEvent: mockConstructEvent },
};

jest.mock('stripe', () => {
  return {
    __esModule: true,
    default: jest.fn().mockImplementation(() => mockStripeInstance),
  };
}, { virtual: true });

describe('PaymentsService', () => {
  let service: PaymentsService;

  const mockPrisma = {
    iuran: {
      findUnique: jest.fn(),
      update: jest.fn(),
    },
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
      mockCreate.mockResolvedValue({
        id: 'pi_123',
        client_secret: 'secret_abc',
      });
      mockPrisma.iuran.update.mockResolvedValue({});

      const result = await service.createIntent({
        iuranId: 'iuran1',
        amount: 100000,
        currency: 'idr',
      });

      expect(result.clientSecret).toBe('secret_abc');
      expect(mockPrisma.iuran.update).toHaveBeenCalledWith({
        where: { id: 'iuran1' },
        data: { pembayaranIntentId: 'pi_123' },
      });
    });

    it('should throw NotFoundException when iuran not found', async () => {
      mockPrisma.iuran.findUnique.mockResolvedValue(null);

      await expect(
        service.createIntent({ iuranId: 'nonexistent', amount: 100000, currency: 'idr' }),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('handleWebhook', () => {
    it('should process payment_intent.succeeded event', async () => {
      const mockEvent = {
        type: 'payment_intent.succeeded',
        data: {
          object: {
            id: 'pi_123',
            metadata: { iuranId: 'iuran1' },
          },
        },
      };
      mockConstructEvent.mockReturnValue(mockEvent);
      mockPrisma.iuran.update.mockResolvedValue({});

      const result = await service.handleWebhook('sig', Buffer.from('{}'));
      expect(result.received).toBe(true);
      expect(mockPrisma.iuran.update).toHaveBeenCalledWith({
        where: { id: 'iuran1' },
        data: { status: 'lunas', tanggalBayar: expect.any(Date) },
      });
    });

    it('should handle payment_intent.succeeded with no iuranId', async () => {
      const mockEvent = {
        type: 'payment_intent.succeeded',
        data: {
          object: {
            id: 'pi_456',
            metadata: {},
          },
        },
      };
      mockConstructEvent.mockReturnValue(mockEvent);

      const result = await service.handleWebhook('sig', Buffer.from('{}'));
      expect(result.received).toBe(true);
      expect(mockPrisma.iuran.update).not.toHaveBeenCalled();
    });

    it('should handle non-payment_intent events', async () => {
      const mockEvent = {
        type: 'charge.succeeded',
        data: { object: {} },
      };
      mockConstructEvent.mockReturnValue(mockEvent);

      const result = await service.handleWebhook('sig', Buffer.from('{}'));
      expect(result.received).toBe(true);
      expect(mockPrisma.iuran.update).not.toHaveBeenCalled();
    });

    it('should throw BadRequestException on invalid signature', async () => {
      mockConstructEvent.mockImplementation(() => {
        throw new Error('Invalid signature');
      });

      await expect(
        service.handleWebhook('bad-sig', Buffer.from('{}')),
      ).rejects.toThrow(BadRequestException);
    });
  });
});
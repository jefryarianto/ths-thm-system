import { Test, TestingModule } from '@nestjs/testing';
import { Reflector } from '@nestjs/core';
import { DuesController } from './dues.controller';
import { DuesService } from './dues.service';
import { CacheService } from '../../common/services/cache.service';
import { IDEMPOTENT_METADATA_KEY } from '../../common/decorators/idempotent.decorator';

describe('DuesController', () => {
  let controller: DuesController;
  let service: jest.Mocked<DuesService>;
  let reflector: Reflector;

  const mockDuesService = {
    findAll: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    remove: jest.fn(),
    getMyDues: jest.fn(),
    getMemberDues: jest.fn(),
    getArrears: jest.fn(),
    getReport: jest.fn(),
    exportReport: jest.fn(),
    importDues: jest.fn(),
    batchPayment: jest.fn(),
    getDashboardStats: jest.fn(),
    findOne: jest.fn(),
    submitPaymentConfirmation: jest.fn(),
  };

  const mockCacheService = {
    get: jest.fn(),
    set: jest.fn(),
    del: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [DuesController],
      providers: [
        { provide: DuesService, useValue: mockDuesService },
        { provide: CacheService, useValue: mockCacheService },
        Reflector,
      ],
    }).compile();

    controller = module.get<DuesController>(DuesController);
    service = module.get(DuesService) as jest.Mocked<DuesService>;
    reflector = module.get<Reflector>(Reflector);
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('Idempotency decorator metadata', () => {
    it('should have @Idempotent metadata configured on create', () => {
      const metadata = reflector.get(IDEMPOTENT_METADATA_KEY, controller.create);
      expect(metadata).toBeDefined();
      expect(metadata.ttl).toBe(300000);
    });

    it('should have @Idempotent metadata configured on batchPayment', () => {
      const metadata = reflector.get(IDEMPOTENT_METADATA_KEY, controller.batchPayment);
      expect(metadata).toBeDefined();
      expect(metadata.ttl).toBe(300000);
    });

    it('should have @Idempotent metadata configured on submitPaymentConfirmation', () => {
      const metadata = reflector.get(IDEMPOTENT_METADATA_KEY, controller.submitPaymentConfirmation);
      expect(metadata).toBeDefined();
      expect(metadata.ttl).toBe(300000);
    });
  });

  describe('CRUD delegation', () => {
    it('should delegate create to service', async () => {
      const dto = { anggotaId: 'a1', jumlah: 50000, periode: '2026-01' };
      const req = { scope: { rantingId: 'r1' } } as never;
      mockDuesService.create.mockResolvedValue({ id: 'due-1', ...dto });

      const result = await controller.create(dto as never, req);
      expect(service.create).toHaveBeenCalledWith(dto, { rantingId: 'r1' });
      expect(result).toEqual({ id: 'due-1', ...dto });
    });

    it('should delegate batchPayment to service', async () => {
      const dto = { memberIds: ['a1', 'a2'], periode: '2026-01', jumlah: 50000 };
      const req = { scope: {} } as never;
      mockDuesService.batchPayment.mockResolvedValue({ created: 2, skipped: 0, total: 2 });

      const result = await controller.batchPayment(dto, req);
      expect(service.batchPayment).toHaveBeenCalledWith(dto, {});
      expect(result).toEqual({ created: 2, skipped: 0, total: 2 });
    });

    it('should delegate submitPaymentConfirmation to service', async () => {
      const dto = { catatan: 'Bukti transfer via BCA' };
      mockDuesService.submitPaymentConfirmation.mockResolvedValue({ id: 'due-1', status: 'menunggu_verifikasi' });

      const result = await controller.submitPaymentConfirmation('due-1', dto);
      expect(service.submitPaymentConfirmation).toHaveBeenCalledWith('due-1', dto);
      expect(result).toEqual({ id: 'due-1', status: 'menunggu_verifikasi' });
    });
  });
});

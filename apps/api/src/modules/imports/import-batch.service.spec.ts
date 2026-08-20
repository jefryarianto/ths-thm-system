import { BadRequestException, NotFoundException } from '@nestjs/common';
import { ImportBatchService } from './import-batch.service';

describe('ImportBatchService', () => {
  let service: ImportBatchService;
  let prisma: any;
  let fakeQueue: any;

  beforeEach(() => {
    prisma = {
      importBatch: {
        create: jest.fn(),
        findUnique: jest.fn(),
        findMany: jest.fn(),
        count: jest.fn(),
        update: jest.fn(),
        updateMany: jest.fn(),
      },
      importBatchItem: {
        createManyAndReturn: jest.fn(),
        findUnique: jest.fn(),
        findMany: jest.fn(),
        count: jest.fn(),
        update: jest.fn(),
        updateMany: jest.fn(),
      },
      notifikasi: {
        create: jest.fn(),
        count: jest.fn(),
      },
      $transaction: jest.fn((arg: any) => {
        if (typeof arg === 'function') return arg(prisma);
        return Promise.all(arg);
      }),
    };

    fakeQueue = {
      addBulk: jest.fn().mockResolvedValue(undefined),
      add: jest.fn().mockResolvedValue(undefined),
      getPendingCount: jest.fn().mockResolvedValue(0),
      pause: jest.fn().mockResolvedValue(undefined),
      resume: jest.fn().mockResolvedValue(undefined),
      shutdown: jest.fn().mockResolvedValue(undefined),
    };

    service = new ImportBatchService(prisma);
    (service as any).queue = fakeQueue;
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('registerProcessor', () => {
    it('should register a processor and report hasProcessor', () => {
      const processor = jest.fn();
      service.registerProcessor('members', processor);
      expect(service.hasProcessor('members')).toBe(true);
      expect(service.hasProcessor('ghost')).toBe(false);
    });
  });

  describe('createBatch', () => {
    it('should reject unknown module', async () => {
      await expect(
        service.createBatch('ghost', [{ nama: 'A' }]),
      ).rejects.toThrow(BadRequestException);
    });

    it('should reject empty rows', async () => {
      service.registerProcessor('members', jest.fn());
      await expect(service.createBatch('members', [])).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should create batch + items and enqueue jobs', async () => {
      service.registerProcessor('members', jest.fn());
      prisma.importBatch.create.mockResolvedValue({ id: 'b1' });
      prisma.importBatchItem.createManyAndReturn.mockResolvedValue([
        { id: 'i1' },
        { id: 'i2' },
      ]);

      const result = await service.createBatch(
        'members',
        [{ nama: 'A' }, { nama: 'B' }],
        { rantingId: 'r1' },
        'u1',
        'file.xlsx',
      );

      expect(result).toEqual({ batchId: 'b1', totalRows: 2 });
      expect(prisma.importBatch.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          module: 'members',
          totalRows: 2,
          status: 'processing',
          scope: { rantingId: 'r1' },
          importedById: 'u1',
          fileName: 'file.xlsx',
        }),
      });
      expect(fakeQueue.addBulk).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({ jobId: 'i1', type: 'members' }),
        ]),
      );
    });
  });

  describe('getBatchProgress', () => {
    it('should return null for missing batch', async () => {
      prisma.importBatch.findUnique.mockResolvedValue(null);
      expect(await service.getBatchProgress('b1')).toBeNull();
    });

    it('should compute progress and include items', async () => {
      prisma.importBatch.findUnique.mockResolvedValue({
        id: 'b1',
        module: 'members',
        totalRows: 4,
        processed: 2,
        errors: 1,
        status: 'processing',
        fileName: null,
      });
      prisma.importBatchItem.findMany.mockResolvedValue([{ id: 'i1', rowIndex: 0, status: 'success' }]);
      prisma.importBatchItem.count.mockResolvedValue(4);

      const result = await service.getBatchProgress('b1');
      expect(result?.progress).toBe(75); // (2+1)/4
      expect(result?.items).toHaveLength(1);
    });
  });

  describe('getBatchList', () => {
    it('should return batches with meta', async () => {
      prisma.importBatch.findMany.mockResolvedValue([
        { id: 'b1', totalRows: 10, processed: 10, errors: 0 },
      ]);
      prisma.importBatch.count.mockResolvedValue(1);

      const result = await service.getBatchList();
      expect(result.data).toHaveLength(1);
      expect(result.data[0].progress).toBe(100);
    });
  });

  describe('retryFailed', () => {
    it('should throw NotFound for missing batch', async () => {
      prisma.importBatch.findUnique.mockResolvedValue(null);
      await expect(service.retryFailed('b1')).rejects.toThrow(NotFoundException);
    });

    it('should reset failed items and re-enqueue', async () => {
      prisma.importBatch.findUnique.mockResolvedValue({ id: 'b1', module: 'members' });
      prisma.importBatchItem.findMany.mockResolvedValue([{ id: 'i1' }, { id: 'i2' }]);
      prisma.importBatchItem.updateMany.mockResolvedValue({ count: 2 });
      prisma.importBatch.update.mockResolvedValue({});

      const result = await service.retryFailed('b1');
      expect(result).toEqual({ retried: 2 });
      expect(fakeQueue.addBulk).toHaveBeenCalledWith(expect.arrayContaining([
        expect.objectContaining({ jobId: 'i1' }),
      ]));
    });
  });

  describe('cancelBatch', () => {
    it('should return false when batch not processing', async () => {
      prisma.importBatch.findUnique.mockResolvedValue({ id: 'b1', status: 'completed' });
      expect(await service.cancelBatch('b1')).toBe(false);
    });

    it('should cancel a processing batch', async () => {
      prisma.importBatch.findUnique.mockResolvedValue({ id: 'b1', status: 'processing' });
      prisma.importBatch.update.mockResolvedValue({});
      prisma.importBatchItem.updateMany.mockResolvedValue({ count: 1 });

      expect(await service.cancelBatch('b1')).toBe(true);
      expect(prisma.importBatch.update).toHaveBeenCalledWith({
        where: { id: 'b1' },
        data: { status: 'cancelled' },
      });
    });
  });
});
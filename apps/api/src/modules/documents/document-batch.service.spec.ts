// @ts-nocheck
import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { DocumentBatchService } from './document-batch.service';
import { PrismaService } from '../../prisma/prisma.service';
import { EventsGateway } from '../notifications/events.gateway';
import { MailService } from '../../mail/mail.service';

// ── Mock queue adapter ──────────────────────────────────
// We replace the constructor so it captures the lifecycle callbacks
// for test invocation, and returns a mock queue instance.
const mockQueue = {
  addBulk: jest.fn().mockResolvedValue(undefined),
  pause: jest.fn().mockResolvedValue(undefined),
  onIdle: jest.fn().mockResolvedValue(undefined),
  shutdown: jest.fn().mockResolvedValue(undefined),
};
let capturedCallbacks: any = null;

jest.mock('../../common/queue/in-process-queue.adapter', () => ({
  InProcessQueueAdapter: jest.fn().mockImplementation((callbacks, _opts) => {
    capturedCallbacks = callbacks;
    return mockQueue;
  }),
}));

jest.mock('../../common/queue/bullmq-queue.adapter', () => ({
  BullMQQueueAdapter: jest.fn().mockImplementation((callbacks, _opts) => {
    capturedCallbacks = callbacks;
    return mockQueue;
  }),
}));

// ── Mock Prisma ─────────────────────────────────────────
const mockPrisma = {
  documentBatchJob: {
    create: jest.fn(),
    findUnique: jest.fn(),
    findMany: jest.fn(),
    update: jest.fn(),
    updateMany: jest.fn(),
    count: jest.fn(),
  },
  documentJob: {
    createManyAndReturn: jest.fn(),
    findMany: jest.fn(),
    update: jest.fn(),
    updateMany: jest.fn(),
  },
  anggota: {
    count: jest.fn(),
    findMany: jest.fn(),
  },
  nilaiPendadaran: {
    findMany: jest.fn(),
  },
  notifikasi: {
    create: jest.fn(),
    count: jest.fn(),
  },
  user: {
    findUnique: jest.fn(),
  },
};

const mockEventsGateway: any = {
  broadcast: jest.fn(),
  sendToUser: jest.fn(),
  sendUnreadCount: jest.fn(),
};

const mockMailService: any = {
  sendMail: jest.fn().mockResolvedValue(undefined),
};

// ── Helpers ──────────────────────────────────────────────
const processCallback = jest.fn();

describe('DocumentBatchService', () => {
  let service: DocumentBatchService;

  beforeEach(async () => {
    jest.clearAllMocks();
    capturedCallbacks = null;

    // Restore the env before each test
    delete process.env.USE_BULLMQ;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DocumentBatchService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: EventsGateway, useValue: mockEventsGateway },
        { provide: MailService, useValue: mockMailService },
      ],
    }).compile();

    service = module.get<DocumentBatchService>(DocumentBatchService);
  });

  // ── initQueue ──────────────────────────────────────────

  describe('initQueue', () => {
    it('should initialize the in-process adapter by default', () => {
      service.initQueue(processCallback);

      const { InProcessQueueAdapter } = require('../../common/queue/in-process-queue.adapter');
      expect(InProcessQueueAdapter).toHaveBeenCalledTimes(1);
      expect(InProcessQueueAdapter).toHaveBeenCalledWith(
        expect.objectContaining({ onProcess: processCallback }),
        expect.objectContaining({ concurrency: 3, maxRetries: 3 }),
      );
    });

    it('should initialize BullMQ adapter when USE_BULLMQ=true', () => {
      process.env.USE_BULLMQ = 'true';
      service.initQueue(processCallback);

      const { BullMQQueueAdapter } = require('../../common/queue/bullmq-queue.adapter');
      expect(BullMQQueueAdapter).toHaveBeenCalledTimes(1);
      expect(BullMQQueueAdapter).toHaveBeenCalledWith(
        expect.objectContaining({ onProcess: processCallback }),
        expect.objectContaining({
          concurrency: 3,
          maxRetries: 3,
          connection: { host: 'localhost', port: 6379 },
          queueName: 'document-generation',
        }),
      );
    });

    it('should throw an error when processCallback is not provided', () => {
      expect(() => service.initQueue(null)).toThrow(
        'processCallback is required to initialize the queue',
      );
    });

    it('should skip initialization if queue is already initialized', () => {
      service.initQueue(processCallback);
      const onProcessSpy = capturedCallbacks?.onProcess;

      service.initQueue(processCallback);
      // The queue adapter constructor should still have been called only once
      // because the second call skips
      expect(onProcessSpy).toBe(capturedCallbacks?.onProcess);
    });
  });

  // ── createBatch ─────────────────────────────────────────

  describe('createBatch', () => {
    const memberIds = ['m1', 'm2', 'm3'];
    const batchRecord = { id: 'batch-123', type: 'kta', totalJobs: 3, status: 'pending' };
    const jobRecords = memberIds.map((mid, i) => ({
      id: `job-${i + 1}`,
      batchId: 'batch-123',
      memberId: mid,
      status: 'pending' as const,
    }));

    beforeEach(() => {
      service.initQueue(processCallback);
      mockPrisma.documentBatchJob.create.mockResolvedValue(batchRecord);
      mockPrisma.documentJob.createManyAndReturn.mockResolvedValue(jobRecords);
      mockPrisma.documentBatchJob.update.mockResolvedValue({ ...batchRecord, status: 'processing' });
    });

    it('should create batch and job records, update status, and enqueue jobs', async () => {
      const result = await service.createBatch('kta', memberIds, 'user-1');

      expect(result).toEqual({ batchId: 'batch-123', totalJobs: 3 });

      expect(mockPrisma.documentBatchJob.create).toHaveBeenCalledWith({
        data: { type: 'kta', totalJobs: 3, status: 'pending', createdBy: 'user-1' },
      });

      expect(mockPrisma.documentJob.createManyAndReturn).toHaveBeenCalledWith({
        data: [
          { batchId: 'batch-123', memberId: 'm1', status: 'pending' },
          { batchId: 'batch-123', memberId: 'm2', status: 'pending' },
          { batchId: 'batch-123', memberId: 'm3', status: 'pending' },
        ],
      });

      expect(mockPrisma.documentBatchJob.update).toHaveBeenCalledWith({
        where: { id: 'batch-123' },
        data: { status: 'processing' },
      });

      expect(mockQueue.addBulk).toHaveBeenCalledTimes(1);
      const payloads = mockQueue.addBulk.mock.calls[0][0];
      expect(payloads).toHaveLength(3);
      expect(payloads[0]).toMatchObject({
        jobId: 'job-1',
        type: 'kta',
        data: { batchId: 'batch-123', memberId: 'm1', type: 'kta' },
      });
    });

    it('should throw when queue is not initialized', async () => {
      // Create a fresh service without initQueue
      const module: TestingModule = await Test.createTestingModule({
        providers: [
          DocumentBatchService,
          { provide: PrismaService, useValue: mockPrisma },
          { provide: EventsGateway, useValue: mockEventsGateway },
          { provide: MailService, useValue: mockMailService },
        ],
      }).compile();

      const uninitService = module.get<DocumentBatchService>(DocumentBatchService);

      await expect(
        uninitService.createBatch('kta', ['m1'], 'user-1'),
      ).rejects.toThrow('Queue not initialized');
    });

    it('should still create the batch record even when no creator is given', async () => {
      mockPrisma.documentBatchJob.create.mockResolvedValue({
        ...batchRecord,
        createdBy: null,
      });

      const result = await service.createBatch('kta', memberIds);

      expect(result.batchId).toBe('batch-123');
      expect(mockPrisma.documentBatchJob.create).toHaveBeenCalledWith({
        data: { type: 'kta', totalJobs: 3, status: 'pending', createdBy: undefined },
      });
    });
  });

  // ── getBatchProgress ───────────────────────────────────

  describe('getBatchProgress', () => {
    it('should return formatted batch progress with job details', async () => {
      mockPrisma.documentBatchJob.findUnique.mockResolvedValue({
        id: 'b1', type: 'kta', totalJobs: 10, completed: 4, failed: 1, status: 'processing',
        jobs: [
          { id: 'j1', memberId: 'm1', status: 'completed', error: null, nomorDokumen: 'DOC-001', startedAt: new Date(), completedAt: new Date() },
          { id: 'j2', memberId: 'm2', status: 'failed', error: 'Render error', nomorDokumen: null, startedAt: new Date(), completedAt: new Date() },
        ],
      });

      const progress = await service.getBatchProgress('b1');

      expect(progress).not.toBeNull();
      expect(progress.progress).toBe(50); // (4+1)/10 = 50%
      expect(progress.jobs).toHaveLength(2);
      expect(progress.jobs[0].status).toBe('completed');
      expect(progress.jobs[1].error).toBe('Render error');
    });

    it('should return null for non-existent batch', async () => {
      mockPrisma.documentBatchJob.findUnique.mockResolvedValue(null);
      const progress = await service.getBatchProgress('nonexistent');
      expect(progress).toBeNull();
    });

    it('should return progress 0 for batch with 0 total jobs', async () => {
      mockPrisma.documentBatchJob.findUnique.mockResolvedValue({
        id: 'b1', type: 'kta', totalJobs: 0, completed: 0, failed: 0, status: 'completed', jobs: [],
      });

      const progress = await service.getBatchProgress('b1');
      expect(progress.progress).toBe(0);
    });
  });

  // ── getBatchList ──────────────────────────────────────

  describe('getBatchList', () => {
    it('should return paginated batch list with progress', async () => {
      mockPrisma.documentBatchJob.findMany.mockResolvedValue([
        { id: 'b1', type: 'kta', totalJobs: 10, completed: 8, failed: 1, status: 'completed_with_errors', createdBy: 'u1', createdAt: new Date() },
        { id: 'b2', type: 'sertifikat_pendadaran', totalJobs: 5, completed: 5, failed: 0, status: 'completed', createdBy: 'u1', createdAt: new Date() },
      ]);
      mockPrisma.documentBatchJob.count.mockResolvedValue(2);

      const result = await service.getBatchList(10, 0);

      expect(result.data).toHaveLength(2);
      expect(result.data[0].progress).toBe(90); // (8+1)/10
      expect(result.data[1].progress).toBe(100); // (5+0)/5
      expect(result.meta).toEqual({ total: 2, limit: 10, offset: 0 });
    });

    it('should return empty list when no batches exist', async () => {
      mockPrisma.documentBatchJob.findMany.mockResolvedValue([]);
      mockPrisma.documentBatchJob.count.mockResolvedValue(0);

      const result = await service.getBatchList();
      expect(result.data).toHaveLength(0);
      expect(result.meta.total).toBe(0);
    });
  });

  // ── cancelBatch ────────────────────────────────────────

  describe('cancelBatch', () => {
    it('should cancel a processing batch and mark pending jobs as failed', async () => {
      mockPrisma.documentBatchJob.findUnique.mockResolvedValue({
        id: 'b1', status: 'processing',
      });
      mockPrisma.documentBatchJob.update.mockResolvedValue({});
      mockPrisma.documentJob.updateMany.mockResolvedValue({ count: 3 });

      const result = await service.cancelBatch('b1');

      expect(result).toBe(true);
      expect(mockPrisma.documentBatchJob.update).toHaveBeenCalledWith({
        where: { id: 'b1' },
        data: { status: 'cancelled' },
      });
      expect(mockPrisma.documentJob.updateMany).toHaveBeenCalledWith({
        where: { batchId: 'b1', status: 'pending' },
        data: { status: 'failed', error: 'Batch cancelled' },
      });
    });

    it('should return false for non-existent batch', async () => {
      mockPrisma.documentBatchJob.findUnique.mockResolvedValue(null);
      const result = await service.cancelBatch('nonexistent');
      expect(result).toBe(false);
    });

    it('should return false for batch that is not in processing status', async () => {
      mockPrisma.documentBatchJob.findUnique.mockResolvedValue({
        id: 'b1', status: 'completed',
      });
      const result = await service.cancelBatch('b1');
      expect(result).toBe(false);
      // Should not attempt to cancel or update any jobs
      expect(mockPrisma.documentBatchJob.update).not.toHaveBeenCalled();
    });
  });

  // ── estimateBatch ──────────────────────────────────────

  describe('estimateBatch', () => {
    it('should count all active members for all_active range', async () => {
      mockPrisma.anggota.count.mockResolvedValue(42);
      const count = await service.estimateBatch('all_active');
      expect(count).toBe(42);
      expect(mockPrisma.anggota.count).toHaveBeenCalledWith({
        where: { statusKeanggotaan: 'aktif', deletedAt: null },
      });
    });

    it('should count active members by ranting for by_ranting range', async () => {
      mockPrisma.anggota.count.mockResolvedValue(15);
      const count = await service.estimateBatch('by_ranting', 'ranting-1');
      expect(count).toBe(15);
      expect(mockPrisma.anggota.count).toHaveBeenCalledWith({
        where: { rantingId: 'ranting-1', statusKeanggotaan: 'aktif', deletedAt: null },
      });
    });

    it('should return 0 for by_ranting without a rantingId', async () => {
      const count = await service.estimateBatch('by_ranting');
      expect(count).toBe(0);
      expect(mockPrisma.anggota.count).not.toHaveBeenCalled();
    });

    it('should return 0 for unknown range type', async () => {
      const count = await service.estimateBatch('invalid_range');
      expect(count).toBe(0);
    });
  });

  // ── retryBatch ─────────────────────────────────────────

  describe('retryBatch', () => {
    const batchRecord = { id: 'b1', type: 'kta', totalJobs: 3, completed: 0, failed: 2, status: 'completed_with_errors' };
    const failedJobs = [
      { id: 'j1', memberId: 'm1', status: 'failed', batchId: 'b1' },
      { id: 'j2', memberId: 'm2', status: 'failed', batchId: 'b1' },
    ];

    beforeEach(() => {
      service.initQueue(processCallback);
      mockPrisma.documentBatchJob.findUnique.mockResolvedValue(batchRecord);
      mockPrisma.documentJob.findMany.mockResolvedValue(failedJobs);
    });

    it('should retry all failed jobs', async () => {
      const result = await service.retryBatch('b1');

      expect(result.retried).toBe(2);
      expect(mockPrisma.documentJob.updateMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { batchId: 'b1', status: 'failed' },
          data: { status: 'pending', error: null, retryCount: { increment: 1 } },
        }),
      );
      expect(mockPrisma.documentBatchJob.update).toHaveBeenCalledWith({
        where: { id: 'b1' },
        data: { status: 'processing', failed: 0 },
      });
      expect(mockQueue.addBulk).toHaveBeenCalledTimes(1);
      // Should re-enqueue 2 jobs
      expect(mockQueue.addBulk.mock.calls[0][0]).toHaveLength(2);
    });

    it('should retry only specific jobs when jobIds is provided', async () => {
      mockPrisma.documentJob.findMany.mockResolvedValue([failedJobs[0]]);

      const result = await service.retryBatch('b1', ['j1']);

      expect(result.retried).toBe(1);
      expect(mockPrisma.documentJob.findMany).toHaveBeenCalledWith({
        where: { batchId: 'b1', status: 'failed', id: { in: ['j1'] } },
      });
    });

    it('should throw NotFoundException for missing batch', async () => {
      mockPrisma.documentBatchJob.findUnique.mockResolvedValue(null);
      await expect(service.retryBatch('nonexistent')).rejects.toThrow(NotFoundException);
    });

    it('should return 0 retried when there are no failed jobs', async () => {
      mockPrisma.documentJob.findMany.mockResolvedValue([]);
      const result = await service.retryBatch('b1');
      expect(result.retried).toBe(0);
      expect(mockPrisma.documentJob.updateMany).not.toHaveBeenCalled();
      expect(mockQueue.addBulk).not.toHaveBeenCalled();
    });
  });

  // ── exportCsv ──────────────────────────────────────────

  describe('exportCsv', () => {
    beforeEach(() => {
      mockPrisma.documentBatchJob.findUnique.mockResolvedValue({
        id: 'b1', type: 'kta', totalJobs: 2,
      });
      mockPrisma.documentJob.findMany.mockResolvedValue([
        { id: 'j1', memberId: 'm1', nomorDokumen: 'DOC-001', status: 'completed', error: null, createdAt: new Date('2026-01-01'), completedAt: new Date('2026-01-01T00:01:00Z') },
        { id: 'j2', memberId: 'm2', nomorDokumen: null, status: 'failed', error: 'Render error', createdAt: new Date('2026-01-01'), completedAt: new Date('2026-01-01T00:02:00Z') },
      ]);
      mockPrisma.anggota.findMany.mockResolvedValue([
        { id: 'm1', namaLengkap: 'Budi Santoso' },
        { id: 'm2', namaLengkap: 'Siti, A.Md' },
      ]);
    });

    it('should return CSV with BOM, header, and data rows', async () => {
      const { csv, filename } = await service.exportCsv('b1');

      expect(csv.startsWith('\uFEFF')).toBe(true); // BOM for Excel
      expect(csv).toContain('Member ID,Nama Anggota,Nomor Dokumen,Status,Error,Created At,Completed At');
      expect(csv).toContain('m1,Budi Santoso,DOC-001,completed,,2026-01-01');
      expect(csv).toContain('m2,"Siti, A.Md",,failed,Render error,2026-01-01');
      expect(filename).toMatch(/^batch-kta-/);
    });

    it('should throw NotFoundException for missing batch', async () => {
      mockPrisma.documentBatchJob.findUnique.mockResolvedValue(null);
      await expect(service.exportCsv('nonexistent')).rejects.toThrow(NotFoundException);
    });

    it('should handle batch with no jobs gracefully', async () => {
      mockPrisma.documentJob.findMany.mockResolvedValue([]);
      mockPrisma.anggota.findMany.mockResolvedValue([]);

      const { csv } = await service.exportCsv('b1');
      const lines = csv.trim().split('\n');
      expect(lines).toHaveLength(1); // just the header
      expect(lines[0]).toContain('Member ID');
    });
  });

  // ── escapeCsvField ─────────────────────────────────────

  describe('escapeCsvField', () => {
    it('should pass through simple values without special characters', () => {
      const result = service['escapeCsvField']('Budi');
      expect(result).toBe('Budi');
    });

    it('should wrap values containing commas in double quotes', () => {
      const result = service['escapeCsvField']('Sari, A.Md');
      expect(result).toBe('"Sari, A.Md"');
    });

    it('should escape double quotes by doubling them', () => {
      const result = service['escapeCsvField']('Anak "Si Kecil"');
      expect(result).toBe('"Anak ""Si Kecil"""');
    });

    it('should wrap values containing newlines in double quotes', () => {
      const result = service['escapeCsvField']('Jl. Merdeka\nNo. 10');
      expect(result).toBe('"Jl. Merdeka\nNo. 10"');
    });
  });

  // ── handleJobComplete (via private method call) ────────

  describe('handleJobComplete', () => {
    const result = { jobId: 'j1', success: true, data: { nomorDokumen: 'DOC-001', batchId: 'b1', documentJobId: 'j1' } };

    it('should update job as completed and increment batch completed counter', async () => {
      mockPrisma.documentJob.update.mockResolvedValue({});
      mockPrisma.documentBatchJob.update.mockResolvedValue({
        id: 'b1', totalJobs: 5, completed: 1, failed: 0,
      });

      await service['handleJobComplete']('b1', 'j1', result);

      expect(mockPrisma.documentJob.update).toHaveBeenCalledWith({
        where: { id: 'j1' },
        data: expect.objectContaining({ status: 'completed', nomorDokumen: 'DOC-001' }),
      });
      expect(mockPrisma.documentBatchJob.update).toHaveBeenCalledWith({
        where: { id: 'b1' },
        data: { completed: { increment: 1 } },
      });
    });

    it('should set batch as completed when all jobs finish successfully', async () => {
      mockPrisma.documentJob.update.mockResolvedValue({});
      // The 5th and final completed job — Prisma.update returns the full record
      // including createdBy, so the mock must include it for the notification
      // guard check (!batch.createdBy) to pass.
      mockPrisma.documentBatchJob.update
        .mockResolvedValueOnce({ id: 'b1', totalJobs: 5, completed: 5, failed: 0, createdBy: 'u1', type: 'kta' });
      mockPrisma.documentBatchJob.updateMany.mockResolvedValue({ count: 1 });
      mockPrisma.notifikasi.create.mockResolvedValue({});
      mockPrisma.notifikasi.count.mockResolvedValue(0);
      // getBatchProgress inside sendBatchCompletionNotifications
      mockPrisma.documentBatchJob.findUnique
        .mockResolvedValue({ id: 'b1', type: 'kta', totalJobs: 5, completed: 5, failed: 0, status: 'completed', progress: 100, jobs: [] });
      // sendBatchCompletionEmail — user lookup
      mockPrisma.user.findUnique.mockResolvedValue({ email: 'user@test.com', namaLengkap: 'Admin' });

      await service['handleJobComplete']('b1', 'j1', result);

      expect(mockPrisma.documentBatchJob.updateMany).toHaveBeenCalledWith({
        where: {
          id: 'b1',
          status: { notIn: ['completed', 'completed_with_errors', 'cancelled'] },
        },
        data: { status: 'completed' },
      });
      expect(mockEventsGateway.sendToUser).toHaveBeenCalledWith(
        'u1', 'batch:complete', expect.any(Object),
      );
    });

    it('should set completed_with_errors when there are some failures', async () => {
      mockPrisma.documentJob.update.mockResolvedValue({});
      // The last job completes but there are already failures — full record
      // must include createdBy so notifications proceed.
      mockPrisma.documentBatchJob.update
        .mockResolvedValueOnce({ id: 'b1', totalJobs: 5, completed: 4, failed: 1, createdBy: 'u1', type: 'kta' });
      mockPrisma.documentBatchJob.updateMany.mockResolvedValue({ count: 1 });
      mockPrisma.notifikasi.create.mockResolvedValue({});
      mockPrisma.notifikasi.count.mockResolvedValue(0);
      // getBatchProgress inside sendBatchCompletionNotifications
      mockPrisma.documentBatchJob.findUnique
        .mockResolvedValue({ id: 'b1', type: 'kta', totalJobs: 5, completed: 4, failed: 1, status: 'completed_with_errors', progress: 80, jobs: [] });

      await service['handleJobComplete']('b1', 'j1', result);

      expect(mockPrisma.documentBatchJob.updateMany).toHaveBeenCalledWith({
        where: { id: 'b1', status: { notIn: ['completed', 'completed_with_errors', 'cancelled'] } },
        data: { status: 'completed_with_errors' },
      });
    });
  });

  // ── handleJobFailed (via private method call) ─────────

  describe('handleJobFailed', () => {
    const result = { jobId: 'j1', success: false, error: 'Render timeout', data: { batchId: 'b1', documentJobId: 'j1' } };

    it('should mark job as failed with error message', async () => {
      mockPrisma.documentJob.update.mockResolvedValue({});
      mockPrisma.documentBatchJob.update.mockResolvedValue({
        id: 'b1', totalJobs: 5, completed: 0, failed: 1,
      });

      await service['handleJobFailed']('b1', 'j1', result);

      expect(mockPrisma.documentJob.update).toHaveBeenCalledWith({
        where: { id: 'j1' },
        data: expect.objectContaining({ status: 'failed', error: 'Render timeout' }),
      });
      expect(mockPrisma.documentBatchJob.update).toHaveBeenCalledWith({
        where: { id: 'b1' },
        data: { failed: { increment: 1 } },
      });
    });

    it('should trigger batch completion when all jobs have finished with errors', async () => {
      mockPrisma.documentJob.update.mockResolvedValue({});
      // Final job fails — totalJobs=5, completed=3, failed was 1, now becomes 2 → 3+2 = 5
      mockPrisma.documentBatchJob.update
        .mockResolvedValueOnce({ id: 'b1', totalJobs: 5, completed: 3, failed: 2 })
        .mockResolvedValueOnce({ id: 'b1', totalJobs: 5, completed: 3, failed: 2, type: 'kta', createdBy: 'u1' });
      mockPrisma.documentBatchJob.updateMany.mockResolvedValue({ count: 1 });
      mockPrisma.notifikasi.create.mockResolvedValue({});
      mockPrisma.notifikasi.count.mockResolvedValue(0);

      await service['handleJobFailed']('b1', 'j5', result);

      expect(mockPrisma.documentBatchJob.updateMany).toHaveBeenCalledWith({
        where: { id: 'b1', status: { notIn: ['completed', 'completed_with_errors', 'cancelled'] } },
        data: { status: 'completed_with_errors' },
      });
    });
  });

  // ── sendBatchCompletionNotifications ──────────────────

  describe('sendBatchCompletionNotifications (indirect through handleJobComplete)', () => {
    it('should send socket event, create in-app notification, and broadcast queue update', async () => {
      // Use completely fresh mocks to avoid any lingering state across tests
      mockPrisma.documentJob.update = jest.fn().mockResolvedValue({});
      mockPrisma.documentBatchJob.update = jest.fn().mockResolvedValue(
        { id: 'b1', totalJobs: 1, completed: 1, failed: 0, createdBy: 'u1', type: 'kta' },
      );
      mockPrisma.documentBatchJob.updateMany = jest.fn().mockResolvedValue({ count: 1 });
      mockPrisma.documentBatchJob.findUnique = jest.fn().mockResolvedValue(
        { id: 'b1', type: 'kta', totalJobs: 1, completed: 1, failed: 0, status: 'completed', progress: 100, jobs: [] },
      );
      mockPrisma.notifikasi.create = jest.fn().mockResolvedValue({});
      mockPrisma.notifikasi.count = jest.fn().mockResolvedValue(3);
      mockPrisma.user.findUnique = jest.fn().mockResolvedValue(
        { email: 'user@test.com', namaLengkap: 'Admin' },
      );

      await service['handleJobComplete']('b1', 'j1', {
        jobId: 'j1', success: true, data: { nomorDokumen: 'DOC-001', batchId: 'b1', documentJobId: 'j1' },
      });

      // Socket.IO real-time event
      expect(mockEventsGateway.sendToUser).toHaveBeenCalledWith(
        'u1', 'batch:complete', expect.objectContaining({ batchId: 'b1', status: 'completed' }),
      );

      // In-app notification — should be a success notification
      expect(mockPrisma.notifikasi.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            userId: 'u1',
            judul: expect.stringContaining('KTA'),
            tipe: 'dokumen_ready',
          }),
        }),
      );

      // Unread count update
      expect(mockEventsGateway.sendUnreadCount).toHaveBeenCalledWith('u1', 3);

      // Queue stats broadcast
      expect(mockEventsGateway.broadcast).toHaveBeenCalledWith(
        'queue:updated', { timestamp: expect.any(Number) },
      );
    });
  });

  // ── sendBatchCompletionEmail ──────────────────────────

  describe('sendBatchCompletionEmail (called via handleJobComplete)', () => {
    it('should send email with failure subject when batch has failures', async () => {
      mockPrisma.documentJob.update.mockResolvedValue({});
      // failed=1 so finalStatus becomes completed_with_errors & email subject mentions Gagal
      mockPrisma.documentBatchJob.update.mockImplementation(() =>
        Promise.resolve({ id: 'b1', totalJobs: 1, completed: 0, failed: 1, createdBy: 'u1', type: 'kta' }),
      );
      mockPrisma.documentBatchJob.updateMany.mockResolvedValue({ count: 1 });
      mockPrisma.documentBatchJob.findUnique.mockImplementation(() =>
        Promise.resolve({ id: 'b1', type: 'kta', totalJobs: 1, completed: 0, failed: 1, status: 'completed_with_errors', progress: 0, jobs: [] }),
      );
      mockPrisma.user.findUnique.mockImplementation(() =>
        Promise.resolve({ email: 'user@test.com', namaLengkap: 'Admin' }),
      );
      mockPrisma.notifikasi.create.mockResolvedValue({});
      mockPrisma.notifikasi.count.mockResolvedValue(0);

      await service['handleJobComplete']('b1', 'j1', {
        jobId: 'j1', success: true, data: { nomorDokumen: 'DOC-001', batchId: 'b1', documentJobId: 'j1' },
      });

      expect(mockMailService.sendMail).toHaveBeenCalledWith(
        expect.objectContaining({
          to: 'user@test.com',
          subject: expect.stringContaining('Gagal'),
        }),
      );
    });

    it('should skip email when user has no email', async () => {
      mockPrisma.documentJob.update.mockResolvedValue({});
      // Full record with createdBy
      mockPrisma.documentBatchJob.update
        .mockResolvedValueOnce({ id: 'b1', totalJobs: 1, completed: 1, failed: 0, createdBy: 'u1', type: 'kta' });
      mockPrisma.documentBatchJob.updateMany.mockResolvedValue({ count: 1 });
      // getBatchProgress
      mockPrisma.documentBatchJob.findUnique
        .mockResolvedValue({ id: 'b1', type: 'kta', totalJobs: 1, completed: 1, failed: 0, status: 'completed', progress: 100, jobs: [] });
      mockPrisma.user.findUnique.mockResolvedValue({ email: null, namaLengkap: 'Admin' });
      mockPrisma.notifikasi.create.mockResolvedValue({});
      mockPrisma.notifikasi.count.mockResolvedValue(0);

      await service['handleJobComplete']('b1', 'j1', {
        jobId: 'j1', success: true, data: { nomorDokumen: 'DOC-001', batchId: 'b1', documentJobId: 'j1' },
      });

      expect(mockMailService.sendMail).not.toHaveBeenCalled();
    });
  });

  // ── onApplicationShutdown ─────────────────────────────

  describe('onApplicationShutdown', () => {
    it('should pause queue, wait for idle, and shutdown', async () => {
      service.initQueue(processCallback);

      await service.onApplicationShutdown();

      expect(mockQueue.pause).toHaveBeenCalledTimes(1);
      expect(mockQueue.onIdle).toHaveBeenCalledTimes(1);
      expect(mockQueue.shutdown).toHaveBeenCalledTimes(1);
    });

    it('should do nothing when queue is not initialized', async () => {
      // Fresh service without initQueue
      const module: TestingModule = await Test.createTestingModule({
        providers: [
          DocumentBatchService,
          { provide: PrismaService, useValue: mockPrisma },
          { provide: EventsGateway, useValue: mockEventsGateway },
          { provide: MailService, useValue: mockMailService },
        ],
      }).compile();

      const uninitService = module.get<DocumentBatchService>(DocumentBatchService);
      await uninitService.onApplicationShutdown();

      expect(mockQueue.pause).not.toHaveBeenCalled();
      expect(mockQueue.shutdown).not.toHaveBeenCalled();
    });
  });
});

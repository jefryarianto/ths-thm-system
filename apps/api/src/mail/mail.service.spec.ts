import { Test, TestingModule } from '@nestjs/testing';
import { MailService } from './mail.service';
import { PrismaService } from '../prisma/prisma.service';

// Mock env: production mode, no SMTP configured
jest.mock('../config/env.validation', () => ({
  env: {
    nodeEnv: 'production',
    smtp: { host: 'smtp.gmail.com', port: 587, user: '', pass: '' },
  },
  validateEnv: () => {},
}));

describe('MailService', () => {
  let service: MailService;
  let loggerSpy: { log: jest.Mock; warn: jest.Mock; error: jest.Mock };
  let moduleRef: TestingModule;

  const mockPrisma = {
    emailLog: {
      findMany: jest.fn(),
      count: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
    suppressedEmail: {
      findUnique: jest.fn(),
    },
    emailTemplate: {
      findUnique: jest.fn(),
    },
  };

  const originalResendKey = process.env.RESEND_API_KEY;
  const originalResendDomain = process.env.RESEND_DOMAIN;

  beforeEach(async () => {
    // Clear env vars that might affect test results
    delete process.env.RESEND_API_KEY;
    delete process.env.RESEND_DOMAIN;

    loggerSpy = { log: jest.fn(), warn: jest.fn(), error: jest.fn() };

    moduleRef = await Test.createTestingModule({
      providers: [MailService, { provide: PrismaService, useValue: mockPrisma }],
    }).compile();

    service = moduleRef.get<MailService>(MailService);
    Object.defineProperty(service, 'logger', { value: loggerSpy, writable: false });

    // By default, suppression check returns null (email not suppressed)
    mockPrisma.suppressedEmail.findUnique.mockResolvedValue(null);
    jest.clearAllMocks();
  });

  afterEach(async () => {
    await moduleRef?.close();
    delete process.env.RESEND_API_KEY;
    if (originalResendKey) {
      process.env.RESEND_API_KEY = originalResendKey;
    }
    delete process.env.RESEND_DOMAIN;
    if (originalResendDomain) {
      process.env.RESEND_DOMAIN = originalResendDomain;
    }
    jest.restoreAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('sendMail', () => {
    it('should warn when RESEND_API_KEY is not set (production, no SMTP)', async () => {
      mockPrisma.suppressedEmail.findUnique.mockResolvedValue(null);
      mockPrisma.emailLog.create.mockResolvedValue({ id: 'log1' });

      await service.sendMail({ to: 'user@test.com', subject: 'Test', text: 'Body' });

      // The service logs RESEND_API_KEY missing, then skips SMTP (no credentials)
      expect(loggerSpy.warn).toHaveBeenCalledWith(
        expect.stringContaining('RESEND_API_KEY not set'),
      );
      // Should log as failed
      expect(mockPrisma.emailLog.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            status: 'failed',
            to: 'user@test.com',
            subject: 'Test',
          }),
        }),
      );
    });

    it('should skip sending to suppressed (bounced) recipients', async () => {
      mockPrisma.suppressedEmail.findUnique.mockResolvedValue({
        id: 'sup-1',
        email: 'bounced@test.com',
        reason: 'bounced',
        createdAt: new Date(),
      });
      mockPrisma.emailLog.create.mockResolvedValue({ id: 'log1' });

      const result = await service.sendMail({
        to: 'bounced@test.com',
        subject: 'Test',
        text: 'Body',
      });

      // Should return true (skipped, not an error)
      expect(result).toBe(true);
      // Should log as skipped
      expect(mockPrisma.emailLog.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            status: 'skipped',
            to: 'bounced@test.com',
            subject: 'Test',
          }),
        }),
      );
      // Should NOT attempt to send via Resend
      expect(loggerSpy.warn).not.toHaveBeenCalledWith(expect.stringContaining('RESEND_API_KEY'));
    });
  });

  describe('retryFailedEmails', () => {
    const baseLog = (overrides: Record<string, unknown> = {}) => ({
      id: 'log1',
      to: 'user@test.com',
      subject: 'Welcome',
      content: '<html>Body</html>',
      metadata: { module: 'members', template: 'welcomeMemberEmail' },
      retryCount: 0,
      ...overrides,
    });

    it('should return zeros when no failed emails exist', async () => {
      mockPrisma.emailLog.findMany.mockResolvedValue([]);

      const result = await service.retryFailedEmails();

      expect(result).toEqual({ retried: 0, succeeded: 0, failed: 0, abandoned: 0 });
      expect(mockPrisma.emailLog.update).not.toHaveBeenCalled();
    });

    it('should apply auto-mode guards (age, attempts, backoff) with a small batch', async () => {
      mockPrisma.emailLog.findMany.mockResolvedValue([]);

      await service.retryFailedEmails();

      const arg = mockPrisma.emailLog.findMany.mock.calls[0][0];
      // Guard anti-loop (insiden retry-loop 2026-09)
      expect(arg.where.status).toBe('failed');
      expect(arg.where.retryCount).toEqual({ lt: 3 });
      expect(arg.where.createdAt.gte).toBeInstanceOf(Date);
      expect(arg.where.OR).toHaveLength(2); // lastRetryAt null ATAU sudah lewat backoff
      // Batch kecil + content tidak dimuat massal tanpa batas
      expect(arg.take).toBe(25);
      expect(arg.orderBy).toEqual({ createdAt: 'asc' });
      expect(arg.select).toEqual(
        expect.objectContaining({ id: true, to: true, subject: true, content: true }),
      );
    });

    it('should skip age/backoff filters for manual retry by ids', async () => {
      mockPrisma.emailLog.findMany.mockResolvedValue([]);

      await service.retryFailedEmails(['id1', 'id2']);

      const arg = mockPrisma.emailLog.findMany.mock.calls[0][0];
      expect(arg.where.id).toEqual({ in: ['id1', 'id2'] });
      // Retry manual eksplisit: tanpa filter usia & backoff, tapi tetap dibatasi batch
      expect(arg.where.createdAt).toBeUndefined();
      expect(arg.where.OR).toBeUndefined();
      expect(arg.take).toBe(25);
    });

    it('should update the ORIGINAL log to sent on success (no new log row)', async () => {
      process.env.RESEND_API_KEY = 'test-key';
      process.env.RESEND_DOMAIN = 'test.com';
      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ id: 'resend-123' }),
      }) as jest.Mock;
      mockPrisma.emailLog.findMany.mockResolvedValue([baseLog()]);
      mockPrisma.emailLog.update.mockResolvedValue({ id: 'log1' });

      const result = await service.retryFailedEmails();

      expect(result).toEqual({ retried: 1, succeeded: 1, failed: 0, abandoned: 0 });
      expect(mockPrisma.emailLog.update).toHaveBeenCalledWith({
        where: { id: 'log1' },
        data: expect.objectContaining({
          status: 'sent',
          provider: 'resend',
          error: null,
          retryCount: { increment: 1 },
          lastRetryAt: expect.any(Date),
          metadata: expect.objectContaining({ resendId: 'resend-123' }),
        }),
      });
      // Tidak lagi membuat baris log baru per percobaan (akar loop 131 ribu baris)
      expect(mockPrisma.emailLog.create).not.toHaveBeenCalled();
    });

    it('should keep the log failed and bump retryCount on failure', async () => {
      process.env.RESEND_API_KEY = 'test-key';
      process.env.RESEND_DOMAIN = 'test.com';
      global.fetch = jest.fn().mockResolvedValue({
        ok: false,
        json: async () => ({ error: { message: 'rate limited' } }),
      }) as jest.Mock;
      mockPrisma.emailLog.findMany.mockResolvedValue([baseLog()]);
      mockPrisma.emailLog.update.mockResolvedValue({ id: 'log1' });

      const result = await service.retryFailedEmails();

      expect(result).toEqual({ retried: 1, succeeded: 0, failed: 1, abandoned: 0 });
      expect(mockPrisma.emailLog.update).toHaveBeenCalledWith({
        where: { id: 'log1' },
        data: expect.objectContaining({
          status: 'failed',
          error: expect.stringContaining('providers failed'),
          retryCount: { increment: 1 },
          lastRetryAt: expect.any(Date),
        }),
      });
    });

    it('should mark exhausted retries as abandoned (out of auto-retry queue)', async () => {
      process.env.RESEND_API_KEY = 'test-key';
      process.env.RESEND_DOMAIN = 'test.com';
      global.fetch = jest.fn().mockResolvedValue({
        ok: false,
        json: async () => ({ error: { message: 'rate limited' } }),
      }) as jest.Mock;
      mockPrisma.emailLog.findMany.mockResolvedValue([baseLog({ retryCount: 2 })]); // +1 = MAX 3
      mockPrisma.emailLog.update.mockResolvedValue({ id: 'log1' });

      const result = await service.retryFailedEmails();

      expect(result.abandoned).toBe(1);
      expect(mockPrisma.emailLog.update).toHaveBeenCalledWith({
        where: { id: 'log1' },
        data: expect.objectContaining({
          status: 'abandoned',
          retryCount: { increment: 1 },
        }),
      });
    });

    it('should skip suppressed recipients during retry', async () => {
      process.env.RESEND_API_KEY = 'test-key';
      process.env.RESEND_DOMAIN = 'test.com';
      global.fetch = jest.fn();
      mockPrisma.emailLog.findMany.mockResolvedValue([baseLog({ to: 'bounced@test.com' })]);
      mockPrisma.emailLog.update.mockResolvedValue({ id: 'log1' });
      mockPrisma.suppressedEmail.findUnique.mockResolvedValue({
        email: 'bounced@test.com',
        reason: 'bounced',
      });

      const result = await service.retryFailedEmails();

      expect(result).toEqual({ retried: 1, succeeded: 0, failed: 0, abandoned: 0 });
      expect(mockPrisma.emailLog.update).toHaveBeenCalledWith({
        where: { id: 'log1' },
        data: expect.objectContaining({ status: 'skipped' }),
      });
      expect(global.fetch).not.toHaveBeenCalled();
    });

    it('should continue the batch when one update fails', async () => {
      process.env.RESEND_API_KEY = 'test-key';
      process.env.RESEND_DOMAIN = 'test.com';
      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ id: 'resend-1' }),
      }) as jest.Mock;
      mockPrisma.emailLog.findMany.mockResolvedValue([
        baseLog({ id: 'log1' }),
        baseLog({ id: 'log2' }),
      ]);
      mockPrisma.emailLog.update
        .mockRejectedValueOnce(new Error('DB error'))
        .mockResolvedValueOnce({ id: 'log2' });

      const result = await service.retryFailedEmails();

      expect(result.retried).toBe(2);
      expect(result.succeeded).toBe(1);
      expect(loggerSpy.error).toHaveBeenCalledWith(expect.stringContaining('log1'));
    });
  });

  describe('discoverVariables', () => {
    it('should extract unique {{var}} tokens', () => {
      const input = 'Halo {{nama}}, nomor {{nomorAnggota}} & {{ nama }} lagi';
      expect(service.discoverVariables(input)).toEqual(['nama', 'nomorAnggota']);
    });

    it('should return empty array when no tokens', () => {
      expect(service.discoverVariables('Tidak ada variabel')).toEqual([]);
    });
  });

  describe('previewTemplate', () => {
    it('should render default template with sample variables', async () => {
      mockPrisma.emailTemplate.findUnique.mockResolvedValue(null);

      const preview = await service.previewTemplate('welcomeMemberEmail');

      expect(preview.name).toBe('welcomeMemberEmail');
      expect(preview.isCustom).toBe(false);
      expect(preview.variables).toEqual(
        expect.arrayContaining([expect.objectContaining({ name: 'nama' })]),
      );
      expect(preview.subject).toContain('Selamat Datang');
      expect(preview.html).toContain('Budi Santoso');
    });

    it('should use active DB custom template', async () => {
      mockPrisma.emailTemplate.findUnique.mockResolvedValue({
        name: 'welcomeMemberEmail',
        subject: 'Custom {{nama}} — THS',
        htmlBody: '<p>Halo {{nama}}!</p>',
        isActive: true,
      });

      const preview = await service.previewTemplate('welcomeMemberEmail');

      expect(preview.isCustom).toBe(true);
      expect(preview.subject).toBe('Custom Budi Santoso — THS');
      expect(preview.html).toContain('Halo Budi Santoso!');
    });

    it('should substitute provided variables over samples', async () => {
      mockPrisma.emailTemplate.findUnique.mockResolvedValue(null);

      const preview = await service.previewTemplate(
        'welcomeMemberEmail',
        undefined,
        { nama: 'Siti Aminah' },
      );

      expect(preview.html).toContain('Siti Aminah');
      expect(preview.html).not.toContain('Budi Santoso');
    });

    it('should preview draft subject/htmlBody even when DB default exists', async () => {
      mockPrisma.emailTemplate.findUnique.mockResolvedValue(null);

      const preview = await service.previewTemplate(
        'generalNotificationEmail',
        {
          subject: 'Draft {{nama}}',
          htmlBody: '<p>{{nama}}, {{judul}}</p>',
        },
        { judul: 'Rapat' },
      );

      expect(preview.subject).toBe('Draft Budi Santoso');
      expect(preview.html).toContain('Rapat');
      expect(preview.html).toContain('Budi Santoso');
    });

    it('should throw NotFoundException for unknown template', async () => {
      mockPrisma.emailTemplate.findUnique.mockResolvedValue(null);

      await expect(service.previewTemplate('unknownTemplate')).rejects.toThrow(
        'Template "unknownTemplate" tidak dikenal',
      );
    });
  });
});

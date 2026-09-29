import { Test, TestingModule } from '@nestjs/testing';
import { MailCronService } from './mail-cron.service';
import { MailService } from './mail.service';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationsService } from '../modules/notifications/notifications.service';

describe('MailCronService', () => {
  let service: MailCronService;
  let loggerSpy: { log: jest.Mock; warn: jest.Mock; error: jest.Mock };
  let moduleRef: TestingModule;

  const mockPrisma = {
    emailLog: {
      count: jest.fn(),
    },
    user: {
      findMany: jest.fn(),
    },
  };

  const mockMailService = {
    retryFailedEmails: jest.fn(),
  };

  const mockNotifications = {
    send: jest.fn(),
  };

  beforeEach(async () => {
    loggerSpy = { log: jest.fn(), warn: jest.fn(), error: jest.fn() };

    moduleRef = await Test.createTestingModule({
      providers: [
        MailCronService,
        { provide: MailService, useValue: mockMailService },
        { provide: PrismaService, useValue: mockPrisma },
        { provide: NotificationsService, useValue: mockNotifications },
      ],
    }).compile();

    service = moduleRef.get<MailCronService>(MailCronService);
    Object.defineProperty(service, 'logger', { value: loggerSpy, writable: false });
    jest.clearAllMocks();
  });

  afterEach(async () => {
    await moduleRef?.close();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('handleAutoRetry', () => {
    it('should do nothing when no retryable emails exist', async () => {
      mockPrisma.emailLog.count.mockResolvedValue(0);

      await service.handleAutoRetry();

      expect(loggerSpy.log).toHaveBeenCalledWith('[Auto-Retry] No failed emails to retry');
      expect(mockMailService.retryFailedEmails).not.toHaveBeenCalled();
      expect(mockNotifications.send).not.toHaveBeenCalled();
    });

    it('should count only recent failed emails (age window parity with MailService)', async () => {
      mockPrisma.emailLog.count.mockResolvedValue(0);

      await service.handleAutoRetry();

      const arg = mockPrisma.emailLog.count.mock.calls[0][0];
      expect(arg.where.status).toBe('failed');
      expect(arg.where.content).toEqual({ not: null });
      expect(arg.where.createdAt.gte).toBeInstanceOf(Date);
    });

    it('should retry, log the result, and notify superadmins', async () => {
      mockPrisma.emailLog.count.mockResolvedValue(5);
      mockMailService.retryFailedEmails.mockResolvedValue({
        retried: 5,
        succeeded: 3,
        failed: 1,
        abandoned: 1,
      });
      mockPrisma.user.findMany.mockResolvedValue([{ id: 'admin-1' }]);

      await service.handleAutoRetry();

      expect(mockMailService.retryFailedEmails).toHaveBeenCalled();
      expect(loggerSpy.log).toHaveBeenCalledWith(
        expect.stringContaining('Complete: 5 retried, 3 succeeded, 1 failed, 1 abandoned'),
      );
      expect(mockNotifications.send).toHaveBeenCalledTimes(1);
      expect(mockNotifications.send).toHaveBeenCalledWith(
        'admin-1',
        expect.objectContaining({ userId: 'admin-1' }),
      );
    });

    it('should not notify superadmins when nothing was retried', async () => {
      mockPrisma.emailLog.count.mockResolvedValue(2);
      mockMailService.retryFailedEmails.mockResolvedValue({
        retried: 0,
        succeeded: 0,
        failed: 0,
        abandoned: 0,
      });

      await service.handleAutoRetry();

      expect(mockNotifications.send).not.toHaveBeenCalled();
    });

    it('should keep API alive when retry fails (error is caught, not thrown)', async () => {
      mockPrisma.emailLog.count.mockResolvedValue(7);
      mockMailService.retryFailedEmails.mockRejectedValue(new Error('boom'));

      await expect(service.handleAutoRetry()).resolves.not.toThrow();
      expect(loggerSpy.error).toHaveBeenCalledWith(
        expect.stringContaining('[Auto-Retry] Error: boom'),
      );
      expect(mockNotifications.send).not.toHaveBeenCalled();
    });
  });
});

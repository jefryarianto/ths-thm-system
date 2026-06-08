import { Test, TestingModule } from '@nestjs/testing';
import { MailService } from './mail.service';

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

  beforeEach(async () => {
    loggerSpy = { log: jest.fn(), warn: jest.fn(), error: jest.fn() };

    moduleRef = await Test.createTestingModule({
      providers: [MailService],
    }).compile();

    service = moduleRef.get<MailService>(MailService);
    Object.defineProperty(service, 'logger', { value: loggerSpy, writable: false });
  });

  afterEach(async () => {
    await moduleRef?.close();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should warn when RESEND_API_KEY is not set (production, no SMTP)', async () => {
    await service.sendMail({ to: 'user@test.com', subject: 'Test', text: 'Body' });

    // The service logs RESEND_API_KEY missing, then skips SMTP (no credentials)
    expect(loggerSpy.warn).toHaveBeenCalledWith(
      expect.stringContaining('RESEND_API_KEY not set'),
    );
  });
});

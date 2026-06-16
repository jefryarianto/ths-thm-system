import { Test, TestingModule } from '@nestjs/testing';
import { Logger } from '@nestjs/common';
import { MemberMailService } from '../member-mail.service';
import { PrismaService } from '../../../prisma/prisma.service';
import { MailService } from '../../../mail/mail.service';

describe('MemberMailService', () => {
  let service: MemberMailService;

  const mockPrisma = {
    anggota: {
      findUnique: jest.fn(),
    },
  };

  const mockMailService = {
    sendMail: jest.fn().mockResolvedValue(true),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MemberMailService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: MailService, useValue: mockMailService },
      ],
    }).compile();

    service = module.get<MemberMailService>(MemberMailService);
    jest.clearAllMocks();
  });

  describe('sendToMember', () => {
    it('should find member and send email', async () => {
      mockPrisma.anggota.findUnique.mockResolvedValue({
        email: 'budi@test.com',
        namaLengkap: 'Budi',
      });

      const templateFn = jest.fn().mockReturnValue({
        subject: 'Welcome',
        html: '<p>Hello Budi</p>',
      });

      await service.sendToMember('member-1', templateFn, { template: 'welcome' }, 'members');

      expect(mockPrisma.anggota.findUnique).toHaveBeenCalledWith({
        where: { id: 'member-1' },
        select: { email: true, namaLengkap: true },
      });
      expect(templateFn).toHaveBeenCalledWith('Budi');
      expect(mockMailService.sendMail).toHaveBeenCalledWith({
        to: 'budi@test.com',
        subject: 'Welcome',
        html: '<p>Hello Budi</p>',
        metadata: { module: 'members', template: 'welcome' },
      });
    });

    it('should skip sending when member has no email', async () => {
      mockPrisma.anggota.findUnique.mockResolvedValue({
        email: null,
        namaLengkap: 'Budi',
      });

      const templateFn = jest.fn();
      await service.sendToMember('member-1', templateFn, {}, 'test');

      expect(templateFn).not.toHaveBeenCalled();
      expect(mockMailService.sendMail).not.toHaveBeenCalled();
    });

    it('should skip sending when member not found', async () => {
      mockPrisma.anggota.findUnique.mockResolvedValue(null);

      await service.sendToMember('nonexistent', jest.fn(), {}, 'test');

      expect(mockMailService.sendMail).not.toHaveBeenCalled();
    });

    it('should not throw when email sending fails', async () => {
      mockPrisma.anggota.findUnique.mockResolvedValue({
        email: 'budi@test.com',
        namaLengkap: 'Budi',
      });
      mockMailService.sendMail.mockRejectedValue(new Error('SMTP error'));

      const templateFn = jest.fn().mockReturnValue({
        subject: 'Test',
        html: '<p>Test</p>',
      });

      await expect(service.sendToMember('member-1', templateFn, {}, 'test')).resolves.not.toThrow();
    });
  });

  describe('sendToMemberWithArgs', () => {
    it('should pass extra args to template function', async () => {
      mockPrisma.anggota.findUnique.mockResolvedValue({
        email: 'budi@test.com',
        namaLengkap: 'Budi',
      });

      const templateFn = jest.fn().mockReturnValue({
        subject: 'Payment Confirmation',
        html: '<p>Thanks</p>',
      });

      await service.sendToMemberWithArgs(
        'member-1',
        templateFn,
        [100000, '2026-01', true] as [number, string, boolean],
        { template: 'payment' },
        'dues',
      );

      expect(templateFn).toHaveBeenCalledWith('Budi', 100000, '2026-01', true);
      expect(mockMailService.sendMail).toHaveBeenCalledWith({
        to: 'budi@test.com',
        subject: 'Payment Confirmation',
        html: '<p>Thanks</p>',
        metadata: { module: 'dues', template: 'payment' },
      });
    });
  });
});

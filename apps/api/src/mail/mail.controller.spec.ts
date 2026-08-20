import { Test } from '@nestjs/testing';
import * as crypto from 'crypto';
import { MailController } from './mail.controller';
import { MailService } from './mail.service';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationsService } from '../modules/notifications/notifications.service';
import { env } from '../config/env.validation';
import { Prisma } from '@prisma/client';

function signWebhook(svixId: string, secret: string, body: Buffer) {
  const rawSecret = secret.startsWith('whsec_')
    ? Buffer.from(secret.slice(6), 'base64')
    : Buffer.from(secret, 'utf-8');
  const signedContent = `${svixId}.${Math.floor(Date.now() / 1000)}.${body.toString('utf-8')}`;
  const sig = crypto.createHmac('sha256', rawSecret).update(signedContent, 'utf-8').digest('base64');
  return { svixId, signedContent, signature: `v1,${sig}` };
}

describe('MailController webhook', () => {
  let controller: MailController;
  let prisma: {
    webhookEvent: { create: jest.Mock; deleteMany: jest.Mock };
    emailLog: { findFirst: jest.Mock };
    emailEvent: { create: jest.Mock };
    suppressedEmail: { upsert: jest.Mock };
  };
  let mailService: { sendMail: jest.Mock };
  let notifications: { notify: jest.Mock };

  const SECRET = 'whsec_bmV3c2VjcmV0';

  beforeEach(async () => {
    (env as unknown as { resendWebhookSecret: string }).resendWebhookSecret = SECRET;

    prisma = {
      webhookEvent: {
        create: jest.fn().mockResolvedValue({ id: 'w1' }),
        deleteMany: jest.fn().mockResolvedValue({ count: 1 }),
      },
      emailLog: { findFirst: jest.fn().mockResolvedValue({ id: 'el1' }) },
      emailEvent: { create: jest.fn().mockResolvedValue({ id: 'ev1', recipient: 'a@b.com' }) },
      suppressedEmail: { upsert: jest.fn().mockResolvedValue({}) },
    };
    mailService = { sendMail: jest.fn() };
    notifications = { notify: jest.fn() };

    const module = await Test.createTestingModule({
      controllers: [MailController],
      providers: [
        { provide: MailService, useValue: mailService },
        { provide: PrismaService, useValue: prisma },
        { provide: NotificationsService, useValue: notifications },
      ],
    }).compile();

    controller = module.get(MailController);
  });

  afterEach(() => {
    (env as unknown as { resendWebhookSecret: string }).resendWebhookSecret = '';
  });

  const callWebhook = async (payload: Record<string, unknown>, headers: Record<string, string>, rawBody: Buffer) =>
    controller.handleWebhook(
      payload,
      headers['svix-id'],
      headers['svix-timestamp'],
      headers['svix-signature'],
      { rawBody } as never,
    );

  it('should reject when signature secret is not configured', async () => {
    (env as unknown as { resendWebhookSecret: string }).resendWebhookSecret = '';
    await expect(callWebhook({ type: 'email.delivered' }, {}, Buffer.from('{}'))).rejects.toThrow(
      'Webhook tidak dikonfigurasi',
    );
  });

  it('should reject missing svix headers', async () => {
    await expect(
      callWebhook({ type: 'email.delivered' }, {}, Buffer.from('{}')),
    ).rejects.toThrow('Webhook signature header tidak lengkap');
  });

  it('should reject invalid signature', async () => {
    const body = Buffer.from(JSON.stringify({ type: 'email.delivered', data: { email_id: 'x' } }));
    const { svixId } = signWebhook('id-1', SECRET, body);
    const ts = Math.floor(Date.now() / 1000);
    await expect(
      callWebhook(
        JSON.parse(body.toString()),
        { 'svix-id': svixId, 'svix-timestamp': String(ts), 'svix-signature': 'v1,bad' },
        body,
      ),
    ).resolves.toEqual({ success: false, message: 'Invalid signature' });
    expect(prisma.emailEvent.create).not.toHaveBeenCalled();
  });

  it('should process a valid webhook exactly once (atomic claim)', async () => {
    const body = Buffer.from(
      JSON.stringify({ type: 'email.delivered', data: { email_id: 'resend-1', to: ['a@b.com'] } }),
    );
    const { svixId, signature } = signWebhook('id-1', SECRET, body);
    const ts = Math.floor(Date.now() / 1000);

    const res = await callWebhook(
      JSON.parse(body.toString()),
      { 'svix-id': svixId, 'svix-timestamp': String(ts), 'svix-signature': signature },
      body,
    );

    expect(res).toEqual({ success: true });
    expect(prisma.webhookEvent.create).toHaveBeenCalledTimes(1);
    expect(prisma.emailEvent.create).toHaveBeenCalledTimes(1);
  });

  it('should skip a duplicate webhook (P2002 claim conflict)', async () => {
    prisma.webhookEvent.create.mockRejectedValue(
      new Prisma.PrismaClientKnownRequestError('Unique constraint', {
        code: 'P2002',
        clientVersion: '5.22.0',
      }),
    );
    const body = Buffer.from(
      JSON.stringify({ type: 'email.delivered', data: { email_id: 'resend-1', to: ['a@b.com'] } }),
    );
    const { svixId, signature } = signWebhook('id-dup', SECRET, body);
    const ts = Math.floor(Date.now() / 1000);

    const res = await callWebhook(
      JSON.parse(body.toString()),
      { 'svix-id': svixId, 'svix-timestamp': String(ts), 'svix-signature': signature },
      body,
    );

    expect(res).toEqual({ success: true, message: 'Already processed' });
    expect(prisma.emailEvent.create).not.toHaveBeenCalled();
  });

  it('should release the claim when processing fails (allow retry)', async () => {
    prisma.emailEvent.create.mockRejectedValue(new Error('db down'));
    const body = Buffer.from(
      JSON.stringify({ type: 'email.delivered', data: { email_id: 'resend-1', to: ['a@b.com'] } }),
    );
    const { svixId, signature } = signWebhook('id-fail', SECRET, body);
    const ts = Math.floor(Date.now() / 1000);

    await expect(
      callWebhook(
        JSON.parse(body.toString()),
        { 'svix-id': svixId, 'svix-timestamp': String(ts), 'svix-signature': signature },
        body,
      ),
    ).rejects.toThrow('db down');
    expect(prisma.webhookEvent.deleteMany).toHaveBeenCalledWith({
      where: { eventId: svixId },
    });
  });
});
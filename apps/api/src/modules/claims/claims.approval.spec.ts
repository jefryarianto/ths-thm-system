import { BadRequestException, ForbiddenException } from '@nestjs/common';
import { ClaimsService } from './claims.service';
import { PrismaService } from '../../prisma/prisma.service';
import { ScopeHelper } from '../../common/utils/scope-helpers';
import { CacheService } from '../../common/services/cache.service';
import { MailService } from '../../mail/mail.service';
import { NraService } from '../../common/services/nra.service';
import { NotificationsService } from '../notifications/notifications.service';

jest.mock('crypto', () => {
  const actual = jest.requireActual('crypto');
  return { ...actual, randomBytes: jest.fn(actual.randomBytes) };
});

const makeClaim = (overrides: Record<string, unknown> = {}) => ({
  id: 'claim-1',
  tipe: 'keanggotaan',
  status: 'pending',
  currentStage: 'ranting',
  namaLengkap: 'Pemohon',
  jenisKelamin: 'L',
  rantingId: 'ranting-1',
  email: 'pemohon@test.com',
  trackingToken: 'tracking-token-1',
  anggotaId: null,
  anggota: null,
  ranting: {
    id: 'ranting-1',
    nama: 'Ranting A',
    wilayahId: 'wilayah-1',
    wilayah: { id: 'wilayah-1', distrikId: 'distrik-1' },
  },
  ...overrides,
});

const flushAsync = () => new Promise<void>((resolve) => setImmediate(resolve));

describe('ClaimsService approval workflow', () => {
  let service: ClaimsService;
  let prisma: Record<string, any>;
  let scopeHelper: { hasAccessToResourceAsync: jest.Mock };
  let nraService: { generateMemberNumber: jest.Mock };
  let mail: { sendMail: jest.Mock; renderWithOverride: jest.Mock };
  let notifications: { sendToRole: jest.Mock };

  beforeEach(() => {
    prisma = {
      klaim: { findUnique: jest.fn(), update: jest.fn(), delete: jest.fn() },
      anggota: { findFirst: jest.fn(), create: jest.fn() },
      user: { findFirst: jest.fn(), findUnique: jest.fn(), create: jest.fn() },
      ktaApplication: { findFirst: jest.fn(), create: jest.fn() },
      ktaAppHistory: { create: jest.fn() },
      klaimApprovalHistory: { create: jest.fn() },
      ranting: { findUnique: jest.fn() },
      setting: { findUnique: jest.fn() },
    };
    prisma.$transaction = jest.fn(async (callback: (tx: typeof prisma) => unknown) => callback(prisma));
    prisma.ranting.findUnique.mockResolvedValue(null);
    prisma.setting.findUnique.mockResolvedValue({ value: { apkUrl: 'https://cdn.example.com/ths-thm.apk' } });
    prisma.user.findFirst.mockResolvedValue({ id: 'user-w', role: 'admin_wilayah', wilayahId: 'wilayah-1' });
    scopeHelper = { hasAccessToResourceAsync: jest.fn().mockResolvedValue(true) };
    nraService = { generateMemberNumber: jest.fn().mockResolvedValue('NRA-001') };
    mail = {
      sendMail: jest.fn().mockResolvedValue(true),
      renderWithOverride: jest.fn(async (_template, factory) => factory()),
    };
    notifications = { sendToRole: jest.fn().mockResolvedValue({ sentTo: 1 }) };
    service = new (ClaimsService as new (...args: unknown[]) => ClaimsService)(
      prisma as unknown as PrismaService,
      scopeHelper as unknown as ScopeHelper,
      { invalidatePrefix: jest.fn() } as unknown as CacheService,
      mail as unknown as MailService,
      nraService as unknown as NraService,
      notifications as unknown as NotificationsService,
      undefined,
      undefined,
    );
  });

  it('requires ranting approval before wilayah', async () => {
    prisma.klaim.findUnique.mockResolvedValue(makeClaim());
    await expect(service.approve('claim-1', { role: 'admin_wilayah', wilayahId: 'wilayah-1' }))
      .rejects.toThrow('Level ini hanya dapat diproses oleh Admin Ranting');
  });

  it('routes ranting approval to wilayah when an active wilayah admin exists', async () => {
    prisma.ranting.findUnique.mockResolvedValue({ wilayahId: 'wilayah-1' });
    prisma.klaim.findUnique.mockResolvedValue(makeClaim());
    await service.approve('claim-1', { role: 'admin_ranting', rantingId: 'ranting-1' }, 'user-r');
    expect(prisma.klaim.update).toHaveBeenCalledWith(expect.objectContaining({
      where: { id: 'claim-1' },
      data: expect.objectContaining({ currentStage: 'wilayah', status: 'pending' }),
    }));
    expect(notifications.sendToRole).toHaveBeenCalledWith(expect.objectContaining({
      role: 'admin_wilayah',
      wilayahId: 'wilayah-1',
    }));
  });

  it('routes ranting approval directly to distrik when branch has no wilayah', async () => {
    prisma.ranting.findUnique.mockResolvedValue(null);
    prisma.klaim.findUnique.mockResolvedValue(makeClaim({
      ranting: { id: 'ranting-1', nama: 'Ranting Mandiri', wilayahId: null, wilayah: null },
    }));
    await service.approve('claim-1', { role: 'admin_ranting', rantingId: 'ranting-1' }, 'user-r');
    expect(prisma.klaim.update).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ currentStage: 'distrik', status: 'pending' }),
    }));
  });

  it('skips wilayah when no active wilayah admin exists', async () => {
    prisma.ranting.findUnique.mockResolvedValue({ wilayahId: 'wilayah-1' });
    prisma.user.findFirst.mockResolvedValue(null);
    prisma.klaim.findUnique.mockResolvedValue(makeClaim());
    await service.approve('claim-1', { role: 'admin_ranting', rantingId: 'ranting-1' }, 'user-r');
    expect(prisma.klaim.update).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ currentStage: 'distrik', status: 'pending' }),
    }));
    expect(prisma.klaimApprovalHistory.create).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ stage: 'WILAYAH', action: 'SKIPPED' }),
    }));
  });

  it('requires wilayah approval before distrik when the branch has one', async () => {
    prisma.klaim.findUnique.mockResolvedValue(makeClaim({ status: 'pending', currentStage: 'wilayah' }));
    await expect(service.approve('claim-1', { role: 'admin_distrik', distrikId: 'distrik-1' }))
      .rejects.toThrow('Level ini hanya dapat diproses oleh Admin Wilayah');
  });

  it('finalizes district approval without creating a KTA application or sending a status email', async () => {
    prisma.klaim.findUnique.mockResolvedValue(makeClaim({ status: 'pending', currentStage: 'distrik' }));
    prisma.anggota.findFirst.mockResolvedValue(null);
    prisma.anggota.create.mockResolvedValue({ id: 'member-1' });
    prisma.user.findUnique.mockResolvedValue(null);
    prisma.user.create.mockResolvedValue({ id: 'user-1' });
    prisma.ktaApplication.create.mockResolvedValue({ id: 'kta-1' });

    const result = await service.approve('claim-1', { role: 'admin_distrik', distrikId: 'distrik-1' }, 'user-d');
    await flushAsync();

    expect(prisma.ktaApplication.create).not.toHaveBeenCalled();
    expect(prisma.ktaAppHistory.create).not.toHaveBeenCalled();
    expect(prisma.klaim.update).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({
        status: 'disetujui',
        currentStage: 'kta_processing',
        anggotaId: 'member-1',
      }),
    }));
    expect(prisma.klaim.update.mock.calls.at(-1)[0].data).not.toHaveProperty('ktaApplicationId');
    expect(result).toEqual(expect.objectContaining({ success: true, status: 'disetujui', anggotaId: 'member-1' }));
    expect(result).not.toHaveProperty('ktaApplicationId');
    expect(mail.renderWithOverride).not.toHaveBeenCalledWith('claimStatusEmail', expect.any(Function), expect.anything());
    expect(mail.sendMail).toHaveBeenCalledTimes(1);
    expect(mail.sendMail).toHaveBeenCalledWith(expect.objectContaining({
      metadata: expect.objectContaining({ template: 'credentialEmail' }),
    }));
  });

  it('sends one credential email with username, password and configured appUrl', async () => {
    prisma.klaim.findUnique.mockResolvedValue(makeClaim({ status: 'pending', currentStage: 'distrik' }));
    prisma.anggota.findFirst.mockResolvedValue(null);
    prisma.anggota.create.mockResolvedValue({ id: 'member-1' });
    prisma.user.findUnique.mockResolvedValue(null);
    prisma.user.create.mockResolvedValue({ id: 'user-1' });

    await service.approve('claim-1', { role: 'admin_distrik', distrikId: 'distrik-1' }, 'user-d');
    await flushAsync();

    expect(mail.renderWithOverride).toHaveBeenCalledWith(
      'credentialEmail',
      expect.any(Function),
      expect.objectContaining({ appUrl: 'https://cdn.example.com/ths-thm.apk' }),
    );
    expect(mail.sendMail).toHaveBeenCalledTimes(1);
    const dto = mail.sendMail.mock.calls[0][0];
    expect(dto.to).toBe('pemohon@test.com');
    expect(dto.html).toContain('pemohon@test.com');
    expect(dto.html).toContain('Password:');
    expect(dto.html).toContain('href="https://cdn.example.com/ths-thm.apk"');
  });

  it('uses the static APK fallback when mobile_update has no apkUrl', async () => {
    prisma.setting.findUnique.mockResolvedValue({ value: {} });
    prisma.klaim.findUnique.mockResolvedValue(makeClaim({ status: 'pending', currentStage: 'distrik' }));
    prisma.anggota.findFirst.mockResolvedValue(null);
    prisma.anggota.create.mockResolvedValue({ id: 'member-1' });
    prisma.user.findUnique.mockResolvedValue(null);
    prisma.user.create.mockResolvedValue({ id: 'user-1' });

    await service.approve('claim-1', { role: 'admin_distrik', distrikId: 'distrik-1' }, 'user-d');
    await flushAsync();

    expect(mail.sendMail).toHaveBeenCalledTimes(1);
    expect(mail.sendMail.mock.calls[0][0].html)
      .toContain('href="https://ths-thm.cloud/api/app/ths-thm-mobile-latest.apk"');
  });

  it('includes the claim url in the staged approver notification payload', async () => {
    prisma.ranting.findUnique.mockResolvedValue({ wilayahId: 'wilayah-1' });
    prisma.klaim.findUnique.mockResolvedValue(makeClaim());

    await service.approve('claim-1', { role: 'admin_ranting', rantingId: 'ranting-1' }, 'user-r');

    expect(notifications.sendToRole).toHaveBeenCalledTimes(1);
    expect(notifications.sendToRole).toHaveBeenCalledWith(expect.objectContaining({
      role: 'admin_wilayah',
      data: expect.objectContaining({ claimId: 'claim-1', url: '/claims/claim-1' }),
    }));
  });

  it('includes the claim url in the final national notification payload', async () => {
    prisma.klaim.findUnique.mockResolvedValue(makeClaim({ status: 'pending', currentStage: 'distrik' }));
    prisma.anggota.findFirst.mockResolvedValue(null);
    prisma.anggota.create.mockResolvedValue({ id: 'member-1' });
    prisma.user.findUnique.mockResolvedValue(null);
    prisma.user.create.mockResolvedValue({ id: 'user-1' });

    await service.approve('claim-1', { role: 'admin_distrik', distrikId: 'distrik-1' }, 'user-d');

    expect(notifications.sendToRole).toHaveBeenCalledWith(expect.objectContaining({
      role: 'admin_nasional',
      data: expect.objectContaining({ claimId: 'claim-1', url: '/claims/claim-1' }),
    }));
  });

  it('passes the transaction client to the NRA generator', async () => {
    prisma.klaim.findUnique.mockResolvedValue(makeClaim({ status: 'pending', currentStage: 'distrik' }));
    prisma.anggota.findFirst.mockResolvedValue(null);
    prisma.anggota.create.mockResolvedValue({ id: 'member-1' });
    prisma.user.findUnique.mockResolvedValue(null);
    prisma.ktaApplication.findFirst.mockResolvedValue(null);
    prisma.ktaApplication.create.mockResolvedValue({ id: 'kta-1' });

    await service.approve('claim-1', { role: 'admin_distrik', distrikId: 'distrik-1' }, 'user-d');

    expect(nraService.generateMemberNumber).toHaveBeenCalledWith('ranting-1', undefined, prisma);
  });

  it('generates the credential password with CSPRNG after the transaction commits', async () => {
    const cryptoMock = require('crypto') as { randomBytes: jest.Mock };
    cryptoMock.randomBytes.mockClear();
    prisma.$transaction = jest.fn(async (callback: (tx: typeof prisma) => unknown) => {
      const result = await callback(prisma);
      expect(cryptoMock.randomBytes).not.toHaveBeenCalled();
      return result;
    });
    prisma.klaim.findUnique.mockResolvedValue(makeClaim({ status: 'pending', currentStage: 'distrik' }));
    prisma.anggota.findFirst.mockResolvedValue(null);
    prisma.anggota.create.mockResolvedValue({ id: 'member-1' });
    prisma.user.findUnique.mockResolvedValue(null);
    prisma.ktaApplication.findFirst.mockResolvedValue(null);
    prisma.ktaApplication.create.mockResolvedValue({ id: 'kta-1' });

    await service.approve('claim-1', { role: 'admin_distrik', distrikId: 'distrik-1' }, 'user-d');

    expect(cryptoMock.randomBytes).toHaveBeenCalledWith(12);
  });

  it('does not fail finalization when user provisioning fails after commit', async () => {
    prisma.klaim.findUnique.mockResolvedValue(makeClaim({ status: 'pending', currentStage: 'distrik' }));
    prisma.anggota.findFirst.mockResolvedValue(null);
    prisma.anggota.create.mockResolvedValue({ id: 'member-1' });
    prisma.user.findUnique.mockResolvedValue(null);
    prisma.user.create.mockRejectedValueOnce(new Error('duplicate email'));
    prisma.ktaApplication.findFirst.mockResolvedValue(null);
    prisma.ktaApplication.create.mockResolvedValue({ id: 'kta-1' });

    await expect(service.approve('claim-1', { role: 'admin_distrik', distrikId: 'distrik-1' }, 'user-d'))
      .resolves.toEqual(expect.objectContaining({ status: 'disetujui', anggotaId: 'member-1' }));
  });

  it('allows national admin to finalize a legacy national claim without a KTA application', async () => {
    prisma.klaim.findUnique.mockResolvedValue(makeClaim({ status: 'pending', currentStage: 'nasional' }));
    prisma.anggota.findFirst.mockResolvedValue(null);
    prisma.anggota.create.mockResolvedValue({ id: 'member-1' });
    prisma.user.findUnique.mockResolvedValue(null);
    prisma.user.create.mockResolvedValue({ id: 'user-1' });
    prisma.ktaApplication.create.mockResolvedValue({ id: 'kta-1' });

    const result = await service.approve('claim-1', { role: 'admin_nasional' }, 'user-n');

    expect(prisma.ktaApplication.create).not.toHaveBeenCalled();
    expect(prisma.ktaAppHistory.create).not.toHaveBeenCalled();
    expect(result).toEqual(expect.objectContaining({ success: true, status: 'disetujui', anggotaId: 'member-1' }));
    expect(result).not.toHaveProperty('ktaApplicationId');
  });

  it('allows deleting only rejected claims', async () => {
    prisma.klaim.findUnique.mockResolvedValue(makeClaim({ status: 'pending' }));
    await expect(service.remove('claim-1', { role: 'admin_ranting', rantingId: 'ranting-1' }))
      .rejects.toThrow('Hanya klaim yang ditolak yang dapat dihapus');
    expect(prisma.klaim.delete).not.toHaveBeenCalled();
  });
});

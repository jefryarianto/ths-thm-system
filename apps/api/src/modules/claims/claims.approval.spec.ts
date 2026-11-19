import { BadRequestException, ForbiddenException } from '@nestjs/common';
import { ClaimsService } from './claims.service';
import { KtaApplicationService } from '../members/kta-application.service';
import { PrismaService } from '../../prisma/prisma.service';
import { ScopeHelper } from '../../common/utils/scope-helpers';
import { CacheService } from '../../common/services/cache.service';
import { MailService } from '../../mail/mail.service';
import { NraService } from '../../common/services/nra.service';

const makeClaim = (overrides: Record<string, unknown> = {}) => ({
  id: 'claim-1',
  tipe: 'keanggotaan',
  status: 'pending',
  currentStage: 'ranting',
  namaLengkap: 'Pemohon',
  jenisKelamin: 'L',
  rantingId: 'ranting-1',
  anggotaId: null,
  anggota: null,
  ranting: { id: 'ranting-1', nama: 'Ranting A', wilayahId: 'wilayah-1', wilayah: { id: 'wilayah-1', distrikId: 'distrik-1' } },
  ...overrides,
});

describe('ClaimsService approval workflow', () => {
  let service: ClaimsService;
  let prisma: Record<string, any>;
  let scopeHelper: { hasAccessToResourceAsync: jest.Mock };
  let nraService: { generateMemberNumber: jest.Mock };

  beforeEach(() => {
    prisma = {
      klaim: { findUnique: jest.fn(), update: jest.fn(), delete: jest.fn() },
      anggota: { findFirst: jest.fn(), create: jest.fn() },
      user: { findUnique: jest.fn(), create: jest.fn() },
      ktaApplication: { findFirst: jest.fn(), create: jest.fn() },
      ktaAppHistory: { create: jest.fn() },
      klaimApprovalHistory: { create: jest.fn() },
      ranting: { findUnique: jest.fn() },
    };
    prisma.$transaction = jest.fn(async (callback: (tx: typeof prisma) => unknown) => callback(prisma));
    prisma.ranting.findUnique.mockResolvedValue(null);
    scopeHelper = { hasAccessToResourceAsync: jest.fn().mockResolvedValue(true) };
    nraService = { generateMemberNumber: jest.fn().mockResolvedValue('NRA-001') };
  service = new (ClaimsService as new (...args: unknown[]) => ClaimsService)(
    prisma as unknown as PrismaService,
    scopeHelper as unknown as ScopeHelper,
    { invalidatePrefix: jest.fn() } as unknown as CacheService,
    { sendMail: jest.fn(), renderWithOverride: jest.fn().mockResolvedValue({ subject: '', html: '' }) } as unknown as MailService,
    nraService as unknown as NraService,
    undefined,
    undefined,
    { } as unknown as KtaApplicationService,
  );
  });

  it('requires ranting approval before wilayah', async () => {
    prisma.klaim.findUnique.mockResolvedValue(makeClaim());
    await expect(service.approve('claim-1', { role: 'admin_wilayah', wilayahId: 'wilayah-1' }))
      .rejects.toThrow('Level ini hanya dapat diproses oleh Admin Ranting');
  });

  it('routes ranting approval to wilayah when the branch has one', async () => {
    prisma.ranting.findUnique.mockResolvedValue({ wilayahId: 'wilayah-1' });
    prisma.klaim.findUnique.mockResolvedValue(makeClaim());
    await service.approve('claim-1', { role: 'admin_ranting', rantingId: 'ranting-1' }, 'user-r');
    expect(prisma.klaim.update).toHaveBeenCalledWith(expect.objectContaining({
      where: { id: 'claim-1' },
      data: expect.objectContaining({ currentStage: 'wilayah', status: 'pending' }),
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

  it('requires wilayah approval before distrik when the branch has one', async () => {
    prisma.klaim.findUnique.mockResolvedValue(makeClaim({ status: 'pending', currentStage: 'wilayah' }));
    await expect(service.approve('claim-1', { role: 'admin_distrik', distrikId: 'distrik-1' }))
      .rejects.toThrow('Level ini hanya dapat diproses oleh Admin Wilayah');
  });

  it('routes distrik approval to nasional without creating a member', async () => {
    prisma.klaim.findUnique.mockResolvedValue(makeClaim({ status: 'pending', currentStage: 'distrik' }));
    await service.approve('claim-1', { role: 'admin_distrik', distrikId: 'distrik-1' }, 'user-d');
    expect(prisma.klaim.update).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ currentStage: 'nasional', status: 'pending' }),
    }));
    expect(prisma.anggota.create).not.toHaveBeenCalled();
  });

  it('creates member and district-level KTA application after national approval', async () => {
    prisma.klaim.findUnique.mockResolvedValue(makeClaim({ status: 'pending', currentStage: 'nasional' }));
    prisma.anggota.findFirst.mockResolvedValue(null);
    prisma.anggota.create.mockResolvedValue({ id: 'member-1' });
    prisma.user.findUnique.mockResolvedValue(null);
    prisma.user.create.mockResolvedValue({ id: 'user-1' });
    prisma.ktaApplication.findFirst.mockResolvedValue(null);
    prisma.ktaApplication.create.mockResolvedValue({ id: 'kta-1' });

    const result = await service.approve('claim-1', { role: 'admin_nasional' }, 'user-n');

    expect(prisma.ktaApplication.create).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ anggotaId: 'member-1', status: 'APPROVED' }),
    }));
    expect(prisma.klaim.update).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ anggotaId: 'member-1', status: 'disetujui', currentStage: 'kta_processing' }),
    }));
    expect(result).toEqual(expect.objectContaining({ status: 'disetujui', ktaApplicationId: 'kta-1' }));
  });

  it('allows deleting only rejected claims', async () => {
    prisma.klaim.findUnique.mockResolvedValue(makeClaim({ status: 'pending' }));
    await expect(service.remove('claim-1', { role: 'admin_ranting', rantingId: 'ranting-1' }))
      .rejects.toThrow('Hanya klaim yang ditolak yang dapat dihapus');
    expect(prisma.klaim.delete).not.toHaveBeenCalled();
  });
});
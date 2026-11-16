import { NotFoundException } from '@nestjs/common';
import { KtaApplicationService } from './kta-application.service';

function makeService(prisma: any, auditLog = jest.fn()) {
  return new KtaApplicationService(prisma, {} as any, {} as any, undefined, { log: auditLog } as any);
}

describe('KtaApplicationService.resetMemberKta', () => {
  it('revokes card docs, deletes all applications, decrements generated batches, audits', async () => {
    const tx = {
      dokumen: { updateMany: jest.fn() },
      qRValidation: { updateMany: jest.fn() },
      ktaBatch: { update: jest.fn() },
      ktaApplication: { deleteMany: jest.fn() },
    };
    const prisma: any = {
      anggota: {
        findFirst: jest
          .fn()
          .mockResolvedValue({ id: 'm1', rantingId: 'r1', nomorAnggota: 'NRA-1' }),
      },
      ktaApplication: {
        findMany: jest.fn().mockResolvedValue([
          { id: 'a1', status: 'CARD_GENERATED', nomorAnggota: 'NRA-1', batchId: 'b1' },
          { id: 'a2', status: 'CANCELLED', nomorAnggota: null, batchId: null },
        ]),
      },
      dokumen: {
        findMany: jest.fn().mockResolvedValue([{ id: 'd1', status: 'generated' }]),
      },
      $transaction: jest.fn(async (cb: any) => cb(tx)),
    };
    const auditLog = jest.fn();
    const svc = makeService(prisma, auditLog);

    const result = await svc.resetMemberKta('m1', { id: 'u1', role: 'superadmin' });

    expect(tx.dokumen.updateMany).toHaveBeenCalledWith({
      where: { id: { in: ['d1'] } },
      data: { status: 'revoked' },
    });
    expect(tx.qRValidation.updateMany).toHaveBeenCalledWith({
      where: { dokumenId: { in: ['d1'] }, isValid: true },
      data: { isValid: false },
    });
    expect(tx.ktaBatch.update).toHaveBeenCalledWith({
      where: { id: 'b1' },
      data: { totalGenerated: { decrement: 1 } },
    });
    expect(tx.ktaApplication.deleteMany).toHaveBeenCalledWith({ where: { anggotaId: 'm1' } });
    expect(result).toEqual({ success: true, deletedApplications: 2, revokedDocuments: 1 });
    expect(auditLog).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'KTA_RESET', entityId: 'm1', userId: 'u1' }),
    );
  });

  it('returns zero counts when the member has no KTA data', async () => {
    const tx = {
      dokumen: { updateMany: jest.fn() },
      qRValidation: { updateMany: jest.fn() },
      ktaBatch: { update: jest.fn() },
      ktaApplication: { deleteMany: jest.fn() },
    };
    const prisma: any = {
      anggota: {
        findFirst: jest.fn().mockResolvedValue({ id: 'm1', rantingId: 'r1', nomorAnggota: null }),
      },
      ktaApplication: { findMany: jest.fn().mockResolvedValue([]) },
      dokumen: { findMany: jest.fn().mockResolvedValue([]) },
      $transaction: jest.fn(async (cb: any) => cb(tx)),
    };
    const svc = makeService(prisma);

    const result = await svc.resetMemberKta('m1', { id: 'u1', role: 'admin_nasional' });

    expect(result).toEqual({ success: true, deletedApplications: 0, revokedDocuments: 0 });
    expect(tx.dokumen.updateMany).not.toHaveBeenCalled();
    expect(tx.ktaBatch.update).not.toHaveBeenCalled();
  });

  it('throws NotFoundException for an unknown member', async () => {
    const prisma: any = {
      anggota: { findFirst: jest.fn().mockResolvedValue(null) },
      $transaction: jest.fn(),
    };
    const svc = makeService(prisma);

    await expect(
      svc.resetMemberKta('missing', { id: 'u1', role: 'superadmin' }),
    ).rejects.toBeInstanceOf(NotFoundException);
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });
});

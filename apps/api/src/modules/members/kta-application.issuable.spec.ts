import { ForbiddenException } from '@nestjs/common';
import { ROLES_KEY } from '../../common/decorators/roles.decorator';
import { SCOPE_KEY } from '../../common/decorators/scope.decorator';
import { KtaApplicationController } from './kta-application.controller';
import { KtaApplicationService } from './kta-application.service';

const requestScope = { role: 'admin_ranting', rantingId: 'r1' } as any;
const request = { user: { id: 'u1', role: 'admin_ranting' }, scope: requestScope } as any;
const dto = { anggotaIds: ['m1'], batchName: 'Batch A' } as any;

function makeController() {
  const service = { submitBulk: jest.fn().mockResolvedValue({ batchId: 'b1' }) };
  return { service, controller: new KtaApplicationController(service as any, {} as any, {} as any) };
}

describe('bulk submit role contract', () => {
  it('mengizinkan hanya admin_ranting pada metadata role', () => {
    expect(Reflect.getMetadata(ROLES_KEY, KtaApplicationController.prototype.bulkSubmit)).toEqual([
      'admin_ranting',
    ]);
  });

  it('tetap memakai scope branch pada bulk submit', () => {
    expect(Reflect.getMetadata(SCOPE_KEY, KtaApplicationController.prototype.bulkSubmit)).toBe(
      'branch',
    );
  });

  it.each(['admin_wilayah', 'admin_distrik', 'superadmin', 'anggota'])(
    'menolak peran %s walaupun RolesGuard bisa bypass',
    async (role) => {
      const { service, controller } = makeController();
      const user = { id: 'u1', role } as any;

      await expect(controller.bulkSubmit(dto, user, request)).rejects.toBeInstanceOf(
        ForbiddenException,
      );
      expect(service.submitBulk).not.toHaveBeenCalled();
    },
  );

  it('admin_ranting dengan scope valid tetap berhasil', async () => {
    const { service, controller } = makeController();

    await expect(
      controller.bulkSubmit(dto, { id: 'u1', role: 'admin_ranting' } as any, request),
    ).resolves.toEqual({ batchId: 'b1' });
    expect(service.submitBulk).toHaveBeenCalledWith(
      ['m1'],
      { id: 'u1', role: 'admin_ranting' },
      'Batch A',
      requestScope,
    );
  });
});

function makeService(status: string | null) {
  const prisma = {
    ktaApplication: {
      findFirst: jest.fn().mockResolvedValue(status === null ? null : { id: 'a1', status }),
    },
  };
  return { prisma, service: new KtaApplicationService(prisma as any, {} as any, {} as any) };
}

describe('assertKtaIssuable', () => {
  it('menolak ketika pengajuan KTA tidak ada', async () => {
    const { service } = makeService(null);
    await expect(service.assertKtaIssuable('m1')).rejects.toThrow(/KTA/);
  });

  it.each(['SUBMITTED', 'RANTING_REVIEW', 'APPROVED', 'PAYMENT_PENDING', 'REJECTED', 'CANCELLED'])(
    'menolak status %s',
    async (status) => {
      const { service } = makeService(status);
      await expect(service.assertKtaIssuable('m1')).rejects.toThrow(/KTA/);
    },
  );

  it.each(['PAYMENT_VERIFIED', 'CARD_GENERATING', 'CARD_GENERATED'])(
    'mengizinkan status %s',
    async (status) => {
      const { service, prisma } = makeService(status);
      await expect(service.assertKtaIssuable('m1')).resolves.toEqual({ id: 'a1', status });
      expect(prisma.ktaApplication.findFirst).toHaveBeenCalledWith(
        expect.objectContaining({ where: { anggotaId: 'm1' } }),
      );
    },
  );
});

it('notifikasi approval request menyertakan url kta queue', async () => {
  const send = jest.fn().mockResolvedValue(undefined);
  const tx = {
    ktaApplication: {
      findUnique: jest.fn().mockResolvedValue({
        id: 'a1',
        nomorAnggota: null,
        anggota: {
          namaLengkap: 'Budi',
          rantingId: 'r1',
          ranting: { wilayahId: 'w1', wilayah: { distrikId: 'd1' } },
        },
      }),
    },
    user: { findMany: jest.fn().mockResolvedValue([{ id: 'approver-1' }]) },
  };
  const service = new KtaApplicationService(
    {} as any,
    {} as any,
    {} as any,
    { send } as any,
  );

  await (service as any).notifyLevel('a1', 'RANTING_REVIEW', tx);

  expect(send).toHaveBeenCalledWith(
    'approver-1',
    expect.objectContaining({
      tipe: 'kta_approval_request',
      data: {
        applicationId: 'a1',
        screen: 'kta-queue',
        screenId: 'a1',
        url: '/kta/queue',
      },
    }),
  );
});

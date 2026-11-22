import { SCOPE_KEY } from '../../common/decorators/scope.decorator';
import { ScopeHelper } from '../../common/utils/scope-helpers';
import { KtaApplicationController } from './kta-application.controller';
import { KtaApplicationService } from './kta-application.service';

const scope = { role: 'admin_ranting', rantingId: 'r1' } as any;
const req = { user: { id: 'u1', role: 'admin_ranting' }, scope } as any;
const user = { id: 'u1', role: 'admin_ranting' } as any;

it('bulkSubmit meneruskan req.scope ke submitBulk', async () => {
  const service = {
    submitBulk: jest.fn().mockResolvedValue({ batchId: 'b1', totalSubmitted: 1 }),
  };
  const controller = new KtaApplicationController(service as any, {} as any, {} as any);

  await controller.bulkSubmit({ anggotaIds: ['m1'], batchName: 'Batch A' } as any, user, req);

  expect(service.submitBulk).toHaveBeenCalledWith(
    ['m1'],
    { id: 'u1', role: 'admin_ranting' },
    'Batch A',
    scope,
  );
});

it('semua handler baca scoped punya metadata branch', () => {
  for (const name of [
    'bulkSubmit',
    'distrikQueue',
    'listBatches',
    'getBatch',
    'exportBatch',
    'findAll',
    'findOne',
    'getHistory',
    'approve',
    'reject',
  ] as const) {
    expect(Reflect.getMetadata(SCOPE_KEY, KtaApplicationController.prototype[name])).toBe('branch');
  }
});

it('handler baca meneruskan req.scope', async () => {
  const service = {
    getDistrikQueue: jest.fn(),
    getBatches: jest.fn(),
    getBatchDetail: jest.fn(),
    exportBatch: jest.fn(),
    getApplications: jest.fn(),
    getApplicationDetail: jest.fn(),
  };
  const controller = new KtaApplicationController(service as any, {} as any, {} as any);

  await controller.distrikQueue(req);
  await controller.listBatches(req);
  await controller.getBatch('b1', req);
  await controller.exportBatch('b1', 'csv', req);
  await controller.findAll({} as any, req);
  await controller.findOne('a1', req);

  expect(service.getDistrikQueue).toHaveBeenCalledWith(scope);
  expect(service.getBatches).toHaveBeenCalledWith(scope);
  expect(service.getBatchDetail).toHaveBeenCalledWith('b1', scope);
  expect(service.exportBatch).toHaveBeenCalledWith('b1', 'csv', scope);
  expect(service.getApplications).toHaveBeenCalledWith({}, scope);
  expect(service.getApplicationDetail).toHaveBeenCalledWith('a1', scope);
});

it('submitBulk menolak anggota di luar scope', async () => {
  const prisma = {
    anggota: {
      findUnique: jest.fn().mockResolvedValue({
        id: 'm1',
        rantingId: 'r2',
        namaLengkap: 'Budi',
        tempatLahir: 'Bandung',
        tanggalLahir: new Date('1990-01-01'),
        alamat: 'Jl. A',
        noHp: '081234567890',
        email: 'budi@test.com',
      }),
    },
    ktaApplication: { findFirst: jest.fn().mockResolvedValue(null) },
    dokumen: { findFirst: jest.fn().mockResolvedValue(null) },
    ktaBatch: { create: jest.fn() },
    $transaction: jest.fn(),
  };
  const scopeHelper = { hasAccessToResourceAsync: jest.fn().mockResolvedValue(false) };
  const service = new KtaApplicationService(prisma as any, scopeHelper as any, {} as any);

  await expect(
    service.submitBulk(['m1'], user, 'Batch A', scope),
  ).rejects.toThrow('Tidak ada anggota yang memenuhi syarat');
  expect(prisma.ktaBatch.create).not.toHaveBeenCalled();
});

it('handler history dan mutasi meneruskan req.scope', async () => {
  const approve = jest.fn().mockResolvedValue({ success: true });
  const reject = jest.fn().mockResolvedValue({ success: true });
  const getHistory = jest.fn().mockResolvedValue([]);
  const service = { approve, reject, getHistory };
  const controller = new KtaApplicationController(service as any, {} as any, {} as any);

  await (controller as any).approve('a1', { catatan: 'catatan' }, user, req);
  await (controller as any).reject('a1', { reason: 'alasan' }, user, req);
  await (controller as any).getHistory('a1', req);

  expect(getHistory).toHaveBeenCalledWith('a1', scope);
  expect(approve).toHaveBeenCalledWith('a1', { id: 'u1', role: 'admin_ranting' }, 'catatan', scope);
  expect(reject).toHaveBeenCalledWith('a1', { id: 'u1', role: 'admin_ranting' }, 'alasan', scope);
});

function makeKtaService(rantingId = 'r2') {
  const tx = {
    ktaApplication: { update: jest.fn().mockResolvedValue({ id: 'a1' }) },
    ktaAppHistory: {
      updateMany: jest.fn().mockResolvedValue({ count: 1 }),
      create: jest.fn().mockResolvedValue({ id: 'h2' }),
    },
    ktaBatch: { update: jest.fn() },
  };
  const prisma = {
    ktaApplication: {
      findUnique: jest.fn().mockResolvedValue({
        id: 'a1',
        status: 'RANTING_REVIEW',
        batchId: null,
        anggota: { id: 'm1', rantingId, email: 'budi@test.com' },
      }),
      update: tx.ktaApplication.update,
    },
    ktaAppHistory: {
      findMany: jest.fn().mockResolvedValue([{ id: 'h1', ktaApplicationId: 'a1' }]),
      updateMany: tx.ktaAppHistory.updateMany,
      create: tx.ktaAppHistory.create,
    },
    ktaBatch: tx.ktaBatch,
    user: { findUnique: jest.fn() },
    $transaction: jest.fn(async (callback: (txArg: unknown) => Promise<unknown>) => callback(tx)),
  };
  const service = new KtaApplicationService(prisma as any, new ScopeHelper(), {} as any);
  return { service, prisma };
}

it('approve menolak aplikasi di luar scope sebelum mutasi', async () => {
  const { service, prisma } = makeKtaService();

  await expect(
    (service as any).approve('a1', { id: 'u1', role: 'admin_ranting' }, undefined, scope),
  ).rejects.toThrow('Akses ditolak: diluar cakupan wilayah Anda');
  expect(prisma.$transaction).not.toHaveBeenCalled();
});

it('reject menolak aplikasi di luar scope sebelum mutasi', async () => {
  const { service, prisma } = makeKtaService();

  await expect(
    (service as any).reject('a1', { id: 'u1', role: 'admin_ranting' }, 'alasan', scope),
  ).rejects.toThrow('Akses ditolak: diluar cakupan wilayah Anda');
  expect(prisma.$transaction).not.toHaveBeenCalled();
});

it('getHistory menolak aplikasi di luar scope sebelum mengembalikan riwayat', async () => {
  const { service, prisma } = makeKtaService();

  await expect((service as any).getHistory('a1', scope)).rejects.toThrow(
    'Akses ditolak: diluar cakupan wilayah Anda',
  );
  expect(prisma.ktaAppHistory.findMany).not.toHaveBeenCalled();
});

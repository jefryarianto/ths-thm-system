import { BadRequestException, NotFoundException } from '@nestjs/common';
import { readFileSync } from 'fs';
import { join } from 'path';
import { ROLES_KEY } from '../../common/decorators/roles.decorator';
import { deleteKtaProofFile } from '../../common/utils/kta-proof-upload.util';
import { KtaApplicationController } from './kta-application.controller';
import { KtaApplicationService } from './kta-application.service';

jest.mock('../../common/utils/kta-proof-upload.util', () => ({
  ...jest.requireActual('../../common/utils/kta-proof-upload.util'),
  deleteKtaProofFile: jest.fn(),
}));

const swagger = JSON.parse(
  readFileSync(join(__dirname, '../../../swagger.json'), 'utf8'),
);

function makeService(status: string | null, buktiBayarPath: string | null = null) {
  const update = jest.fn().mockResolvedValue({ id: 'a1', status });
  const updateMany = jest.fn().mockResolvedValue({ count: 1 });
  const prisma = {
    anggota: {
      findFirst: jest.fn().mockResolvedValue({ id: 'm1' }),
    },
    ktaApplication: {
      findFirst: jest
        .fn()
        .mockResolvedValue(
          status === null ? null : { id: 'a1', anggotaId: 'm1', status, buktiBayarPath },
        ),
      findUnique: jest.fn().mockResolvedValue(
        status === null
          ? null
          : { id: 'a1', anggotaId: 'm1', status, buktiBayarPath, anggota: {} },
      ),
      update,
      updateMany,
    },
    user: { findUnique: jest.fn().mockResolvedValue(null) },
    $transaction: jest.fn(async (callback: (tx: unknown) => unknown) =>
      callback({
        ktaApplication: { update },
        ktaAppHistory: { create: jest.fn().mockResolvedValue({}) },
      }),
    ),
  };
  const service = new KtaApplicationService(prisma as any, {} as any, {} as any);
  return { service, prisma, update, updateMany };
}

describe('uploadProof', () => {
  beforeEach(() => jest.clearAllMocks());

  it.each(['APPROVED', 'PAYMENT_VERIFIED', 'REJECTED'])(
    'menolak status %s',
    async (status) => {
      const { service, update } = makeService(status);

      await expect(
        (service as any).uploadProof('member@example.com', { filename: 'bukti.png' }),
      ).rejects.toBeInstanceOf(BadRequestException);
      expect(update).not.toHaveBeenCalled();
    },
  );

  it('menolak ketika pengajuan tidak ada', async () => {
    const { service } = makeService(null);

    await expect(
      (service as any).uploadProof('member@example.com', { filename: 'bukti.png' }),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it.each(['PAYMENT_SETUP', 'PAYMENT_PENDING'])(
    'menyimpan bukti dan status untuk %s',
    async (status) => {
      const { service, updateMany } = makeService(status);

      await (service as any).uploadProof('member@example.com', { filename: 'bukti.png' });

      expect(updateMany).toHaveBeenCalledWith({
        where: { id: 'a1', status: { in: ['PAYMENT_SETUP', 'PAYMENT_PENDING'] } },
        data: {
          buktiBayarPath: '/api/uploads/kta-proofs/bukti.png',
          status: 'PAYMENT_PENDING',
          statusPembayaran: 'MENUNGGU_VERIFIKASI',
        },
      });
    },
  );

  it('menolak ketika status berubah saat bukti diunggah', async () => {
    const { service, updateMany } = makeService('PAYMENT_SETUP');
    updateMany.mockResolvedValue({ count: 0 });

    await expect(
      (service as any).uploadProof('member@example.com', { filename: 'bukti.png' }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('menghapus bukti lama setelah upload ulang', async () => {
    const { service } = makeService('PAYMENT_PENDING', '/api/uploads/kta-proofs/old.png');

    await (service as any).uploadProof('member@example.com', { filename: 'bukti.png' });

    expect(deleteKtaProofFile).toHaveBeenCalledWith('old.png');
  });

  it('mendeklarasikan request body multipart pada kontrak', () => {
    const operation = swagger.paths['/kta-applications/me/upload-proof'].post;

    expect(operation.requestBody).toBeDefined();
    expect(JSON.stringify(operation.requestBody)).toContain('bukti');
  });

  it('mengizinkan anggota pada route upload', () => {
    expect(
      Reflect.getMetadata(ROLES_KEY, (KtaApplicationController.prototype as any).uploadProof),
    ).toEqual([
      'anggota',
    ]);
  });
});

describe('verifyPayment fallback', () => {
  it('mempertahankan bukti yang sudah diupload', async () => {
    const oldPath = '/api/uploads/kta-proofs/old.png';
    const { service, prisma } = makeService('PAYMENT_PENDING', oldPath);

    await service.verifyPayment('a1', 'admin1');

    expect(prisma.ktaApplication.update).toHaveBeenCalledWith({
      where: { id: 'a1' },
      data: {
        status: 'PAYMENT_VERIFIED',
        buktiBayarPath: oldPath,
        statusPembayaran: 'LUNAS',
      },
    });
  });
});

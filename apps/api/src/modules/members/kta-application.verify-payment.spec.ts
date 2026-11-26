import { BadRequestException } from '@nestjs/common';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';
import { KtaApplicationController } from './kta-application.controller';
import { KtaApplicationService } from './kta-application.service';

const proofFileName = 'kta-proof-verify.png';
const proofPath = `/api/uploads/kta-proofs/${proofFileName}`;
const originalUploadDir = process.env.UPLOAD_DIR;
let uploadDir: string;

beforeAll(() => {
  uploadDir = mkdtempSync(join(tmpdir(), 'kta-verify-payment-'));
  mkdirSync(join(uploadDir, 'kta-proofs'));
  writeFileSync(join(uploadDir, 'kta-proofs', proofFileName), 'proof');
  process.env.UPLOAD_DIR = uploadDir;
});

afterAll(() => {
  if (originalUploadDir === undefined) delete process.env.UPLOAD_DIR;
  else process.env.UPLOAD_DIR = originalUploadDir;
  rmSync(uploadDir, { recursive: true, force: true });
});

function makeService(status = 'PAYMENT_PENDING', buktiBayarPath: string | null = proofPath) {
  const update = jest.fn().mockResolvedValue({});
  const createHistory = jest.fn().mockResolvedValue({});
  const prisma = {
    ktaApplication: {
      findUnique: jest.fn().mockResolvedValue({ id: 'a1', status, buktiBayarPath, anggota: {} }),
    },
    user: { findUnique: jest.fn().mockResolvedValue(null) },
    $transaction: jest.fn(async (cb: (tx: unknown) => unknown) =>
      cb({ ktaApplication: { update }, ktaAppHistory: { create: createHistory } }),
    ),
  };
  const service = new KtaApplicationService(prisma as any, {} as any, {} as any);
  return { service, prisma, update, createHistory };
}

describe('KtaApplicationService.verifyPayment', () => {
  it('menolak verifikasi PAYMENT_PENDING tanpa bukti', async () => {
    const { service, prisma } = makeService('PAYMENT_PENDING', null);

    await expect(service.verifyPayment('a1', 'admin1', { buktiPath: '' })).rejects.toThrow(
      new BadRequestException('Bukti pembayaran belum tersedia atau tidak valid'),
    );
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });

  it('menolak verifikasi ketika nama file bukti tidak valid', async () => {
    const { service, prisma } = makeService(
      'PAYMENT_PENDING',
      '/api/uploads/kta-proofs/evil.png',
    );

    await expect(service.verifyPayment('a1', 'admin1', { buktiPath: '' })).rejects.toThrow(
      new BadRequestException('Bukti pembayaran belum tersedia atau tidak valid'),
    );
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });

  it('mengabaikan buktiPath dari body dan mempertahankan path tersimpan', async () => {
    const { service, update } = makeService();

    await service.verifyPayment('a1', 'admin1', {
      buktiPath: '/api/uploads/kta-proofs/kta-proof-client.png',
    });

    expect(update).toHaveBeenCalledWith({
      where: { id: 'a1' },
      data: {
        status: 'PAYMENT_VERIFIED',
        buktiBayarPath: proofPath,
        statusPembayaran: 'LUNAS',
      },
    });
  });

  it.each([
    ['admin_distrik', undefined],
    ['superadmin', 'superadmin'],
  ])(
    'menyimpan catatan dengan actorRole %s ke riwayat PAYMENT_VERIFIED',
    async (expectedRole, actorRole) => {
      const { service, createHistory } = makeService();

      await service.verifyPayment(
        'a1',
        'admin1',
        { buktiPath: '', catatan: 'Transfer sesuai' },
        actorRole,
      );

      expect(createHistory).toHaveBeenCalledWith({
        data: {
          ktaApplicationId: 'a1',
          level: 'DISTRIK',
          action: 'PAYMENT_VERIFIED',
          actorId: 'admin1',
          actorRole: expectedRole,
          catatan: 'Transfer sesuai',
        },
      });
    },
  );

  it('mengizinkan body tanpa catatan dan menulis catatan undefined', async () => {
    const { service, createHistory } = makeService();

    await service.verifyPayment('a1', 'admin1', { buktiPath: '' });

    expect(createHistory).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ catatan: undefined }) }),
    );
  });
});

describe('KtaApplicationController.verifyPayment', () => {
  it('meneruskan body ke service', async () => {
    const verifyPayment = jest.fn().mockResolvedValue({ success: true });
    const controller = new KtaApplicationController(
      { verifyPayment } as any,
      {} as any,
      {} as any,
    );
    const body = { buktiPath: '', catatan: 'Transfer sesuai' };

    await controller.verifyPayment('a1', body, { id: 'admin1', role: 'superadmin' });

    expect(verifyPayment).toHaveBeenCalledWith('a1', 'admin1', body, 'superadmin');
  });
});

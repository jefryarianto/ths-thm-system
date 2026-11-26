import { GUARDS_METADATA } from '@nestjs/common/constants';
import { NotFoundException } from '@nestjs/common';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'fs';
import { tmpdir } from 'os';
import { join, resolve } from 'path';
import { PassThrough } from 'stream';
import { ROLES_KEY } from '../../common/decorators/roles.decorator';
import { SCOPE_KEY } from '../../common/decorators/scope.decorator';
import { ScopeGuard } from '../../common/guards/scope.guard';
import { resolveKtaProofFile } from '../../common/utils/kta-proof-upload.util';
import { KtaApplicationController } from './kta-application.controller';
import { KtaApplicationService } from './kta-application.service';

const adminRoles = [
  'admin_ranting',
  'admin_wilayah',
  'admin_distrik',
  'admin_nasional',
  'superadmin',
];
const proofFileName = 'kta-proof-123.png';
const proofUrl = `/api/uploads/kta-proofs/${proofFileName}`;
const scope = { role: 'admin_ranting', rantingId: 'r1' } as any;
const req = { user: { id: 'u1', role: 'admin_ranting' }, scope } as any;

const originalUploadDir = process.env.UPLOAD_DIR;
let uploadDir: string;

beforeAll(() => {
  uploadDir = mkdtempSync(join(tmpdir(), 'kta-proof-test-'));
  mkdirSync(join(uploadDir, 'kta-proofs'));
  writeFileSync(join(uploadDir, 'kta-proofs', proofFileName), 'proof');
  process.env.UPLOAD_DIR = uploadDir;
});

afterAll(() => {
  if (originalUploadDir === undefined) delete process.env.UPLOAD_DIR;
  else process.env.UPLOAD_DIR = originalUploadDir;
  rmSync(uploadDir, { recursive: true, force: true });
});

describe('resolveKtaProofFile', () => {
  it('mengembalikan metadata untuk path bukti yang valid', () => {
    expect(resolveKtaProofFile(proofUrl)).toEqual({
      absolutePath: resolve(uploadDir, 'kta-proofs', proofFileName),
      fileName: proofFileName,
      mimeType: 'image/png',
    });
  });

  it.each([
    '/api/uploads/kta-proofs/evil.png',
    '../kta-proof-123.png',
    '/api/uploads/kta-proofs/../kta-proof-123.png',
    '/api/uploads/kta-proofs/subdir/kta-proof-123.png',
    '/api/uploads/kta-proofs/kta-proof-123.exe',
    null,
    undefined,
  ])('menolak path %p', (path) => {
    expect(resolveKtaProofFile(path)).toBeNull();
  });
});

function makeService(buktiBayarPath: string | null = proofUrl, hasAccess = true) {
  const findUnique = jest.fn().mockResolvedValue({
    buktiBayarPath,
    anggota: { rantingId: 'r1' },
  });
  const scopeHelper = { hasAccessToResourceAsync: jest.fn().mockResolvedValue(hasAccess) };
  const prisma = { ktaApplication: { findUnique } };
  const service = new KtaApplicationService(prisma as any, scopeHelper as any, {} as any);
  return { service, findUnique, scopeHelper };
}

describe('KtaApplicationService.getProof', () => {
  it('mengembalikan metadata bukti untuk path yang tersimpan', async () => {
    const { service } = makeService();

    await expect(service.getProof('a1', scope)).resolves.toEqual({
      absolutePath: resolve(uploadDir, 'kta-proofs', proofFileName),
      fileName: proofFileName,
      mimeType: 'image/png',
    });
  });

  it.each([null, '/api/uploads/kta-proofs/kta-proof-missing.png'])(
    'menolak bukti dengan path %p',
    async (path) => {
      const { service } = makeService(path);

      await expect(service.getProof('a1', scope)).rejects.toBeInstanceOf(NotFoundException);
    },
  );

  it('menolak aplikasi di luar scope sebelum membaca bukti', async () => {
    const { service, scopeHelper } = makeService(proofUrl, false);

    await expect(
      service.getProof('a1', { role: 'admin_ranting', rantingId: 'r2' } as any),
    ).rejects.toThrow('Akses ditolak: diluar cakupan wilayah Anda');
    expect(scopeHelper.hasAccessToResourceAsync).toHaveBeenCalled();
  });
});

async function waitUntil(predicate: () => boolean): Promise<void> {
  for (let attempt = 0; attempt < 100; attempt++) {
    if (predicate()) return;
    await new Promise((resolve) => setTimeout(resolve, 10));
  }
}

function makeStreamResponse(headersSent = false) {
  const res = new PassThrough() as PassThrough & {
    headersSent: boolean;
    statusCode: number;
    status: jest.Mock;
    json: jest.Mock;
    setHeader: jest.Mock;
  };
  res.headersSent = headersSent;
  res.statusCode = 200;
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  res.setHeader = jest.fn();
  res.resume();
  return res;
}

function makeProofController(absolutePath: string) {
  const getProof = jest.fn().mockResolvedValue({
    absolutePath,
    fileName: proofFileName,
    mimeType: 'image/png',
  });
  const controller = new KtaApplicationController(
    { getProof } as any,
    {} as any,
    {} as any,
  );
  return { controller, getProof };
}

describe('KtaApplicationController.getProof', () => {
  it('memakai role admin, ScopeGuard, dan scope branch', () => {
    const method = KtaApplicationController.prototype.getProof;

    expect(Reflect.getMetadata(ROLES_KEY, method)).toEqual(adminRoles);
    expect(Reflect.getMetadata(GUARDS_METADATA, method)).toContain(ScopeGuard);
    expect(Reflect.getMetadata(SCOPE_KEY, method)).toBe('branch');
  });

  it('dideklarasikan sebelum route :id', () => {
    const methodNames = Object.getOwnPropertyNames(KtaApplicationController.prototype);

    expect(methodNames.indexOf('getProof')).toBeGreaterThan(-1);
    expect(methodNames.indexOf('getProof')).toBeLessThan(methodNames.indexOf('findOne'));
  });

  it('mengirim file sebagai inline dengan header yang sesuai', async () => {
    const getProof = jest.fn().mockResolvedValue({
      absolutePath: join(uploadDir, 'kta-proofs', proofFileName),
      fileName: proofFileName,
      mimeType: 'image/png',
    });
    const service = { getProof };
    const controller = new KtaApplicationController(service as any, {} as any, {} as any);
    const res = new PassThrough() as PassThrough & { setHeader: jest.Mock };
    res.setHeader = jest.fn();
    const chunks: Buffer[] = [];
    res.on('data', (chunk: Buffer) => chunks.push(chunk));

    await controller.getProof('a1', req, res as any);
    await new Promise<void>((done) => res.on('end', done));

    expect(getProof).toHaveBeenCalledWith('a1', scope);
    expect(res.setHeader).toHaveBeenCalledWith('Content-Type', 'image/png');
    expect(res.setHeader).toHaveBeenCalledWith(
      'Content-Disposition',
      `inline; filename="${proofFileName}"`,
    );
    expect(Buffer.concat(chunks).toString()).toBe('proof');
  });

  it('mengembalikan 404 saat stream gagal sebelum header terkirim', async () => {
    const { controller } = makeProofController(
      join(uploadDir, 'kta-proofs', 'kta-proof-missing.png'),
    );
    const res = makeStreamResponse();

    await controller.getProof('a1', req, res as any);
    await waitUntil(() => (res.json as jest.Mock).mock.calls.length > 0);

    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith({ message: 'Bukti pembayaran tidak ditemukan' });
  });

  it('menghancurkan respons saat stream gagal setelah header terkirim', async () => {
    const { controller } = makeProofController(
      join(uploadDir, 'kta-proofs', 'kta-proof-missing.png'),
    );
    const res = makeStreamResponse(true);
    const destroy = jest.fn();
    res.destroy = destroy as any;

    await controller.getProof('a1', req, res as any);
    await waitUntil(() => destroy.mock.calls.length > 0);

    expect(destroy).toHaveBeenCalledTimes(1);
    expect(res.status).not.toHaveBeenCalled();
  });
});

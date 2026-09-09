import { ConflictException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { PrismaClientKnownRequestError } from '@prisma/client/runtime/library';
import { BaseCrudService, OPTIMISTIC_VERSIONED_MODELS } from './base-crud.service';
import { PrismaService } from '../../prisma/prisma.service';
import { ScopeHelper } from './scope-helpers';
import { CacheService } from '../services/cache.service';

interface UpdateDto {
  nama?: string;
  version?: number;
}

class TestVersionedService extends BaseCrudService<Record<string, unknown>, UpdateDto> {
  constructor(
    prisma: PrismaService,
    scopeHelper: ScopeHelper,
    cache: CacheService,
  ) {
    super(prisma, scopeHelper, cache, {
      model: 'anggota',
      prefix: 'test:',
      scopeStrategy: 'ranting',
    });
  }
  async doUpdate(id: string, dto: UpdateDto) {
    return this.baseUpdate(id, dto);
  }
}

class TestIuranService extends BaseCrudService<Record<string, unknown>, UpdateDto> {
  constructor(
    prisma: PrismaService,
    scopeHelper: ScopeHelper,
    cache: CacheService,
  ) {
    super(prisma, scopeHelper, cache, {
      model: 'iuran',
      prefix: 'test:',
      scopeStrategy: 'anggota_indirect',
    });
  }
  async doRemove(id: string, scope?: any, message?: string) {
    return this.baseRemove(id, scope, message);
  }
}

class TestPlainService extends BaseCrudService<Record<string, unknown>, UpdateDto> {
  constructor(
    prisma: PrismaService,
    scopeHelper: ScopeHelper,
    cache: CacheService,
  ) {
    super(prisma, scopeHelper, cache, {
      model: 'latihan',
      prefix: 'test:',
      scopeStrategy: 'ranting',
    });
  }
  async doUpdate(id: string, dto: UpdateDto) {
    return this.baseUpdate(id, dto);
  }
}

describe('BaseCrudService optimistic locking', () => {
  let prisma: any;
  let scopeHelper: any;
  let cache: any;
  let versionedSvc: TestVersionedService;
  let plainSvc: TestPlainService;
  let iuranSvc: TestIuranService;

  beforeEach(() => {
    prisma = {
      ranting: {
        findUnique: jest.fn(),
      },
      anggota: {
        findUnique: jest.fn(),
        update: jest.fn(),
      },
      latihan: {
        findUnique: jest.fn(),
        update: jest.fn(),
      },
      iuran: {
        findUnique: jest.fn(),
        delete: jest.fn(),
      },
    };
    scopeHelper = {
      verifyResourceAccess: jest.fn().mockResolvedValue(undefined),
      hasAccessToResourceAsync: jest.fn().mockResolvedValue(true),
    };
    cache = {
      getOrSet: jest.fn((_k: string, f: () => Promise<unknown>) => f()),
      invalidatePrefix: jest.fn(),
    };
    versionedSvc = new TestVersionedService(prisma as never, scopeHelper as never, cache as never);
    plainSvc = new TestPlainService(prisma as never, scopeHelper as never, cache as never);
    iuranSvc = new TestIuranService(prisma as never, scopeHelper as never, cache as never);
  });

  it('should contain versioned models', () => {
    expect(OPTIMISTIC_VERSIONED_MODELS.has('anggota')).toBe(true);
    expect(OPTIMISTIC_VERSIONED_MODELS.has('klaim')).toBe(true);
  });

  it('should update without version check when version not provided', async () => {
    prisma.anggota.update.mockResolvedValue({ id: 'a1', version: 1 });
    const result = await versionedSvc.doUpdate('a1', { nama: 'Baru' });
    expect(prisma.anggota.update).toHaveBeenCalledWith({
      where: { id: 'a1' },
      data: { nama: 'Baru' },
    });
    expect((result.data as any).version).toBe(1);
  });

  it('should apply optimistic locking when version matches', async () => {
    prisma.anggota.findUnique.mockResolvedValue({ version: 3 });
    prisma.anggota.update.mockResolvedValue({ id: 'a1', version: 4 });
    const result = await versionedSvc.doUpdate('a1', { nama: 'Baru', version: 3 });
    expect(prisma.anggota.findUnique).toHaveBeenCalledWith({
      where: { id: 'a1' },
      select: { version: true },
    });
    expect(prisma.anggota.update).toHaveBeenCalledWith({
      where: { id: 'a1', version: 3 },
      data: { nama: 'Baru', version: 4 },
    });
    expect((result.data as any).version).toBe(4);
  });

  it('should throw ConflictException when version mismatches', async () => {
    prisma.anggota.findUnique.mockResolvedValue({ version: 5 });
    await expect(versionedSvc.doUpdate('a1', { nama: 'Baru', version: 2 })).rejects.toThrow(
      ConflictException,
    );
    expect(prisma.anggota.update).not.toHaveBeenCalled();
  });

  it('should throw NotFoundException when record does not exist', async () => {
    prisma.anggota.findUnique.mockResolvedValue(null);
    await expect(versionedSvc.doUpdate('a1', { nama: 'Baru', version: 2 })).rejects.toThrow(
      NotFoundException,
    );
  });

  it('should throw ConflictException when P2025 occurs on concurrent update', async () => {
    prisma.anggota.findUnique.mockResolvedValue({ version: 3 });
    const err = new PrismaClientKnownRequestError('not found', {
      code: 'P2025',
      clientVersion: '6',
    });
    prisma.anggota.update.mockRejectedValue(err);
    await expect(versionedSvc.doUpdate('a1', { nama: 'Baru', version: 3 })).rejects.toThrow(
      ConflictException,
    );
  });

  it('should ignore version for non-versioned models', async () => {
    prisma.latihan.update.mockResolvedValue({ id: 'l1' });
    await plainSvc.doUpdate('l1', { nama: 'Baru', version: 9 });
    expect(prisma.latihan.update).toHaveBeenCalledWith({
      where: { id: 'l1' },
      data: { nama: 'Baru' },
    });
  });

  it('should delete iuran (anggota_indirect, no rantingId) without throwing', async () => {
    prisma.iuran.findUnique.mockResolvedValue({ anggota: { rantingId: 'r1' } });
    prisma.iuran.delete.mockResolvedValue({ id: 'i1' });
    await expect(iuranSvc.doRemove('i1', undefined, 'Data iuran berhasil dihapus')).resolves.toEqual({
      message: 'Data iuran berhasil dihapus',
    });
    expect(prisma.iuran.delete).toHaveBeenCalledWith({ where: { id: 'i1' } });
  });

  it('should resolve iuran rantingId through anggota.rantingId, never a direct rantingId', async () => {
    prisma.iuran.findUnique.mockResolvedValue({ anggota: { rantingId: 'r2' } });
    prisma.iuran.delete.mockResolvedValue({ id: 'i2' });
    await iuranSvc.doRemove('i2');
    expect(prisma.iuran.findUnique).toHaveBeenCalledWith({
      where: { id: 'i2' },
      select: { anggota: { select: { rantingId: true } } },
    });
    expect(prisma.iuran.findUnique).not.toHaveBeenCalledWith({
      where: { id: 'i2' },
      select: { rantingId: true },
    });
  });

  describe('delete scope verification (anggota_indirect)', () => {
    beforeEach(() => {
      // Entity exists in scope — assignee ranting r1
      prisma.iuran.findUnique.mockResolvedValue({ anggotaId: 'a1', anggota: { rantingId: 'r1' } });
      prisma.iuran.delete.mockResolvedValue({ id: 'i1' });
      scopeHelper.hasAccessToResourceAsync.mockResolvedValue(true);
    });

    it('should delete when user scope matches the resource ranting', async () => {
      const result = await iuranSvc.doRemove('i1', { rantingId: 'r1' });
      expect(result).toEqual({ message: 'Data berhasil dihapus' });
      expect(scopeHelper.hasAccessToResourceAsync).toHaveBeenCalledWith(
        prisma,
        { rantingId: 'r1' },
        'r1',
      );
      expect(prisma.iuran.delete).toHaveBeenCalledWith({ where: { id: 'i1' } });
    });

    it('should delete when user scope has no ranting restriction (national)', async () => {
      // empty scope => hasAccessToResourceAsync short-circuits to true for national
      scopeHelper.hasAccessToResourceAsync.mockImplementation(
        async (_p: any, s: any, resourceRantingId?: string) => {
          if (!s || (!s.rantingId && !s.wilayahId && !s.distrikId)) return true;
          if (!resourceRantingId) return true;
          return s.rantingId === resourceRantingId;
        },
      );
      const result = await iuranSvc.doRemove('i1', {});
      expect(result).toEqual({ message: 'Data berhasil dihapus' });
      expect(prisma.iuran.delete).toHaveBeenCalledWith({ where: { id: 'i1' } });
    });

    it('should throw ForbiddenException when user scope does not match the resource ranting', async () => {
      scopeHelper.hasAccessToResourceAsync.mockImplementation(
        async (_p: any, s: any, resourceRantingId?: string) => {
          return !!(!s || (!s.rantingId && !s.wilayahId && !s.distrikId)) || s.rantingId === resourceRantingId;
        },
      );
      // User at ranting r2, resource belongs to r1
      await expect(iuranSvc.doRemove('i1', { rantingId: 'r2' })).rejects.toThrow(
        ForbiddenException,
      );
      // Delete must NOT have been attempted
      expect(prisma.iuran.delete).not.toHaveBeenCalled();
    });

    it('should throw NotFoundException when the entity no longer exists during scope check', async () => {
      prisma.iuran.findUnique.mockResolvedValue(null);
      await expect(iuranSvc.doRemove('missing', { rantingId: 'r1' })).rejects.toThrow(
        NotFoundException,
      );
      expect(prisma.iuran.delete).not.toHaveBeenCalled();
    });
  });
});
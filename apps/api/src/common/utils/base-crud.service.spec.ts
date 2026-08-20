import { ConflictException, NotFoundException } from '@nestjs/common';
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

  beforeEach(() => {
    prisma = {
      anggota: {
        findUnique: jest.fn(),
        update: jest.fn(),
      },
      latihan: {
        findUnique: jest.fn(),
        update: jest.fn(),
      },
    };
    scopeHelper = {
      verifyResourceAccess: jest.fn().mockResolvedValue(undefined),
    };
    cache = {
      getOrSet: jest.fn((_k: string, f: () => Promise<unknown>) => f()),
      invalidatePrefix: jest.fn(),
    };
    versionedSvc = new TestVersionedService(prisma as never, scopeHelper as never, cache as never);
    plainSvc = new TestPlainService(prisma as never, scopeHelper as never, cache as never);
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
});
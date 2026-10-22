import { SearchService } from './search.service';
import { PrismaService } from '../../prisma/prisma.service';
import { ScopeHelper } from '../../common/utils/scope-helpers';

describe('SearchService', () => {
  let service: SearchService;
  let prisma: any;
  let scopeHelper: any;

  beforeEach(() => {
    prisma = {
      anggota: { findMany: jest.fn().mockResolvedValue([]) },
      calonAnggota: { findMany: jest.fn().mockResolvedValue([]) },
      kegiatan: { findMany: jest.fn().mockResolvedValue([]) },
      latihan: { findMany: jest.fn().mockResolvedValue([]) },
      user: { findMany: jest.fn().mockResolvedValue([]) },
      dokumen: { findMany: jest.fn().mockResolvedValue([]) },
    };
    scopeHelper = {
      buildScopeFilter: jest.fn().mockReturnValue({}),
      buildIndirectScopeFilter: jest.fn().mockReturnValue({}),
      buildSelfScopeFilter: jest.fn().mockReturnValue({}),
      isOwnMemberRow: jest.fn().mockReturnValue(true),
      selfCacheSegment: jest.fn().mockReturnValue(''),
    };
    service = new SearchService(prisma as never, scopeHelper as never);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should return empty for queries shorter than 2 chars', async () => {
    const result = await service.search('a');
    expect(result.total).toBe(0);
    expect(prisma.anggota.findMany).not.toHaveBeenCalled();
  });

  it('should query all groups for type=all', async () => {
    prisma.anggota.findMany.mockResolvedValue([
      { id: 'm1', namaLengkap: 'Andi', nomorAnggota: 'THS-001', email: 'andi@x.org' },
    ]);
    prisma.user.findMany.mockResolvedValue([
      { id: 'u1', namaLengkap: 'Budi', email: 'budi@x.org', role: 'anggota' },
    ]);
    const result = await service.search('and', undefined, ['all'], 8, 'superadmin');
    expect(result.query).toBe('and');
    expect(prisma.anggota.findMany).toHaveBeenCalled();
    expect(prisma.kegiatan.findMany).toHaveBeenCalled();
    expect(prisma.dokumen.findMany).toHaveBeenCalled();
    expect(result.groups.members.items[0].title).toBe('Andi');
    expect(result.groups.users.items[0].subtitle).toContain('anggota');
    expect(result.total).toBe(2);
  });

  it('should filter to requested types only', async () => {
    await service.search('and', undefined, ['members']);
    expect(prisma.anggota.findMany).toHaveBeenCalled();
    expect(prisma.kegiatan.findMany).not.toHaveBeenCalled();
    expect(prisma.user.findMany).not.toHaveBeenCalled();
  });

  it('should apply scope filter to members', async () => {
    scopeHelper.buildScopeFilter.mockReturnValue({ rantingId: 'r1' });
    await service.search('and', { rantingId: 'r1' });
    expect(prisma.anggota.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: expect.objectContaining({ rantingId: 'r1' }) }),
    );
  });

  describe('user directory visibility', () => {
    it('should include the users group for admin roles', async () => {
      await service.search('and', undefined, ['users'], 8, 'admin_distrik');
      expect(prisma.user.findMany).toHaveBeenCalled();
    });

    it('should expose the users group for admin_nasional too', async () => {
      await service.search('and', undefined, ['users'], 8, 'admin_nasional');
      expect(prisma.user.findMany).toHaveBeenCalled();
    });

    it('should hide the users group from anggota (no email/role enumeration)', async () => {
      const result = await service.search('and', undefined, ['users'], 8, 'anggota');
      expect(prisma.user.findMany).not.toHaveBeenCalled();
      expect(result.groups.users).toBeUndefined();
    });

    it('should hide the users group from penguji and admin_kegiatan', async () => {
      await service.search('and', undefined, ['users'], 8, 'penguji');
      await service.search('and', undefined, ['users'], 8, 'admin_kegiatan');
      expect(prisma.user.findMany).not.toHaveBeenCalled();
    });
  });

  it('should cap limit between 1 and 50', async () => {
    await service.search('and', undefined, ['members'], 999);
    const call = prisma.anggota.findMany.mock.calls[0][0];
    expect(call.take).toBe(50);
  });

  describe('self-scope isolation (anggota/penguji)', () => {
    // Regression: an anggota used to find other members (email, no HP) via
    // search because only the org-hierarchy filter was applied.
    const selfScope = {
      selfMemberId: 'member-a',
      rantingId: 'r1',
      wilayahId: 'w1',
      distrikId: 'd1',
    };

    beforeEach(() => {
      scopeHelper.buildSelfScopeFilter.mockImplementation((scope: any, field = 'anggotaId') =>
        scope?.selfMemberId ? { [field]: scope.selfMemberId } : {},
      );
    });

    it('should restrict member results to the requesting member', async () => {
      await service.search('budi', selfScope, ['members']);
      const where = prisma.anggota.findMany.mock.calls[0][0].where;
      expect(where.id).toBe('member-a');
    });

    it('should restrict document results to the requesting member', async () => {
      await service.search('KT-0012', selfScope, ['documents']);
      const where = prisma.dokumen.findMany.mock.calls[0][0].where;
      expect(where.anggotaId).toBe('member-a');
    });
  });
});

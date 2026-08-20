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
    const result = await service.search('and');
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

  it('should cap limit between 1 and 50', async () => {
    await service.search('and', undefined, ['members'], 999);
    const call = prisma.anggota.findMany.mock.calls[0][0];
    expect(call.take).toBe(50);
  });
});
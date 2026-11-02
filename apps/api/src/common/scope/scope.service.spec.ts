import { ScopeService } from './scope.service';
import { ScopeHelper } from '../utils/scope-helpers';

describe('ScopeService', () => {
  let service: ScopeService;
  let helper: jest.Mocked<ScopeHelper>;

  beforeEach(() => {
    helper = {
      buildScopeFilter: jest.fn(),
      buildIndirectScopeFilter: jest.fn(),
      buildKegiatanScopeFilter: jest.fn(),
      verifyKegiatanScope: jest.fn(),
      hasAccessToResource: jest.fn(),
      hasAccessToResourceAsync: jest.fn(),
      verifyResourceAccess: jest.fn(),
      buildSelfScopeFilter: jest.fn(),
      isOwnMemberRow: jest.fn(),
      selfCacheSegment: jest.fn(),
    } as any;

    service = new ScopeService({} as any, helper);
  });

  it('delegates buildScopeFilter to ScopeHelper', () => {
    helper.buildScopeFilter.mockReturnValue({ ranting: { id: 'r1' } });
    const result = service.buildScopeFilter({ rantingId: 'r1' } as any);
    expect(helper.buildScopeFilter).toHaveBeenCalledWith({ rantingId: 'r1' }, 'ranting');
    expect(result).toEqual({ ranting: { id: 'r1' } });
  });

  it('delegates buildIndirectScopeFilter to ScopeHelper', () => {
    helper.buildIndirectScopeFilter.mockReturnValue({ anggota: { rantingId: 'r1' } });
    const result = service.buildIndirectScopeFilter({ rantingId: 'r1' } as any, 'anggota');
    expect(helper.buildIndirectScopeFilter).toHaveBeenCalledWith({ rantingId: 'r1' }, 'anggota');
    expect(result).toEqual({ anggota: { rantingId: 'r1' } });
  });

  it('delegates buildKegiatanScopeFilter to ScopeHelper with prisma fallback', async () => {
    helper.buildKegiatanScopeFilter.mockResolvedValue({ OR: [] });
    const prisma = {} as any;
    const result = await service.buildKegiatanScopeFilter({ rantingId: 'r1' } as any, prisma);
    expect(helper.buildKegiatanScopeFilter).toHaveBeenCalledWith({ rantingId: 'r1' }, prisma);
    expect(result).toEqual({ OR: [] });
  });

  it('buildKegiatanScopeFilter uses injected prisma when none passed', async () => {
    helper.buildKegiatanScopeFilter.mockResolvedValue({});
    await service.buildKegiatanScopeFilter({} as any);
    expect(helper.buildKegiatanScopeFilter).toHaveBeenCalled();
  });

  it('delegates verifyKegiatanScope to ScopeHelper', async () => {
    helper.verifyKegiatanScope.mockResolvedValue(undefined);
    await service.verifyKegiatanScope({} as any, {} as any, 'ranting', 'r1');
    expect(helper.verifyKegiatanScope).toHaveBeenCalled();
  });

  it('delegates access checks to ScopeHelper', () => {
    helper.hasAccessToResource.mockReturnValue(true);
    expect(service.hasAccessToResource({} as any, 'r1')).toBe(true);
    expect(helper.hasAccessToResource).toHaveBeenCalled();
  });

  it('delegates async access checks to ScopeHelper', async () => {
    helper.hasAccessToResourceAsync.mockResolvedValue(false);
    await expect(service.hasAccessToResourceAsync({} as any, {} as any, 'r1')).resolves.toBe(false);
    expect(helper.hasAccessToResourceAsync).toHaveBeenCalled();
  });

  it('delegates verifyResourceAccess to ScopeHelper', async () => {
    const resource = { id: 'x' } as any;
    helper.verifyResourceAccess.mockResolvedValue(resource);
    await expect(service.verifyResourceAccess({} as any, {} as any, 'x', jest.fn(), 'msg')).resolves.toBe(resource);
    expect(helper.verifyResourceAccess).toHaveBeenCalled();
  });

  it('delegates self-scope helpers to ScopeHelper', () => {
    helper.buildSelfScopeFilter.mockReturnValue({ anggotaId: 'a1' });
    helper.isOwnMemberRow.mockReturnValue(true);
    helper.selfCacheSegment.mockReturnValue('a1');
    expect(service.buildSelfScopeFilter({ selfMemberId: 'a1' } as any)).toEqual({ anggotaId: 'a1' });
    expect(service.isOwnMemberRow({ selfMemberId: 'a1' } as any, 'a1')).toBe(true);
    expect(service.selfCacheSegment({ selfMemberId: 'a1' } as any)).toBe('a1');
  });

  it('exposes isSelfScope from interface', () => {
    expect(service.isSelfScope({ selfMemberId: 'a1' } as any)).toBe(true);
    expect(service.isSelfScope({} as any)).toBe(false);
  });
});

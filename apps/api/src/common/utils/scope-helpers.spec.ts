import { ScopeHelper } from './scope-helpers';
import { isSelfScope, UserScope } from '../interfaces/user-scope.interface';

describe('ScopeHelper — self-scope isolation', () => {
  let helper: ScopeHelper;

  beforeEach(() => {
    helper = new ScopeHelper();
  });

  const selfScope: UserScope = {
    selfMemberId: 'member-a',
    rantingId: 'r1',
    wilayahId: 'w1',
    distrikId: 'd1',
  };

  describe('isSelfScope', () => {
    it('should be true when selfMemberId is set', () => {
      expect(isSelfScope(selfScope)).toBe(true);
    });

    it('should be false for an empty (national) scope', () => {
      // SECURITY: an empty scope belongs to superadmin, NOT to an anggota —
      // `!scope.rantingId && ...` would conflate the two.
      expect(isSelfScope({})).toBe(false);
    });

    it('should be false for an org-hierarchy scope without selfMemberId', () => {
      expect(isSelfScope({ rantingId: 'r1', wilayahId: 'w1', distrikId: 'd1' })).toBe(false);
    });

    it('should be false for undefined scope', () => {
      expect(isSelfScope(undefined)).toBe(false);
    });
  });

  describe('buildSelfScopeFilter', () => {
    it('should return an anggotaId filter for a self scope', () => {
      expect(helper.buildSelfScopeFilter(selfScope)).toEqual({ anggotaId: 'member-a' });
    });

    it('should support a custom column', () => {
      expect(helper.buildSelfScopeFilter(selfScope, 'userId')).toEqual({
        userId: 'member-a',
      });
    });

    it('should support a nested relation path', () => {
      expect(helper.buildSelfScopeFilter(selfScope, 'anggotaId', 'anggota')).toEqual({
        anggota: { id: 'member-a' },
      });
    });

    it('should return an empty filter for non-self scopes', () => {
      expect(helper.buildSelfScopeFilter({ rantingId: 'r1' })).toEqual({});
      expect(helper.buildSelfScopeFilter({})).toEqual({});
      expect(helper.buildSelfScopeFilter(undefined)).toEqual({});
    });
  });

  describe('isOwnMemberRow', () => {
    it('should allow own row for self scope', () => {
      expect(helper.isOwnMemberRow(selfScope, 'member-a')).toBe(true);
    });

    it('should deny another member row for self scope', () => {
      expect(helper.isOwnMemberRow(selfScope, 'member-b')).toBe(false);
    });

    it('should allow any row for admin scopes', () => {
      expect(helper.isOwnMemberRow({ rantingId: 'r1' }, 'member-b')).toBe(true);
      expect(helper.isOwnMemberRow({}, 'member-b')).toBe(true);
    });
  });

  describe('selfCacheSegment', () => {
    it('should produce a member-specific segment for self scope', () => {
      expect(helper.selfCacheSegment(selfScope)).toBe('member-a');
    });

    it('should produce an empty segment for admin scopes', () => {
      expect(helper.selfCacheSegment({ rantingId: 'r1' })).toBe('');
      expect(helper.selfCacheSegment({})).toBe('');
      expect(helper.selfCacheSegment(undefined)).toBe('');
    });
  });

  describe('hasAccessToResource (self scope)', () => {
    it('should not treat a self scope as national', () => {
      // SECURITY: previously `!scope.rantingId && ...` returned true, which made
      // an anggota look like a national admin to this check.
      expect(helper.hasAccessToResource(selfScope, 'r1')).toBe(true);
      expect(helper.hasAccessToResource(selfScope, 'r-other')).toBe(false);
    });
  });

  // ── Matrix role × level ────────────────────────────────────────────────
  // Scope di bawah meniru apa yang dipasang ScopeGuard untuk tiap role.
  // Tujuannya mengunci bentuk `where` agar filter hierarki tidak melebar
  // (regresi: wilayahId hilang saat scope berisi wilayahId + distrikId).
  describe('buildScopeFilter (matrix role)', () => {
    it('superadmin / scope kosong → tanpa filter', () => {
      expect(helper.buildScopeFilter({}, 'ranting')).toEqual({});
    });

    it('admin_distrik → filter distrik', () => {
      expect(helper.buildScopeFilter({ distrikId: 'd1' }, 'ranting')).toEqual({
        ranting: { wilayah: { distrikId: 'd1' } },
      });
    });

    it('admin_wilayah → wilayahId DAN distrikId dipertahankan', () => {
      expect(helper.buildScopeFilter({ wilayahId: 'w1', distrikId: 'd1' }, 'ranting')).toEqual({
        ranting: { wilayahId: 'w1', wilayah: { distrikId: 'd1' } },
      });
    });

    it('admin_ranting → id, wilayahId, dan distrikId sekaligus', () => {
      expect(
        helper.buildScopeFilter({ rantingId: 'r1', wilayahId: 'w1', distrikId: 'd1' }, 'ranting'),
      ).toEqual({
        ranting: { id: 'r1', wilayahId: 'w1', wilayah: { distrikId: 'd1' } },
      });
    });

    it('self scope (anggota) → hierarki ranting tetap dilampirkan', () => {
      expect(helper.buildScopeFilter({ ...selfScope }, 'ranting')).toEqual({
        ranting: { id: 'r1', wilayahId: 'w1', wilayah: { distrikId: 'd1' } },
      });
    });
  });

  describe('buildIndirectScopeFilter (matrix role)', () => {
    it('superadmin / scope kosong → tanpa filter', () => {
      expect(helper.buildIndirectScopeFilter({}, 'anggota')).toEqual({});
    });

    it('admin_distrik → anggota.ranting.wilayah.distrikId', () => {
      expect(helper.buildIndirectScopeFilter({ distrikId: 'd1' }, 'anggota')).toEqual({
        anggota: { ranting: { wilayah: { distrikId: 'd1' } } },
      });
    });

    it('admin_wilayah → wilayahId + distrikId tidak saling menimpa (regresi)', () => {
      const where = helper.buildIndirectScopeFilter(
        { wilayahId: 'w1', distrikId: 'd1' },
        'anggota',
      );
      expect(where).toEqual({
        anggota: { ranting: { wilayahId: 'w1', wilayah: { distrikId: 'd1' } } },
      });
      // Filter tidak boleh melebar ke seluruh distrik (wilayahId hilang).
      expect(JSON.stringify(where)).toContain('"wilayahId":"w1"');
    });

    it('admin_ranting → rantingId + wilayahId + distrikId sekaligus', () => {
      expect(
        helper.buildIndirectScopeFilter(
          { rantingId: 'r1', wilayahId: 'w1', distrikId: 'd1' },
          'anggota',
        ),
      ).toEqual({
        anggota: {
          rantingId: 'r1',
          ranting: { wilayahId: 'w1', wilayah: { distrikId: 'd1' } },
        },
      });
    });

    it('relation path kustom dipertahankan', () => {
      expect(helper.buildIndirectScopeFilter({ distrikId: 'd1' }, 'peserta')).toEqual({
        peserta: { ranting: { wilayah: { distrikId: 'd1' } } },
      });
    });
  });

  describe('admin_nasional (nasional, tanpa hierarki)', () => {
    it('buildScopeFilter → tanpa filter hierarki', () => {
      expect(helper.buildScopeFilter({ role: 'admin_nasional' }, 'ranting')).toEqual({});
    });

    it('buildIndirectScopeFilter → tanpa filter hierarki (bukan key literal)', () => {
      expect(helper.buildIndirectScopeFilter({ role: 'admin_nasional' }, 'anggota')).toEqual({});
    });

    it('hasAccessToResourceAsync → boleh akses resource ber-ranting', async () => {
      const prisma = { ranting: { findUnique: jest.fn() } };
      await expect(
        helper.hasAccessToResourceAsync(prisma as never, { role: 'admin_nasional' }, 'r1'),
      ).resolves.toBe(true);
      expect(prisma.ranting.findUnique).not.toHaveBeenCalled();
    });

    it('bukan self scope dan bukan national superadmin', () => {
      expect(isSelfScope({ role: 'admin_nasional' })).toBe(false);
      expect(helper.hasAccessToResource({ role: 'admin_nasional' }, 'r1')).toBe(true);
    });
  });
});

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
});

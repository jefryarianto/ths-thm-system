import { ScopeGuard } from './scope.guard';
import { SCOPE_KEY, ScopeLevel } from '../decorators/scope.decorator';
import { UserScope } from '../interfaces/user-scope.interface';

describe('ScopeGuard', () => {
  let guard: ScopeGuard;
  let reflector: { getAllAndOverride: jest.Mock };
  let mockAuditService: { logScopeViolation: jest.Mock };
  let mockPrismaService: {
    user: { findUnique: jest.Mock };
    ranting: { findUnique: jest.Mock };
    wilayah: { findUnique: jest.Mock };
    anggota: { findFirst: jest.Mock; findMany: jest.Mock };
  };

  const mockRequest = (user: {
    id: string;
    email?: string;
    role: string;
    rantingId?: string;
    namaLengkap?: string;
  }) => ({
    user,
    scope: undefined,
    method: 'GET',
    url: '/api/test',
    ip: '127.0.0.1',
  });

  const mockExecutionContext = (request: ReturnType<typeof mockRequest>) =>
    ({
      switchToHttp: () => ({
        getRequest: () => request,
      }),
      getHandler: () => ({}),
      getClass: () => ({}),
    }) as never;

  beforeEach(() => {
    reflector = { getAllAndOverride: jest.fn() } as never;
    mockAuditService = { logScopeViolation: jest.fn() };
    mockPrismaService = {
      user: { findUnique: jest.fn() },
      ranting: { findUnique: jest.fn().mockResolvedValue(null) },
      wilayah: { findUnique: jest.fn().mockResolvedValue(null) },
      anggota: {
        findFirst: jest.fn().mockResolvedValue(null),
        findMany: jest.fn().mockResolvedValue([]),
      },
    };
    guard = new ScopeGuard(
      reflector as never,
      mockAuditService as never,
      mockPrismaService as never,
    );
  });

  it('should be defined', async () => {
    expect(guard).toBeDefined();
  });

  describe('No @RequireScope decorator', () => {
    it('should allow access when no scope is required', async () => {
      jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(undefined);
      const req = mockRequest({ id: 'u1', role: 'anggota' });
      const ctx = mockExecutionContext(req);

      expect(await guard.canActivate(ctx)).toBe(true);
    });
  });

  describe('superadmin (national scope)', () => {
    beforeEach(() => {
      jest
        .spyOn(reflector, 'getAllAndOverride')
        .mockImplementation((key: string) =>
          key === SCOPE_KEY ? ('branch' as ScopeLevel) : undefined,
        );
    });

    it('should allow access to branch-level endpoints', async () => {
      const req = mockRequest({ id: 'u1', role: 'superadmin' });
      expect(await guard.canActivate(mockExecutionContext(req))).toBe(true);
      expect(req.scope).toEqual({ role: 'superadmin' });
    });

    it('should allow access to district-level endpoints', async () => {
      jest
        .spyOn(reflector, 'getAllAndOverride')
        .mockImplementation((key: string) =>
          key === SCOPE_KEY ? ('district' as ScopeLevel) : undefined,
        );
      const req = mockRequest({ id: 'u1', role: 'superadmin' });
      expect(await guard.canActivate(mockExecutionContext(req))).toBe(true);
    });
  });

  describe('admin_distrik (district scope)', () => {
    beforeEach(() => {
      jest
        .spyOn(reflector, 'getAllAndOverride')
        .mockImplementation((key: string) =>
          key === SCOPE_KEY ? ('branch' as ScopeLevel) : undefined,
        );
    });

    it('should allow access to branch-level endpoints', async () => {
      const req = mockRequest({ id: 'u1', role: 'admin_distrik', rantingId: 'r1' });
      expect(await guard.canActivate(mockExecutionContext(req))).toBe(true);
      expect(req.scope).toEqual({ role: 'admin_distrik', rantingId: 'r1' });
    });

    it('should allow access to district-level endpoints', async () => {
      jest
        .spyOn(reflector, 'getAllAndOverride')
        .mockImplementation((key: string) =>
          key === SCOPE_KEY ? ('district' as ScopeLevel) : undefined,
        );
      const req = mockRequest({ id: 'u1', role: 'admin_distrik', rantingId: 'r1' });
      expect(await guard.canActivate(mockExecutionContext(req))).toBe(true);
    });

    it('should deny access to national-level endpoints and log violation', async () => {
      jest
        .spyOn(reflector, 'getAllAndOverride')
        .mockImplementation((key: string) =>
          key === SCOPE_KEY ? ('national' as ScopeLevel) : undefined,
        );
      const req = mockRequest({ id: 'u1', email: 'distrik@test.com', role: 'admin_distrik' });
      expect(await guard.canActivate(mockExecutionContext(req))).toBe(false);
      expect(mockAuditService.logScopeViolation).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: 'u1',
          userEmail: 'distrik@test.com',
          userRole: 'admin_distrik',
          requiredScope: 'national',
        }),
      );
    });
  });

  describe('admin_wilayah (region scope)', () => {
    beforeEach(() => {
      jest
        .spyOn(reflector, 'getAllAndOverride')
        .mockImplementation((key: string) =>
          key === SCOPE_KEY ? ('branch' as ScopeLevel) : undefined,
        );
    });

    it('should allow access to branch-level endpoints', async () => {
      const req = mockRequest({ id: 'u1', role: 'admin_wilayah', rantingId: 'r1' });
      expect(await guard.canActivate(mockExecutionContext(req))).toBe(true);
      expect(req.scope).toEqual({ role: 'admin_wilayah', rantingId: 'r1' });
    });

    it('should deny access to district-level endpoints and log violation', async () => {
      jest
        .spyOn(reflector, 'getAllAndOverride')
        .mockImplementation((key: string) =>
          key === SCOPE_KEY ? ('district' as ScopeLevel) : undefined,
        );
      const req = mockRequest({ id: 'u1', email: 'wilayah@test.com', role: 'admin_wilayah' });
      expect(await guard.canActivate(mockExecutionContext(req))).toBe(false);
      expect(mockAuditService.logScopeViolation).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: 'u1',
          userRole: 'admin_wilayah',
          requiredScope: 'district',
        }),
      );
    });
  });

  describe('admin_ranting (branch scope)', () => {
    beforeEach(() => {
      jest
        .spyOn(reflector, 'getAllAndOverride')
        .mockImplementation((key: string) =>
          key === SCOPE_KEY ? ('branch' as ScopeLevel) : undefined,
        );
    });

    it('should allow access to branch-level endpoints', async () => {
      const req = mockRequest({ id: 'u1', role: 'admin_ranting', rantingId: 'r1' });
      expect(await guard.canActivate(mockExecutionContext(req))).toBe(true);
      expect(req.scope).toEqual({ role: 'admin_ranting', rantingId: 'r1' });
    });

    it('should deny access to region-level endpoints and log violation', async () => {
      jest
        .spyOn(reflector, 'getAllAndOverride')
        .mockImplementation((key: string) =>
          key === SCOPE_KEY ? ('region' as ScopeLevel) : undefined,
        );
      const req = mockRequest({ id: 'u1', email: 'ranting@test.com', role: 'admin_ranting' });
      expect(await guard.canActivate(mockExecutionContext(req))).toBe(false);
      expect(mockAuditService.logScopeViolation).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: 'u1',
          userRole: 'admin_ranting',
          requiredScope: 'region',
        }),
      );
    });
  });

  describe('anggota (self scope)', () => {
    it('should allow access to self-level endpoints', async () => {
      jest
        .spyOn(reflector, 'getAllAndOverride')
        .mockImplementation((key: string) =>
          key === SCOPE_KEY ? ('self' as ScopeLevel) : undefined,
        );
      const req = mockRequest({ id: 'u1', role: 'anggota', rantingId: 'r1' });
      expect(await guard.canActivate(mockExecutionContext(req))).toBe(true);
      expect(req.scope).toEqual({ role: 'anggota', rantingId: 'r1' });
    });

    it('should allow access to branch-level endpoints (self satisfies branch)', async () => {
      // Regression: anggota used to be rejected at every @RequireScope('branch')
      // endpoint because 'self' sat last in SCOPE_ORDER. The guard now lets them
      // through; row-level isolation is enforced by the service layer.
      jest
        .spyOn(reflector, 'getAllAndOverride')
        .mockImplementation((key: string) =>
          key === SCOPE_KEY ? ('branch' as ScopeLevel) : undefined,
        );
      const req = mockRequest({ id: 'u1', email: 'anggota@test.com', role: 'anggota' });
      expect(await guard.canActivate(mockExecutionContext(req))).toBe(true);
      expect(mockAuditService.logScopeViolation).not.toHaveBeenCalled();
    });

    it('should allow access to district-level endpoints (self satisfies any level)', async () => {
      jest
        .spyOn(reflector, 'getAllAndOverride')
        .mockImplementation((key: string) =>
          key === SCOPE_KEY ? ('district' as ScopeLevel) : undefined,
        );
      const req = mockRequest({ id: 'u1', email: 'anggota@test.com', role: 'anggota' });
      expect(await guard.canActivate(mockExecutionContext(req))).toBe(true);
      expect(mockAuditService.logScopeViolation).not.toHaveBeenCalled();
    });

    it('should attach selfMemberId resolved from the member email', async () => {
      mockPrismaService.anggota.findFirst.mockResolvedValue({
        id: 'member-self',
        rantingId: 'r1',
      });
      mockPrismaService.ranting.findUnique.mockResolvedValue({
        wilayahId: 'w1',
        wilayah: { distrikId: 'd1' },
      });
      jest
        .spyOn(reflector, 'getAllAndOverride')
        .mockImplementation((key: string) =>
          key === SCOPE_KEY ? ('self' as ScopeLevel) : undefined,
        );
      const req = mockRequest({
        id: 'u1',
        email: 'anggota@test.com',
        role: 'anggota',
      });
      await guard.canActivate(mockExecutionContext(req));
      expect(req.scope).toEqual({
        role: 'anggota',
        selfMemberId: 'member-self',
        rantingId: 'r1',
        wilayahId: 'w1',
        distrikId: 'd1',
      });
    });

    it('should fall back to the user rantingId hierarchy when no member record matches the email', async () => {
      mockPrismaService.anggota.findFirst.mockResolvedValue(null);
      mockPrismaService.anggota.findMany.mockResolvedValue([]);
      mockPrismaService.ranting.findUnique.mockResolvedValue({
        wilayahId: 'w1',
        wilayah: { distrikId: 'd1' },
      });
      jest
        .spyOn(reflector, 'getAllAndOverride')
        .mockImplementation((key: string) =>
          key === SCOPE_KEY ? ('branch' as ScopeLevel) : undefined,
        );
      const req = mockRequest({
        id: 'u1',
        email: 'orphan@test.com',
        role: 'penguji',
        rantingId: 'r1',
      });
      await guard.canActivate(mockExecutionContext(req));
      expect(req.scope).toEqual({
        role: 'penguji',
        rantingId: 'r1',
        wilayahId: 'w1',
        distrikId: 'd1',
      });
      // No member found → no selfMemberId, so this user is NOT treated as self
      // scope by the services (isSelfScope() must stay false).
      expect((req.scope as UserScope | undefined)?.selfMemberId).toBeUndefined();
    });

    it('should never treat an unresolved anggota as national scope', async () => {
      // Even when nothing can be resolved, the scope object must remain a plain
      // empty object (selfMemberId absent) — identical to what the guard already
      // produced for unknown roles, and services must still gate by @Roles.
      mockPrismaService.anggota.findFirst.mockResolvedValue(null);
      mockPrismaService.anggota.findMany.mockResolvedValue([]);
      jest
        .spyOn(reflector, 'getAllAndOverride')
        .mockImplementation((key: string) =>
          key === SCOPE_KEY ? ('branch' as ScopeLevel) : undefined,
        );
      const req = mockRequest({ id: 'u1', email: 'ghost@test.com', role: 'anggota' });
      expect(await guard.canActivate(mockExecutionContext(req))).toBe(true);
      expect(req.scope).toEqual({ role: 'anggota' });
    });
  });

  describe('admin_nasional (national scope, tanpa organisasi)', () => {
    it('should attach role but no hierarchy ids', async () => {
      jest
        .spyOn(reflector, 'getAllAndOverride')
        .mockImplementation((key: string) =>
          key === SCOPE_KEY ? ('branch' as ScopeLevel) : undefined,
        );
      const req = mockRequest({ id: 'u1', role: 'admin_nasional' });
      expect(await guard.canActivate(mockExecutionContext(req))).toBe(true);
      expect(req.scope).toEqual({ role: 'admin_nasional' });
    });

    it('should allow access to national-level endpoints', async () => {
      jest
        .spyOn(reflector, 'getAllAndOverride')
        .mockImplementation((key: string) =>
          key === SCOPE_KEY ? ('national' as ScopeLevel) : undefined,
        );
      const req = mockRequest({ id: 'u1', role: 'admin_nasional' });
      expect(await guard.canActivate(mockExecutionContext(req))).toBe(true);
      expect(mockAuditService.logScopeViolation).not.toHaveBeenCalled();
    });
  });

  describe('No user on request', () => {
    it('should deny access when user is not authenticated', async () => {
      jest
        .spyOn(reflector, 'getAllAndOverride')
        .mockImplementation((key: string) =>
          key === SCOPE_KEY ? ('self' as ScopeLevel) : undefined,
        );
      const req = {
        user: undefined as never,
        scope: undefined,
        method: 'GET',
        url: '/api/test',
        ip: '127.0.0.1',
      };
      expect(await guard.canActivate(mockExecutionContext(req as never))).toBe(false);
    });
  });

  describe('Scope resolution', () => {
    it('should set empty scope for superadmin (no rantingId)', async () => {
      jest
        .spyOn(reflector, 'getAllAndOverride')
        .mockImplementation((key: string) =>
          key === SCOPE_KEY ? ('branch' as ScopeLevel) : undefined,
        );
      const req = mockRequest({ id: 'u1', role: 'superadmin' });
      await guard.canActivate(mockExecutionContext(req));
      expect(req.scope).toEqual({ role: 'superadmin' });
    });

    it('should set rantingId in scope for admin_ranting', async () => {
      jest
        .spyOn(reflector, 'getAllAndOverride')
        .mockImplementation((key: string) =>
          key === SCOPE_KEY ? ('branch' as ScopeLevel) : undefined,
        );
      const req = mockRequest({ id: 'u1', role: 'admin_ranting', rantingId: 'r123' });
      await guard.canActivate(mockExecutionContext(req));
      expect(req.scope).toEqual({ role: 'admin_ranting', rantingId: 'r123' });
    });
  });
});

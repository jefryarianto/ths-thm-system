import { ScopeGuard } from './scope.guard';
import { SCOPE_KEY, ScopeLevel } from '../decorators/scope.decorator';

describe('ScopeGuard', () => {
  let guard: ScopeGuard;
  let reflector: { getAllAndOverride: jest.Mock };
  let mockAuditService: { logScopeViolation: jest.Mock };
  let mockPrismaService: {
    user: { findUnique: jest.Mock };
    ranting: { findUnique: jest.Mock };
    wilayah: { findUnique: jest.Mock };
  };

  const mockRequest = (user: { id: string; email?: string; role: string; rantingId?: string }) => ({
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
      ranting: { findUnique: jest.fn() },
      wilayah: { findUnique: jest.fn() },
    };
    guard = new ScopeGuard(reflector as never, mockAuditService as never, mockPrismaService as never);
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
      expect(req.scope).toEqual({});
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
      expect(req.scope).toEqual({ rantingId: 'r1' });
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
      expect(req.scope).toEqual({ rantingId: 'r1' });
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
      expect(req.scope).toEqual({ rantingId: 'r1' });
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
      expect(req.scope).toEqual({ rantingId: 'r1' });
    });

    it('should deny access to branch-level endpoints and log violation', async () => {
      jest
        .spyOn(reflector, 'getAllAndOverride')
        .mockImplementation((key: string) =>
          key === SCOPE_KEY ? ('branch' as ScopeLevel) : undefined,
        );
      const req = mockRequest({ id: 'u1', email: 'anggota@test.com', role: 'anggota' });
      expect(await guard.canActivate(mockExecutionContext(req))).toBe(false);
      expect(mockAuditService.logScopeViolation).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: 'u1',
          userRole: 'anggota',
          requiredScope: 'branch',
        }),
      );
    });

    it('should deny access to district-level endpoints and log violation', async () => {
      jest
        .spyOn(reflector, 'getAllAndOverride')
        .mockImplementation((key: string) =>
          key === SCOPE_KEY ? ('district' as ScopeLevel) : undefined,
        );
      const req = mockRequest({ id: 'u1', email: 'anggota@test.com', role: 'anggota' });
      expect(await guard.canActivate(mockExecutionContext(req))).toBe(false);
      expect(mockAuditService.logScopeViolation).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: 'u1',
          userRole: 'anggota',
          requiredScope: 'district',
        }),
      );
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
      expect(req.scope).toEqual({});
    });

    it('should set rantingId in scope for admin_ranting', async () => {
      jest
        .spyOn(reflector, 'getAllAndOverride')
        .mockImplementation((key: string) =>
          key === SCOPE_KEY ? ('branch' as ScopeLevel) : undefined,
        );
      const req = mockRequest({ id: 'u1', role: 'admin_ranting', rantingId: 'r123' });
      await guard.canActivate(mockExecutionContext(req));
      expect(req.scope).toEqual({ rantingId: 'r123' });
    });
  });
});

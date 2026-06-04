import { ScopeGuard } from './scope.guard';
import { SCOPE_KEY, ScopeLevel } from '../decorators/scope.decorator';

describe('ScopeGuard', () => {
  let guard: ScopeGuard;
  let reflector: { getAllAndOverride: jest.Mock };

  const mockRequest = (user: { id: string; role: string; rantingId?: string }) => ({
    user,
    scope: undefined,
  });

  const mockExecutionContext = (request: ReturnType<typeof mockRequest>) => ({
    switchToHttp: () => ({
      getRequest: () => request,
    }),
    getHandler: () => ({}),
    getClass: () => ({}),
  } as never);

  beforeEach(() => {
    reflector = { getAllAndOverride: jest.fn() } as never;
    guard = new ScopeGuard(reflector as never);
  });

  it('should be defined', () => {
    expect(guard).toBeDefined();
  });

  describe('No @RequireScope decorator', () => {
    it('should allow access when no scope is required', () => {
      jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(undefined);
      const req = mockRequest({ id: 'u1', role: 'anggota' });
      const ctx = mockExecutionContext(req);

      expect(guard.canActivate(ctx)).toBe(true);
    });
  });

  describe('superadmin (national scope)', () => {
    beforeEach(() => {
      jest.spyOn(reflector, 'getAllAndOverride').mockImplementation(
        (key: string) => key === SCOPE_KEY ? 'branch' as ScopeLevel : undefined,
      );
    });

    it('should allow access to branch-level endpoints', () => {
      const req = mockRequest({ id: 'u1', role: 'superadmin' });
      expect(guard.canActivate(mockExecutionContext(req))).toBe(true);
      expect(req.scope).toEqual({});
    });

    it('should allow access to district-level endpoints', () => {
      jest.spyOn(reflector, 'getAllAndOverride').mockImplementation(
        (key: string) => key === SCOPE_KEY ? 'district' as ScopeLevel : undefined,
      );
      const req = mockRequest({ id: 'u1', role: 'superadmin' });
      expect(guard.canActivate(mockExecutionContext(req))).toBe(true);
    });
  });

  describe('admin_distrik (district scope)', () => {
    beforeEach(() => {
      jest.spyOn(reflector, 'getAllAndOverride').mockImplementation(
        (key: string) => key === SCOPE_KEY ? 'branch' as ScopeLevel : undefined,
      );
    });

    it('should allow access to branch-level endpoints', () => {
      const req = mockRequest({ id: 'u1', role: 'admin_distrik', rantingId: 'r1' });
      expect(guard.canActivate(mockExecutionContext(req))).toBe(true);
      expect(req.scope).toEqual({ rantingId: 'r1' });
    });

    it('should allow access to district-level endpoints', () => {
      jest.spyOn(reflector, 'getAllAndOverride').mockImplementation(
        (key: string) => key === SCOPE_KEY ? 'district' as ScopeLevel : undefined,
      );
      const req = mockRequest({ id: 'u1', role: 'admin_distrik', rantingId: 'r1' });
      expect(guard.canActivate(mockExecutionContext(req))).toBe(true);
    });

    it('should deny access to national-level endpoints', () => {
      jest.spyOn(reflector, 'getAllAndOverride').mockImplementation(
        (key: string) => key === SCOPE_KEY ? 'national' as ScopeLevel : undefined,
      );
      const req = mockRequest({ id: 'u1', role: 'admin_distrik' });
      expect(guard.canActivate(mockExecutionContext(req))).toBe(false);
    });
  });

  describe('admin_wilayah (region scope)', () => {
    beforeEach(() => {
      jest.spyOn(reflector, 'getAllAndOverride').mockImplementation(
        (key: string) => key === SCOPE_KEY ? 'branch' as ScopeLevel : undefined,
      );
    });

    it('should allow access to branch-level endpoints', () => {
      const req = mockRequest({ id: 'u1', role: 'admin_wilayah', rantingId: 'r1' });
      expect(guard.canActivate(mockExecutionContext(req))).toBe(true);
      expect(req.scope).toEqual({ rantingId: 'r1' });
    });

    it('should deny access to district-level endpoints', () => {
      jest.spyOn(reflector, 'getAllAndOverride').mockImplementation(
        (key: string) => key === SCOPE_KEY ? 'district' as ScopeLevel : undefined,
      );
      const req = mockRequest({ id: 'u1', role: 'admin_wilayah' });
      expect(guard.canActivate(mockExecutionContext(req))).toBe(false);
    });
  });

  describe('admin_ranting (branch scope)', () => {
    beforeEach(() => {
      jest.spyOn(reflector, 'getAllAndOverride').mockImplementation(
        (key: string) => key === SCOPE_KEY ? 'branch' as ScopeLevel : undefined,
      );
    });

    it('should allow access to branch-level endpoints', () => {
      const req = mockRequest({ id: 'u1', role: 'admin_ranting', rantingId: 'r1' });
      expect(guard.canActivate(mockExecutionContext(req))).toBe(true);
      expect(req.scope).toEqual({ rantingId: 'r1' });
    });

    it('should deny access to region-level endpoints', () => {
      jest.spyOn(reflector, 'getAllAndOverride').mockImplementation(
        (key: string) => key === SCOPE_KEY ? 'region' as ScopeLevel : undefined,
      );
      const req = mockRequest({ id: 'u1', role: 'admin_ranting' });
      expect(guard.canActivate(mockExecutionContext(req))).toBe(false);
    });
  });

  describe('anggota (self scope)', () => {
    it('should allow access to self-level endpoints', () => {
      jest.spyOn(reflector, 'getAllAndOverride').mockImplementation(
        (key: string) => key === SCOPE_KEY ? 'self' as ScopeLevel : undefined,
      );
      const req = mockRequest({ id: 'u1', role: 'anggota', rantingId: 'r1' });
      expect(guard.canActivate(mockExecutionContext(req))).toBe(true);
      expect(req.scope).toEqual({ rantingId: 'r1' });
    });

    it('should deny access to branch-level endpoints', () => {
      jest.spyOn(reflector, 'getAllAndOverride').mockImplementation(
        (key: string) => key === SCOPE_KEY ? 'branch' as ScopeLevel : undefined,
      );
      const req = mockRequest({ id: 'u1', role: 'anggota' });
      expect(guard.canActivate(mockExecutionContext(req))).toBe(false);
    });

    it('should deny access to district-level endpoints', () => {
      jest.spyOn(reflector, 'getAllAndOverride').mockImplementation(
        (key: string) => key === SCOPE_KEY ? 'district' as ScopeLevel : undefined,
      );
      const req = mockRequest({ id: 'u1', role: 'anggota' });
      expect(guard.canActivate(mockExecutionContext(req))).toBe(false);
    });
  });

  describe('No user on request', () => {
    it('should deny access when user is not authenticated', () => {
      jest.spyOn(reflector, 'getAllAndOverride').mockImplementation(
        (key: string) => key === SCOPE_KEY ? 'self' as ScopeLevel : undefined,
      );
      const req = { user: undefined as never, scope: undefined };
      expect(guard.canActivate(mockExecutionContext(req))).toBe(false);
    });
  });

  describe('Scope resolution', () => {
    it('should set empty scope for superadmin (no rantingId)', () => {
      jest.spyOn(reflector, 'getAllAndOverride').mockImplementation(
        (key: string) => key === SCOPE_KEY ? 'branch' as ScopeLevel : undefined,
      );
      const req = mockRequest({ id: 'u1', role: 'superadmin' });
      guard.canActivate(mockExecutionContext(req));
      expect(req.scope).toEqual({});
    });

    it('should set rantingId in scope for admin_ranting', () => {
      jest.spyOn(reflector, 'getAllAndOverride').mockImplementation(
        (key: string) => key === SCOPE_KEY ? 'branch' as ScopeLevel : undefined,
      );
      const req = mockRequest({ id: 'u1', role: 'admin_ranting', rantingId: 'r123' });
      guard.canActivate(mockExecutionContext(req));
      expect(req.scope).toEqual({ rantingId: 'r123' });
    });
  });
});

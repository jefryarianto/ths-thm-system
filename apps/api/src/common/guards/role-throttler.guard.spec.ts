import { ExecutionContext } from '@nestjs/common';
import { RoleBasedThrottlerGuard } from './role-throttler.guard';

describe('RoleBasedThrottlerGuard', () => {
  let guard: RoleBasedThrottlerGuard;

  beforeEach(() => {
    guard = new RoleBasedThrottlerGuard({} as never, {} as never, { getAllAndOverride: jest.fn() } as never);
  });

  it('should be defined', () => {
    expect(guard).toBeDefined();
  });

  describe('getTracker', () => {
    it('should return user ID for authenticated requests', async () => {
      const req = { user: { id: 'user-123' } };
      const result = await (guard as any).getTracker(req);
      expect(result).toBe('user-123');
    });

    it('should fallback to IP for unauthenticated requests', async () => {
      const req = { ip: '192.168.1.1' };
      const result = await (guard as any).getTracker(req);
      expect(result).toBe('192.168.1.1');
    });

    it('should return unknown when no user or IP', async () => {
      const req = {};
      const result = await (guard as any).getTracker(req);
      expect(result).toBe('unknown');
    });

    it('should prefer user ID over IP', async () => {
      const req = { user: { id: 'user-123' }, ip: '192.168.1.1' };
      const result = await (guard as any).getTracker(req);
      expect(result).toBe('user-123');
    });
  });

  describe('handleRequest - role-based limits', () => {
    const createMockContext = (role?: string): ExecutionContext => ({
      switchToHttp: () => ({
        getRequest: () => ({
          user: role ? { role } : undefined,
          ip: '127.0.0.1',
        }),
        getResponse: () => ({}),
      }),
      getHandler: () => ({}),
      getClass: () => ({}),
    } as never);

    const createRequestProps = (context: ExecutionContext, limit = 100, ttl = 60) => ({
      context,
      limit,
      ttl,
      throttler: { name: 'default', ttl, limit },
      blockDuration: 0,
      getTracker: jest.fn().mockResolvedValue('test-tracker'),
      generateKey: jest.fn().mockReturnValue('test-key'),
    });

    it('should use anonymous limits for unauthenticated users', async () => {
      const context = createMockContext(undefined);
      const superSpy = jest.spyOn(
        Object.getPrototypeOf(Object.getPrototypeOf(guard)),
        'handleRequest',
      ).mockResolvedValue(true);

      const props = createRequestProps(context);
      await (guard as any).handleRequest(props);

      expect(props.limit).toBe(20);
      expect(props.ttl).toBe(60);
      expect(superSpy).toHaveBeenCalled();
      superSpy.mockRestore();
    });

    it('should use anggota limits for anggota role', async () => {
      const context = createMockContext('anggota');
      jest.spyOn(
        Object.getPrototypeOf(Object.getPrototypeOf(guard)),
        'handleRequest',
      ).mockResolvedValue(true);

      const props = createRequestProps(context);
      await (guard as any).handleRequest(props);

      expect(props.limit).toBe(60);
    });

    it('should use superadmin limits for superadmin role', async () => {
      const context = createMockContext('superadmin');
      jest.spyOn(
        Object.getPrototypeOf(Object.getPrototypeOf(guard)),
        'handleRequest',
      ).mockResolvedValue(true);

      const props = createRequestProps(context);
      await (guard as any).handleRequest(props);

      expect(props.limit).toBe(200);
    });

    it('should use admin_ranting limits for admin_ranting role', async () => {
      const context = createMockContext('admin_ranting');
      jest.spyOn(
        Object.getPrototypeOf(Object.getPrototypeOf(guard)),
        'handleRequest',
      ).mockResolvedValue(true);

      const props = createRequestProps(context);
      await (guard as any).handleRequest(props);

      expect(props.limit).toBe(100);
    });

    it('should use admin_wilayah limits for admin_wilayah role', async () => {
      const context = createMockContext('admin_wilayah');
      jest.spyOn(
        Object.getPrototypeOf(Object.getPrototypeOf(guard)),
        'handleRequest',
      ).mockResolvedValue(true);

      const props = createRequestProps(context);
      await (guard as any).handleRequest(props);

      expect(props.limit).toBe(120);
    });

    it('should use admin_distrik limits for admin_distrik role', async () => {
      const context = createMockContext('admin_distrik');
      jest.spyOn(
        Object.getPrototypeOf(Object.getPrototypeOf(guard)),
        'handleRequest',
      ).mockResolvedValue(true);

      const props = createRequestProps(context);
      await (guard as any).handleRequest(props);

      expect(props.limit).toBe(150);
    });

    it('should fall back to default limit for unknown roles', async () => {
      const context = createMockContext('unknown_role');
      jest.spyOn(
        Object.getPrototypeOf(Object.getPrototypeOf(guard)),
        'handleRequest',
      ).mockResolvedValue(true);

      const props = createRequestProps(context);
      await (guard as any).handleRequest(props);

      // Unknown role falls back to base limit
      expect(props.limit).toBe(100);
    });
  });
});

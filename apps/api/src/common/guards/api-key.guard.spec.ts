import { ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ApiKeyGuard, ApiKeyStore, ApiKeyAuth, API_KEY_AUTH_KEY } from './api-key.guard';

describe('ApiKeyStore', () => {
  let store: ApiKeyStore;

  beforeEach(() => {
    // Clear env
    delete process.env.API_KEYS;
    store = new ApiKeyStore();
  });

  it('should be defined', () => {
    expect(store).toBeDefined();
  });

  it('should load keys from API_KEYS env variable', () => {
    process.env.API_KEYS = JSON.stringify([
      { key: 'test-key-12345678', role: 'admin_ranting', description: 'Mobile app' },
    ]);
    const s = new ApiKeyStore();
    expect(s.validate('test-key-12345678')).toBeDefined();
    expect(s.validate('test-key-12345678')?.role).toBe('admin_ranting');
  });

  it('should return undefined for invalid key', () => {
    expect(store.validate('nonexistent')).toBeUndefined();
  });

  it('should register and validate keys programmatically', () => {
    store.register({ key: 'prog-key', role: 'superadmin', description: 'Test' });
    expect(store.validate('prog-key')).toBeDefined();
    expect(store.validate('prog-key')?.role).toBe('superadmin');
  });

  it('should remove keys', () => {
    store.register({ key: 'remove-me', role: 'anggota' });
    expect(store.validate('remove-me')).toBeDefined();
    store.remove('remove-me');
    expect(store.validate('remove-me')).toBeUndefined();
  });

  it('should list all keys with preview', () => {
    store.register({ key: 'abcdefghijklmnop', role: 'superadmin', description: 'External API' });
    const all = store.getAll();
    expect(all).toHaveLength(1);
    expect(all[0].keyPreview).toBe('abcdefgh...mnop');
    expect(all[0].role).toBe('superadmin');
    expect(all[0].description).toBe('External API');
  });

  it('should handle malformed API_KEYS env gracefully', () => {
    process.env.API_KEYS = 'not-json';
    const s = new ApiKeyStore();
    expect(s.validate('anything')).toBeUndefined();
  });
});

describe('ApiKeyGuard', () => {
  let guard: ApiKeyGuard;
  let reflector: Reflector;
  let store: ApiKeyStore;

  const createMockContext = (headers: Record<string, string> = {}): ExecutionContext => ({
    switchToHttp: () => ({
      getRequest: () => ({
        headers,
        ip: '127.0.0.1',
        user: undefined,
        scope: undefined,
      }),
    }),
    getHandler: () => ({}),
    getClass: () => ({}),
  } as never);

  beforeEach(() => {
    reflector = { getAllAndOverride: jest.fn() } as never;
    store = new ApiKeyStore();
    guard = new ApiKeyGuard(reflector, store);
  });

  it('should be defined', () => {
    expect(guard).toBeDefined();
  });

  describe('when endpoint does not require API key', () => {
    it('should allow access without API key', () => {
      jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(undefined);
      expect(guard.canActivate(createMockContext())).toBe(true);
    });
  });

  describe('when endpoint requires API key (@ApiKeyAuth)', () => {
    beforeEach(() => {
      jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(true);
    });

    it('should throw UnauthorizedException when no API key header', () => {
      expect(() => guard.canActivate(createMockContext())).toThrow('API key diperlukan');
    });

    it('should throw UnauthorizedException for invalid API key', () => {
      const ctx = createMockContext({ 'x-api-key': 'invalid-key' });
      expect(() => guard.canActivate(ctx)).toThrow('API key tidak valid');
    });

    it('should allow access and attach user for valid API key', () => {
      store.register({ key: 'valid-key', role: 'admin_ranting', description: 'Test integration' });
      const request = { headers: { 'x-api-key': 'valid-key' }, ip: '10.0.0.1', user: undefined, scope: undefined };
      const ctx = ({
        switchToHttp: () => ({ getRequest: () => request }),
        getHandler: () => ({}),
        getClass: () => ({}),
      } as never);

      expect(guard.canActivate(ctx)).toBe(true);
      expect(request.user).toBeDefined();
      const user = request.user as unknown as { role: string; email: string };
      expect(user.role).toBe('admin_ranting');
      expect(user.email).toContain('apikey@');
    });

    it('should attach scope from API key config', () => {
      store.register({
        key: 'scoped-key',
        role: 'admin_ranting',
        description: 'Branch app',
        scope: { rantingId: 'ranting-123' },
      });
      const request = { headers: { 'x-api-key': 'scoped-key' }, ip: '10.0.0.1', user: undefined, scope: undefined };
      const ctx = ({
        switchToHttp: () => ({ getRequest: () => request }),
        getHandler: () => ({}),
        getClass: () => ({}),
      } as never);

      guard.canActivate(ctx);
      expect(request.scope).toEqual({ rantingId: 'ranting-123' });
    });
  });
});

describe('@ApiKeyAuth decorator', () => {
  it('should set API_KEY_AUTH_KEY metadata on handler', () => {
    class TestController {
      @ApiKeyAuth()
      testMethod() {}
    }

    const metadata = Reflect.getMetadata(API_KEY_AUTH_KEY, TestController.prototype.testMethod);
    expect(metadata).toBe(true);
  });
});

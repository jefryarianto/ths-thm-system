import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// ─── Mock localStorage before anything else ───
const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: (key: string) => store[key] ?? null,
    setItem: (key: string, value: string) => {
      store[key] = value;
    },
    removeItem: (key: string) => {
      delete store[key];
    },
    clear: () => {
      store = {};
    },
    get length() {
      return Object.keys(store).length;
    },
    key: (index: number) => Object.keys(store)[index] ?? null,
  };
})();
Object.defineProperty(globalThis, 'localStorage', { value: localStorageMock, writable: true });

// ─── mock axios BEFORE importing api-client ───
vi.mock('axios', () => {
  const mockAxiosInstance = {
    interceptors: {
      request: { use: vi.fn() },
      response: { use: vi.fn() },
    },
    get: vi.fn(),
    post: vi.fn(),
  };

  return {
    default: Object.assign(
      vi.fn(() => mockAxiosInstance),
      { create: vi.fn(() => mockAxiosInstance) },
    ),
  };
});

import apiClient, { unwrap, unwrapPaginated, setTokens, clearTokens } from '@/lib/api-client';

describe('api-client', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  // ─── Token Management ───

  describe('setTokens', () => {
    it('stores access and refresh tokens in localStorage', () => {
      setTokens('my-access-token', 'my-refresh-token');
      expect(localStorage.getItem('accessToken')).toBe('my-access-token');
      expect(localStorage.getItem('refreshToken')).toBe('my-refresh-token');
    });
  });

  describe('clearTokens', () => {
    it('removes both tokens from localStorage', () => {
      localStorage.setItem('accessToken', 'something');
      localStorage.setItem('refreshToken', 'something');
      clearTokens();
      expect(localStorage.getItem('accessToken')).toBeNull();
      expect(localStorage.getItem('refreshToken')).toBeNull();
    });

    it('does not throw when tokens are not present', () => {
      expect(() => clearTokens()).not.toThrow();
    });
  });

  // ─── Response Helpers ───

  describe('unwrap', () => {
    it('extracts data from a standard API response', () => {
      const response = {
        data: { success: true, data: { id: '1', name: 'Test' } },
      };
      expect(unwrap(response)).toEqual({ id: '1', name: 'Test' });
    });

    it('returns undefined when inner data is missing', () => {
      const response: { data: { success: boolean; data?: unknown } } = {
        data: { success: true },
      };
      expect(unwrap(response as Parameters<typeof unwrap>[0])).toBeUndefined();
    });

    it('works with primitive values', () => {
      const response = {
        data: { success: true, data: 42 },
      };
      expect(unwrap(response)).toBe(42);
    });

    it('works with array data', () => {
      const response = {
        data: { success: true, data: [{ id: '1' }, { id: '2' }] },
      };
      expect(unwrap(response)).toEqual([{ id: '1' }, { id: '2' }]);
    });
  });

  describe('unwrapPaginated', () => {
    it('extracts paginated response with data and meta', () => {
      const response = {
        data: {
          success: true,
          data: {
            data: [{ id: '1', name: 'Item 1' }],
            meta: { total: 1, totalPages: 1 },
          },
        },
      };
      const result = unwrapPaginated(response);
      expect(result.data).toEqual([{ id: '1', name: 'Item 1' }]);
      expect(result.meta).toEqual({ total: 1, totalPages: 1 });
    });

    it('handles empty paginated response', () => {
      const response = {
        data: {
          success: true,
          data: {
            data: [],
            meta: { total: 0, totalPages: 0 },
          },
        },
      };
      const result = unwrapPaginated(response);
      expect(result.data).toEqual([]);
      expect(result.meta.total).toBe(0);
    });
  });

  // ─── Request Interceptor ───

  describe('request interceptor', () => {
    it('attaches Authorization header when token exists', () => {
      localStorage.setItem('accessToken', 'test-token');
      const config: { headers: Record<string, string> } = { headers: {} };

      const { use } = (
        apiClient as unknown as { interceptors: { request: { use: ReturnType<typeof vi.fn> } } }
      ).interceptors.request;
      const interceptorFn = use.mock.calls[0][0] as (config: {
        headers: Record<string, string>;
      }) => typeof config;
      const result = interceptorFn(config);

      expect(result.headers.Authorization).toBe('Bearer test-token');
    });

    it('does not attach Authorization header when no token', () => {
      const config: { headers: Record<string, string> } = { headers: {} };

      const { use } = (
        apiClient as unknown as { interceptors: { request: { use: ReturnType<typeof vi.fn> } } }
      ).interceptors.request;
      const interceptorFn = use.mock.calls[0][0] as (config: {
        headers: Record<string, string>;
      }) => typeof config;
      const result = interceptorFn(config);

      expect(result.headers.Authorization).toBeUndefined();
    });
  });

  // ─── Response Interceptor ───

  describe('response interceptor - 401 handling', () => {
    it('calls the success handler directly for non-error responses', () => {
      const { use } = (
        apiClient as unknown as { interceptors: { response: { use: ReturnType<typeof vi.fn> } } }
      ).interceptors.response;
      const successHandler = use.mock.calls[0][0] as (response: unknown) => typeof response;
      const response = { data: 'ok' };

      expect(successHandler(response)).toBe(response);
    });

    it('rejects non-401 errors without attempting token refresh', async () => {
      const { use } = (
        apiClient as unknown as { interceptors: { response: { use: ReturnType<typeof vi.fn> } } }
      ).interceptors.response;
      const errorHandler = use.mock.calls[0][1] as (error: {
        response?: { status: number };
        config: { _retry?: boolean };
      }) => Promise<unknown>;

      const error = {
        response: { status: 500 },
        config: {},
      };

      await expect(errorHandler(error)).rejects.toBe(error);
    });
  });

  describe('clearTokens on auth failure', () => {
    it('exposes clearTokens as an exported function', () => {
      expect(clearTokens).toBeDefined();
      expect(typeof clearTokens).toBe('function');
    });
  });
});

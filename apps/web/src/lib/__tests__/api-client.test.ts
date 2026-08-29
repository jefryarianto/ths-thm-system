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
  // Instance dari axios.create() harus CALLABLE — api-client memanggil ulang
  // apiClient(config) untuk retry setelah refresh sukses.
  const mockAxiosInstance = Object.assign(vi.fn(() => Promise.resolve({ data: {} })), {
    interceptors: {
      request: { use: vi.fn() },
      response: { use: vi.fn() },
    },
    get: vi.fn(),
    post: vi.fn(),
  });

  const mockedAxios = Object.assign(vi.fn(() => mockAxiosInstance), {
    create: vi.fn(() => mockAxiosInstance),
    // api-client memanggil axios.post (default export) untuk /auth/refresh
    get: vi.fn(),
    post: vi.fn(),
    isCancel: vi.fn(() => false),
    CancelToken: class {},
  });

  return {
    default: mockedAxios,
  };
});

import axios from 'axios';
import apiClient, { unwrap, unwrapPaginated, setTokens, clearTokens } from '@/lib/api-client';
import { sessionManager } from '@/lib/session-manager';

describe('api-client', () => {
  beforeEach(() => {
    localStorage.clear();
    // Reset shared session state so tests are isolated (clearTokens sets isExpired).
    sessionManager.reset();
    // Bersihkan history panggilan antar-test (restoreAllMocks tidak
    // menghapus call history mock dari vi.mock factory).
    vi.mocked(axios.post).mockClear();
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
    // Interceptor kini async (mendukung self-healing refresh), jadi hasilnya
    // berupa Promise yang harus di-await.
    const getRequestInterceptor = () =>
      (
        apiClient as unknown as { interceptors: { request: { use: ReturnType<typeof vi.fn> } } }
      ).interceptors.request.use.mock.calls[0][0] as (config: {
        url?: string;
        headers: Record<string, string>;
      }) => Promise<{ url?: string; headers: Record<string, string> }>;

    it('attaches Authorization header when token exists', async () => {
      localStorage.setItem('accessToken', 'test-token');
      const config = { headers: {} as Record<string, string> };
      const result = await getRequestInterceptor()(config);

      expect(result.headers.Authorization).toBe('Bearer test-token');
    });

    it('does not attach Authorization header when no token', async () => {
      const config = { headers: {} as Record<string, string> };
      const result = await getRequestInterceptor()(config);

      expect(result.headers.Authorization).toBeUndefined();
    });
  });

  // ─── Request Interceptor: self-healing saat flag expired ───

  describe('request interceptor - session expiry self-healing', () => {
    const getRequestInterceptor = () =>
      (
        apiClient as unknown as { interceptors: { request: { use: ReturnType<typeof vi.fn> } } }
      ).interceptors.request.use.mock.calls[0][0] as (config: {
        url?: string;
        headers: Record<string, string>;
      }) => Promise<{ url?: string; headers: Record<string, string> }>;

    it('attempts a silent refresh and proceeds when the expired flag is stale', async () => {
      sessionManager.expire(false); // tandai expired tanpa redirect
      vi.mocked(axios.post).mockResolvedValue({
        data: { data: { accessToken: 'recovered-token' } },
      });

      const config = { url: '/members', headers: {} as Record<string, string> };
      const result = await getRequestInterceptor()(config);

      expect(axios.post).toHaveBeenCalledWith('/api/auth/refresh', {}, { withCredentials: true });
      expect(result.headers.Authorization).toBe('Bearer recovered-token');
      expect(localStorage.getItem('accessToken')).toBe('recovered-token');
      // Flag expired berhasil dipulihkan — sesi hidup kembali tanpa logout.
      expect(sessionManager.isExpired).toBe(false);
    });

    it('lets auth endpoints pass through without any refresh attempt', async () => {
      sessionManager.expire(false);
      const config = { url: '/auth/login', headers: {} as Record<string, string> };

      const result = await getRequestInterceptor()(config);

      expect(result).toBe(config);
      expect(axios.post).not.toHaveBeenCalled();
    });

    it('rejects with SESSION_EXPIRED when recovery refresh is rejected as unauthorized', async () => {
      sessionManager.expire(false);
      vi.mocked(axios.post).mockRejectedValue({ response: { status: 401 } });

      const config = { url: '/members', headers: {} as Record<string, string> };

      await expect(getRequestInterceptor()(config)).rejects.toThrow('SESSION_EXPIRED');
      expect(sessionManager.isExpired).toBe(true);
    });

    it('keeps the session alive and surfaces a retryable error on transient refresh failure', async () => {
      sessionManager.expire(false);
      localStorage.setItem('accessToken', 'kept-token'); // expire() menghapus token → set ulang
      vi.mocked(axios.post).mockRejectedValue(new Error('Network Error'));

      const config = { url: '/members', headers: {} as Record<string, string> };

      // Bukan SESSION_EXPIRED (yang dibungkam UI), melainkan error ternormalisasi.
      await expect(getRequestInterceptor()(config)).rejects.toEqual({
        status: 0,
        message: 'Network Error',
        data: null,
      });
      // Sesi TIDAK dianggap berakhir dan token TIDAK dihapus.
      expect(sessionManager.isExpired).toBe(true);
      expect(localStorage.getItem('accessToken')).toBe('kept-token');
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

      // Error normalization wraps the original error into a consistent shape
      await expect(errorHandler(error)).rejects.toEqual({
        status: 500,
        message: 'Terjadi kesalahan pada server.',
        data: null,
      });
    });
  });

  // ─── Response Interceptor: semantik kegagalan refresh ───

  describe('response interceptor - refresh failure semantics', () => {
    const getResponseErrorHandler = () =>
      (
        apiClient as unknown as { interceptors: { response: { use: ReturnType<typeof vi.fn> } } }
      ).interceptors.response.use.mock.calls[0][1] as (error: {
        response?: { status: number; data?: { message?: string } };
        config: { headers?: Record<string, string>; _retry?: boolean };
        message?: string;
        code?: string;
      }) => Promise<unknown>;

    it('retries the original request once after a successful refresh', async () => {
      vi.mocked(axios.post).mockResolvedValue({
        data: { data: { accessToken: 'fresh-token' } },
      });

      const error = { response: { status: 401 }, config: { headers: {} as Record<string, string> } };
      const result = await getResponseErrorHandler()(error);

      expect(axios.post).toHaveBeenCalledWith('/api/auth/refresh', {}, { withCredentials: true });
      expect(error.config.headers?.Authorization).toBe('Bearer fresh-token');
      expect(result).toBeDefined();
    });

    it('expires the session when refresh is rejected with 401 (genuine expiry)', async () => {
      vi.mocked(axios.post).mockRejectedValue({
        response: { status: 401, data: { message: 'Token tidak valid atau kadaluarsa' } },
      });

      const error = { response: { status: 401 }, config: { headers: {} } };
      await expect(getResponseErrorHandler()(error)).rejects.toThrow('SESSION_EXPIRED');

      expect(sessionManager.isExpired).toBe(true);
      expect(localStorage.getItem('accessToken')).toBeNull();
    });

    it('does NOT expire the session when refresh fails transiently (network error)', async () => {
      localStorage.setItem('accessToken', 'still-present');
      vi.mocked(axios.post).mockRejectedValue(new Error('Network Error'));

      const error = { response: { status: 401 }, config: { headers: {} } };
      await expect(getResponseErrorHandler()(error)).rejects.toEqual({
        status: 0,
        message: 'Network Error',
        data: null,
      });

      // Sesi tetap hidup — tanpa logout palsu, token tidak dihapus.
      expect(sessionManager.isExpired).toBe(false);
      expect(localStorage.getItem('accessToken')).toBe('still-present');
    });

    it('does NOT expire the session when refresh fails with a 5xx error', async () => {
      vi.mocked(axios.post).mockRejectedValue({
        response: { status: 503, data: { message: 'Service Unavailable' } },
      });

      const error = { response: { status: 401 }, config: { headers: {} } };
      await expect(getResponseErrorHandler()(error)).rejects.toEqual({
        status: 503,
        message: 'Service Unavailable',
        data: { message: 'Service Unavailable' },
      });

      expect(sessionManager.isExpired).toBe(false);
    });
  });

  describe('clearTokens on auth failure', () => {
    it('exposes clearTokens as an exported function', () => {
      expect(clearTokens).toBeDefined();
      expect(typeof clearTokens).toBe('function');
    });
  });
});

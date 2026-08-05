import axios from 'axios';

// Use relative URL so requests go through Next.js proxy (no CORS issues)
// Next.js rewrites in next.config.js proxy /api/* to the backend on the server side.
const apiClient = axios.create({
  baseURL: '/api',
  headers: {
    'Content-Type': 'application/json',
  },
});

let isRefreshing = false;
let refreshSubscribers: Array<(token: string) => void> = [];

function onTokenRefreshed(token: string) {
  refreshSubscribers.forEach((cb) => cb(token));
  refreshSubscribers = [];
}

function addRefreshSubscriber(cb: (token: string) => void) {
  refreshSubscribers.push(cb);
}

apiClient.interceptors.request.use((config) => {
  if (typeof window !== 'undefined') {
    const token = localStorage.getItem('accessToken');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
  }
  return config;
});

apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    if (!originalRequest) {
      return Promise.reject(error);
    }

    // ─── NETWORK RETRY STRATEGY ───
    const isNetworkError =
      error.code === 'ECONNABORTED' ||
      error.message?.includes('Network Error') ||
      !error.response;

    if (isNetworkError && !originalRequest._retryCount) {
      originalRequest._retryCount = 1;
    }

    if (isNetworkError && originalRequest._retryCount <= 2) {
      const delay = 500 * originalRequest._retryCount;
      await new Promise((res) => setTimeout(res, delay));
      originalRequest._retryCount += 1;
      return apiClient(originalRequest);
    }

    // ─── TOKEN REFRESH HANDLING ───
    if (error.response?.status === 401 && !originalRequest._retry) {
      if (isRefreshing) {
        return new Promise((resolve) => {
          addRefreshSubscriber((token: string) => {
            originalRequest.headers.Authorization = `Bearer ${token}`;
            resolve(apiClient(originalRequest));
          });
        });
      }

      originalRequest._retry = true;
      isRefreshing = true;

      try {
        // refreshToken sekarang dikirim secara otomatis sebagai HttpOnly cookie
        const { data } = await axios.post(`/api/auth/refresh`, {}, { withCredentials: true });

        const newToken = data.data.accessToken;
        localStorage.setItem('accessToken', newToken);

        onTokenRefreshed(newToken);

        originalRequest.headers.Authorization = `Bearer ${newToken}`;
        return apiClient(originalRequest);
      } catch {
        localStorage.removeItem('accessToken');
        if (typeof window !== 'undefined') {
          window.location.href = '/login';
        }
      } finally {
        isRefreshing = false;
      }
    }

    // ─── ERROR NORMALIZATION ───
    const normalizedError = {
      status: error.response?.status ?? 0,
      message:
        error.response?.data?.message ||
        error.message ||
        'Terjadi kesalahan pada server.',
      data: error.response?.data ?? null,
    };

    return Promise.reject(normalizedError);
  },
);

export default apiClient;

export const setTokens = (accessToken: string, refreshToken: string) => {
  localStorage.setItem('accessToken', accessToken);
  localStorage.setItem('refreshToken', refreshToken);
};

export const clearTokens = () => {
  localStorage.removeItem('accessToken');
  localStorage.removeItem('refreshToken');
};

/**
 * Extract a readable error message from an apiClient rejection.
 *
 * apiClient's response interceptor normalizes every rejection to
 * `{ status, message, data }` — so page-level `err.response?.data?.message`
 * access is dead code and always yields `undefined`. The real server message
 * (e.g. 'Email sudah terdaftar') lives on `err.message`, which NestJS
 * ValidationPipe may provide as an array of strings — joined here.
 *
 * Returns `''` when no message is available so callers can keep the idiomatic
 * `extractErrorMessage(err) || 'Fallback text'` pattern.
 *
 * @param err      The rejected value (usually `unknown` from a catch clause)
 * @param fallback Message shown when no server message is available
 */
export function extractErrorMessage(err: unknown, fallback?: string): string {
  const raw = (err as { message?: string | string[] } | null)?.message;
  const msg = Array.isArray(raw) ? raw.join(', ') : raw;
  return msg?.trim() ? msg : (fallback ?? '');
}

// ─── Response Helpers ───

/** Standard API response wrapper from the backend */
export interface ApiResponse<T> {
  success: boolean;
  message?: string;
  data: T;
}

/** Paginated list envelope */
export interface PaginatedResponse<T> {
  data: T[];
  meta: {
    total: number;
    totalPages: number;
    page?: number;
    limit?: number;
  };
}

/**
 * Unwrap `r.data.data` from an Axios response.
 *
 * @example
 * ```tsx
 * // Before:
 * apiClient.get('/settings').then(r => setOrg(r.data.data))
 *
 * // After:
 * apiClient.get('/settings').then(res => setOrg(unwrap(res)))
 *
 * // With useApi:
 * const { data, loading } = useApi(() => apiClient.get('/foo').then(unwrap))
 * ```
 */
// eslint-disable-next-line no-restricted-syntax
export const unwrap = <T>(response: { data: ApiResponse<T> }): T => response.data.data;

/**
 * Unwrap a paginated response.
 *
 * @example
 * ```tsx
 * // Before:
 * apiClient.get('/items').then(r => ({ data: r.data.data, meta: r.data.meta }))
 *
 * // After:
 * apiClient.get('/items').then(unwrapPaginated)
 *
 * // With usePaginatedList:
 * usePaginatedList(() => apiClient.get('/items').then(unwrapPaginated), [page])
 * ```
 */
// eslint-disable-next-line no-restricted-syntax
export const unwrapPaginated = <T>(response: {
  data: ApiResponse<PaginatedResponse<T>>;
}): PaginatedResponse<T> => response.data.data;

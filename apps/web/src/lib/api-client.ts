import axios from 'axios';

// Use relative URL so requests go through Next.js proxy (no CORS issues)
// Next.js rewrites in next.config.js proxy /api/* to the backend on the server side.
const apiClient = axios.create({
  baseURL: '/api',
});

// --- Session expiry guard ---
// Once the session is known to be expired, reject all further requests
// immediately and redirect to /login. This prevents:
//   1. Multiple concurrent refresh attempts
//   2. Components rendering with empty/errored data
//   3. Users seeing error messages before the redirect
let sessionExpired = false;

/** A promise that never resolves - used to swallow API calls after session expiry */
const PENDING_PROMISE = new Promise<never>(() => {});

function triggerSessionExpired() {
  if (sessionExpired) return;
  sessionExpired = true;
  localStorage.removeItem('accessToken');
  localStorage.removeItem('refreshToken');
  localStorage.setItem('session-expired', 'true');
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('session-expired'));
    // Hard redirect - takes effect after current JS stack finishes.
    // Components will stay in loading state (never-resolving promise) until
    // the page unloads, preventing any error flash.
    window.location.href = '/login';
  }
}

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
  if (sessionExpired) {
    // Return a never-resolving promise so the component stays in loading
    // state instead of showing an error. The page will unload when the
    // redirect completes.
    return PENDING_PROMISE;
  }
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
    if (sessionExpired || axios.isCancel(error)) {
      // Swallow the error - never-resolving promise prevents component
      // from rendering error state while the redirect is in progress.
      return PENDING_PROMISE;
    }

    const originalRequest = error.config;

    if (!originalRequest) {
      return Promise.reject(error);
    }

    // --- NETWORK RETRY STRATEGY ---
    const isNetworkError =
      error.code === 'ECONNABORTED' || error.message?.includes('Network Error') || !error.response;

    if (isNetworkError && !originalRequest._retryCount) {
      originalRequest._retryCount = 1;
    }

    if (isNetworkError && originalRequest._retryCount <= 2) {
      const delay = 500 * originalRequest._retryCount;
      await new Promise((res) => setTimeout(res, delay));
      originalRequest._retryCount += 1;
      return apiClient(originalRequest);
    }

    // --- TOKEN REFRESH HANDLING ---
    if (error.response?.status === 401 && !originalRequest._retry) {
      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          addRefreshSubscriber((token: string) => {
            originalRequest.headers.Authorization = `Bearer ${token}`;
            resolve(apiClient(originalRequest));
          });
          setTimeout(() => {
            if (!sessionExpired) {
              triggerSessionExpired();
            }
            // Never-resolving promise - prevents component error state
            reject(PENDING_PROMISE);
          }, 5000);
        });
      }

      originalRequest._retry = true;
      isRefreshing = true;

      try {
        const { data } = await axios.post(`/api/auth/refresh`, {}, { withCredentials: true });
        const newToken = data.data.accessToken;
        localStorage.setItem('accessToken', newToken);
        onTokenRefreshed(newToken);
        originalRequest.headers.Authorization = `Bearer ${newToken}`;
        return apiClient(originalRequest);
      } catch {
        triggerSessionExpired();
        return PENDING_PROMISE;
      } finally {
        isRefreshing = false;
      }
    }

    // --- ERROR NORMALIZATION ---
    const normalizedError = {
      status: error.response?.status ?? 0,
      message:
        error.response?.data?.message || error.message || 'Terjadi kesalahan pada server.',
      data: error.response?.data ?? null,
    };

    return Promise.reject(normalizedError);
  },
);

export default apiClient;

export const setTokens = (accessToken: string, refreshToken: string) => {
  sessionExpired = false;
  localStorage.setItem('accessToken', accessToken);
  localStorage.setItem('refreshToken', refreshToken);
};

export const clearTokens = () => {
  sessionExpired = true;
  localStorage.removeItem('accessToken');
  localStorage.removeItem('refreshToken');
};

/**
 * Extract a readable error message from an apiClient rejection.
 */
export function extractErrorMessage(err: unknown, fallback?: string): string {
  const raw = (err as { message?: string | string[] } | null)?.message;
  const msg = Array.isArray(raw) ? raw.join(', ') : raw;
  return msg?.trim() ? msg : (fallback ?? '');
}

// --- Response Helpers ---

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

// eslint-disable-next-line no-restricted-syntax
export const unwrap = <T>(response: { data: ApiResponse<T> }): T => response.data.data;

// eslint-disable-next-line no-restricted-syntax
export const unwrapPaginated = <T>(response: {
  data: ApiResponse<PaginatedResponse<T>>;
}): PaginatedResponse<T> => response.data.data;

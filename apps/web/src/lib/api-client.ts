import axios from 'axios';
import { sessionManager } from './session-manager';

// Use relative URL so requests go through Next.js proxy (no CORS issues)
// Next.js rewrites in next.config.js proxy /api/* to the backend on the server side.
const apiClient = axios.create({
  baseURL: '/api',
});

// ─── Session Expiry ───────────────────────────────────────────────
const SESSION_EXPIRED_ERROR = new Error('SESSION_EXPIRED');

/**
 * Called when the session is known to be expired.
 * Delegates to SessionManager to clear tokens, set the flag, and notify subscribers.
 * The SessionProvider (subscribed to SessionManager) handles showing the toast
 * and redirecting to /login.
 */
function triggerSessionExpired() {
  sessionManager.expire();
}

// ─── Token Refresh ────────────────────────────────────────────────

let isRefreshing = false;
let refreshSubscribers: Array<(token: string) => void> = [];

function onTokenRefreshed(token: string) {
  refreshSubscribers.forEach((cb) => cb(token));
  refreshSubscribers = [];
}

function addRefreshSubscriber(cb: (token: string) => void) {
  refreshSubscribers.push(cb);
}

// ─── Interceptors ─────────────────────────────────────────────────

function getAccessToken(): string | null {
  if (typeof document !== 'undefined') {
    const match = document.cookie.match(/(?:^|;\s*)accessToken=([^;]+)/);
    if (match) return decodeURIComponent(match[1]);
  }
  if (typeof window !== 'undefined') {
    return localStorage.getItem('accessToken');
  }
  return null;
}

apiClient.interceptors.request.use((config) => {
  if (sessionManager.isExpired) {
    return Promise.reject(SESSION_EXPIRED_ERROR);
  }
  const token = getAccessToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (sessionManager.isExpired || axios.isCancel(error)) {
      return Promise.reject(SESSION_EXPIRED_ERROR);
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
    // Skip refresh on login/auth endpoints since there's no valid refresh token yet
    const isAuthEndpoint = originalRequest.url?.includes('/auth/login') || originalRequest.url?.includes('/auth/refresh');
    if (error.response?.status === 401 && !originalRequest._retry && !isAuthEndpoint) {
      if (isRefreshing) {
      // Wait for the ongoing refresh — if refresh fails, triggerSessionExpired()
      // will fire for the first requester; this one just gets rejected.
      return Promise.reject(SESSION_EXPIRED_ERROR);
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
        return Promise.reject(SESSION_EXPIRED_ERROR);
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
  sessionManager.reset();
  localStorage.setItem('accessToken', accessToken);
  localStorage.setItem('refreshToken', refreshToken);
};

export const clearTokens = () => {
  sessionManager.expire();
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

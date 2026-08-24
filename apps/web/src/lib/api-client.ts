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
 * Delegates to SessionManager to clear tokens, set the flag, and notify subscribers
 * (e.g. SessionProvider will display a toast and redirect to /login).
 */
function triggerSessionExpired() {
  sessionManager.expire();
}

/**
 * Show a toast via DOM (works even if React tree is in a broken state).
 * Called by SessionProvider which subscribes to SessionManager changes.
 */
function showSessionExpiredToast() {
  if (typeof window === 'undefined') return;

  if (document.getElementById('session-expired-toast')) return;

  const toast = document.createElement('div');
  toast.id = 'session-expired-toast';
  toast.style.cssText = [
    'position:fixed', 'bottom:24px', 'right:24px', 'z-index:99999',
    'display:flex', 'align-items:center', 'gap:10px',
    'padding:12px 20px', 'border-radius:12px',
    'border:1px solid #fecaca', 'background:#fef2f2',
    'box-shadow:0 10px 25px rgba(0,0,0,0.15)',
    'font-family:Inter,system-ui,sans-serif', 'font-size:14px',
    'color:#991b1b', 'max-width:420px',
  ].join(';');
  toast.innerHTML = [
    '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#dc2626" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="flex-shrink:0">',
    '<circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>',
    '<span>Sesi Anda telah berakhir. Mengalihkan ke halaman login...</span>',
  ].join('');
  document.body.appendChild(toast);
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
    if (error.response?.status === 401 && !originalRequest._retry) {
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

// ─── Session Expiry Toast ─────────────────────────────────────────
// Subscribe to session manager changes so the toast DOM element is shown
// whenever the session expires, even if React is in a broken state.
if (typeof window !== 'undefined') {
  sessionManager.subscribe(() => {
    if (sessionManager.isExpired) {
      showSessionExpiredToast();
    }
  });
}

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

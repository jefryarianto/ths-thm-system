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
  sessionManager.expire(true);
}

// ─── Token Refresh ────────────────────────────────────────────────

let isRefreshing = false;
type RefreshSubscriber = {
  resolve: (token: string) => void;
  reject: (error: any) => void;
};
let refreshSubscribers: RefreshSubscriber[] = [];

function onTokenRefreshed(token: string) {
  refreshSubscribers.forEach((cb) => cb.resolve(token));
  refreshSubscribers = [];
}

function onTokenRefreshFailed(error: any) {
  refreshSubscribers.forEach((cb) => cb.reject(error));
  refreshSubscribers = [];
}

function addRefreshSubscriber(
  resolve: (token: string) => void,
  reject: (error: any) => void
) {
  refreshSubscribers.push({ resolve, reject });
}

// ─── Cross-Tab Refresh Coordination ─────────────────────────────
// Ketika beberapa tab membuka sesi yang sama dan token akses kedaluwarsa
// bersamaan, hanya SATU tab yang boleh memanggil /auth/refresh. Tab lain
// menunggu token baru lewat BroadcastChannel (atau storage event sebagai
// fallback) sehingga tidak saling mengalahkan dalam race condition refresh
// token (yang dulu memicu logout di salah satu tab).

const isBrowser = typeof window !== 'undefined';
const REFRESH_LOCK_KEY = 'ths-auth-refresh-lock';
const REFRESH_LOCK_TTL = 10000; // 10 detik
// ID unik per tab untuk mendeteksi kalau kita "kalah" dalam race claim lock.
const tabId = `${Date.now()}-${Math.random().toString(36).slice(2)}`;

type RefreshMessage =
  | { type: 'REFRESH_SUCCESS'; token: string }
  | { type: 'REFRESH_FAILED' };

const refreshChannel: BroadcastChannel | null =
  isBrowser && typeof BroadcastChannel !== 'undefined'
    ? new BroadcastChannel('ths-thm-auth-refresh')
    : null;

// Resolver untuk tab yang menunggu hasil refresh dari tab lain.
let crossTabWaiters: Array<(token: string | null) => void> = [];

function resolveCrossTabWaiters(token: string | null) {
  const waiters = crossTabWaiters;
  crossTabWaiters = [];
  waiters.forEach((cb) => cb(token));
}

if (refreshChannel) {
  refreshChannel.onmessage = (e: MessageEvent<RefreshMessage>) => {
    if (e.data.type === 'REFRESH_SUCCESS') {
      resolveCrossTabWaiters(e.data.token);
    } else if (e.data.type === 'REFRESH_FAILED') {
      resolveCrossTabWaiters(null);
    }
  };
}

// Fallback tanpa BroadcastChannel: tab pengirim menulis accessToken ke
// localStorage, sehingga tab lain menerima storage event dan bisa mengambil
// token baru tersebut.
if (isBrowser) {
  window.addEventListener('storage', (e: StorageEvent) => {
    if (e.key === 'accessToken' && e.newValue) {
      resolveCrossTabWaiters(e.newValue);
    }
  });
}

function isAnotherTabRefreshing(): boolean {
  if (!isBrowser) return false;
  try {
    const raw = localStorage.getItem(REFRESH_LOCK_KEY);
    if (!raw) return false;
    const ts = Number(raw.split(':')[0]);
    if (Number.isNaN(ts) || Date.now() - ts > REFRESH_LOCK_TTL) {
      localStorage.removeItem(REFRESH_LOCK_KEY);
      return false;
    }
    return true;
  } catch {
    return false;
  }
}

// Claim lock secara best-effort. Mengembalikan true bila tab ini berhak me-refresh.
// Jika tab lain sudah/sementara memegang lock, atau kita kalah dalam race penulisan
// (nilai lock ternyata milik tab lain setelah dibaca kembali), kembalikan false agar
// tab ini menunggu hasil refresh dari tab lain.
function claimRefreshLock(): boolean {
  if (!isBrowser) return true;
  try {
    const existing = localStorage.getItem(REFRESH_LOCK_KEY);
    if (existing) {
      const ts = Number(existing.split(':')[0]);
      if (!Number.isNaN(ts) && Date.now() - ts <= REFRESH_LOCK_TTL) {
        return false; // tab lain sedang memegang lock
      }
    }
    const value = `${Date.now()}:${tabId}`;
    localStorage.setItem(REFRESH_LOCK_KEY, value);
    // Baca kembali untuk mendeteksi race: bila sudah milik tab lain, kita kalah.
    const written = localStorage.getItem(REFRESH_LOCK_KEY);
    return written === value || !!written && written.endsWith(`:${tabId}`);
  } catch {
    return true; // optimistis bila storage tidak bisa diakses
  }
}

function clearRefreshLock() {
  if (!isBrowser) return;
  try {
    localStorage.removeItem(REFRESH_LOCK_KEY);
  } catch {
    /* abaikan */
  }
}

function waitForCrossTabRefresh(): Promise<string | null> {
  return new Promise((resolve) => {
    crossTabWaiters.push(resolve);
    // Jika tidak ada broadcast dalam TTL, kembalikan null agar tab ini
    // melakukan refresh sendiri sebagai fallback.
    setTimeout(() => {
      const idx = crossTabWaiters.indexOf(resolve);
      if (idx !== -1) {
        crossTabWaiters.splice(idx, 1);
        resolve(null);
      }
    }, REFRESH_LOCK_TTL);
  });
}

// ─── Interceptors ─────────────────────────────────────────────────

function getAccessToken(): string | null {
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
        // Tab ini sedang me-refresh → antrekan request yang sama.
        return new Promise((resolve, reject) => {
          addRefreshSubscriber(
            (token: string) => {
              originalRequest.headers.Authorization = `Bearer ${token}`;
              resolve(apiClient(originalRequest));
            },
            (err: any) => {
              reject(err);
            }
          );
        });
      }

      // Tab lain mungkin sedang me-refresh → tunggu token barunya supaya tidak
      // memicu race condition antar-tab (yang dulu berujung logout di salah satu tab).
      if (isAnotherTabRefreshing()) {
        const token = await waitForCrossTabRefresh();
        if (token) {
          originalRequest.headers.Authorization = `Bearer ${token}`;
          return apiClient(originalRequest);
        }
        // Token null (timeout/kegagalan tab lain) → lanjut refresh sendiri sebagai fallback.
      }

      originalRequest._retry = true;
      isRefreshing = true;

      // Coba klaim lock antar-tab. Bila kalah (tab lain sudah/sementara me-refresh),
      // tunggu token barunya alih-alih me-refresh sendiri (menghindari race).
      if (!claimRefreshLock()) {
        const token = await waitForCrossTabRefresh();
        if (token) {
          originalRequest.headers.Authorization = `Bearer ${token}`;
          return apiClient(originalRequest);
        }
        // Lock sudah lewat/cleared → lanjut refresh sendiri sebagai fallback.
      }

      try {
        const { data } = await axios.post(`/api/auth/refresh`, {}, { withCredentials: true });
        const newToken = data.data.accessToken;
        localStorage.setItem('accessToken', newToken);
        // Also set in cookie for consistency with login flow
        if (typeof document !== 'undefined') {
          document.cookie = `accessToken=${newToken}; path=/; max-age=86400; SameSite=Lax`;
        }
        onTokenRefreshed(newToken);
        // Kabarkan tab lain agar bisa pakai token yang sama.
        refreshChannel?.postMessage({ type: 'REFRESH_SUCCESS', token: newToken });
        originalRequest.headers.Authorization = `Bearer ${newToken}`;
        return apiClient(originalRequest);
      } catch (err) {
        console.error('[api-client] Token refresh failed:', err);
        triggerSessionExpired();
        onTokenRefreshFailed(SESSION_EXPIRED_ERROR);
        // Kabarkan tab lain bahwa refresh gagal.
        refreshChannel?.postMessage({ type: 'REFRESH_FAILED' });
        return Promise.reject(SESSION_EXPIRED_ERROR);
      } finally {
        isRefreshing = false;
        clearRefreshLock();
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
  // Also set in cookie for consistency with login flow and middleware
  if (typeof document !== 'undefined') {
    document.cookie = `accessToken=${accessToken}; path=/; max-age=86400; SameSite=Lax`;
  }
};

export const clearTokens = () => {
  sessionManager.expire(true);
  if (typeof document !== 'undefined') {
    document.cookie = 'accessToken=; path=/; max-age=0; SameSite=Lax';
  }
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

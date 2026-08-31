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

// ─── Single-Flight Token Refresh ──────────────────────────────────
// Memanggil /auth/refresh tepat SATU kali per tab (request lain yang kena
// 401 bersamaan mengantre hasilnya), dengan koordinasi antar-tab via
// localStorage lock + BroadcastChannel.
//
// SEMANTIK KEGAGALAN (penting untuk skenario idle/laptop sleep):
// - 401/403 dari server → refresh token benar-benar invalid/expired →
//   sesi tamat: bersihkan state + tandai expired + tolak SESSION_EXPIRED.
// - Network error / 5xx / timeout → GANGGUAN SEKALI: token JANGAN dihapus
//   dan sesi TIDAK dianggap berakhir; lempar error asli agar pemanggil
//   bisa mencoba lagi (tanpa toast/logout palsu).
async function performTokenRefresh(): Promise<string> {
  if (isRefreshing) {
    // Refresh lain sedang berjalan di tab ini → antre dan tunggu hasilnya.
    return new Promise((resolve, reject) => {
      addRefreshSubscriber(resolve, reject);
    });
  }

  // Tab lain mungkin sedang me-refresh → tunggu token barunya supaya tidak
  // memicu race condition antar-tab (yang dulu berujung logout di salah
  // satu tab).
  if (isAnotherTabRefreshing()) {
    const token = await waitForCrossTabRefresh();
    if (token) return token;
    // null (timeout/kegagalan tab lain) → lanjut refresh sendiri sebagai fallback.
  }

  isRefreshing = true;
  try {
    // Coba klaim lock antar-tab. Bila kalah (tab lain sudah/sementara
    // me-refresh), tunggu token barunya alih-alih me-refresh sendiri.
    if (!claimRefreshLock()) {
      const token = await waitForCrossTabRefresh();
      if (token) return token;
      // Lock sudah lewat/stale → refresh sendiri sebagai fallback.
    }

    // Retry transient failures up to 2 times with backoff before giving up
    const MAX_REFRESH_RETRIES = 2;
    let lastRefreshErr: unknown;
    for (let attempt = 0; attempt <= MAX_REFRESH_RETRIES; attempt++) {
      try {
        const { data } = await axios.post(`/api/auth/refresh`, {}, { withCredentials: true });
        const newToken = data.data.accessToken;
        localStorage.setItem('accessToken', newToken);
        if (typeof document !== 'undefined') {
          document.cookie = `accessToken=${newToken}; path=/; max-age=86400; SameSite=Lax`;
        }
        onTokenRefreshed(newToken);
        refreshChannel?.postMessage({ type: 'REFRESH_SUCCESS', token: newToken });
        if (sessionManager.isExpired) {
          sessionManager.reset();
        }
        return newToken;
      } catch (err) {
        lastRefreshErr = err;
        const status = (err as { response?: { status?: number } } | null)?.response?.status;
        // 401/403 = permanent: token truly expired, no point retrying
        if (status === 401 || status === 403) {
          onTokenRefreshFailed(err);
          refreshChannel?.postMessage({ type: 'REFRESH_FAILED' });
          triggerSessionExpired();
          throw SESSION_EXPIRED_ERROR;
        }
        // Transient: retry with backoff (but not on last attempt)
        if (attempt < MAX_REFRESH_RETRIES) {
          const delay = 1000 * Math.pow(2, attempt);
          await new Promise((r) => setTimeout(r, delay));
          continue;
        }
        // All retries exhausted: transient failure, session preserved
        onTokenRefreshFailed(err);
        refreshChannel?.postMessage({ type: 'REFRESH_FAILED' });
        throw err;
      }
    }
    // Should not reach here, but safety net
    throw lastRefreshErr;
  } finally {
    isRefreshing = false;
    clearRefreshLock();
  }
}

/**
 * Normalize an axios error into the flat error shape used across the app.
 */
function normalizeAxiosError(err: unknown): { status: number; message: string; data: unknown } {
  const e = err as
    | { response?: { status?: number; data?: { message?: string } }; message?: string }
    | null;
  return {
    status: e?.response?.status ?? 0,
    message:
      e?.response?.data?.message || e?.message || 'Terjadi kesalahan pada server.',
    data: e?.response?.data ?? null,
  };
}

// ─── Interceptors ─────────────────────────────────────────────────

function getAccessToken(): string | null {
  if (typeof window !== 'undefined') {
    return localStorage.getItem('accessToken');
  }
  return null;
}

// Endpoint auth selalu lolos dari blokir sesi-expired. Tanpa ini, login
// setelah sesi kedaluwarsa akan deadlock: flag `isExpired` menolak request
// login itu sendiri sehingga user terjebak sampai reload manual (F5).
const AUTH_ENDPOINT_PATTERNS = [
  '/auth/login',
  '/auth/refresh',
  '/auth/register',
  '/auth/logout',
  '/auth/forgot-password',
  '/auth/reset-password',
  '/auth/verify',
  '/auth/oauth',
];

function isAuthEndpoint(url?: string): boolean {
  return !!url && AUTH_ENDPOINT_PATTERNS.some((pattern) => url.includes(pattern));
}

apiClient.interceptors.request.use(async (config) => {
  // Auth endpoints must always pass through — even when the session is
  // flagged expired — otherwise re-login deadlocks until a manual reload.
  if (isAuthEndpoint(config.url)) {
    return config;
  }

  if (sessionManager.isExpired) {
    // SELF-HEALING: flag expired bisa jadi usang (tertulis setelah gangguan
    // network sesaat, atau terbawa lintas navigasi SPA). Cookie refresh 14
    // hari sering masih valid → coba SATU re-auth senyap sebelum menyerah.
    // performTokenRefresh() single-flight, jadi request concurrent berbagi
    // satu panggilan refresh.
    try {
      const token = await performTokenRefresh();
      config.headers.Authorization = `Bearer ${token}`;
    } catch (err) {
      if (err === SESSION_EXPIRED_ERROR) {
        return Promise.reject(SESSION_EXPIRED_ERROR);
      }
      // Kegagalan transient: sesi masih hidup, tapi request ini tetap tidak
      // bisa jalan tanpa token → lempar error ternormalisasi (bukan
      // SESSION_EXPIRED yang dibungkam UI) agar halaman menampilkan state
      // error yang bisa dicoba ulang.
      throw normalizeAxiosError(err);
    }
    return config;
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
    // Skip refresh on auth endpoints since there's no valid refresh token yet
    if (error.response?.status === 401 && !originalRequest._retry && !isAuthEndpoint(originalRequest.url)) {
      originalRequest._retry = true;
      try {
        const newToken = await performTokenRefresh();
        originalRequest.headers.Authorization = `Bearer ${newToken}`;
        return apiClient(originalRequest);
      } catch (refreshErr) {
        if (refreshErr === SESSION_EXPIRED_ERROR) {
          // Refresh token genuinely invalid/expired — the session is over.
          // SessionProvider shows the toast and redirects to /login.
          return Promise.reject(refreshErr);
        }
        // TRANSIENT failure (network/5xx): tokens are intact and the session
        // is still alive. Surface a normalized, retryable error instead of
        // silently logging the user out.
        return Promise.reject(normalizeAxiosError(refreshErr));
      }
    }

    // --- ERROR NORMALIZATION ---
    return Promise.reject(normalizeAxiosError(error));
  },
);

export default apiClient;

/**
 * Ensure a fresh access token, performing a single-flight refresh when
 * needed. Used by the SSE hook before reconnecting after an auth failure.
 * Resolves with a valid access token; rejects with SESSION_EXPIRED_ERROR
 * when the session is genuinely over, or the raw error when transient.
 */
export async function ensureFreshToken(): Promise<string> {
  return performTokenRefresh();
}

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

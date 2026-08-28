import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { emitSessionExpired, resetSessionExpired } from './session-expired';

const API_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3001';

const apiClient = axios.create({
  baseURL: `${API_URL}/api`,
  timeout: 15000,
  headers: { 'Content-Type': 'application/json' },
});

// ─── Token Refresh (single-flight) ─────────────────────────────
let isRefreshing = false;
type RefreshSubscriber = {
  resolve: (token: string) => void;
  reject: (err: unknown) => void;
};
let refreshSubscribers: RefreshSubscriber[] = [];

function onTokenRefreshed(token: string) {
  const subs = refreshSubscribers;
  refreshSubscribers = [];
  subs.forEach((s) => s.resolve(token));
}

function onTokenRefreshFailed(err: unknown) {
  const subs = refreshSubscribers;
  refreshSubscribers = [];
  subs.forEach((s) => s.reject(err));
}

function addRefreshSubscriber(resolve: (token: string) => void, reject: (err: unknown) => void) {
  refreshSubscribers.push({ resolve, reject });
}

/** Check if access token is about to expire (< 2 minutes left) */
async function isTokenExpiringSoon(): Promise<boolean> {
  try {
    const token = await AsyncStorage.getItem('accessToken');
    if (!token) return false;
    const parts = token.split('.');
    if (parts.length !== 3) return false;
    const payload = JSON.parse(atob(parts[1]));
    const expiresIn = payload.exp * 1000 - Date.now();
    return expiresIn > 0 && expiresIn < 120_000;
  } catch {
    return false;
  }
}

/**
 * Single-flight token refresh. Bila sedang refresh berjalan, panggilan lain
 * menunggu promise yang sama (antrean) sehingga tidak ada refresh konkuren
 * yang memicu race condition / penolakan token di backend (dulu memicu
 * logout massal lintas-perangkat).
 */
async function doRefresh(): Promise<string> {
  if (isRefreshing) {
    return new Promise<string>((resolve, reject) => addRefreshSubscriber(resolve, reject));
  }
  isRefreshing = true;
  try {
    const refreshToken = await AsyncStorage.getItem('refreshToken');
    if (!refreshToken) throw new Error('No refresh token');

    const res = await axios.post(`${API_URL}/api/auth/refresh`, { refreshToken });
    const { accessToken, refreshToken: newRefresh } = res.data.data;

    await AsyncStorage.setItem('accessToken', accessToken);
    await AsyncStorage.setItem('refreshToken', newRefresh);

    onTokenRefreshed(accessToken);
    return accessToken;
  } catch (err) {
    onTokenRefreshFailed(err);
    // Refresh gagal → sesi berakhir. Emit & bersihkan token (dijaga sekali di session-expired).
    await AsyncStorage.multiRemove(['accessToken', 'refreshToken', 'user']);
    emitSessionExpired();
    throw err;
  } finally {
    isRefreshing = false;
  }
}

/** Proactively refresh token before it expires (single-flight). */
async function proactivelyRefresh(): Promise<string | null> {
  try {
    return await doRefresh();
  } catch {
    return null;
  }
}

apiClient.interceptors.request.use(async (config) => {
  // Proactive refresh if token about to expire
  if (await isTokenExpiringSoon()) {
    const newToken = await proactivelyRefresh();
    if (newToken) {
      config.headers.Authorization = `Bearer ${newToken}`;
      return config;
    }
  }

  const token = await AsyncStorage.getItem('accessToken');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

apiClient.interceptors.response.use(
  (response) => response,
  async (error: unknown) => {
    const originalRequest = (error as { config?: any }).config;
    if (!originalRequest) return Promise.reject(error);

    const axiosError = error as {
      code?: string;
      message?: string;
      response?: { status?: number };
      config?: any;
    };

    // ─── NETWORK RETRY STRATEGY ───
    const isNetworkError =
      axiosError.code === 'ECONNABORTED' ||
      axiosError.message?.includes('Network Error') ||
      !axiosError.response;

    if (isNetworkError && !originalRequest._retryCount) {
      originalRequest._retryCount = 1;
    }

    if (isNetworkError && originalRequest._retryCount <= 2) {
      const delay = 500 * originalRequest._retryCount; // simple backoff
      await new Promise((res) => setTimeout(res, delay));
      originalRequest._retryCount += 1;
      return apiClient(originalRequest);
    }

    // ─── TOKEN REFRESH HANDLING ───
    if (axiosError.response?.status === 401 && !originalRequest._retry) {
      try {
        const token = await doRefresh();
        originalRequest._retry = true;
        originalRequest.headers.Authorization = `Bearer ${token}`;
        return apiClient(originalRequest);
      } catch {
        // doRefresh sudah emit session-expired & hapus token
        return Promise.reject(error);
      }
    }

    return Promise.reject(error);
  },
);

export const setTokens = async (accessToken: string, refreshToken: string) => {
  resetSessionExpired();
  await AsyncStorage.setItem('accessToken', accessToken);
  await AsyncStorage.setItem('refreshToken', refreshToken);
};

export const clearTokens = async () => {
  await AsyncStorage.multiRemove(['accessToken', 'refreshToken', 'user']);
};

// ─── Response Helpers ───────────────────────────────────────────

export interface ApiResponse<T> {
  success: boolean;
  message?: string;
  data: T;
}

/** Unwrap `r.data.data` from an Axios response. Use with `.then(unwrap)` */
export const unwrap = <T>(response: { data: ApiResponse<T> }): T => response.data.data;

/**
 * Ubah path relatif (mis. `/storage/qris.png`) menjadi URL absolut untuk `<Image>`
 * React Native (tidak bisa resolve path relatif seperti browser). URL http(s)
 * dibiarkan apa adanya.
 */
export const toAbsoluteUrl = (url?: string | null): string | null => {
  if (!url) return null;
  if (/^https?:\/\//i.test(url)) return url;
  return `${API_URL}${url.startsWith('/') ? '' : '/'}${url}`;
};

export default apiClient;

import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { emitSessionExpired } from './session-expired';

const API_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3001';

const apiClient = axios.create({
  baseURL: `${API_URL}/api`,
  timeout: 15000,
  headers: { 'Content-Type': 'application/json' },
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

/** Check if access token is about to expire (< 2 minutes left) */
async function isTokenExpiringSoon(): Promise<boolean> {
  try {
    const token = await AsyncStorage.getItem('accessToken');
    if (!token) return false;
    const parts = token.split('.');
    if (parts.length !== 3) return false;
    const payload = JSON.parse(atob(parts[1]));
    const expiresIn = payload.exp * 1000 - Date.now();
    return expiresIn > 0 && expiresIn < 120_000; // less than 2 minutes
  } catch {
    return false;
  }
}

/** Proactively refresh token before it expires */
async function proactivelyRefresh(): Promise<string | null> {
  try {
    const refreshToken = await AsyncStorage.getItem('refreshToken');
    if (!refreshToken) return null;

    const res = await axios.post(`${API_URL}/api/auth/refresh`, { refreshToken });
    const { accessToken, refreshToken: newRefresh } = res.data.data;

    await AsyncStorage.setItem('accessToken', accessToken);
    await AsyncStorage.setItem('refreshToken', newRefresh);

    return accessToken;
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
  async (error) => {
    const originalRequest = error.config;

    // ─── NETWORK RETRY STRATEGY ───
    const isNetworkError =
      error.code === 'ECONNABORTED' ||
      error.message?.includes('Network Error') ||
      !error.response;

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
    if (error.response?.status === 401 && !originalRequest._retry) {
      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          addRefreshSubscriber((token: string) => {
            originalRequest.headers.Authorization = `Bearer ${token}`;
            resolve(apiClient(originalRequest));
          });
          // Timeout — if refresh takes too long, reject
          setTimeout(() => reject(error), 5000);
        });
      }

      originalRequest._retry = true;
      isRefreshing = true;

      try {
        const refreshToken = await AsyncStorage.getItem('refreshToken');
        if (!refreshToken) throw new Error('No refresh token');

        const res = await axios.post(`${API_URL}/api/auth/refresh`, { refreshToken });
        const { accessToken, refreshToken: newRefresh } = res.data.data;

        await AsyncStorage.setItem('accessToken', accessToken);
        await AsyncStorage.setItem('refreshToken', newRefresh);

        onTokenRefreshed(accessToken);

        originalRequest.headers.Authorization = `Bearer ${accessToken}`;
        return apiClient(originalRequest);
      } catch {
        await AsyncStorage.multiRemove(['accessToken', 'refreshToken', 'user']);
        emitSessionExpired();
      } finally {
        isRefreshing = false;
      }
    }

    return Promise.reject(error);
  },
);

export const setTokens = async (accessToken: string, refreshToken: string) => {
  await AsyncStorage.setItem('accessToken', accessToken);
  await AsyncStorage.setItem('refreshToken', refreshToken);
};

export const clearTokens = async () => {
  await AsyncStorage.multiRemove(['accessToken', 'refreshToken', 'user']);
};

// ─── Response Helpers ───

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

import axios from 'axios';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

const apiClient = axios.create({
  baseURL: `${API_URL}/api`,
  headers: {
    'Content-Type': 'application/json',
  },
});

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

    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      try {
        const refreshToken = localStorage.getItem('refreshToken');
        const { data } = await axios.post(`${API_URL}/api/auth/refresh`, {
          refreshToken,
        });

        localStorage.setItem('accessToken', data.data.accessToken);
        localStorage.setItem('refreshToken', data.data.refreshToken);

        originalRequest.headers.Authorization = `Bearer ${data.data.accessToken}`;
        return apiClient(originalRequest);
      } catch {
        localStorage.removeItem('accessToken');
        localStorage.removeItem('refreshToken');
        window.location.href = '/login';
      }
    }

    return Promise.reject(error);
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
export const unwrapPaginated = <T>(response: { data: ApiResponse<PaginatedResponse<T>> }): PaginatedResponse<T> =>
  response.data.data;

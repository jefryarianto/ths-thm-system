'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import apiClient, { setTokens } from '@/lib/api-client';

// Use relative URLs so OAuth redirects go through Next.js proxy (same origin, no CORS)
const API_URL = '';

// Reads URL params without useSearchParams, for use outside Suspense
function getOAuthErrorFromUrl(): string | null {
  if (typeof window === 'undefined') return null;
  const params = new URLSearchParams(window.location.search);
  const error = params.get('error');
  if (error === 'oauth_failed') return 'Login dengan Google/LinkedIn gagal. Silakan coba lagi.';
  return null;
}

function OAuthCallbackHandler() {
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    const token = searchParams.get('token');
    const refresh = searchParams.get('refresh');

    if (token && refresh) {
      setTokens(token, refresh);
      document.cookie = `accessToken=${token}; path=/; max-age=86400; SameSite=Lax`;
      document.cookie = `refreshToken=${refresh}; path=/; max-age=604800; SameSite=Lax`;

      // Fetch user profile
      apiClient
        .get('/auth/me')
        .then(({ data }) => {
          if (data.success) {
            localStorage.setItem('user', JSON.stringify(data.data));
            router.replace('/members');
          }
        })
        .catch(() => {
          router.replace('/login');
        });
    }
  }, [searchParams, router]);

  return null;
}

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // Detect OAuth error from URL params (no Suspense needed)
  useEffect(() => {
    const oauthError = getOAuthErrorFromUrl();
    if (oauthError) setError(oauthError);
    // Clean up the URL params to prevent showing error on refresh
    if (typeof window !== 'undefined' && window.location.search.includes('error=')) {
      const url = new URL(window.location.href);
      url.searchParams.delete('error');
      url.searchParams.delete('token');
      url.searchParams.delete('refresh');
      window.history.replaceState({}, '', url.toString());
    }
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const { data } = await apiClient.post('/auth/login', { email, password });

      if (data.success) {
        setTokens(data.data.accessToken, data.data.refreshToken);
        localStorage.setItem('user', JSON.stringify(data.data.user));

        // Also set cookie for middleware auth check
        document.cookie = `accessToken=${data.data.accessToken}; path=/; max-age=86400; SameSite=Lax`;
        document.cookie = `refreshToken=${data.data.refreshToken}; path=/; max-age=604800; SameSite=Lax`;

        router.push('/members');
      }
    } catch (err: unknown) {
      const apiError = (err as { response?: { data?: { message?: string } } })?.response?.data
        ?.message;
      setError(apiError || 'Login gagal, periksa email dan password');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100 dark:bg-gray-950">
      <Suspense fallback={null}>
        <OAuthCallbackHandler />
      </Suspense>

      <div className="max-w-md w-full bg-white dark:bg-gray-800 rounded-lg shadow-md p-8">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">THS-THM System</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">Sistem Manajemen</p>
        </div>

        {error && (
          <div
            data-testid="login-error"
            className="mb-4 p-3 bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-800 rounded-md text-red-700 dark:text-red-400 text-sm"
          >
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label
              htmlFor="email"
              className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
            >
              Email
            </label>
            <input
              id="email"
              name="email"
              data-testid="email-input"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoComplete="email"
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="admin@ths-thm.org"
            />
          </div>

          <div>
            <label
              htmlFor="password"
              className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
            >
              Password
            </label>
            <input
              id="password"
              name="password"
              data-testid="password-input"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              autoComplete="current-password"
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="••••••••"
            />
          </div>

          <button
            type="submit"
            data-testid="login-submit"
            disabled={loading}
            className="w-full py-2 px-4 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition"
          >
            {loading ? 'Memproses...' : 'Masuk'}
          </button>

          <div className="text-center">
            <a
              href="/forgot-password"
              className="text-sm text-blue-600 dark:text-blue-400 hover:underline hover:text-blue-800 dark:hover:text-blue-300 transition"
            >
              Lupa Password?
            </a>
          </div>
        </form>

        {/* OAuth Divider */}
        <div className="relative my-6">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-gray-200 dark:border-gray-700" />
          </div>
          <div className="relative flex justify-center text-sm">
            <span className="px-3 bg-white dark:bg-gray-800 text-gray-500 dark:text-gray-400">
              Atau login dengan
            </span>
          </div>
        </div>

        {/* OAuth Buttons */}
        <div className="space-y-3">
          <a
            href={`${API_URL}/api/auth/google`}
            className="flex items-center justify-center gap-3 w-full py-2.5 px-4 border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-50 dark:hover:bg-gray-700 transition text-sm font-medium text-gray-700 dark:text-gray-300"
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24">
              <path
                fill="#4285F4"
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"
              />
              <path
                fill="#34A853"
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              />
              <path
                fill="#FBBC05"
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
              />
              <path
                fill="#EA4335"
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
              />
            </svg>
            Google
          </a>

          <a
            href={`${API_URL}/api/auth/linkedin`}
            className="flex items-center justify-center gap-3 w-full py-2.5 px-4 border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-50 dark:hover:bg-gray-700 transition text-sm font-medium text-gray-700 dark:text-gray-300"
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24" fill="#0A66C2">
              <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 0 1-2.063-2.065 2.064 2.064 0 1 1 2.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
            </svg>
            LinkedIn
          </a>
        </div>

        <div className="mt-6 text-center text-xs text-gray-500 dark:text-gray-400">
          <p>Seed credentials (development):</p>
          <p>superadmin@ths-thm.org / password123</p>
        </div>
      </div>
    </div>
  );
}

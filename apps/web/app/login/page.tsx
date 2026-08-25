'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import {
  LogIn,
  Mail,
  Lock,
  Eye,
  EyeOff,
  AlertCircle,
  CheckCircle2,
  ArrowRight,
  Loader2,
} from 'lucide-react';
import apiClient, { setTokens } from '@/lib/api-client';
import { getHomePathForRole } from '@/lib/role-redirect';
import { useToast } from '@/components/ui/toast';

const API_URL = '';

function getOAuthErrorFromUrl(): string | null {
  if (typeof window === 'undefined') return null;
  const params = new URLSearchParams(window.location.search);
  const error = params.get('error');
  if (error === 'oauth_failed') return 'Login dengan Google gagal. Silakan coba lagi.';
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

      apiClient
        .get('/auth/me')
        .then(({ data }) => {
          if (data.success) {
            localStorage.setItem('user', JSON.stringify(data.data));
            router.replace(getHomePathForRole(data.data.role));
          }
        })
        .catch(() => {
          router.replace('/login');
        });
    }
  }, [searchParams, router]);

  return null;
}

/** Decorative background blob */
function BackgroundBlobs() {
  return (
    <div className="fixed inset-0 -z-10 overflow-hidden">
      <div className="absolute -top-40 -right-40 h-[500px] w-[500px] animate-blob rounded-full bg-gradient-to-br from-gold-400/10 to-navy-400/10 blur-3xl" />
      <div className="absolute -bottom-40 -left-40 h-[500px] w-[500px] animate-blob animation-delay-2000 rounded-full bg-gradient-to-tr from-cyan-400/20 to-blue-500/30 blur-3xl" />
      <div className="absolute left-1/2 top-1/3 h-[400px] w-[400px] animate-blob animation-delay-4000 rounded-full bg-gradient-to-r from-indigo-400/20 to-purple-400/20 blur-3xl" />
      <div className="absolute bottom-1/4 right-1/4 h-[300px] w-[300px] animate-blob animation-delay-6000 rounded-full bg-gradient-to-bl from-sky-400/15 to-blue-600/20 blur-3xl" />
      {/* Grid overlay */}
      <div
        className="absolute inset-0 opacity-[0.03] dark:opacity-[0.05]"
        style={{
          backgroundImage:
            'linear-gradient(rgba(0,0,0,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(0,0,0,0.1) 1px, transparent 1px)',
          backgroundSize: '60px 60px',
        }}
      />
    </div>
  );
}

/** Animated feature list item */
function FeatureItem({ icon, text, delay }: { icon: string; text: string; delay: number }) {
  return (
    <div
      className="flex items-center gap-3 text-white/80 animate-fade-in-up"
      style={{ animationDelay: `${delay}ms`, animationFillMode: 'both' }}
    >
      <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/10 text-lg backdrop-blur-sm">
        {icon}
      </span>
      <span className="text-sm font-medium">{text}</span>
    </div>
  );
}

/** Floating label input */
function FloatingInput({
  id,
  label,
  type,
  value,
  onChange,
  icon: Icon,
  autoComplete,
  placeholder,
}: {
  id: string;
  label: string;
  type: string;
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  icon: React.ElementType;
  autoComplete: string;
  placeholder: string;
}) {
  const [focused, setFocused] = useState(false);
  const hasValue = value.length > 0;
  const isFloating = focused || hasValue;

  return (
    <div className="relative">
      <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-4">
        <Icon
          size={18}
          className={`transition-colors duration-200 ${
            isFloating ? 'text-navy-500' : 'text-gray-400'
          }`}
        />
      </div>
      <input
        id={id}
        name={id}
        type={type}
        value={value}
        onChange={onChange}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        required
        autoComplete={autoComplete}
        placeholder={placeholder}
        className="peer block w-full rounded-xl border-2 border-gray-200 bg-white/80 px-4 pb-2.5 pl-12 pt-7 text-sm text-gray-900 backdrop-blur-sm transition-all duration-200 focus:border-[#1B3A5C] focus:outline-none focus:ring-0 dark:border-gray-600 dark:bg-gray-800/80 dark:text-gray-100 dark:focus:border-blue-400"
      />
      <label
        htmlFor={id}
        className={`pointer-events-none absolute left-12 transition-all duration-200 ${
          isFloating
            ? 'top-2 text-[11px] font-medium text-[#1B3A5C]'
            : 'top-1/2 -translate-y-1/2 text-sm text-gray-400'
        }`}
      >
        {label}
      </label>
    </div>
  );
}

export default function LoginPage() {
  const router = useRouter();
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [mounted, setMounted] = useState(false);
  const toast = useToast();

  useEffect(() => {
    setMounted(true);
    // Check if we were redirected here due to session expiry
    const isExpired = localStorage.getItem('session-expired') === 'true';
    if (isExpired) {
      toast('error', 'Sesi Anda telah berakhir. Silakan login kembali.');
      localStorage.removeItem('session-expired');
    }
    const oauthError = getOAuthErrorFromUrl();
    if (oauthError) setError(oauthError);
    if (typeof window !== 'undefined' && window.location.search.includes('error=')) {
      const url = new URL(window.location.href);
      url.searchParams.delete('error');
      url.searchParams.delete('token');
      url.searchParams.delete('refresh');
      window.history.replaceState({}, '', url.toString());
    }
    // Restore remembered email
    const remembered = localStorage.getItem('rememberedIdentifier');
    if (remembered) {
      setIdentifier(remembered);
      setRememberMe(true);
    }
  }, [toast]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccessMessage('');
    setLoading(true);

    try {
      const { data } = await apiClient.post('/auth/login', { identifier: identifier.trim(), password });

      if (data.success) {
        setTokens(data.data.accessToken, data.data.refreshToken);
        localStorage.setItem('user', JSON.stringify(data.data.user));

        document.cookie = `accessToken=${data.data.accessToken}; path=/; max-age=86400; SameSite=Lax`;

        if (rememberMe) {
          localStorage.setItem('rememberedIdentifier', identifier.trim());
        } else {
          localStorage.removeItem('rememberedIdentifier');
        }

        if (data.data.user.mustChangePassword && data.data.resetToken) {
          router.push(`/force-change-password?token=${data.data.resetToken}`);
          return;
        }

        setSuccessMessage('Login berhasil! Mengalihkan...');
        setTimeout(() => router.push(getHomePathForRole(data.data.user.role)), 800);
      }
    } catch (err: unknown) {
      const apiError = (err as { response?: { data?: { message?: string } } })?.response?.data
        ?.message;
      setError(apiError || 'Login gagal, periksa email dan password');
    } finally {
      setLoading(false);
    }
  };

  const isDev = typeof window !== 'undefined' && window.location.hostname === 'localhost';

  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden bg-gradient-to-br bg-white">
      
      <Suspense fallback={null}>
        <OAuthCallbackHandler />
      </Suspense>

      {/* Animated container */}
      <div
        className={`w-full max-w-5xl transition-all duration-700 ${
          mounted ? 'translate-y-0 opacity-100' : 'translate-y-8 opacity-0'
        }`}
      >
        <div className="overflow-hidden rounded-3xl bg-white/70 shadow-2xl shadow-blue-900/10 backdrop-blur-xl dark:bg-gray-900/70 dark:shadow-blue-900/20">
          <div className="grid min-h-[600px] lg:grid-cols-5">
            {/* ── LEFT PANEL - Branding ── */}
            <div className="relative hidden overflow-hidden bg-gradient-to-br from-navy-800 via-navy-900 to-navy-950 lg:col-span-2 lg:flex lg:flex-col lg:justify-center lg:p-10 xl:p-14">
              {/* Decorative elements */}
              <div className="absolute -right-20 -top-20 h-64 w-64 rounded-full bg-white/5 blur-3xl" />
              <div className="absolute -bottom-20 -left-20 h-80 w-80 rounded-full bg-yellow-400/10 blur-3xl" />
              <div className="absolute right-10 top-1/3 h-40 w-40 rounded-full bg-blue-400/10 blur-2xl" />

              <div className="relative z-10">
                {/* Logo */}
                <div
                  className="mb-8 animate-fade-in-up"
                  style={{ animationDelay: '100ms', animationFillMode: 'both' }}
                >
                  <img
                    src="/logo.svg"
                    alt="THS-THM Logo"
                    className="mb-6 h-16 w-16 rounded-2xl shadow-lg ring-4 ring-white/20 object-cover"
                  />
                  <h1 className="text-3xl font-extrabold tracking-tight text-white xl:text-4xl">
                    THS-THM
                  </h1>
                  <p className="mt-2 max-w-xs text-base leading-relaxed text-gold-400/80">
                    Sistem Manajemen Organisasi - Kelola organisasi secara digital dalam satu
                    platform terpadu.
                  </p>
                </div>

                {/* Feature list */}
                <div className="space-y-4">
                  <FeatureItem icon="👥" text="Manajemen anggota & calon anggota" delay={300} />
                  <FeatureItem icon="💳" text="Pembayaran iuran & verifikasi" delay={400} />
                  <FeatureItem icon="📊" text="Laporan & statistik real-time" delay={500} />
                  <FeatureItem icon="📱" text="Akses mobile & notifikasi push" delay={600} />
                  <FeatureItem icon="📋" text="Pendadaran & evaluasi penilaian" delay={700} />
                </div>

                {/* Bottom quote */}
                <div
                  className="mt-10 border-t border-white/10 pt-6 animate-fade-in-up"
                  style={{ animationDelay: '800ms', animationFillMode: 'both' }}
                >
                  <p className="text-sm italic text-white/50">
                    &ldquo;Bersama membangun organisasi yang lebih baik, transparan, dan efisien.&rdquo;
                  </p>
                </div>
              </div>
            </div>

            {/* ── RIGHT PANEL - Login Form ── */}
            <div className="flex items-center justify-center p-6 sm:p-8 lg:col-span-3 lg:p-10 xl:p-14">
              <div className="w-full max-w-sm">
                {/* Mobile Logo (visible only on small screens) */}
                <div className="mb-8 text-center lg:hidden">
                  <img
                    src="/logo.svg"
                    alt="THS-THM Logo"
                    className="mx-auto mb-4 h-14 w-14 rounded-2xl shadow-lg object-cover"
                  />
                  <h1 className="text-2xl font-extrabold text-gray-900 dark:text-white">
                    THS-THM
                  </h1>
                  <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                    Sistem Manajemen Organisasi
                  </p>
                </div>

                {/* Header */}
                <div
                  className="mb-8 animate-fade-in-up"
                  style={{ animationDelay: '100ms', animationFillMode: 'both' }}
                >
                  <div className="mb-2 flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-navy-700 to-navy-800 shadow-sm">
                      <LogIn size={20} className="text-white" />
                    </div>
                    <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                      Masuk ke Akun
                    </h2>
                  </div>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    Masukkan kredensial Anda untuk mengakses dashboard
                  </p>
                </div>

                {/* Error Alert */}
                {error && (
                  <div
                    className="mb-5 animate-slide-down rounded-xl border border-red-200 bg-gradient-to-r from-red-50 to-red-50/50 p-4 dark:border-red-800/50 dark:from-red-900/20 dark:to-red-900/10"
                    data-testid="login-error"
                  >
                    <div className="flex items-start gap-3">
                      <AlertCircle size={20} className="mt-0.5 shrink-0 text-red-500" />
                      <div>
                        <p className="text-sm font-medium text-red-800 dark:text-red-300">
                          Login Gagal
                        </p>
                        <p className="mt-0.5 text-sm text-red-600 dark:text-red-400">{error}</p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Success Alert */}
                {successMessage && (
                  <div className="mb-5 animate-slide-down rounded-xl border border-green-200 bg-gradient-to-r from-green-50 to-green-50/50 p-4 dark:border-green-800/50 dark:from-green-900/20 dark:to-green-900/10">
                    <div className="flex items-start gap-3">
                      <CheckCircle2 size={20} className="mt-0.5 shrink-0 text-green-500" />
                      <div>
                        <p className="text-sm font-medium text-green-800 dark:text-green-300">
                          Berhasil
                        </p>
                        <p className="mt-0.5 text-sm text-green-600 dark:text-green-400">
                          {successMessage}
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Form */}
                <form
                  onSubmit={handleSubmit}
                  className="space-y-5 animate-fade-in-up"
                  style={{ animationDelay: '200ms', animationFillMode: 'both' }}
                >
                  {/* Email */}
                  <FloatingInput
                    id="identifier"
                    label="Email / No. HP"
                    type="text"
                    value={identifier}
                    onChange={(e) => setIdentifier(e.target.value)}
                    icon={Mail}
                    autoComplete="username"
                    placeholder="email@ths-thm.org atau 08xxx"
                  />

                  {/* Password */}
                  <div className="relative">
                    <FloatingInput
                      id="password"
                      label="Password"
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      icon={Lock}
                      autoComplete="current-password"
                      placeholder="????????"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 transition-colors hover:text-gray-600 dark:hover:text-gray-300"
                      tabIndex={-1}
                      aria-label={showPassword ? 'Sembunyikan password' : 'Tampilkan password'}
                    >
                      {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>

                  {/* Remember Me & Forgot Password */}
                  <div className="flex items-center justify-between">
                    <label className="flex cursor-pointer items-center gap-2">
                      <input
                        type="checkbox"
                        checked={rememberMe}
                        onChange={(e) => setRememberMe(e.target.checked)}
                        className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-navy-700 dark:border-gray-600"
                      />
                      <span className="text-sm text-gray-600 dark:text-gray-400">Ingat saya</span>
                    </label>
                    <Link
                      href="/forgot-password"
                      className="text-sm font-medium text-navy-600 transition-colors hover:text-navy-800 dark:text-blue-400 dark:hover:text-blue-300"
                    >
                      Lupa Password?
                    </Link>
                  </div>

                  {/* Submit Button */}
                  <button
                    type="submit"
                    data-testid="login-submit"
                    disabled={loading}
                    className="group relative w-full overflow-hidden rounded-xl bg-gradient-to-r from-navy-800 to-navy-900 px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-navy-800/25 transition-all duration-200 hover:shadow-xl hover:shadow-navy-800/30 hover:from-navy-700 hover:to-navy-800 focus:outline-none focus:ring-2 focus:ring-navy-700 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-70 dark:focus:ring-offset-gray-900"
                  >
                    <span className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/20 to-transparent transition-transform duration-500 group-hover:translate-x-full" />
                    <span className="relative flex items-center justify-center gap-2">
                      {loading ? (
                        <>
                          <Loader2 size={18} className="animate-spin" />
                          Memproses...
                        </>
                      ) : (
                        <>
                          <LogIn size={18} />
                          Masuk
                          <ArrowRight size={16} className="transition-transform group-hover:translate-x-0.5" />
                        </>
                      )}
                    </span>
                  </button>
                </form>

                {/* OAuth Divider */}
                <div
                  className="relative my-7 animate-fade-in-up"
                  style={{ animationDelay: '300ms', animationFillMode: 'both' }}
                >
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-gray-200 dark:border-gray-700" />
                  </div>
                  <div className="relative flex justify-center">
                    <span className="bg-white/70 px-4 text-xs font-medium text-gray-400 backdrop-blur-sm dark:bg-gray-900/70 dark:text-gray-500">
                      Atau login dengan
                    </span>
                  </div>
                </div>

                {/* OAuth Buttons */}
                <div
                  className="flex flex-col gap-3 animate-fade-in-up"
                  style={{ animationDelay: '400ms', animationFillMode: 'both' }}
                >
                  <a
                    href={`${API_URL}/api/auth/google`}
                    className="group flex items-center justify-center gap-3 rounded-xl border-2 border-gray-200 bg-white/50 px-6 py-3 text-sm font-medium text-gray-700 shadow-sm backdrop-blur-sm transition-all duration-200 hover:border-gold-300 hover:bg-gold-50/50 hover:shadow-md dark:border-gray-700 dark:bg-gray-800/50 dark:text-gray-300 dark:hover:border-gold-400 dark:hover:bg-gold-900/20"
                  >
                    <svg className="h-5 w-5 shrink-0" viewBox="0 0 24 24">
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
                    <span>Google</span>
                  </a>

                </div>

                {/* Register Link */}
                <div
                  className="mt-8 text-center animate-fade-in-up"
                  style={{ animationDelay: '500ms', animationFillMode: 'both' }}
                >
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    Belum punya akun?{' '}
                    <Link
                      href="/daftar"
                      className="font-semibold text-navy-600 transition-colors hover:text-navy-800 dark:text-blue-400 dark:hover:text-blue-300"
                    >
                      Daftar Anggota Baru
                    </Link>
                  </p>
                </div>

                {/* Dev credentials (only show in development) */}
                {isDev && (
                  <div
                    className="mt-6 animate-fade-in-up"
                    style={{ animationDelay: '600ms', animationFillMode: 'both' }}
                  >
                    <div className="rounded-xl border border-amber-200 bg-amber-50/80 px-4 py-3 backdrop-blur-sm dark:border-amber-800/50 dark:bg-amber-900/10">
                      <p className="text-xs font-medium text-amber-800 dark:text-amber-400">
                        ⚡ Development Mode
                      </p>
                      <p className="mt-1 text-xs text-amber-600 dark:text-amber-500">
                        Seed credentials:{' '}
                        <code className="rounded bg-amber-100 px-1.5 py-0.5 font-mono dark:bg-amber-900/30">
                          superadmin@ths-thm.org
                        </code>{' '}
                        /{' '}
                        <code className="rounded bg-amber-100 px-1.5 py-0.5 font-mono dark:bg-amber-900/30">
                          password123
                        </code>
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <p className="mt-6 text-center text-xs text-gray-400 dark:text-gray-600">
          &copy; {new Date().getFullYear()} THS-THM System. All rights reserved.
        </p>
      </div>
    </div>
  );
}

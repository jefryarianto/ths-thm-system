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
  Users,
  CreditCard,
  BarChart3,
  Smartphone,
  UserCheck,
  UserPlus,
} from 'lucide-react';
import apiClient, { setTokens } from '@/lib/api-client';
import { getHomePathForRole } from '@/lib/role-redirect';
import { useToast } from '@/components/ui/toast';

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

/** Feature list item for left branding panel */
function BrandFeatureItem({
  icon: Icon,
  text,
}: {
  icon: React.ElementType;
  text: string;
}) {
  return (
    <div className="flex items-center gap-3.5">
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary text-white shadow-sm">
        <Icon size={20} className="stroke-[2]" />
      </div>
      <span className="text-[15px] font-medium leading-snug text-white/95">{text}</span>
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
  const [googleOAuthEnabled, setGoogleOAuthEnabled] = useState(true);
  const toast = useToast();

  useEffect(() => {
    setMounted(true);
    apiClient
      .get('/auth/providers')
      .then(({ data }) => {
        if (typeof data?.googleOAuthEnabled === 'boolean') {
          setGoogleOAuthEnabled(data.googleOAuthEnabled);
        }
      })
      .catch(() => {});
    // Check if we were redirected here due to session expiry
    const isExpired = localStorage.getItem('session-expired') === 'true';
    if (isExpired) {
      localStorage.removeItem('session-expired');
      toast('error', 'Sesi Anda telah berakhir. Silakan login kembali.');
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

  // Mount-gated agar render pertama (hydration) identik dengan HTML server —
  // pembacaan window saat render menyebabkan hydration mismatch di /login.
  const isDev = mounted && typeof window !== 'undefined' && window.location.hostname === 'localhost';

  return (
    <div className="flex min-h-screen w-full flex-col bg-[#FAF9FF] lg:h-screen lg:flex-row lg:overflow-hidden font-sans">
      <Suspense fallback={null}>
        <OAuthCallbackHandler />
      </Suspense>

      {/* ── MOBILE COMPACT HEADER (< 1024px) ──
          Dipadatkan agar form login normal tidak perlu scroll di layar mobile wajar. */}
      <div className="relative overflow-hidden bg-secondary px-5 py-3 text-center text-white sm:py-5 lg:hidden">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -right-16 -top-16 h-40 w-40 rounded-full bg-primary/25 blur-3xl"
        />
        <div className="relative flex flex-col items-center">
          <img
            src="/logo.svg"
            alt="THS-THM Logo"
            className="h-9 w-9 object-contain drop-shadow-md sm:h-14 sm:w-14"
          />
          <h1 className="mt-1.5 text-lg font-bold tracking-tight text-white">
            THS-THM System
          </h1>
          <p className="mt-0.5 text-xs font-semibold text-primary-100 sm:text-sm">
            Satu Data THS-THM Indonesia
          </p>
        </div>
      </div>

      {/* ── LEFT PANEL - BRANDING (Desktop 40%, >= 1024px) ──
          Deep Navy #06154F (token: secondary) sesuai Design System. */}
      <div className="relative hidden w-full flex-col justify-between overflow-hidden bg-secondary p-10 text-white lg:flex lg:w-[40%] xl:p-14 2xl:p-16">
        {/* Dekorasi halus (navy tetap solid) */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -right-24 -top-24 h-80 w-80 rounded-full bg-primary/20 blur-3xl"
        />
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -bottom-32 -left-20 h-80 w-80 rounded-full bg-primary/10 blur-3xl"
        />

        {/* Top & Brand Info */}
        <div className="relative">
          {/* Logo */}
          <div className="mb-6">
            <img
              src="/logo.svg"
              alt="THS-THM Logo"
              className="h-20 w-20 object-contain drop-shadow-lg xl:h-24 xl:w-24"
            />
          </div>

          {/* Title, Tagline & Deskripsi Singkat */}
          <h1 className="text-3xl font-bold tracking-tight text-white xl:text-4xl">
            THS-THM System
          </h1>
          <p className="mt-2 text-base font-semibold text-primary-100 xl:text-lg">
            Satu Data THS-THM Indonesia
          </p>
          <p className="mt-4 max-w-md text-sm leading-relaxed text-secondary-100/85">
            Platform terpadu untuk pengelolaan data anggota, pelatihan, kegiatan, iuran, dan
            dokumen organisasi THS-THM di seluruh Indonesia.
          </p>

          {/* Feature Highlights (maks 4) */}
          <div className="mt-9 space-y-4 xl:mt-11 xl:space-y-5">
            <BrandFeatureItem
              icon={Users}
              text="Manajemen anggota & calon anggota"
            />
            <BrandFeatureItem
              icon={CreditCard}
              text="Administrasi & pembayaran iuran"
            />
            <BrandFeatureItem
              icon={BarChart3}
              text="Data, laporan & evaluasi organisasi"
            />
            <BrandFeatureItem
              icon={Smartphone}
              text="Akses mobile & notifikasi real-time"
            />
          </div>
        </div>

        {/* Quote */}
        <div className="relative mt-8 border-t border-white/15 pt-5">
          <p className="text-sm italic leading-relaxed text-primary-100/85">
            &ldquo;Bersama membangun organisasi yang lebih baik, transparan, dan efisien.&rdquo;
          </p>
        </div>
      </div>

      {/* ── RIGHT PANEL - LOGIN FORM (Desktop 60%, Clean Light Surface) ──
          Surface #FAF9FF sesuai spesifikasi. */}
      <div className="flex w-full flex-1 flex-col justify-center overflow-y-auto bg-[#FAF9FF] px-5 py-4 sm:px-10 sm:py-8 lg:w-[60%] lg:px-12 xl:px-16">
        <div className="mx-auto w-full max-w-[460px]">
          {/* Login Header */}
          <div className="mb-4 sm:mb-6">
            <div className="flex items-center gap-3.5">
              <div className="hidden h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-primary text-white shadow-sm sm:flex">
                <LogIn size={22} className="stroke-[2.5]" />
              </div>
              <div>
                <h2 className="text-lg font-bold tracking-tight text-secondary sm:text-[28px]">
                  Masuk ke Akun
                </h2>
                <p className="mt-0.5 text-xs text-muted sm:text-sm">
                  Masukkan kredensial Anda untuk mengakses dashboard
                </p>
              </div>
            </div>
          </div>

          {/* Error Message */}
          {error && (
            <div
              data-testid="login-error"
              className="mb-4 flex items-start gap-3 rounded-xl border border-error-200 bg-error-50/90 p-3.5 text-xs text-error animate-fade-in-up sm:text-sm"
            >
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-error" />
              <span className="flex-1 font-medium">{error}</span>
            </div>
          )}

          {/* Success Message */}
          {successMessage && (
            <div className="mb-4 flex items-start gap-3 rounded-xl border border-success-200 bg-success-50/90 p-3.5 text-xs text-success animate-fade-in-up sm:text-sm">
              <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-success" />
              <span className="flex-1 font-medium">{successMessage}</span>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-2.5 sm:space-y-4">
            {/* Email / No. HP Input */}
            <div>
              <label
                htmlFor="identifier"
                className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-secondary"
              >
                Email / No. HP
              </label>
              <div className="relative">
                <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5 text-muted">
                  <Mail size={18} />
                </div>
                <input
                  id="identifier"
                  name="identifier"
                  type="text"
                  value={identifier}
                  onChange={(e) => setIdentifier(e.target.value)}
                  required
                  autoComplete="username"
                  placeholder="nama@email.com / 08xxxxxxxxxx"
                  className="block h-[54px] w-full rounded-xl border border-border bg-white pl-11 pr-4 text-sm text-text placeholder:text-muted transition-all duration-200 hover:border-muted/60 focus:border-primary focus:outline-none focus:ring-4 focus:ring-primary/15"
                />
              </div>
            </div>

            {/* Password Input */}
            <div>
              <label
                htmlFor="password"
                className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-secondary"
              >
                Password
              </label>
              <div className="relative">
                <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5 text-muted">
                  <Lock size={18} />
                </div>
                <input
                  id="password"
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  autoComplete="current-password"
                  placeholder="••••••••"
                  className="block h-[54px] w-full rounded-xl border border-border bg-white pl-11 pr-11 text-sm text-text placeholder:text-muted transition-all duration-200 hover:border-muted/60 focus:border-primary focus:outline-none focus:ring-4 focus:ring-primary/15"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  aria-label={showPassword ? 'Sembunyikan password' : 'Lihat password'}
                  className="absolute inset-y-0 right-0 flex items-center pr-3.5 text-muted transition-colors hover:text-secondary"
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            {/* Remember Me + Forgot Password in ONE Single Row */}
            <div className="flex items-center justify-between pt-0.5">
              <label className="flex cursor-pointer select-none items-center gap-2 text-sm text-text">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="h-4 w-4 rounded border-border text-primary focus:ring-primary focus:ring-offset-0"
                />
                <span className="font-normal text-text">Ingat saya</span>
              </label>

              <Link
                href="/forgot-password"
                className="text-sm font-semibold text-link transition-colors hover:text-link-dark hover:underline"
              >
                Lupa Password?
              </Link>
            </div>

            {/* Primary Masuk Button */}
            <div className="pt-1.5">
              <button
                type="submit"
                data-testid="login-submit"
                disabled={loading}
                className="flex h-[54px] w-full items-center justify-center gap-2 rounded-xl bg-primary text-base font-bold text-white shadow-sm transition-all duration-200 hover:bg-[var(--primary-hover)] active:bg-primary-800 disabled:cursor-not-allowed disabled:opacity-70 cursor-pointer"
              >
                {loading ? (
                  <>
                    <Loader2 className="h-5 w-5 animate-spin" />
                    <span>Memverifikasi...</span>
                  </>
                ) : (
                  'Masuk'
                )}
              </button>
            </div>
          </form>

          {/* Google Login */}
          {googleOAuthEnabled && (
            <div className="mt-3 sm:mt-4">
              <div className="relative my-2.5 sm:my-3 flex items-center justify-center">
                <div className="h-px min-w-0 flex-1 border-t border-border" />
                <span className="shrink-0 whitespace-nowrap bg-[#FAF9FF] px-3 text-xs font-medium uppercase tracking-wider text-muted select-none">
                  Atau login dengan
                </span>
                <div className="h-px min-w-0 flex-1 border-t border-border" />
              </div>

              <a
                href="/api/auth/google"
                className="flex h-[52px] w-full items-center justify-center gap-3 rounded-xl border border-border bg-white text-sm font-semibold text-text shadow-sm transition-all duration-200 hover:bg-surface-variant active:bg-surface-variant"
              >
                <svg className="h-5 w-5 shrink-0" viewBox="0 0 24 24">
                  <path
                    fill="#4285F4"
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  />
                  <path
                    fill="#34A853"
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  />
                  <path
                    fill="#FBBC05"
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                  />
                  <path
                    fill="#EA4335"
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                  />
                </svg>
                <span>Masuk dengan Google</span>
              </a>
            </div>
          )}

          {/* Membership Actions: Klaim & Daftar */}
          <div className="mt-3 sm:mt-4">
            <p className="mb-2 text-center text-xs font-medium text-muted">Belum punya akun?</p>

            <div className="space-y-2">
              {/* Klaim Keanggotaan */}
              <Link
                href="/klaim"
                className="group flex items-center justify-between rounded-xl border border-primary-100 bg-primary-50 p-2.5 transition-all duration-200 hover:bg-primary-container sm:p-3"
              >
                <div className="flex items-center gap-2.5 sm:gap-3">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary text-white shadow-sm sm:h-9 sm:w-9">
                    <UserCheck size={18} className="stroke-[2.5]" />
                  </div>
                  <div>
                    <span className="block text-[13px] font-semibold text-secondary sm:text-sm">
                      Klaim Keanggotaan
                    </span>
                    <span className="hidden text-xs text-muted sm:block">
                      Sudah menjadi anggota tapi belum terdaftar di sistem
                    </span>
                  </div>
                </div>
                <ArrowRight
                  size={16}
                  className="ml-2 shrink-0 text-primary transition-transform duration-200 group-hover:translate-x-1"
                />
              </Link>

              {/* Daftar Calon Anggota */}
              <Link
                href="/daftar"
                className="group flex items-center justify-between rounded-xl border border-primary-100 bg-primary-50 p-2.5 transition-all duration-200 hover:bg-primary-container sm:p-3"
              >
                <div className="flex items-center gap-2.5 sm:gap-3">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary text-white shadow-sm sm:h-9 sm:w-9">
                    <UserPlus size={18} className="stroke-[2.5]" />
                  </div>
                  <div>
                    <span className="block text-[13px] font-semibold text-secondary sm:text-sm">
                      Daftar Calon Anggota
                    </span>
                    <span className="hidden text-xs text-muted sm:block">
                      Bergabung menjadi bagian dari THS-THM
                    </span>
                  </div>
                </div>
                <ArrowRight
                  size={16}
                  className="ml-2 shrink-0 text-primary transition-transform duration-200 group-hover:translate-x-1"
                />
              </Link>
            </div>
          </div>

          {/* Dev credentials (only shown in development) */}
          {isDev && (
            <div className="mt-3.5 rounded-xl border border-warning-200 bg-warning-50/90 px-3.5 py-2.5 text-xs">
              <p className="font-semibold text-warning-800">⚡ Development Mode</p>
              <p className="mt-0.5 text-warning-700">
                Seed: <code className="font-mono font-bold">superadmin@ths-thm.org</code> /{' '}
                <code className="font-mono font-bold">password123</code>
              </p>
            </div>
          )}

          {/* Footer */}
          <div className="mt-3 text-center sm:mt-5">
            <p className="text-xs font-semibold text-secondary">Pro Patria et Ecclesia</p>
            <p className="mt-0.5 text-2xs text-muted">
              &copy; 2026 | Created by litbang_koornas 2026
            </p>
          </div>
        </div>
      </div>

      {/* Full-screen loading overlay */}
      {loading && (
        <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-surface/80 backdrop-blur-sm">
          <div className="relative">
            <div className="h-16 w-16 animate-spin rounded-full border-4 border-transparent border-t-primary border-r-secondary" />
            <div className="absolute inset-0 flex items-center justify-center">
              <img src="/logo.svg" alt="" className="h-8 w-8 animate-pulse object-contain" />
            </div>
          </div>
          <p className="mt-4 text-sm font-semibold text-secondary animate-pulse">
            Memverifikasi kredensial...
          </p>
        </div>
      )}
    </div>
  );
}

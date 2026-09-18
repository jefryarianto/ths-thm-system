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
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#072AC8] text-white shadow-sm">
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

      {/* ── MOBILE COMPACT HEADER (< 1024px) ── */}
      <div className="flex flex-col items-center justify-center bg-gradient-to-b from-[#06154F] to-[#072AC8] px-6 py-8 text-center text-white lg:hidden">
        <img
          src="/logo.svg"
          alt="THS-THM Logo"
          className="h-20 w-20 object-contain drop-shadow-md"
        />
        <h1 className="mt-3 text-2xl font-bold tracking-tight text-white">THS-THM</h1>
        <p className="mt-1 text-sm font-normal text-[#DDE4FF]">
          Sistem Manajemen Organisasi Terpadu
        </p>
      </div>

      {/* ── LEFT PANEL - BRANDING (Desktop 40%, >= 1024px) ── */}
      <div className="relative hidden w-full flex-col justify-between bg-gradient-to-b from-[#06154F] via-[#06154F] to-[#072AC8] p-10 text-white lg:flex lg:w-[40%] xl:p-14 2xl:p-16">
        {/* Top & Brand Info */}
        <div>
          {/* Logo */}
          <div className="mb-6">
            <img
              src="/logo.svg"
              alt="THS-THM Logo"
              className="h-24 w-24 object-contain drop-shadow-lg xl:h-28 xl:w-28"
            />
          </div>

          {/* Title & Subtitle */}
          <h1 className="text-4xl font-bold tracking-tight text-white xl:text-[44px]">
            THS-THM
          </h1>
          <p className="mt-2 text-lg font-medium text-[#DDE4FF]">
            Sistem Manajemen Organisasi Terpadu
          </p>

          {/* Feature List (Section G: Max 4 items) */}
          <div className="mt-10 space-y-4 xl:mt-12 xl:space-y-5">
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

        {/* Bottom Quote (Section H) */}
        <div className="mt-8 border-t border-white/15 pt-5">
          <p className="text-sm italic leading-relaxed text-[#DDE4FF]/85">
            &ldquo;Bersama membangun organisasi yang lebih baik, transparan, dan efisien.&rdquo;
          </p>
        </div>
      </div>

      {/* ── RIGHT PANEL - LOGIN FORM (Desktop 60%, Clean Light Surface) ── */}
      <div className="flex w-full flex-1 flex-col justify-center overflow-y-auto bg-[#FAF9FF] px-6 py-8 sm:px-10 lg:w-[60%] lg:px-12 xl:px-16">
        <div className="mx-auto w-full max-w-[460px]">
          {/* Login Header (Section K & L) */}
          <div className="mb-6">
            <div className="flex items-center gap-3.5">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-[#072AC8] text-white shadow-sm">
                <LogIn size={22} className="stroke-[2.5]" />
              </div>
              <div>
                <h2 className="text-2xl font-bold tracking-tight text-[#06154F] sm:text-[28px]">
                  Masuk ke Akun
                </h2>
                <p className="text-sm text-[#667085] mt-0.5">
                  Masukkan kredensial Anda untuk mengakses dashboard
                </p>
              </div>
            </div>
          </div>

          {/* Error Message */}
          {error && (
            <div
              data-testid="login-error"
              className="mb-4 flex items-start gap-3 rounded-xl border border-red-200 bg-red-50/90 p-3.5 text-xs text-[#BA1A1A] sm:text-sm animate-fade-in-up"
            >
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-[#BA1A1A]" />
              <span className="flex-1 font-medium">{error}</span>
            </div>
          )}

          {/* Success Message */}
          {successMessage && (
            <div className="mb-4 flex items-start gap-3 rounded-xl border border-emerald-200 bg-emerald-50/90 p-3.5 text-xs text-[#1B7F4B] sm:text-sm animate-fade-in-up">
              <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-[#1B7F4B]" />
              <span className="flex-1 font-medium">{successMessage}</span>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-3.5 sm:space-y-4">
            {/* Email / No. HP Input (Section M) */}
            <div>
              <label
                htmlFor="identifier"
                className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-[#06154F]"
              >
                Email / No. HP
              </label>
              <div className="relative">
                <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5 text-[#667085]">
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
                  className="block h-[52px] w-full rounded-xl border border-[#C6C6D0] bg-white pl-11 pr-4 text-sm text-[#1F2937] placeholder-[#9CA3AF] transition-all duration-200 hover:border-[#A0A0B0] focus:border-[#072AC8] focus:outline-none focus:ring-4 focus:ring-[#072AC8]/12"
                />
              </div>
            </div>

            {/* Password Input (Section N) */}
            <div>
              <label
                htmlFor="password"
                className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-[#06154F]"
              >
                Password
              </label>
              <div className="relative">
                <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5 text-[#667085]">
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
                  className="block h-[52px] w-full rounded-xl border border-[#C6C6D0] bg-white pl-11 pr-11 text-sm text-[#1F2937] placeholder-[#9CA3AF] transition-all duration-200 hover:border-[#A0A0B0] focus:border-[#072AC8] focus:outline-none focus:ring-4 focus:ring-[#072AC8]/12"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  aria-label={showPassword ? 'Sembunyikan password' : 'Lihat password'}
                  className="absolute inset-y-0 right-0 flex items-center pr-3.5 text-[#667085] transition-colors hover:text-[#06154F]"
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            {/* Remember Me + Forgot Password in ONE Single Row (Section O) */}
            <div className="flex items-center justify-between pt-0.5">
              <label className="flex cursor-pointer select-none items-center gap-2 text-sm text-[#1F2937]">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="h-4 w-4 rounded border-[#C6C6D0] text-[#072AC8] focus:ring-[#072AC8] focus:ring-offset-0"
                />
                <span className="font-normal text-[#1F2937]">Ingat saya</span>
              </label>

              <Link
                href="/forgot-password"
                className="text-sm font-semibold text-[#1E5BFF] transition-colors hover:text-[#1646C7] hover:underline"
              >
                Lupa Password?
              </Link>
            </div>

            {/* Primary Masuk Button (Section P) */}
            <div className="pt-1.5">
              <button
                type="submit"
                data-testid="login-submit"
                disabled={loading}
                className="flex h-[52px] w-full items-center justify-center gap-2 rounded-xl bg-[#072AC8] text-base font-bold text-white shadow-sm transition-all duration-200 hover:bg-[#1646C7] active:bg-[#051C8A] disabled:cursor-not-allowed disabled:opacity-70 cursor-pointer"
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

          {/* Google Login Section (Section Q) */}
          {googleOAuthEnabled && (
            <div className="mt-4">
              <div className="relative my-3 flex items-center justify-center">
                <div className="w-full border-t border-[#E5E7EB]" />
                <span className="bg-[#FAF9FF] px-3 text-xs font-medium uppercase tracking-wider text-[#667085] select-none">
                  Atau login dengan
                </span>
                <div className="w-full border-t border-[#E5E7EB]" />
              </div>

              <a
                href="/api/auth/google"
                className="flex h-[50px] w-full items-center justify-center gap-3 rounded-xl border border-[#C6C6D0] bg-white text-sm font-semibold text-[#1F2937] shadow-xs transition-all duration-200 hover:bg-gray-50 active:bg-gray-100"
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

          {/* Membership Actions (Section R, S, T) */}
          <div className="mt-4">
            <p className="mb-2 text-center text-xs font-medium text-[#667085]">
              Belum punya akun?
            </p>

            <div className="space-y-2">
              {/* Klaim Keanggotaan (Section S) */}
              <Link
                href="/klaim"
                className="group flex items-center justify-between rounded-xl bg-[#E8EDFF] p-3 transition-all duration-200 hover:bg-[#DDE4FF] border border-[#D0DCFF]/60"
              >
                <div className="flex items-center gap-3">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[#072AC8] text-white shadow-xs">
                    <UserCheck size={18} className="stroke-[2.5]" />
                  </div>
                  <div>
                    <span className="block text-sm font-semibold text-[#06154F]">
                      Klaim Keanggotaan
                    </span>
                    <span className="block text-xs text-[#667085]">
                      Sudah menjadi anggota tapi belum terdaftar di sistem
                    </span>
                  </div>
                </div>
                <ArrowRight
                  size={16}
                  className="text-[#072AC8] transition-transform duration-200 group-hover:translate-x-1 shrink-0 ml-2"
                />
              </Link>

              {/* Daftar Calon Anggota (Section T) */}
              <Link
                href="/daftar"
                className="group flex items-center justify-between rounded-xl bg-[#E8EDFF] p-3 transition-all duration-200 hover:bg-[#DDE4FF] border border-[#D0DCFF]/60"
              >
                <div className="flex items-center gap-3">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[#072AC8] text-white shadow-xs">
                    <UserPlus size={18} className="stroke-[2.5]" />
                  </div>
                  <div>
                    <span className="block text-sm font-semibold text-[#06154F]">
                      Daftar Calon Anggota
                    </span>
                    <span className="block text-xs text-[#667085]">
                      Bergabung menjadi bagian dari THS-THM
                    </span>
                  </div>
                </div>
                <ArrowRight
                  size={16}
                  className="text-[#072AC8] transition-transform duration-200 group-hover:translate-x-1 shrink-0 ml-2"
                />
              </Link>
            </div>
          </div>

          {/* Dev credentials (only shown in development) */}
          {isDev && (
            <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50/90 px-3.5 py-2.5 text-xs">
              <p className="font-semibold text-amber-800">⚡ Development Mode</p>
              <p className="mt-0.5 text-amber-700">
                Seed: <code className="font-mono font-bold">superadmin@ths-thm.org</code> /{' '}
                <code className="font-mono font-bold">password123</code>
              </p>
            </div>
          )}

          {/* Footer (Section U) */}
          <div className="mt-5 text-center">
            <p className="text-xs font-semibold text-[#06154F]">Pro Patria et Ecclesia</p>
            <p className="mt-0.5 text-[10px] text-[#667085]">
              &copy; 2026 | Created by litbang_koornas 2026
            </p>
          </div>
        </div>
      </div>

      {/* Full-screen loading overlay */}
      {loading && (
        <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-white/80 backdrop-blur-sm">
          <div className="relative">
            <div className="h-16 w-16 animate-spin rounded-full border-4 border-transparent border-t-[#072AC8] border-r-[#06154F]" />
            <div className="absolute inset-0 flex items-center justify-center">
              <img src="/logo.svg" alt="" className="h-8 w-8 animate-pulse object-contain" />
            </div>
          </div>
          <p className="mt-4 text-sm font-semibold text-[#06154F] animate-pulse">
            Memverifikasi kredensial...
          </p>
        </div>
      )}
    </div>
  );
}

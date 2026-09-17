import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// Exact-match public paths. JANGAN masukkan '/' ke daftar startsWith di
// bawah — startsWith('/') mencocokkan SEMUA route dan mematikan proteksi auth.
const publicExactPaths = ['/'];

const publicPaths = [
  '/login',
  '/public',
  '/verify',
  '/klaim',
  '/daftar',
  '/reset-password',
  '/forgot-password',
  '/landing',
  '/sejarah',
  '/organisasi',
  '/kepengurusan',
  '/struktur-organisasi',
  '/berita',
  '/galeri',
  '/donasi',
];

// ─────────────────────────────────────────────────────────────────────────
// Proxy (dulu: Middleware) — Next.js 16 mengganti konvensi `middleware.ts`
// menjadi `proxy.ts` dengan ekspor bernama `proxy`. File middleware.ts lama
// TIDAK dijalankan Next 16, sehingga proteksi auth halaman dashboard mati
// total di dev maupun produksi hingga migrasi ini.
// ─────────────────────────────────────────────────────────────────────────
export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (
    publicExactPaths.includes(pathname) ||
    publicPaths.some((path) => pathname.startsWith(path))
  ) {
    return NextResponse.next();
  }

  if (pathname.startsWith('/_next') || pathname.startsWith('/api')) {
    return NextResponse.next();
  }

  // E2E test bypass: when the Playwright route interceptor injects this header,
  // skip the auth check so tests can mock auth at the API level.
  // Only active in development/test mode - never in production.
  if (process.env.NODE_ENV !== 'production' && request.headers.get('x-e2e-bypass') === 'true') {
    return NextResponse.next();
  }

  // Gunakan refreshToken (cookie httpOnly, berumur 14 hari, diset backend dengan
  // `Secure` di production) sebagai sinyal sesi yang tahan lama. accessToken hanya
  // berumur 15 menit — mengandalkannya untuk proteksi halaman akan memicu redirect
  // palsu ("session expired") setelah token akses kadaluarsa padahal sesi masih valid.
  const refreshToken = request.cookies.get('refreshToken')?.value;
  const accessToken = request.cookies.get('accessToken')?.value;

  if (!refreshToken && !accessToken) {
    const loginUrl = new URL('/login', request.url);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};

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
export async function proxy(request: NextRequest) {
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
  // berumur 15 menit — tidak lagi digunakan untuk keputusan autentikasi di proxy.
  const refreshToken = request.cookies.get('refreshToken')?.value;

  // Jika tidak ada refreshToken, dianggap tidak terautentikasi.
  if (!refreshToken) {
    const loginUrl = new URL('/login', request.url);
    return NextResponse.redirect(loginUrl);
  }

  // Panggil endpoint verifikasi sesi di backend.
  // Gunakan timeout agar tidak menunggu selamanya jika backend tidak merespon.
  const verifyUrl = new URL('/api/auth/session/verify', request.url);
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 5000);
  let loginUrl: URL;
  try {
    const verifyResp = await fetch(verifyUrl.toString(), {
      method: 'GET',
      headers: request.headers, // Forward semua header (terutama cookie)
      credentials: 'include',   // Pastikan cookie dikirim ke backend
      signal: controller.signal, // Timeout 5 detik
    });

    if (verifyResp.ok) {
      // Sesi valid, lanjutkan request.
      return NextResponse.next();
    }

    // Jika backend mengembalikan 401 (sesi tidak valid) atau status lain,
    // anggap sesi tidak valid dan redirect ke login.
    loginUrl = new URL('/login', request.url);
  } catch {
    // Jika terjadi error (timeout, network error, dll), fail closed.
    loginUrl = new URL('/login', request.url);
  } finally {
    clearTimeout(timeoutId);
  }
  return NextResponse.redirect(loginUrl);
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};

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
  '/force-change-password',
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
    loginUrl.searchParams.set('session_invalid', '1');
    return NextResponse.redirect(loginUrl);
  }

  // Panggil endpoint verifikasi sesi di backend.
  // Gunakan timeout agar tidak menunggu selamanya jika backend tidak merespon.
  //
  // PENTING (BUG login loop "login sukses → langsung di-kick ke /login"):
  // Jangan `fetch` ke origin Next.js sendiri (`new URL('/api/...', request.url)`)
  // karena request itu RE-ENTER Next.js dan di dev/standalone bisa gagal sampai
  // API (tidak terekam di log backend) namun tetap mengembalikan 401 dari jalur
  // lain → proxy salah anggap sesi invalid → 307 /login?session_invalid=1 → loop.
  // Solusinya: panggil API backend LANGSUNG lewat NEXT_PUBLIC_API_URL, dan
  // teruskan header `cookie` dari `request.cookies` secara eksplisit (di runtime
  // proxy, `request.headers` tidak dijamin memuat `cookie`).
  const apiBase = (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001').replace(/\/api\/?$/, '');
  const verifyUrl = `${apiBase}/api/auth/session/verify`;
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 5000);
  try {
    const verifyResp = await fetch(verifyUrl, {
      method: 'GET',
      headers: {
        // Hanya kirim cookie + minimal header; jangan teruskan `host`/`origin`
        // dari request asal agar backend tidak bingung.
        cookie: request.cookies.toString(),
      },
      signal: controller.signal, // Timeout 5 detik
    });

    if (verifyResp.ok) {
      // Sesi valid, lanjutkan request.
      return NextResponse.next();
    }

    // Backend menjawab secara eksplisit 401 (sesi tidak valid) — sinyal pasti
    // bahwa pengguna memang tidak terautentikasi. Redirect ke login.
    if (verifyResp.status === 401) {
      const loginUrl = new URL('/login', request.url);
      loginUrl.searchParams.set('session_invalid', '1');
      return NextResponse.redirect(loginUrl);
    }

    // Status lain (5xx, 429, 3xx, dll.) = backend bermasalah, BUKAN bukti sesi
    // invalid. Fail-OPEN agar pengguna valid tidak terlempar ke login saat backend
    // sibuk. Sesi sungguhan divalidasi di data-layer via apiClient interceptor.
    return NextResponse.next();
  } catch (error) {
    // Timeout / network error (mis. hairpin NAT di Docker produksi: container
    // web tidak bisa fetch balik ke https://ths-thm.cloud WAN IP — penyebab
    // BUG login hang/loop). Fail-OPEN, bukan fail-closed: sesi yang valid
    // tidak boleh dianggap invalid hanya karena backend tak terjangkau dari
    // dalam proxy. Sesi asli divalidasi ulang oleh data-layer & apiClient.
    return NextResponse.next();
  } finally {
    clearTimeout(timeoutId);
  }
}

export const config = {
  // Matcher membiarkan SEMUA aset statis publik (gambar, font, dll) lewat tanpa
  // dicegat proxy. Sebelumnya hanya _next/static|_next/image|favicon.ico yang
  // dikecualikan — akibatnya request /logo.svg, /logo.png, /favicon.png,
  // /peta-indonesia.png dll. ikut dicegat, lalu (tanpa refreshToken) di-redirect
  // 307 ke /login?session_invalid=1 yang berisi HTML, bukan file gambar.
  // Ini yang membuat logo pecah di landing page, loading spinner login & header.
  // Ekstensi yang dikecualikan: gambar, ikon, font, CSS, JS, dokumen, dll.
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|avif|ico|bmp|woff|woff2|ttf|otf|eot|css|js|map|json|webmanifest|txt|pdf|doc|docx|xls|xlsx|zip|mp4|webm|mp3|wav)).*)',
  ],
};

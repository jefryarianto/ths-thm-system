'use client';

import { useEffect } from 'react';
import { LandingPageContent } from '@/components';
import { getHomePathForRole } from '@/lib/role-redirect';

/**
 * Halaman root (https://ths-thm.cloud/).
 *
 * - Pengunjung anonim: melihat landing page langsung di domain utama.
 * - Pengguna yang sudah login: diarahkan ke home sesuai peran
 *   (admin → /dashboard, anggota → /forum) sehingga tidak perlu melewati landing.
 *
 * PENTING (bug "tidak bisa kembali ke landing page"):
 * Keberadaan `accessToken` di localStorage BUKAN bukti sesi masih hidup — token
 * itu berumur 15 menit dan bisa basi sementara cookie httpOnly `refreshToken`
 * (satu-satunya sinyal sesi server) sudah dicabut. Kalau kita langsung
 * `window.location.replace()` berdasarkan localStorage, user dengan sesi mati
 * dilempar ke `/dashboard` → proxy tidak menemukan refreshToken → 307 kembali
 * ke `/login?session_invalid=1`. Maka bouncing keluar landing terjadi setiap
 * kali sesi server kedaluwarsa.
 *
 * Solusinya: verifikasi sesi ke backend (`/auth/session/verify`) dulu, dan baru
 * redirect kalau backend mengonfirmasi sesi masih valid. Gagal verifikasi
 * (termasuk transient/network) → tetap di landing page, tempat paling aman.
 */
export default function HomePage() {
  useEffect(() => {
    const token = localStorage.getItem('accessToken');
    if (!token) return;

    let cancelled = false;

    (async () => {
      try {
        // Hanya redirect kalau sesi server benar-benar valid. Cookie httpOnly
        // refreshToken dikirim otomatis oleh browser (same-origin /api).
        const res = await fetch('/api/auth/session/verify', {
          credentials: 'include',
          cache: 'no-store',
        });
        if (cancelled) return;
        if (!res.ok) return; // 401/403 = sesi mati → tetap di landing
      } catch {
        // Network error / backend tidak terjangkau: jangan mengusir user dari
        // landing. Halaman ini publik dan tetap utuh tanpa sesi.
        return;
      }

      let role: string | null = null;
      try {
        const raw = localStorage.getItem('user');
        if (raw) role = (JSON.parse(raw) as { role?: string })?.role ?? null;
      } catch {
        /* ignore */
      }
      window.location.replace(getHomePathForRole(role));
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  return <LandingPageContent />;
}

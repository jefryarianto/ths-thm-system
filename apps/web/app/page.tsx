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
 * Catatan: pemeriksaan auth terjadi di efek sisi-klien (token ada di localStorage),
 * jadi landing dirender dulu lalu di-replace — tidak ada flash kosong.
 */
export default function HomePage() {
  useEffect(() => {
    const token = localStorage.getItem('accessToken');
    if (!token) return;

    let role: string | null = null;
    try {
      const raw = localStorage.getItem('user');
      if (raw) role = (JSON.parse(raw) as { role?: string })?.role ?? null;
    } catch {
      /* ignore */
    }
    window.location.replace(getHomePathForRole(role));
  }, []);

  return <LandingPageContent />;
}

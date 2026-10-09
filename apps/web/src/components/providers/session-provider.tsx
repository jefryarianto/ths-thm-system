'use client';

import { useEffect, useRef } from 'react';
import { usePathname } from 'next/navigation';
import { sessionManager } from '@/lib/session-manager';
import { useToast } from '@/components/ui/toast';
import { SessionWarningToast } from '@/components/session-warning-toast';
import { useActivityTracker } from '@/hooks/use-activity-tracker';
import { playSessionWarningAlert, playSessionExpiredAlert } from '@/lib/notification-alert';

export function SessionProvider({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const toast = useToast();
  const toastRef = useRef(toast);
  const pathnameRef = useRef(pathname);
  // Benar-benar "session expired redirect" sudah dijadwalkan dan tidak boleh
  // dibatalkan oleh refresh sukses yang datang sesudahnya (lihat listener).
  const redirectScheduledRef = useRef(false);
  toastRef.current = toast;
  pathnameRef.current = pathname;

  // Session expired listener — stable, runs once
  useEffect(() => {
    let timeoutId: NodeJS.Timeout | undefined;

    const unsubscribe = sessionManager.subscribe(() => {
      if (sessionManager.isExpired) {
        if (pathnameRef.current === '/login') {
          // Pengguna berada di halaman login saat sesi berakhir: tidak perlu
          // redirect (sudah di sana). Reset flag redirect juga agar login baru
          // di halaman ini bisa berjalan bersih.
          redirectScheduledRef.current = false;
          sessionManager.reset();
          return;
        }
        // BUG FIX (loop "sesi berulang"): tandai bahwa redirect expired SUDAH
        // dijadwalkan. Tanpa ini, permintaan API yang tertunda (mis. polling
        // dashboard setiap 10 detik) memicu self-healing interceptor, refresh
        // berhasil karena cookie refreshToken 14 hari masih valid, lalu
        // memanggil sessionManager.reset() → subscriber ini masuk cabang else
        // dan clearTimeout(timeoutId) membatalkan redirect yang seharusnya
        // membawa pengguna ke landing. Sesi otomatis "hidup" lagi tanpa login
        // baru, dan 15 menit kemudian expire() menendang lagi → siklus
        // landing ↔ dashboard tanpa henti.
        redirectScheduledRef.current = true;
        playSessionExpiredAlert();
        toastRef.current('error', 'Sesi Anda telah berakhir. Mengalihkan ke halaman utama...');
        timeoutId = setTimeout(() => {
          window.location.replace('/');
        }, 1000);
      } else if (!redirectScheduledRef.current) {
        // Hanya batalkan redirect bila belum pernah dijadwalkan. Setelah
        // expire() memutuskan untuk redirect, hanya login baru (yang me-reset
        // lewat setTokens di halaman /login, jauh sebelum ini) yang boleh
        // memulihkan sesi.
        if (timeoutId) {
          clearTimeout(timeoutId);
          timeoutId = undefined;
        }
      }
    });

    return () => {
      unsubscribe();
      if (timeoutId) clearTimeout(timeoutId);
    };
  }, []); // stable — uses refs

  // Expiring soon listener — stable, runs once
  useEffect(() => {
    const unsubscribeExpiring = sessionManager.subscribeExpiringSoon((secondsRemaining: number) => {
      if (sessionManager.isExpired) return;
      playSessionWarningAlert();
      const warningToastId = `warning-expiry`;
      toastRef.current('warning', 'Sesi Anda akan segera berakhir.', {
        id: warningToastId,
        duration: 0,
        content: (
          <SessionWarningToast expiresInSeconds={secondsRemaining} toastId={warningToastId} />
        ),
      });
    });

    return () => {
      unsubscribeExpiring();
    };
  }, []); // stable — uses refs

  // One-time setup: expired flag check + initial warning schedule
  useEffect(() => {
    const expired = localStorage.getItem('session-expired') === 'true';
    if (expired && !sessionManager.isExpired) {
      localStorage.removeItem('session-expired');
      sessionManager.expire(false);
    }

    const existingToken = localStorage.getItem('accessToken');
    if (existingToken && !sessionManager.isExpired) {
      sessionManager.scheduleExpiryWarning(existingToken);
    }
  }, []); // runs once on mount

  // Track user activity and auto-refresh token before expiry
  useActivityTracker();

  return <>{children}</>;
}

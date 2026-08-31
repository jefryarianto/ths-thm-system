'use client';

import { useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { sessionManager } from '@/lib/session-manager';
import { proactivelyRefresh } from '@/lib/api-client';
import { useToast } from '@/components/ui/toast';

export function SessionProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const toast = useToast();

  useEffect(() => {
    let timeoutId: NodeJS.Timeout | undefined;

    // ─── Session Expired Listener ─────────────────────────────
    const unsubscribe = sessionManager.subscribe(() => {
      console.log('[session-provider] Session state changed:', { isExpired: sessionManager.isExpired, pathname });
      if (sessionManager.isExpired) {
        // Sudah di halaman login: bersihkan state expired segera agar login
        // berikutnya tidak diblokir flag usang (tanpa toast/redirect).
        if (pathname === '/login') {
          sessionManager.reset();
          return;
        }

        toast('error', 'Sesi Anda telah berakhir. Mengalihkan ke halaman login...');

        timeoutId = setTimeout(() => {
          router.push('/login');
        }, 1000);
      } else {
        if (timeoutId) {
          clearTimeout(timeoutId);
          timeoutId = undefined;
        }
      }
    });

    // ─── Expiring Soon Listener ───────────────────────────────
    const unsubscribeExpiring = sessionManager.subscribeExpiringSoon((secondsRemaining: number) => {
      if (sessionManager.isExpired) return;

      const minutes = Math.floor(secondsRemaining / 60);
      const seconds = secondsRemaining % 60;
      const timeStr = minutes > 0 ? `${minutes} menit ${seconds} detik` : `${seconds} detik`;

      toast('warning', `Sesi Anda akan berakhir dalam ${timeStr}. Klik "Perpanjang Sesi" untuk tetap masuk.`, {
        duration: 30_000, // 30 seconds — long enough for user to decide
        action: {
          label: 'Perpanjang Sesi',
          onClick: async () => {
            try {
              const newToken = await proactivelyRefresh();
              // Schedule next warning for the refreshed token
              sessionManager.scheduleExpiryWarning(newToken);
              toast('success', 'Sesi berhasil diperpanjang.');
            } catch {
              // Refresh failed — session will be handled by the expired listener
              toast('error', 'Gagal memperpanjang sesi. Anda akan dialihkan ke halaman login.');
            }
          },
        },
      });
    });

    // Check for pre-existing session-expired flag on mount
    const expired = localStorage.getItem('session-expired') === 'true';
    if (expired && !sessionManager.isExpired) {
      // Clear the flag first to avoid redirect loops on subsequent loads
      localStorage.removeItem('session-expired');
      sessionManager.expire(false);
    }

    // ─── Schedule initial warning if token is already set ─────
    const existingToken = localStorage.getItem('accessToken');
    if (existingToken && !sessionManager.isExpired) {
      sessionManager.scheduleExpiryWarning(existingToken);
    }

    return () => {
      unsubscribe();
      unsubscribeExpiring();
      if (timeoutId) clearTimeout(timeoutId);
    };
  }, [router, pathname, toast]);

  return <>{children}</>;
}

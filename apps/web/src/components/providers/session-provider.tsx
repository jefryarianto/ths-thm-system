'use client';

import { useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { sessionManager } from '@/lib/session-manager';
import { useToast } from '@/components/ui/toast';
import { SessionWarningToast } from '@/components/session-warning-toast';

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

      // Pre-generate ID so the countdown component can dismiss itself
      const warningToastId = `warning-${Date.now()}`;
      toast('warning', 'Sesi Anda akan segera berakhir.', {
        id: warningToastId,
        duration: 0, // don't auto-dismiss — countdown handles its own lifecycle
        content: <SessionWarningToast expiresInSeconds={secondsRemaining} toastId={warningToastId} />,
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

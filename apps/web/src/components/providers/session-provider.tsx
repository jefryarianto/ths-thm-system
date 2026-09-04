'use client';

import { useEffect, useRef } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { sessionManager } from '@/lib/session-manager';
import { useToast } from '@/components/ui/toast';
import { SessionWarningToast } from '@/components/session-warning-toast';
import { useActivityTracker } from '@/hooks/use-activity-tracker';
import { playSessionWarningAlert, playSessionExpiredAlert } from '@/lib/notification-alert';

export function SessionProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const toast = useToast();
  const toastRef = useRef(toast);
  const pathnameRef = useRef(pathname);
  const routerRef = useRef(router);
  toastRef.current = toast;
  pathnameRef.current = pathname;
  routerRef.current = router;

  // Session expired listener — stable, runs once
  useEffect(() => {
    let timeoutId: NodeJS.Timeout | undefined;

    const unsubscribe = sessionManager.subscribe(() => {
      if (sessionManager.isExpired) {
        if (pathnameRef.current === '/login') {
          sessionManager.reset();
          return;
        }
        playSessionExpiredAlert();
        toastRef.current('error', 'Sesi Anda telah berakhir. Mengalihkan ke halaman utama...');
        timeoutId = setTimeout(() => {
          routerRef.current.replace('/');
        }, 1000);
      } else {
        if (timeoutId) {
          clearTimeout(timeoutId);
          timeoutId = undefined;
        }
      }
    });

    return () => {
      unsubscribe();
      if (timeoutId) clearTimeout(timeoutId);
    }
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
        content: <SessionWarningToast expiresInSeconds={secondsRemaining} toastId={warningToastId} />,
      });
    });

    return () => { unsubscribeExpiring(); };
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

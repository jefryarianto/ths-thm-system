'use client';

import { useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { sessionManager } from '@/lib/session-manager';
import { useToast } from '@/components/ui/toast';

export function SessionProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const toast = useToast();

  useEffect(() => {
    let timeoutId: NodeJS.Timeout | undefined;

    const unsubscribe = sessionManager.subscribe(() => {
      if (sessionManager.isExpired) {
        // Don't toast/redirect if already on login page
        if (pathname === '/login' || pathname === '/') return;

        toast('error', 'Sesi Anda telah berakhir. Mengalihkan ke halaman login...');

        timeoutId = setTimeout(() => {
          router.push('/login');
        }, 3000);
      } else {
        if (timeoutId) {
          clearTimeout(timeoutId);
          timeoutId = undefined;
        }
      }
    });

    // Check for pre-existing session-expired flag on mount
    const expired = localStorage.getItem('session-expired') === 'true';
    if (expired && !sessionManager.isExpired) {
      sessionManager.expire();
    }

    return () => {
      unsubscribe();
      if (timeoutId) clearTimeout(timeoutId);
    };
  }, [router, pathname, toast]);

  return <>{children}</>;
}

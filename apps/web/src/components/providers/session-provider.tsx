'use client';

import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { sessionManager } from '@/lib/session-manager';

export function SessionProvider({ children }: { children: React.ReactNode }) {
  const [showToast, setShowToast] = useState(false);
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    let timeoutId: NodeJS.Timeout | undefined;

    const unsubscribe = sessionManager.subscribe(() => {
      if (sessionManager.isExpired) {
        // Don't toast/redirect if already on login page
        if (pathname === '/login' || pathname === '/') return;

        setShowToast(true);

        timeoutId = setTimeout(() => {
          setShowToast(false);
          router.push('/login');
        }, 3000);
      } else {
        setShowToast(false);
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
  }, [router, pathname]);

  return (
    <>
      {children}
      {showToast && (
        <div className="fixed bottom-4 right-4 z-[9999] flex items-center gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 shadow-xl">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#dc2626" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="8" x2="12" y2="12" />
            <line x1="12" y1="16" x2="12.01" y2="16" />
          </svg>
          <span className="text-sm text-red-800">
            Sesi Anda telah berakhir. Silakan login kembali...
          </span>
        </div>
      )}
    </>
  );
}

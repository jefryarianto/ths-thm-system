'use client';

import { useState, useEffect } from 'react';
import { proactivelyRefresh } from '@/lib/api-client';
import { sessionManager } from '@/lib/session-manager';
import { useDismissToast } from '@/components/ui/toast';

interface SessionWarningToastProps {
  expiresInSeconds: number;
  toastId: string;
}

function formatTime(totalSeconds: number): string {
  const m = Math.floor(totalSeconds / 60);
  const s = totalSeconds % 60;
  return m > 0 ? `${m}:${String(s).padStart(2, '0')}` : `${s}`;
}

export function SessionWarningToast({ expiresInSeconds: initial, toastId }: SessionWarningToastProps) {
  const [remaining, setRemaining] = useState(initial);
  const [refreshing, setRefreshing] = useState(false);
  const dismissToast = useDismissToast();

  const dismiss = () => dismissToast(toastId);

  useEffect(() => {
    if (remaining <= 0) {
      dismiss();
      return;
    }
    const timer = setInterval(() => {
      setRemaining((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          dismiss();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [remaining, dismiss]);

  const progressPercent = Math.max(0, Math.min(100, (remaining / initial) * 100));
  const isUrgent = remaining <= 60;

  const handleExtend = async () => {
    setRefreshing(true);
    try {
      const newToken = await proactivelyRefresh();
      sessionManager.scheduleExpiryWarning(newToken);
      dismiss();
    } catch {
      dismiss();
    } finally {
      setRefreshing(false);
    }
  };

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center gap-2">
        <span className="text-sm text-gray-800 dark:text-gray-200">
          Sesi berakhir dalam{' '}
          <span className={`font-mono font-bold ${isUrgent ? 'text-red-600 dark:text-red-400' : 'text-amber-600 dark:text-amber-400'}`}>
            {formatTime(remaining)}
          </span>
        </span>
      </div>
      {/* Progress bar */}
      <div className="w-full h-1.5 rounded-full bg-gray-200 dark:bg-gray-700 overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-1000 ease-linear ${
            isUrgent ? 'bg-red-500' : 'bg-amber-500'
          }`}
          style={{ width: `${progressPercent}%` }}
        />
      </div>
      <p className="text-xs text-gray-500 dark:text-gray-400">
        Klik &quot;Perpanjang Sesi&quot; untuk tetap masuk
      </p>
      <button
        onClick={handleExtend}
        disabled={refreshing}
        className="mt-1 w-full text-sm font-medium px-3 py-1.5 rounded-md bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-800 dark:text-gray-200 transition-colors disabled:opacity-50"
      >
        {refreshing ? 'Memperpanjang...' : 'Perpanjang Sesi'}
      </button>
    </div>
  );
}

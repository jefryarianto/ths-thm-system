'use client';

import { useState, useEffect } from 'react';
import { Shield, Clock } from 'lucide-react';
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
    <div className="flex flex-col gap-3 p-1">
      {/* Header with icon */}
      <div className="flex items-center gap-2.5">
        <div className={`shrink-0 p-1.5 rounded-full ${isUrgent ? 'bg-error-100 dark:bg-error-900/60' : 'bg-warning-100 dark:bg-warning-900/60'}`}>
          {isUrgent ? (
            <Clock size={16} className="text-error-500 dark:text-error-400 animate-pulse" />
          ) : (
            <Shield size={16} className="text-warning-500 dark:text-warning-400" />
          )}
        </div>
        <span className="text-sm font-medium text-text">
          Sesi berakhir dalam{' '}
          <span
            className={`font-mono font-bold tabular-nums ${
              isUrgent
                ? 'text-error dark:text-error'
                : 'text-warning-600 dark:text-warning-400'
            }`}
          >
            {formatTime(remaining)}
          </span>
        </span>
      </div>

      {/* Progress bar */}
      <div className="w-full h-1.5 rounded-full bg-surface-variant overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-1000 ease-linear ${
            isUrgent ? 'bg-error-500 dark:bg-error-400' : 'bg-warning-500 dark:bg-warning-400'
          }`}
          style={{ width: `${progressPercent}%` }}
        />
      </div>

      <p className="text-xs text-muted -mt-1">
        Klik &quot;Perpanjang Sesi&quot; untuk tetap masuk
      </p>

      {/* Extend button */}
      <button
        onClick={handleExtend}
        disabled={refreshing}
        className={`w-full text-sm font-semibold px-3 py-2 rounded-lg
          transition-all duration-150 active:scale-[0.98]
          disabled:opacity-50 disabled:cursor-not-allowed
          ${
            isUrgent
              ? 'bg-error hover:bg-error-700 dark:bg-error-700 dark:hover:bg-error-600 text-white'
              : 'bg-primary hover:bg-[var(--primary-hover)] dark:bg-primary-700 dark:hover:bg-primary-600 text-white'
          }`}
      >
        {refreshing ? (
          <span className="flex items-center justify-center gap-2">
            <span className="animate-spin h-3.5 w-3.5 border-2 border-white/30 border-t-white rounded-full" />
            Memperpanjang...
          </span>
        ) : (
          'Perpanjang Sesi'
        )}
      </button>
    </div>
  );
}

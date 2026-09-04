'use client';

import { useEffect, useRef, useCallback } from 'react';
import { proactivelyRefresh } from '@/lib/api-client';
import { sessionManager } from '@/lib/session-manager';

// Refresh token if less than this many seconds remain
const REFRESH_THRESHOLD_SECONDS = 120; // 2 minutes (refresh before 5-min inactivity timeout)

// Throttle: minimum ms between activity-triggered refresh attempts
const REFRESH_COOLDOWN_MS = 60_000; // 1 minute

/**
 * Track user activity (clicks, scrolls, keystrokes, touches) and
 * proactively refresh the access token when it is close to expiry.
 *
 * This prevents the 5-minute warning toast from ever appearing for
 * active users — the token is silently renewed before the warning window.
 *
 * Usage: call once in a top-level layout/provider.
 */
export function useActivityTracker() {
  const lastRefreshAt = useRef(0);
  const refreshing = useRef(false);

  const maybeRefresh = useCallback(async () => {
    if (refreshing.current) return;
    if (sessionManager.isExpired) return;

    // Cooldown check
    const now = Date.now();
    if (now - lastRefreshAt.current < REFRESH_COOLDOWN_MS) return;

    // Decode token to check expiry
    const token = typeof window !== 'undefined' ? localStorage.getItem('accessToken') : null;
    if (!token) return;

    try {
      const parts = token.split('.');
      if (parts.length !== 3) return;
      const payload = JSON.parse(atob(parts[1]));
      if (typeof payload.exp !== 'number') return;

      const secondsUntilExpiry = Math.floor((payload.exp * 1000 - Date.now()) / 1000);
      if (secondsUntilExpiry > REFRESH_THRESHOLD_SECONDS) return;
      if (secondsUntilExpiry <= 0) return; // already expired, let interceptor handle

      // Token is within threshold — refresh now
      refreshing.current = true;
      lastRefreshAt.current = Date.now();
      console.log(
        `[activity-tracker] Token expiring in ${secondsUntilExpiry}s, refreshing proactively`,
      );
      await proactivelyRefresh();
    } catch {
      // Ignore decode/refresh errors — the interceptor will handle real failures
    } finally {
      refreshing.current = false;
    }
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    // Throttled wrapper to prevent hammering refresh
    let throttleTimer: ReturnType<typeof setTimeout> | null = null;
    const throttledRefresh = () => {
      if (throttleTimer) return;
      throttleTimer = setTimeout(() => {
        throttleTimer = null;
        maybeRefresh();
      }, 2000); // debounce 2s after last activity burst
    };

    // Activity events to track
    const events: Array<[Window | Document, string, EventListenerOrEventListenerObject]> = [
      [window, 'mousemove', throttledRefresh],
      [window, 'keydown', throttledRefresh],
      [window, 'scroll', throttledRefresh],
      [window, 'touchstart', throttledRefresh],
      [document, 'click', throttledRefresh],
    ];

    events.forEach(([target, event, handler]) => {
      target.addEventListener(event, handler, { passive: true });
    });

    return () => {
      events.forEach(([target, event, handler]) => {
        target.removeEventListener(event, handler);
      });
      if (throttleTimer) clearTimeout(throttleTimer);
    };
  }, [maybeRefresh]);
}

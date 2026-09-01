import { useEffect, useRef, useCallback } from 'react';
import { AppState, AppStateStatus } from 'react-native';
import { proactivelyRefresh } from '../lib/api-client';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Refresh token if less than this many seconds remain
const REFRESH_THRESHOLD_SECONDS = 600; // 10 minutes

// Cooldown between activity-triggered refresh attempts
const REFRESH_COOLDOWN_MS = 60_000; // 1 minute

/**
 * Track user activity on mobile (app foreground, screen focus) and
 * proactively refresh the access token when it is close to expiry.
 *
 * For mobile, "activity" means the app is in the foreground — the user
 * is actively looking at the screen. This is the strongest signal of
 * activity available in React Native without per-screen gesture tracking.
 */
export function useActivityTracker() {
  const lastRefreshAt = useRef(0);
  const refreshing = useRef(false);

  const maybeRefresh = useCallback(async () => {
    if (refreshing.current) return;

    // Cooldown check
    const now = Date.now();
    if (now - lastRefreshAt.current < REFRESH_COOLDOWN_MS) return;

    // Decode token to check expiry
    try {
      const token = await AsyncStorage.getItem('accessToken');
      if (!token) return;

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
      // Ignore errors — the interceptor will handle real failures
    } finally {
      refreshing.current = false;
    }
  }, []);

  useEffect(() => {
    const handleAppState = (nextState: AppStateStatus) => {
      if (nextState === 'active') {
        // App just came to foreground — user is active
        maybeRefresh();
      }
    };

    const subscription = AppState.addEventListener('change', handleAppState);

    // Also check on mount (app might already be active with token near expiry)
    maybeRefresh();

    return () => {
      subscription?.remove();
    };
  }, [maybeRefresh]);
}

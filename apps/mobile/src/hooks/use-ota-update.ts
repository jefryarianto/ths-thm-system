import { useEffect, useRef, useState, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Updates from 'expo-updates';

/** AsyncStorage key untuk setelan "periksa pembaruan otomatis saat aplikasi dibuka". */
export const OTA_AUTO_CHECK_KEY = '@settings/ota_auto_check';

/** Baca setelan auto-check pembaruan (default: aktif). */
export async function getOtaAutoCheckEnabled(): Promise<boolean> {
  try {
    const value = await AsyncStorage.getItem(OTA_AUTO_CHECK_KEY);
    return value === null ? true : value === '1';
  } catch {
    return true;
  }
}

/** Simpan setelan auto-check pembaruan. */
export async function setOtaAutoCheckEnabled(enabled: boolean): Promise<void> {
  try {
    await AsyncStorage.setItem(OTA_AUTO_CHECK_KEY, enabled ? '1' : '0');
  } catch {
    /* best-effort */
  }
}


interface OTAUpdateState {
  /** Whether an update is currently being downloaded */
  isDownloading: boolean;
  /** Download progress 0–1 (if available) */
  downloadProgress: number;
  /** Whether an update is ready to apply (will apply on next restart) */
  isUpdateReady: boolean;
  /** Latest error message, if any */
  error: string | null;
  /** The runtime version of the available update */
  availableVersion: string | null;
}

interface UseOTAUpdateReturn extends OTAUpdateState {
  /** Manually trigger an update check */
  checkForUpdate: () => Promise<void>;
  /** Download and apply the update (restarts the app) */
  applyUpdate: () => Promise<void>;
  /** Dismiss the update prompt without applying */
  dismissUpdate: () => void;
  /** Whether the update prompt should be shown to the user */
  showUpdatePrompt: boolean;
}

/**
 * Hook to check for and apply OTA updates via EAS Update.
 *
 * On mount it checks for an update. If one is available, it sets
 * `showUpdatePrompt = true` so the UI can show a dialog.
 * The user can then choose to apply (restart) or dismiss.
 */
export function useOTAUpdate(): UseOTAUpdateReturn {
  const [state, setState] = useState<OTAUpdateState>({
    isDownloading: false,
    downloadProgress: 0,
    isUpdateReady: false,
    error: null,
    availableVersion: null,
  });
  const [showUpdatePrompt, setShowUpdatePrompt] = useState(false);
  const didCheckRef = useRef(false);

  const checkForUpdate = useCallback(async () => {
    try {
      // Skip in development — OTA doesn't work in dev mode
      if (__DEV__) return;

      setState((s) => ({ ...s, error: null }));

      const update = await Updates.checkForUpdateAsync();

      if (update.isAvailable) {
        setState((s) => ({
          ...s,
          availableVersion: 'baru',
        }));
        setShowUpdatePrompt(true);
      }
    } catch (err: any) {
      // Don't show error to user — just log it
      if (__DEV__) {
        console.warn('[OTA] Check failed:', err?.message ?? err);
      }
    }
  }, []);

  const applyUpdate = useCallback(async () => {
    try {
      setState((s) => ({ ...s, isDownloading: true, error: null, downloadProgress: 0 }));

      // Download the update
      const downloadResult = await Updates.fetchUpdateAsync();

      if (downloadResult.isNew) {
        // Update downloaded — apply on restart
        setState((s) => ({ ...s, isDownloading: false, isUpdateReady: true, downloadProgress: 1 }));
        setShowUpdatePrompt(false);

        // Restart the app to apply the update
        await Updates.reloadAsync();
      } else {
        // No new content — might already be up to date
        setState((s) => ({ ...s, isDownloading: false }));
        setShowUpdatePrompt(false);
      }
    } catch (err: any) {
      setState((s) => ({
        ...s,
        isDownloading: false,
        error: err?.message ?? 'Gagal memperbarui aplikasi',
      }));
      if (__DEV__) {
        console.warn('[OTA] Apply failed:', err?.message ?? err);
      }
    }
  }, []);

  const dismissUpdate = useCallback(() => {
    setShowUpdatePrompt(false);
  }, []);

  // Check for updates on mount (once) — hanya jika setelan auto-check aktif.
  // Pemeriksaan + unduhan background native (checkAutomatically: "ON_LOAD" di app.json)
  // TETAP berjalan terlepas dari setelan ini; yang dikendalikan di sini hanyalah
  // pemeriksaan JS dan tampilnya prompt otomatis kepada pengguna.
  useEffect(() => {
    if (didCheckRef.current) return;
    didCheckRef.current = true;

    let timer: ReturnType<typeof setTimeout> | undefined;
    let cancelled = false;

    (async () => {
      const enabled = await getOtaAutoCheckEnabled();
      if (cancelled || !enabled) return;
      // Delay the check slightly so the app has time to render
      timer = setTimeout(() => {
        checkForUpdate();
      }, 3000);
    })();

    return () => {
      cancelled = true;
      if (timer) clearTimeout(timer);
    };
  }, [checkForUpdate]);

  // Background updates are handled by checkAutomatically: "ON_LOAD" in app.json.
  // No need for a foreground listener — the native module checks on each app load.

  return {
    ...state,
    showUpdatePrompt,
    checkForUpdate,
    applyUpdate,
    dismissUpdate,
  };
}

import { useEffect, useRef, useState, useCallback } from 'react';
import * as Updates from 'expo-updates';

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

  // Check for updates on mount (once)
  useEffect(() => {
    if (didCheckRef.current) return;
    didCheckRef.current = true;

    // Delay the check slightly so the app has time to render
    const timer = setTimeout(() => {
      checkForUpdate();
    }, 3000);

    return () => clearTimeout(timer);
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

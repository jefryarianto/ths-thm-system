import { Stack, router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useState, useCallback } from 'react';
import { Alert } from 'react-native';
import { useFonts } from 'expo-font';
import { useAuthStore, AuthState } from '../src/store/auth-store';
import { GlobalErrorBoundary } from '../src/components/GlobalErrorBoundary';
import { SessionExpiryWarning } from '../src/components/SessionExpiryWarning';
import { setupNotificationListeners } from '../src/lib/fcm';
import { useNotificationDeepLink } from '../src/hooks/useNotificationDeepLink';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { onSessionExpired, onExpiringSoon, scheduleExpiryWarning } from '../src/lib/session-expired';
import { useActivityTracker } from '../src/hooks/use-activity-tracker';
import { playSessionWarningAlert, playSessionExpiredAlert, preloadAlertSound } from '../src/lib/notification-alert';
import { useOTAUpdate } from '../src/hooks/use-ota-update';
import { OTAUpdatePrompt } from '../src/components/OTAUpdatePrompt';

export default function RootLayout() {
  const loadUser = useAuthStore((s: AuthState) => s.loadUser);

  useNotificationDeepLink();

  // Muat font kartu: OCR A Extended (data No. Anggota), Open Sans (header), Roboto (label & teks lain).
  // Kunci useFonts harus sama persis dgn nama family internal TTF ("OCR A Extended", "Open Sans", "Roboto").
  // Ionicons di-PRELOAD di sini (dengan alias 'ionicons' + 'Ionicons' untuk pencocokan Android/web) supaya
  // ikon tab bar & tombol tidak dirender kosong/kotak gara-gara lazy-load @expo/vector-icons.
  const [fontsLoaded, fontError] = useFonts({
    'OCR A Extended': require('../assets/fonts/ocr-a-extended.ttf'),
    'OpenSans-Bold': require('../assets/fonts/open-sans-bold.ttf'),
    'Roboto-Regular': require('../assets/fonts/Roboto-Regular.ttf'),
    'Roboto-Bold': require('../assets/fonts/Roboto-Bold.ttf'),
    'Ionicons': require('../assets/fonts/Ionicons.ttf'),
    'ionicons': require('../assets/fonts/Ionicons.ttf'),
  });

  // ─── Session Expiry Warning State ─────────────────────────
  const [expiryWarningVisible, setExpiryWarningVisible] = useState(false);
  const [expirySeconds, setExpirySeconds] = useState(300);

  const handleExpiryWarningDismiss = useCallback(() => {
    setExpiryWarningVisible(false);
  }, []);

  // Track user activity (app foreground) and auto-refresh token before expiry
  useActivityTracker();

  // OTA Update
  const {
    isDownloading: otaDownloading,
    availableVersion: otaVersion,
    error: otaError,
    showUpdatePrompt: otaShowPrompt,
    applyUpdate: otaApplyUpdate,
    dismissUpdate: otaDismissUpdate,
  } = useOTAUpdate();

  useEffect(() => {
    loadUser();
  }, []);

  // Preload notification sound on mount
  useEffect(() => {
    preloadAlertSound();
  }, []);

  // Listen for session expiry from api-client interceptor
  useEffect(() => {
    const unsubscribe = onSessionExpired(() => {
      setExpiryWarningVisible(false);
      playSessionExpiredAlert();
      Alert.alert(
        'Sesi Berakhir',
        'Sesi Anda telah berakhir. Silakan login kembali.',
        [{ text: 'OK', onPress: () => router.replace('/login') }],
      );
    });
    return unsubscribe;
  }, []);

  // Listen for expiring-soon warnings
  useEffect(() => {
    const unsubscribe = onExpiringSoon((secondsRemaining: number) => {
      setExpirySeconds(secondsRemaining);
      setExpiryWarningVisible(true);
      playSessionWarningAlert();
    });
    return unsubscribe;
  }, []);

  // Schedule initial warning if token is already set on mount
  useEffect(() => {
    AsyncStorage.getItem('accessToken').then((token) => {
      if (token) scheduleExpiryWarning(token);
    }).catch(() => {});
  }, []);

  useEffect(() => {
    const cleanup = setupNotificationListeners(
      undefined,
      (response) => {
        const data = response.notification?.request?.content?.data as
          | { screen?: string; screenId?: string }
          | undefined;
        if (data?.screen === 'approvals' && data?.screenId) {
          router.push(`/approvals/${data.screenId}`);
        }
      },
    );
    return cleanup;
  }, []);

  // Tunggu font siap sebelum merender navigasi agar font kartu langsung tersedia.
  // Jika ada ERROR (font korup/hilang), JANGAN blokir app — biarkan font sistem sebagai
  // fallback supaya UI tetap terlihat (tidak blank screen permanen).
  if (!fontsLoaded && !fontError) {
    return null;
  }
  if (__DEV__ && fontError) {
    console.warn('[fonts] Sebagian font gagal dimuat, memakai font sistem sebagai fallback:', fontError);
  }

  return (
    <GlobalErrorBoundary>
      <>
        <StatusBar style="light" />
        <SessionExpiryWarning
          visible={expiryWarningVisible}
          expiresInSeconds={expirySeconds}
          onDismiss={handleExpiryWarningDismiss}
        />
        <OTAUpdatePrompt
          visible={otaShowPrompt}
          isDownloading={otaDownloading}
          availableVersion={otaVersion}
          error={otaError}
          onUpdate={otaApplyUpdate}
          onDismiss={otaDismissUpdate}
        />
        <Stack screenOptions={{ headerShown: false }}>
          <Stack.Screen name="index" />
          <Stack.Screen name="login" />
          <Stack.Screen name="(tabs)" />
          <Stack.Screen name="trainings" />
          <Stack.Screen name="trainings/[id]" />
          <Stack.Screen name="trainings/create" />
          <Stack.Screen name="activities" />
          <Stack.Screen name="activities/[id]" />
          <Stack.Screen name="activities/create" />
          <Stack.Screen name="candidates" />
          <Stack.Screen name="candidates/[id]" />
          <Stack.Screen name="letters" />
          <Stack.Screen name="letters/[id]" />
          <Stack.Screen name="letters/create" />
          <Stack.Screen name="assessments" />
          <Stack.Screen name="assessments/[id]" />
          <Stack.Screen name="assessments/create" />
          <Stack.Screen name="graduations" />
          <Stack.Screen name="graduations/[id]" />
          <Stack.Screen name="graduations/input-score" />
          <Stack.Screen name="graduations/invitations" />
          <Stack.Screen name="dues/[id]" />
          <Stack.Screen name="payments/create" />
          <Stack.Screen name="documents/[id]" />
          <Stack.Screen name="member-import" />
          <Stack.Screen name="reports" />
          <Stack.Screen name="admin-rewards" />
          <Stack.Screen name="notification-preferences" />
          <Stack.Screen name="profile/edit" />
          <Stack.Screen name="public-leaderboard" />
          <Stack.Screen name="members" />
          <Stack.Screen name="members/[id]" />
          <Stack.Screen name="members/create" />
          <Stack.Screen name="forgot-password" />
          <Stack.Screen name="reset-password" />
          <Stack.Screen name="force-change-password" />
          <Stack.Screen name="approvals" />
          <Stack.Screen name="approvals/[id]" />
          <Stack.Screen name="approvals/reference-claim" />
          <Stack.Screen name="approvals/reference-letter" />
          <Stack.Screen name="approvals/reference-document" />
          <Stack.Screen name="approvals/reference-member" />
          <Stack.Screen name="approvals/reference-candidate" />
          <Stack.Screen name="examiners" />
          <Stack.Screen name="forum" />
          <Stack.Screen name="forum/create" />
          <Stack.Screen name="forum/c/[categoryId]" />
          <Stack.Screen name="forum/t/[threadId]" />
          <Stack.Screen name="org-documents" />
          <Stack.Screen name="camera/photo" />
        </Stack>
      </>
    </GlobalErrorBoundary>
  );
}
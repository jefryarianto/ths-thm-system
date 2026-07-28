import { Stack, router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { useAuthStore, AuthState } from '../src/store/auth-store';
import { GlobalErrorBoundary } from '../src/components/GlobalErrorBoundary';
import { setupNotificationListeners } from '../src/lib/fcm';

export default function RootLayout() {
  const loadUser = useAuthStore((s: AuthState) => s.loadUser);

  useEffect(() => {
    loadUser();
  }, []);

  // ─── FCM deep link handler ───
  useEffect(() => {
    const cleanup = setupNotificationListeners(
      // Received while app is in foreground — badge count handled by socket
      undefined,
      // Tapped from notification tray → navigate to deep link
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

  return (
    <GlobalErrorBoundary>
      <>
        <StatusBar style="light" />
        <Stack screenOptions={{ headerShown: false }}>
          <Stack.Screen name="index" />
          <Stack.Screen name="login" />
          <Stack.Screen name="(tabs)" />
          <Stack.Screen name="trainings" />
          <Stack.Screen name="trainings/[id]" />
          <Stack.Screen name="activities" />
          <Stack.Screen name="activities/[id]" />
          <Stack.Screen name="candidates" />
          <Stack.Screen name="candidates/[id]" />
          <Stack.Screen name="letters" />
          <Stack.Screen name="letters/[id]" />
          <Stack.Screen name="assessments" />
          <Stack.Screen name="assessments/[id]" />
          <Stack.Screen name="graduations" />
          <Stack.Screen name="graduations/[id]" />
          <Stack.Screen name="graduations/input-score" />
          <Stack.Screen name="dues/[id]" />
          <Stack.Screen name="documents/[id]" />
          <Stack.Screen name="member-import" />
          <Stack.Screen name="reports" />
          <Stack.Screen name="admin-rewards" />
          <Stack.Screen name="notification-preferences" />
          <Stack.Screen name="profile/edit" />
          <Stack.Screen name="public-leaderboard" />
          <Stack.Screen name="members" />
          <Stack.Screen name="members/[id]" />
          <Stack.Screen name="forgot-password" />
          <Stack.Screen name="approvals" />
          <Stack.Screen name="approvals/[id]" />
          <Stack.Screen name="approvals/reference-claim" />
          <Stack.Screen name="approvals/reference-letter" />
          <Stack.Screen name="approvals/reference-document" />
          <Stack.Screen name="approvals/reference-member" />
          <Stack.Screen name="approvals/reference-candidate" />
          <Stack.Screen name="org-documents" />
        </Stack>
      </>
    </GlobalErrorBoundary>
  );
}

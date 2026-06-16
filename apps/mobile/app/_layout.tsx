import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { useAuthStore, AuthState } from '../src/store/auth-store';

export default function RootLayout() {
  const loadUser = useAuthStore((s: AuthState) => s.loadUser);

  useEffect(() => {
    loadUser();
  }, []);

  return (
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
        <Stack.Screen name="org-documents" />
      </Stack>
    </>
  );
}

import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { useAuthStore, AuthState } from '../src/store/auth-store';

export default function RootLayout() {
  const loadUser = useAuthStore((s: AuthState) => s.loadUser);

  useEffect(() => { loadUser(); }, []);

  return (
    <>
      <StatusBar style="light" />
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="index" />
        <Stack.Screen name="login" />
        <Stack.Screen name="(tabs)" />
      </Stack>
    </>
  );
}
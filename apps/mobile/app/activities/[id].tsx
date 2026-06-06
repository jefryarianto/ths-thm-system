import { Redirect, useLocalSearchParams } from 'expo-router';
import { useAuthStore, AuthState } from '../../src/store/auth-store';

export default function ActivityDetailRoute() {
  const isAuthenticated = useAuthStore((s: AuthState) => s.isAuthenticated);
  if (!isAuthenticated) return <Redirect href={'/login' as any} />;

  const Screen = require('../../src/screens/activities/detail').default;
  return <Screen />;
}

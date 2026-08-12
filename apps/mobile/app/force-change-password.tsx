import { Redirect } from 'expo-router';
import { useAuthStore, AuthState } from '../src/store/auth-store';

export default function ForceChangePasswordRoute() {
  const isAuthenticated = useAuthStore((s: AuthState) => s.isAuthenticated);
  if (isAuthenticated) return <Redirect href={'/(tabs)/home' as any} />;

  const Screen = require('../src/screens/auth/force-change-password').default;
  return <Screen />;
}

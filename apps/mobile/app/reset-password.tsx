import { Redirect } from 'expo-router';
import { useAuthStore, AuthState } from '../src/store/auth-store';

export default function ResetPasswordRoute() {
  const isAuthenticated = useAuthStore((s: AuthState) => s.isAuthenticated);
  if (isAuthenticated) return <Redirect href={'/(tabs)/home' as any} />;

  const Screen = require('../src/screens/auth/reset-password').default;
  return <Screen />;
}

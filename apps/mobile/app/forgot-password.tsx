import { Redirect } from 'expo-router';
import { useAuthStore, AuthState } from '../src/store/auth-store';

export default function ForgotPasswordRoute() {
  const isAuthenticated = useAuthStore((s: AuthState) => s.isAuthenticated);
  if (isAuthenticated) return <Redirect href={'/(tabs)/home' as any} />;

  const Screen = require('../src/screens/auth/forgot-password').default;
  return <Screen />;
}
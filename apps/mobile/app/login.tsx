import { Redirect } from 'expo-router';
import { useAuthStore, AuthState } from '../src/store/auth-store';

export default function LoginRoute() {
  const isAuthenticated = useAuthStore((s: AuthState) => s.isAuthenticated);
  if (isAuthenticated) return <Redirect href={"/(tabs)/home" as any} />;

  const LoginScreen = require('../src/screens/auth/login').default;
  return <LoginScreen />;
}
import { Redirect } from 'expo-router';
import { useAuthStore } from '../../src/store/auth-store';

export default function LoginRoute() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  if (isAuthenticated) return <Redirect href="/(tabs)/home" />;

  const LoginScreen = require('../../src/screens/auth/login').default;
  return <LoginScreen />;
}
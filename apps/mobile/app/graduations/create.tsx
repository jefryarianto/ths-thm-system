import { Redirect } from 'expo-router';
import { useAuthStore, AuthState } from '../../src/store/auth-store';

export default function CreateGraduationRoute() {
  const isAuthenticated = useAuthStore((s: AuthState) => s.isAuthenticated);
  if (!isAuthenticated) return <Redirect href={'/login' as any} />;

  const Screen = require('../../src/screens/graduations/create').default;
  return <Screen />;
}
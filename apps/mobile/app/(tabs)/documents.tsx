import { Redirect } from 'expo-router';
import { useAuthStore, AuthState } from '../../src/store/auth-store';

export default function DocumentsRoute() {
  if (!useAuthStore((s: AuthState) => s.isAuthenticated)) return <Redirect href={"/login" as any} />;
  const Screen = require('../../src/screens/documents/index').default;
  return <Screen />;
}
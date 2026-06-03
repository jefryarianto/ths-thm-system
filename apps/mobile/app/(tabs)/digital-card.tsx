import { Redirect } from 'expo-router';
import { useAuthStore, AuthState } from '../../src/store/auth-store';

export default function DigitalCardRoute() {
  if (!useAuthStore((s: AuthState) => s.isAuthenticated)) return <Redirect href={"/login" as any} />;
  const Screen = require('../../src/screens/digital-card/index').default;
  return <Screen />;
}
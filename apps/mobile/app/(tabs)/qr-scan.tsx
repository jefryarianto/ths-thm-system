import { Redirect } from 'expo-router';
import { useAuthStore, AuthState } from '../../src/store/auth-store';

export default function QRScanRoute() {
  if (!useAuthStore((s: AuthState) => s.isAuthenticated)) return <Redirect href={"/login" as any} />;
  const Screen = require('../../src/screens/qr-scan/index').default;
  return <Screen />;
}
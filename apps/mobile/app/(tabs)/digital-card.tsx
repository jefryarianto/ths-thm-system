import { Redirect } from 'expo-router';
import { useAuthStore } from '../../../src/store/auth-store';

export default function DigitalCardRoute() {
  if (!useAuthStore((s) => s.isAuthenticated)) return <Redirect href="/login" />;
  const Screen = require('../../../src/screens/digital-card/index').default;
  return <Screen />;
}
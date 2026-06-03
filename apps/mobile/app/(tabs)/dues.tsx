import { Redirect } from 'expo-router';
import { useAuthStore } from '../../../src/store/auth-store';

export default function DuesRoute() {
  if (!useAuthStore((s) => s.isAuthenticated)) return <Redirect href="/login" />;
  const Screen = require('../../../src/screens/dues/index').default;
  return <Screen />;
}
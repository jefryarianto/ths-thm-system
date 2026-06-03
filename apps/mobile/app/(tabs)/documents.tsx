import { Redirect } from 'expo-router';
import { useAuthStore } from '../../../src/store/auth-store';

export default function DocumentsRoute() {
  if (!useAuthStore((s) => s.isAuthenticated)) return <Redirect href="/login" />;
  const Screen = require('../../../src/screens/documents/index').default;
  return <Screen />;
}
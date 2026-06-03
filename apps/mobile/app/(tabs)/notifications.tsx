import { Redirect } from 'expo-router';
import { useAuthStore } from '../../../src/store/auth-store';

export default function NotificationsRoute() {
  if (!useAuthStore((s) => s.isAuthenticated)) return <Redirect href="/login" />;
  const Screen = require('../../../src/screens/notifications/index').default;
  return <Screen />;
}
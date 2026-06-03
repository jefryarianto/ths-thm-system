import { Redirect } from 'expo-router';
import { useAuthStore, AuthState } from '../../src/store/auth-store';

export default function NotificationsRoute() {
  if (!useAuthStore((s: AuthState) => s.isAuthenticated)) return <Redirect href={"/login" as any} />;
  const Screen = require('../../src/screens/notifications/index').default;
  return <Screen />;
}
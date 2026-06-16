import { Redirect } from 'expo-router';
import { useAuthStore, AuthState } from '../src/store/auth-store';

export default function MembersRoute() {
  const isAuthenticated = useAuthStore((s: AuthState) => s.isAuthenticated);
  if (!isAuthenticated) return <Redirect href={'/login' as any} />;

  const Screen = require('../src/screens/members/list').default;
  return <Screen />;
}
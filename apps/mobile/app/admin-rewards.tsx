import { Redirect } from 'expo-router';
import { useAuthStore, AuthState } from '../src/store/auth-store';

export default function AdminRewardsRoute() {
  const isAuthenticated = useAuthStore((s: AuthState) => s.isAuthenticated);
  if (!isAuthenticated) return <Redirect href={'/login' as any} />;

  const AdminRewardsScreen = require('../src/screens/gamification/admin-rewards').default;
  return <AdminRewardsScreen />;
}

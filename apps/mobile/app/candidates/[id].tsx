import { Redirect, useLocalSearchParams } from 'expo-router';
import { useAuthStore, AuthState } from '../../src/store/auth-store';

export default function CandidateDetailRoute() {
  const isAuthenticated = useAuthStore((s: AuthState) => s.isAuthenticated);
  if (!isAuthenticated) return <Redirect href={'/login' as any} />;

  const Screen = require('../../src/screens/candidates/detail').default;
  return <Screen />;
}

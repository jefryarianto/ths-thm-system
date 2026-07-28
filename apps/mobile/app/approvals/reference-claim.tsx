import { Redirect } from 'expo-router';
import { useAuthStore, AuthState } from '../../src/store/auth-store';
import ReferenceClaimScreen from '../../src/screens/approvals/reference-claim';

export default function ReferenceClaimRoute() {
  const user = useAuthStore((s: AuthState) => s.user);
  if (!user) return <Redirect href="/login" />;
  return <ReferenceClaimScreen />;
}

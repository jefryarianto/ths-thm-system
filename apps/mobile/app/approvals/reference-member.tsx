import { Redirect } from 'expo-router';
import { useAuthStore, AuthState } from '../../src/store/auth-store';
import ReferenceMemberScreen from '../../src/screens/approvals/reference-member';

export default function ReferenceMemberRoute() {
  const user = useAuthStore((s: AuthState) => s.user);
  if (!user) return <Redirect href="/login" />;
  return <ReferenceMemberScreen />;
}

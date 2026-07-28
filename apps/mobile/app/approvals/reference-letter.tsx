import { Redirect } from 'expo-router';
import { useAuthStore, AuthState } from '../../src/store/auth-store';
import ReferenceLetterScreen from '../../src/screens/approvals/reference-letter';

export default function ReferenceLetterRoute() {
  const user = useAuthStore((s: AuthState) => s.user);
  if (!user) return <Redirect href="/login" />;
  return <ReferenceLetterScreen />;
}

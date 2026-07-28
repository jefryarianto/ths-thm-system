import { Redirect } from 'expo-router';
import { useAuthStore, AuthState } from '../../src/store/auth-store';
import ReferenceDocumentScreen from '../../src/screens/approvals/reference-document';

export default function ReferenceDocumentRoute() {
  const user = useAuthStore((s: AuthState) => s.user);
  if (!user) return <Redirect href="/login" />;
  return <ReferenceDocumentScreen />;
}

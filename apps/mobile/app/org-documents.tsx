import { Redirect } from 'expo-router';
import { useAuthStore, AuthState } from '../src/store/auth-store';

export default function OrgDocumentsRoute() {
  const isAuthenticated = useAuthStore((s: AuthState) => s.isAuthenticated);
  if (!isAuthenticated) return <Redirect href={'/login' as any} />;

  const Screen = require('../src/screens/org-documents/index').default;
  return <Screen />;
}
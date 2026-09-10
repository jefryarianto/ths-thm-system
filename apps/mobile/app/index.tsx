import { Redirect } from 'expo-router';
import { useAuthStore, AuthState } from '../src/store/auth-store';
import { LoadingView } from '../src/components/ui/shared';

export default function Index() {
  const isAuthenticated = useAuthStore((s: AuthState) => s.isAuthenticated);
  const isLoading = useAuthStore((s: AuthState) => s.isLoading);

  if (isLoading) {
    return <LoadingView message="Memuat aplikasi..." />;
  }

  return isAuthenticated ? (
    <Redirect href={'/(tabs)/home' as any} />
  ) : (
    <Redirect href={'/login' as any} />
  );
}

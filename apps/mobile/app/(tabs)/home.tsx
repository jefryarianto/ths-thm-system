import { Redirect } from 'expo-router';
import { useAuthStore, AuthState } from '../../src/store/auth-store';

export default function HomeRoute() {
  const isAuthenticated = useAuthStore((s: AuthState) => s.isAuthenticated);
  if (!isAuthenticated) return <Redirect href={"/login" as any} />;

  const HomeScreen = require('../../src/screens/members/home').default;
  return <HomeScreen />;
}
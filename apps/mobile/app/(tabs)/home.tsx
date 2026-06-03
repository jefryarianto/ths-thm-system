import { Redirect } from 'expo-router';
import { useAuthStore } from '../../../src/store/auth-store';

export default function HomeRoute() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  if (!isAuthenticated) return <Redirect href="/login" />;

  const HomeScreen = require('../../../src/screens/members/home').default;
  return <HomeScreen />;
}
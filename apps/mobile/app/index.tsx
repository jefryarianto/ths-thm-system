import { Redirect } from 'expo-router';
import { useAuthStore, AuthState } from '../src/store/auth-store';
import { ActivityIndicator, View } from 'react-native';

export default function Index() {
  const isAuthenticated = useAuthStore((s: AuthState) => s.isAuthenticated);
  const isLoading = useAuthStore((s: AuthState) => s.isLoading);

  if (isLoading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#111827' }}>
        <ActivityIndicator size="large" color="#2563eb" />
      </View>
    );
  }

  return isAuthenticated ? <Redirect href={"/(tabs)/home" as any} /> : <Redirect href={"/login" as any} />;
}
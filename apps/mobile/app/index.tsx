import { Redirect } from 'expo-router';
import { useAuthStore } from '../../src/store/auth-store';
import { ActivityIndicator, View } from 'react-native';

export default function Index() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const isLoading = useAuthStore((s) => s.isLoading);

  if (isLoading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#111827' }}>
        <ActivityIndicator size="large" color="#2563eb" />
      </View>
    );
  }

  return isAuthenticated ? <Redirect href="/(tabs)/home" /> : <Redirect href="/login" />;
}
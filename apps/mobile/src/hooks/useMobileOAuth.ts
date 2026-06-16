import { useState, useCallback } from 'react';
import { Alert } from 'react-native';
import * as WebBrowser from 'expo-web-browser';
import AsyncStorage from '@react-native-async-storage/async-storage';
import apiClient from '../lib/api-client';
import { useAuthStore } from '../store/auth-store';
import { registerForPushNotifications } from '../lib/fcm';

const API_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3001';

// Derive the frontend URL from the API URL (API on :3001, frontend on :3000)
const FRONTEND_URL = process.env.EXPO_PUBLIC_FRONTEND_URL || API_URL.replace(':3001', ':3000');

// Warm up the browser auth session
WebBrowser.warmUpAsync();

export function useMobileOAuth() {
  const [loading, setLoading] = useState<string | null>(null);

  const handleOAuthLogin = useCallback(async (provider: 'google' | 'linkedin') => {
    setLoading(provider);
    try {
      // Build the OAuth URL
      const oauthUrl = `${API_URL}/api/auth/${provider}`;

      // The backend redirects to FRONTEND_URL/login?token=xxx&refresh=yyy
      // Use that login URL as the redirectUrl so openAuthSessionAsync captures it
      const redirectUrl = `${FRONTEND_URL}/login`;

      const result = await WebBrowser.openAuthSessionAsync(oauthUrl, redirectUrl);

      if (result.type === 'success' && result.url) {
        // Parse the redirect URL to extract token and refresh params
        const url = result.url;
        const tokenMatch = url.match(/[?&]token=([^&]+)/);
        const refreshMatch = url.match(/[?&]refresh=([^&]+)/);
        const errorMatch = url.match(/[?&]error=([^&]+)/);

        if (errorMatch) {
          Alert.alert(
            'Login Gagal',
            'Autentikasi dengan ' + provider + ' gagal. Silakan coba lagi.',
          );
          return;
        }

        if (tokenMatch && refreshMatch) {
          const accessToken = decodeURIComponent(tokenMatch[1]);
          const refreshToken = decodeURIComponent(refreshMatch[1]);

          // Store tokens
          await AsyncStorage.setItem('accessToken', accessToken);
          await AsyncStorage.setItem('refreshToken', refreshToken);

          // Fetch user profile
          try {
            const { data } = await apiClient.get('/auth/me');
            if (data.success) {
              await AsyncStorage.setItem('user', JSON.stringify(data.data));
              const user = data.data;
              useAuthStore.setState({ user, isAuthenticated: true });

              // Register FCM push token for notifications
              registerForPushNotifications().catch(() => {});
            }
          } catch {
            // Failed to fetch profile, but tokens are stored
            Alert.alert('Info', 'Login berhasil, tetapi gagal memuat profil.');
          }
        } else {
          Alert.alert('Login Gagal', 'Tidak menerima token dari server. Silakan coba lagi.');
        }
      } else if (result.type === 'cancel' || result.type === 'dismiss') {
        // User cancelled - do nothing
      } else {
        Alert.alert('Error', 'Terjadi kesalahan saat autentikasi. Silakan coba lagi.');
      }
    } catch (error: any) {
      Alert.alert('Error', error?.message || 'Terjadi kesalahan. Silakan coba lagi.');
    } finally {
      setLoading(null);
    }
  }, []);

  return {
    handleGoogleLogin: useCallback(() => handleOAuthLogin('google'), [handleOAuthLogin]),
    handleLinkedInLogin: useCallback(() => handleOAuthLogin('linkedin'), [handleOAuthLogin]),
    loading,
  };
}

// Clean up
export function cleanupOAuth() {
  WebBrowser.coolDownAsync();
}

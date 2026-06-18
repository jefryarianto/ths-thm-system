import { useState, useCallback } from 'react';
import { Alert } from 'react-native';
import * as WebBrowser from 'expo-web-browser';
import AsyncStorage from '@react-native-async-storage/async-storage';
import apiClient from '../lib/api-client';
import { useAuthStore } from '../store/auth-store';
import { registerForPushNotifications } from '../lib/fcm';

const API_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3001';
const FRONTEND_URL = process.env.EXPO_PUBLIC_FRONTEND_URL || API_URL.replace(':3001', ':3000');

WebBrowser.warmUpAsync();

export function useMobileOAuth() {
  const [loading, setLoading] = useState<string | null>(null);

  const handleGoogleLogin = useCallback(async () => {
    setLoading('google');
    try {
      const oauthUrl = `${API_URL}/api/auth/google`;
      const redirectUrl = `${FRONTEND_URL}/login`;
      const result = await WebBrowser.openAuthSessionAsync(oauthUrl, redirectUrl);

      if (result.type === 'success' && result.url) {
        const url = result.url;
        const tokenMatch = url.match(/[?&]token=([^&]+)/);
        const refreshMatch = url.match(/[?&]refresh=([^&]+)/);
        const errorMatch = url.match(/[?&]error=([^&]+)/);

        if (errorMatch) {
          Alert.alert('Login Gagal', 'Autentikasi dengan Google gagal. Silakan coba lagi.');
          return;
        }

        if (tokenMatch && refreshMatch) {
          const accessToken = decodeURIComponent(tokenMatch[1]);
          const refreshToken = decodeURIComponent(refreshMatch[1]);

          await AsyncStorage.setItem('accessToken', accessToken);
          await AsyncStorage.setItem('refreshToken', refreshToken);

          try {
            const { data } = await apiClient.get('/auth/me');
            if (data.success) {
              await AsyncStorage.setItem('user', JSON.stringify(data.data));
              useAuthStore.setState({ user: data.data, isAuthenticated: true });
              registerForPushNotifications().catch(() => {});
            }
          } catch {
            Alert.alert('Info', 'Login berhasil, tetapi gagal memuat profil.');
          }
        } else {
          Alert.alert('Login Gagal', 'Tidak menerima token dari server. Silakan coba lagi.');
        }
      }
    } catch (error: any) {
      Alert.alert('Error', error?.message || 'Terjadi kesalahan. Silakan coba lagi.');
    } finally {
      setLoading(null);
    }
  }, []);

  const handleLinkedInLogin = useCallback(async () => {
    setLoading('linkedin');
    try {
      const oauthUrl = `${API_URL}/api/auth/linkedin`;
      const redirectUrl = `${FRONTEND_URL}/login`;
      await WebBrowser.openAuthSessionAsync(oauthUrl, redirectUrl);
    } catch (error: any) {
      Alert.alert('Error', error?.message || 'Terjadi kesalahan. Silakan coba lagi.');
    } finally {
      setLoading(null);
    }
  }, []);

  return {
    handleGoogleLogin,
    handleLinkedInLogin,
    loading,
  };
}

export function cleanupOAuth() {
  WebBrowser.coolDownAsync();
}

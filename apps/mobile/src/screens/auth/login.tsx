import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { router } from 'expo-router';
import { useAuthStore, AuthState } from '../../store/auth-store';
import { useMobileOAuth } from '../../hooks/useMobileOAuth';
import { registerForPushNotifications } from '../../lib/fcm';

export default function LoginScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const login = useAuthStore((s: AuthState) => s.login);
  const { handleGoogleLogin, handleLinkedInLogin, loading: oauthLoading } = useMobileOAuth();

  const handleLogin = async () => {
    if (!email || !password) {
      Alert.alert('Error', 'Email dan password harus diisi');
      return;
    }
    setLoading(true);
    try {
      await login(email, password);
      // Register FCM token after successful login
      registerForPushNotifications();
      router.replace('/(tabs)/home' as any);
    } catch (error: any) {
      const msg = error?.response?.data?.message || 'Login gagal. Periksa email dan password Anda.';
      Alert.alert('Error', msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>THS-THM</Text>
        <Text style={styles.subtitle}>Sistem Manajemen</Text>
      </View>
      <View style={styles.form}>
        <Text style={styles.label}>Email</Text>
        <TextInput
          style={styles.input}
          value={email}
          onChangeText={setEmail}
          placeholder="email@ths-thm.org"
          keyboardType="email-address"
          autoCapitalize="none"
        />
        <Text style={styles.label}>Password</Text>
        <TextInput
          style={styles.input}
          value={password}
          onChangeText={setPassword}
          placeholder="Password"
          secureTextEntry
        />
        <TouchableOpacity
          style={[styles.button, loading && styles.buttonDisabled]}
          onPress={handleLogin}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.buttonText}>Masuk</Text>
          )}
        </TouchableOpacity>

        {/* OAuth Divider */}
        <View style={styles.divider}>
          <View style={styles.dividerLine} />
          <Text style={styles.dividerText}>Atau login dengan</Text>
          <View style={styles.dividerLine} />
        </View>

        {/* Google OAuth */}
        <TouchableOpacity
          style={[styles.oauthButton, oauthLoading === 'google' && styles.oauthButtonDisabled]}
          onPress={handleGoogleLogin}
          disabled={!!oauthLoading}
        >
          {oauthLoading === 'google' ? (
            <ActivityIndicator color="#374151" />
          ) : (
            <>
              <Text style={styles.oauthIcon}>G</Text>
              <Text style={styles.oauthButtonText}> Login dengan Google</Text>
            </>
          )}
        </TouchableOpacity>

        {/* LinkedIn OAuth */}
        <TouchableOpacity
          style={[styles.oauthButton, oauthLoading === 'linkedin' && styles.oauthButtonDisabled]}
          onPress={handleLinkedInLogin}
          disabled={!!oauthLoading}
        >
          {oauthLoading === 'linkedin' ? (
            <ActivityIndicator color="#374151" />
          ) : (
            <>
              <Text style={styles.oauthIcon}>in</Text>
              <Text style={styles.oauthButtonText}> Login dengan LinkedIn</Text>
            </>
          )}
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.forgotPassword}
          onPress={() => router.push('/forgot-password' as any)}
        >
          <Text style={styles.forgotPasswordText}>Lupa password?</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.publicButton}
          onPress={() => router.push('/public-leaderboard' as any)}
        >
          <Text style={styles.publicButtonText}>🏆 Lihat Peringkat Publik</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f3f4f6', justifyContent: 'center', padding: 24 },
  header: { alignItems: 'center', marginBottom: 40 },
  title: { fontSize: 28, fontWeight: 'bold', color: '#1d4ed8' },
  subtitle: { fontSize: 14, color: '#6b7280', marginTop: 4 },
  form: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 24,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 2,
  },
  label: { fontSize: 14, fontWeight: '600', color: '#374151', marginBottom: 6, marginTop: 16 },
  input: {
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    backgroundColor: '#f9fafb',
  },
  button: {
    backgroundColor: '#2563eb',
    borderRadius: 8,
    padding: 14,
    alignItems: 'center',
    marginTop: 24,
  },
  buttonDisabled: { opacity: 0.5 },
  buttonText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  divider: { flexDirection: 'row', alignItems: 'center', marginVertical: 20 },
  dividerLine: { flex: 1, height: 1, backgroundColor: '#d1d5db' },
  dividerText: { marginHorizontal: 12, fontSize: 13, color: '#9ca3af' },
  oauthButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 14,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#d1d5db',
    backgroundColor: '#fff',
    marginBottom: 8,
  },
  oauthButtonDisabled: { opacity: 0.5 },
  oauthIcon: {
    fontSize: 16,
    fontWeight: '700',
    color: '#374151',
    width: 24,
    height: 24,
    textAlign: 'center',
    lineHeight: 24,
    backgroundColor: '#f3f4f6',
    borderRadius: 4,
    overflow: 'hidden',
  },
  oauthButtonText: { fontSize: 14, fontWeight: '600', color: '#374151' },
  publicButton: {
    marginTop: 8,
    padding: 12,
    alignItems: 'center',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#d1d5db',
    backgroundColor: '#f9fafb',
  },
  publicButtonText: { fontSize: 14, fontWeight: '500', color: '#374151' },
  forgotPassword: {
    marginTop: 12,
    alignItems: 'center',
    padding: 8,
  },
  forgotPasswordText: { fontSize: 13, color: '#2563eb', fontWeight: '500' },
});

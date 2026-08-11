import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
  Image,
  Switch,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAuthStore, AuthState } from '../../store/auth-store';
import { useMobileOAuth } from '../../hooks/useMobileOAuth';
import { registerForPushNotifications } from '../../lib/fcm';

// Logo resmi THS-THM (di-bundle bersama app)
const LOGO = require('../../../assets/images/logo.png');
const REMEMBERED_EMAIL_KEY = 'remembered_email';

export default function LoginScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const login = useAuthStore((s: AuthState) => s.login);
  const { handleGoogleLogin, loading: oauthLoading } = useMobileOAuth();

  // Pre-fill email yang disimpan dari sesi sebelumnya ("Ingat Saya")
  useEffect(() => {
    (async () => {
      try {
        const saved = await AsyncStorage.getItem(REMEMBERED_EMAIL_KEY);
        if (saved) {
          setEmail(saved);
          setRememberMe(true);
        }
      } catch {
        // ignore storage read errors
      }
    })();
  }, []);

  const handleLogin = async () => {
    if (!email || !password) {
      Alert.alert('Error', 'Email dan password harus diisi');
      return;
    }
    setLoading(true);
    try {
      await login(email, password);
      // Simpan / hapus email sesuai preferensi "Ingat Saya"
      try {
        if (rememberMe) {
          await AsyncStorage.setItem(REMEMBERED_EMAIL_KEY, email);
        } else {
          await AsyncStorage.removeItem(REMEMBERED_EMAIL_KEY);
        }
      } catch {
        // ignore storage write errors
      }
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
        {/* Logo organisasi — langsung tampil tanpa lingkaran putih, biar muat penuh */}
        <Image source={LOGO} style={styles.logo} resizeMode="contain" />
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
        <View style={styles.passwordWrap}>
          <TextInput
            style={[styles.input, styles.passwordInput]}
            value={password}
            onChangeText={setPassword}
            placeholder="Password"
            secureTextEntry={!showPassword}
          />
          {/* Intip Password */}
          <TouchableOpacity
            style={styles.eyeButton}
            onPress={() => setShowPassword((prev) => !prev)}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Ionicons
              name={showPassword ? 'eye-off-outline' : 'eye-outline'}
              size={22}
              color="#6b7280"
            />
          </TouchableOpacity>
        </View>

        {/* Ingat Saya */}
        <View style={styles.rememberRow}>
          <Switch
            value={rememberMe}
            onValueChange={setRememberMe}
            trackColor={{ false: '#d1d5db', true: '#2563eb' }}
            thumbColor={rememberMe ? '#fff' : '#f9fafb'}
          />
          <Text style={styles.rememberText}>Ingat saya</Text>
        </View>

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

        <TouchableOpacity
          style={styles.forgotPassword}
          onPress={() => router.push('/forgot-password' as any)}
        >
          <Text style={styles.forgotPasswordText}>Lupa password?</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f3f4f6', justifyContent: 'center', paddingHorizontal: 24, paddingVertical: 16 },
  header: { alignItems: 'center', marginBottom: 20 },
  logo: { width: 128, height: 128, marginBottom: 12 },
  title: { fontSize: 34, fontWeight: 'bold', color: '#1d4ed8', textAlign: 'center' },
  subtitle: { fontSize: 16, color: '#6b7280', marginTop: 2, textAlign: 'center' },
  form: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 20,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 2,
  },
  label: { fontSize: 14, fontWeight: '600', color: '#374151', marginBottom: 6, marginTop: 12 },
  input: {
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    backgroundColor: '#f9fafb',
  },
  passwordWrap: { position: 'relative' },
  passwordInput: { paddingRight: 48 },
  eyeButton: {
    position: 'absolute',
    right: 12,
    top: 0,
    bottom: 0,
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
  rememberRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 12,
    gap: 8,
  },
  rememberText: { fontSize: 14, color: '#374151', fontWeight: '500' },
  button: {
    backgroundColor: '#2563eb',
    borderRadius: 8,
    padding: 13,
    alignItems: 'center',
    marginTop: 18,
  },
  buttonDisabled: { opacity: 0.5 },
  buttonText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  divider: { flexDirection: 'row', alignItems: 'center', marginVertical: 14 },
  dividerLine: { flex: 1, height: 1, backgroundColor: '#d1d5db' },
  dividerText: { marginHorizontal: 12, fontSize: 13, color: '#9ca3af' },
  oauthButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 13,
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
  forgotPassword: {
    marginTop: 10,
    alignItems: 'center',
    padding: 6,
  },
  forgotPasswordText: { fontSize: 13, color: '#2563eb', fontWeight: '500' },
});
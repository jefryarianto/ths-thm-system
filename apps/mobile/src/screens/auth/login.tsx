import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  Image,
  Switch,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import apiClient from '../../lib/api-client';
import { useAuthStore, AuthState } from '../../store/auth-store';
import { useMobileOAuth } from '../../hooks/useMobileOAuth';
import { registerForPushNotifications } from '../../lib/fcm';
import { LoadingSpinner } from '../../components/ui/shared';
import { theme } from '../../theme';

// Logo resmi THS-THM (di-bundle bersama app)
const LOGO = require('../../../assets/images/logo.png');
const REMEMBERED_IDENTIFIER_KEY = 'remembered_identifier';

export default function LoginScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [googleOAuthEnabled, setGoogleOAuthEnabled] = useState(true);
  const login = useAuthStore((s: AuthState) => s.login);
  const { handleGoogleLogin, loading: oauthLoading } = useMobileOAuth();

  useEffect(() => {
    // Cek apakah Google OAuth diaktifkan oleh admin.
    apiClient
      .get('/auth/providers')
      .then(({ data }) => {
        if (typeof data?.googleOAuthEnabled === 'boolean') {
          setGoogleOAuthEnabled(data.googleOAuthEnabled);
        }
      })
      .catch(() => {});
  }, []);

  // Pre-fill email yang disimpan dari sesi sebelumnya ("Ingat Saya")
  useEffect(() => {
    (async () => {
      try {
        const saved = await AsyncStorage.getItem(REMEMBERED_IDENTIFIER_KEY);
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
      Alert.alert('Error', 'Email/No. HP dan password harus diisi');
      return;
    }
    setLoading(true);
    try {
      const result = await login(email.trim(), password);

      if (result.mustChangePassword && result.resetToken) {
        router.push({ pathname: '/force-change-password', params: { token: result.resetToken } } as any);
        return;
      }

      // Simpan / hapus identifier sesuai preferensi "Ingat Saya"
      try {
        if (rememberMe) {
          await AsyncStorage.setItem(REMEMBERED_IDENTIFIER_KEY, email.trim());
        } else {
          await AsyncStorage.removeItem(REMEMBERED_IDENTIFIER_KEY);
        }
      } catch {
        // ignore storage write errors
      }
      // Register FCM token after successful login
      registerForPushNotifications();
      router.replace('/(tabs)/home' as any);
    } catch (error: any) {
      const msg = error?.response?.data?.message || 'Login gagal. Periksa Email/No. HP dan password Anda.';
      Alert.alert('Error', msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      {/* Aksen gradasi halus di bagian atas (efek cahaya modern) */}
      <View style={styles.topGlow} pointerEvents="none" />
      <View style={styles.header}>
        {/* Logo organisasi — langsung tampil tanpa lingkaran putih, biar muat penuh */}
        <Image source={LOGO} style={styles.logo} resizeMode="contain" />
        <Text style={styles.title}>THS-THM</Text>
        <Text style={styles.subtitle}>Sistem Manajemen</Text>
        <View style={styles.brandChip}>
          <View style={styles.brandDot} />
          <Text style={styles.brandChipText}>Organisasi Profesional</Text>
        </View>
      </View>
      <View style={styles.form}>
        <Text style={styles.label}>Email / No. HP</Text>
        <View style={styles.inputWrap}>
          <Ionicons name="mail-outline" size={20} color={theme.colors.textMuted} style={styles.inputIcon} />
          <TextInput
            style={styles.input}
            value={email}
            onChangeText={setEmail}
            placeholder="email@ths-thm.org atau 08xxx"
            placeholderTextColor={theme.colors.textMuted}
            keyboardType="default"
            autoCapitalize="none"
          />
        </View>
        <Text style={styles.label}>Password</Text>
        <View style={styles.inputWrap}>
          <Ionicons name="lock-closed-outline" size={20} color={theme.colors.textMuted} style={styles.inputIcon} />
          <TextInput
            style={styles.input}
            value={password}
            onChangeText={setPassword}
            placeholder="Password"
            placeholderTextColor={theme.colors.textMuted}
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
              color={theme.colors.textMuted}
            />
          </TouchableOpacity>
        </View>

        {/* Ingat Saya */}
        <View style={styles.rememberRow}>
          <Switch
            value={rememberMe}
            onValueChange={setRememberMe}
            trackColor={{ false: theme.colors.borderStrong, true: theme.colors.primary }}
            thumbColor={rememberMe ? theme.colors.surface : theme.colors.surfaceMuted}
          />
          <Text style={styles.rememberText}>Ingat saya</Text>
        </View>

        <TouchableOpacity
          style={[styles.button, loading && styles.buttonDisabled]}
          onPress={handleLogin}
          disabled={loading}
        >
          {loading ? (
            <LoadingSpinner color={theme.colors.surface} />
          ) : (
            <Text style={styles.buttonText}>Masuk</Text>
          )}
        </TouchableOpacity>

        {/* OAuth Divider & Button */}
        {googleOAuthEnabled && (
          <>
            <View style={styles.divider}>
              <View style={styles.dividerLine} />
              <Text style={styles.dividerText}>Atau login dengan</Text>
              <View style={styles.dividerLine} />
            </View>

            <TouchableOpacity
              style={[styles.oauthButton, oauthLoading === 'google' && styles.oauthButtonDisabled]}
              onPress={handleGoogleLogin}
              disabled={!!oauthLoading}
            >
              {oauthLoading === 'google' ? (
                <LoadingSpinner color={theme.colors.textSecondary} />
              ) : (
                <>
                  <Text style={styles.oauthIcon}>G</Text>
                  <Text style={styles.oauthButtonText}> Login dengan Google</Text>
                </>
              )}
            </TouchableOpacity>
          </>
        )}

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
  container: { flex: 1, backgroundColor: theme.colors.surfaceMuted, justifyContent: 'center', paddingHorizontal: 24, paddingVertical: 16 },
  topGlow: {
    position: 'absolute',
    top: -120,
    left: -80,
    right: -80,
    height: 280,
    backgroundColor: theme.colors.primary,
    borderRadius: 160,
    opacity: 0.10,
  },
  header: { alignItems: 'center', marginBottom: 24 },
  logo: { width: 116, height: 116, marginBottom: 14, borderRadius: 24, backgroundColor: theme.colors.surface, padding: 8 },
  title: { fontSize: 32, fontWeight: 'bold', color: theme.colors.text, textAlign: 'center', letterSpacing: 0.5 },
  subtitle: { fontSize: 15, color: theme.colors.textMuted, marginTop: 2, textAlign: 'center' },
  brandChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 14,
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: theme.colors.primaryDark,
  },
  brandDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: theme.colors.primaryLight },
  brandChipText: { fontSize: 12, fontWeight: '600', color: theme.colors.surface, letterSpacing: 0.3 },
  form: {
    backgroundColor: theme.colors.surface,
    borderRadius: 20,
    padding: 24,
    shadowColor: theme.colors.text,
    shadowOpacity: 0.08,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 8 },
    elevation: 6,
    borderWidth: 1,
    borderColor: theme.colors.surfaceMuted,
  },
  label: { fontSize: 13, fontWeight: '600', color: theme.colors.textSecondary, marginBottom: 6, marginTop: 14 },
  inputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: 12,
    backgroundColor: theme.colors.surfaceMuted,
    paddingHorizontal: 14,
  },
  inputIcon: { marginRight: 10 },
  input: {
    flex: 1,
    paddingVertical: 13,
    fontSize: 16,
    color: theme.colors.text,
  },
  passwordWrap: { position: 'relative' },
  passwordInput: { paddingRight: 48 },
  eyeButton: {
    justifyContent: 'center',
    paddingLeft: 12,
  },
  rememberRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 14,
    gap: 8,
  },
  rememberText: { fontSize: 14, color: theme.colors.textSecondary, fontWeight: '500' },
  button: {
    backgroundColor: theme.colors.primary,
    borderRadius: 12,
    padding: 15,
    alignItems: 'center',
    marginTop: 20,
    shadowColor: theme.colors.primary,
    shadowOpacity: 0.3,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 4,
  },
  buttonDisabled: { opacity: 0.5 },
  buttonText: { color: theme.colors.surface, fontSize: 16, fontWeight: '700', letterSpacing: 0.3 },
  divider: { flexDirection: 'row', alignItems: 'center', marginVertical: 16 },
  dividerLine: { flex: 1, height: 1, backgroundColor: theme.colors.border },
  dividerText: { marginHorizontal: 12, fontSize: 13, color: theme.colors.textMuted },
  oauthButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.surface,
    marginBottom: 8,
  },
  oauthButtonDisabled: { opacity: 0.5 },
  oauthIcon: {
    fontSize: 16,
    fontWeight: '700',
    color: theme.colors.text,
    width: 24,
    height: 24,
    textAlign: 'center',
    lineHeight: 24,
    backgroundColor: theme.colors.surfaceMuted,
    borderRadius: 6,
    overflow: 'hidden',
  },
  oauthButtonText: { fontSize: 14, fontWeight: '600', color: theme.colors.text },
  forgotPassword: {
    marginTop: 8,
    alignItems: 'center',
    padding: 6,
  },
  forgotPasswordText: { fontSize: 13, color: theme.colors.primary, fontWeight: '600' },
});

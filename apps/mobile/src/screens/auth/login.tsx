import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Alert,
  Image,
  Switch,
  ActivityIndicator,
  KeyboardAvoidingView,
  useWindowDimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAuthStore, AuthState } from '../../store/auth-store';
import { registerForPushNotifications } from '../../lib/fcm';
import { LoadingView } from '../../components/ui/shared';
import { theme } from '../../theme';

const LOGO = require('../../../assets/images/logo.png');
const REMEMBERED_IDENTIFIER_KEY = 'remembered_identifier';

export default function LoginScreen() {
  const { width, height } = useWindowDimensions();
  const isTablet = Math.min(width, height) >= 768;
  const isLandscape = width > height;
  const compactBranding = !isTablet && (isLandscape || height < 760);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [emailFocused, setEmailFocused] = useState(false);
  const [passwordFocused, setPasswordFocused] = useState(false);
  const [emailError, setEmailError] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const login = useAuthStore((s: AuthState) => s.login);

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
    const trimmedEmail = email.trim();
    const nextEmailError = trimmedEmail ? '' : 'Email atau nomor HP wajib diisi.';
    const nextPasswordError = password ? '' : 'Password wajib diisi.';

    setEmailError(nextEmailError);
    setPasswordError(nextPasswordError);

    if (nextEmailError || nextPasswordError || loading) {
      return;
    }

    setLoading(true);
    try {
      const result = await login(trimmedEmail, password);

      if (result.mustChangePassword && result.resetToken) {
        router.push({ pathname: '/force-change-password', params: { token: result.resetToken } } as never);
        return;
      }

      try {
        if (rememberMe) {
          await AsyncStorage.setItem(REMEMBERED_IDENTIFIER_KEY, trimmedEmail);
        } else {
          await AsyncStorage.removeItem(REMEMBERED_IDENTIFIER_KEY);
        }
      } catch {
        // ignore storage write errors
      }
      registerForPushNotifications();
      router.replace('/(tabs)/home');
    } catch (error) {
      setEmailError('');
      setPasswordError('');
      const status = (error as { response?: { status: number } })?.response?.status;
      if (status === 401 || status === 403) {
        Alert.alert('Error', 'Email/nomor HP atau password salah.');
        return;
      }
      Alert.alert('Error', 'Login gagal. Silakan coba lagi.');
    } finally {
      setLoading(false);
    }
  };

  const emailIconColor = emailError ? theme.colors.danger : emailFocused ? theme.colors.primaryDark : theme.colors.textMuted;
  const passwordIconColor = passwordError ? theme.colors.danger : passwordFocused ? theme.colors.primaryDark : theme.colors.textMuted;

  return (
    <View style={styles.container}>
      <View style={styles.topGlow} pointerEvents="none" />
      <KeyboardAvoidingView style={styles.flex} behavior="padding">
        <ScrollView
          contentContainerStyle={[
            styles.scrollContent,
            isTablet ? styles.scrollContentTablet : null,
            compactBranding ? styles.scrollContentCompact : null,
          ]}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
          showsVerticalScrollIndicator={false}
        >
          <View style={[styles.shell, isTablet ? styles.shellTablet : null]}>
            <View style={[styles.header, compactBranding ? styles.headerCompact : null]}>
              <Image source={LOGO} style={[styles.logo, compactBranding ? styles.logoCompact : null]} resizeMode="contain" />
              <Text style={[styles.title, compactBranding ? styles.titleCompact : null]}>THS-THM</Text>
              <Text style={[styles.subtitle, compactBranding ? styles.subtitleCompact : null]}>Sistem Manajemen</Text>
              <View style={[styles.brandChip, compactBranding ? styles.brandChipCompact : null]}>
                <View style={styles.brandDot} />
                <Text style={styles.brandChipText}>Organisasi Profesional</Text>
              </View>
            </View>

            <View style={styles.form}>
              <Text style={styles.label}>Email / No. HP</Text>
              <View style={[styles.inputWrap, emailFocused ? styles.inputWrapFocused : null, emailError ? styles.inputWrapError : null]}>
                <Ionicons name="mail-outline" size={20} color={emailIconColor} style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  value={email}
                  onChangeText={(text) => {
                    setEmail(text);
                    if (emailError) setEmailError('');
                  }}
                  placeholder="Masukkan email atau nomor HP"
                  placeholderTextColor={theme.colors.inputPlaceholder}
                  keyboardType="default"
                  autoCapitalize="none"
                  onFocus={() => setEmailFocused(true)}
                  onBlur={() => setEmailFocused(false)}
                  accessibilityLabel="Email atau nomor HP"
                  accessibilityHint="Masukkan email atau nomor HP yang terdaftar"
                />
              </View>
              {emailError ? <Text style={styles.errorText} accessibilityLiveRegion="polite">{emailError}</Text> : null}

              <Text style={styles.label}>Password</Text>
              <View style={[styles.inputWrap, passwordFocused ? styles.inputWrapFocused : null, passwordError ? styles.inputWrapError : null]}>
                <Ionicons name="lock-closed-outline" size={20} color={passwordIconColor} style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  value={password}
                  onChangeText={(text) => {
                    setPassword(text);
                    if (passwordError) setPasswordError('');
                  }}
                  placeholder="Masukkan password"
                  placeholderTextColor={theme.colors.inputPlaceholder}
                  secureTextEntry={!showPassword}
                  onFocus={() => setPasswordFocused(true)}
                  onBlur={() => setPasswordFocused(false)}
                  accessibilityLabel="Password"
                  accessibilityHint="Masukkan password akun Anda"
                />
                <TouchableOpacity
                  style={styles.eyeButton}
                  onPress={() => setShowPassword((prev) => !prev)}
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                  accessibilityRole="button"
                  accessibilityLabel={showPassword ? 'Sembunyikan password' : 'Tampilkan password'}
                  accessibilityHint={showPassword ? 'Menyembunyikan karakter password' : 'Menampilkan karakter password'}
                >
                  <Ionicons name={showPassword ? 'eye-off-outline' : 'eye-outline'} size={22} color={passwordIconColor} />
                </TouchableOpacity>
              </View>
              {passwordError ? <Text style={styles.errorText} accessibilityLiveRegion="polite">{passwordError}</Text> : null}

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
                style={[styles.button, loading ? styles.buttonDisabled : null]}
                onPress={handleLogin}
                disabled={loading}
                accessibilityRole="button"
                accessibilityLabel={loading ? 'Sedang memproses login' : 'Masuk'}
              >
                {loading ? (
                  <View style={styles.loadingContent}>
                    <ActivityIndicator size="small" color={theme.colors.surface} />
                    <Text style={styles.buttonText}>Memproses.</Text>
                  </View>
                ) : (
                  <Text style={styles.buttonText}>Masuk</Text>
                )}
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.forgotPassword}
                onPress={() => router.push('/forgot-password')}
                accessibilityRole="button"
                accessibilityLabel="Lupa password"
              >
                <Text style={styles.forgotPasswordText}>Lupa password?</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.onboardSection}>
              <View style={styles.divider}>
                <View style={styles.dividerLine} />
                <Text style={styles.dividerText}>Belum punya akun?</Text>
                <View style={styles.dividerLine} />
              </View>
              <View style={styles.onboardButtons}>
                <TouchableOpacity style={styles.onboardButton} activeOpacity={0.8} onPress={() => router.push('/claim')}>
                  <View style={[styles.onboardIconWrap, { backgroundColor: theme.colors.primaryLight }]}>
                    <Ionicons name="id-card-outline" size={18} color={theme.colors.primaryDark} />
                  </View>
                  <View style={styles.onboardTextWrap}>
                    <Text style={styles.onboardTitle}>Klaim Keanggotaan</Text>
                    <Text style={styles.onboardSub}>Sudah menjadi anggota tapi belum terdaftar di sistem</Text>
                  </View>
                  <Ionicons name="chevron-forward" size={18} color={theme.colors.textMuted} />
                </TouchableOpacity>

                <TouchableOpacity style={styles.onboardButton} activeOpacity={0.8} onPress={() => router.push('/register-candidate')}>
                  <View style={[styles.onboardIconWrap, { backgroundColor: theme.colors.warningLight }]}>
                    <Ionicons name="person-add-outline" size={18} color={theme.colors.warning} />
                  </View>
                  <View style={styles.onboardTextWrap}>
                    <Text style={styles.onboardTitle}>Daftar Calon Anggota</Text>
                    <Text style={styles.onboardSub}>Belum menjadi anggota — isi formulir pendaftaran calon</Text>
                  </View>
                  <Ionicons name="chevron-forward" size={18} color={theme.colors.textMuted} />
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      {loading ? (
        <View style={styles.loginOverlay}>
          <LoadingView message="Memverifikasi kredensial..." />
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.loginPageBackground },
  flex: { flex: 1 },
  scrollContent: { flexGrow: 1, justifyContent: 'center', paddingHorizontal: 24, paddingVertical: 24 },
  scrollContentTablet: { paddingHorizontal: 32, paddingVertical: 32 },
  scrollContentCompact: { paddingVertical: 16 },
  shell: { width: '100%' },
  shellTablet: { alignSelf: 'center' },
  loginOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.85)',
  },
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
  headerCompact: { marginBottom: 16 },
  logo: { width: 116, height: 116, marginBottom: 14, borderRadius: 24, backgroundColor: theme.colors.surface, padding: 8 },
  logoCompact: { width: 88, height: 88, marginBottom: 10, borderRadius: 20, padding: 6 },
  title: { fontSize: 32, fontWeight: 'bold', color: theme.colors.text, textAlign: 'center', letterSpacing: 0.5 },
  titleCompact: { fontSize: 28 },
  subtitle: { fontSize: 15, color: theme.colors.textMuted, marginTop: 2, textAlign: 'center' },
  subtitleCompact: { fontSize: 14 },
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
  brandChipCompact: { marginTop: 10, paddingHorizontal: 12, paddingVertical: 5 },
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
    borderColor: theme.colors.inputBorder,
    borderRadius: theme.radius.md,
    backgroundColor: theme.colors.surface,
    paddingHorizontal: theme.spacing.md,
    height: 64,
  },
  inputWrapFocused: {
    borderWidth: 2,
    borderColor: theme.colors.primaryDark,
  },
  inputWrapError: {
    borderWidth: 2,
    borderColor: theme.colors.danger,
  },
  inputIcon: { marginRight: 10 },
  input: {
    flex: 1,
    paddingVertical: 13,
    fontSize: 16,
    color: theme.colors.text,
  },
  eyeButton: {
    justifyContent: 'center',
    paddingLeft: 12,
    minWidth: 44,
    minHeight: 44,
    alignItems: 'center',
    marginRight: -6,
  },
  rememberRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 14,
    gap: 8,
    minHeight: 44,
  },
  rememberText: { fontSize: 14, color: theme.colors.textSecondary, fontWeight: '500' },
  button: {
    backgroundColor: theme.colors.primary,
    borderRadius: 12,
    padding: 15,
    alignItems: 'center',
    marginTop: 20,
    minHeight: 48,
    justifyContent: 'center',
    shadowColor: theme.colors.primary,
    shadowOpacity: 0.3,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 4,
  },
  buttonDisabled: { opacity: 0.5 },
  loadingContent: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  buttonText: { color: theme.colors.surface, fontSize: 16, fontWeight: '700', letterSpacing: 0.3 },
  divider: { flexDirection: 'row', alignItems: 'center', marginVertical: 16 },
  dividerLine: { flex: 1, height: 1, backgroundColor: theme.colors.border },
  dividerText: { marginHorizontal: 12, fontSize: 13, color: theme.colors.textMuted },
  onboardSection: { marginTop: 20 },
  onboardButtons: { gap: 10, marginTop: 4 },
  onboardButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 12,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.surface,
    minHeight: 44,
  },
  onboardIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  onboardTextWrap: { flex: 1 },
  onboardTitle: { fontSize: 14, fontWeight: '700', color: theme.colors.text },
  onboardSub: { fontSize: 12, color: theme.colors.textMuted, marginTop: 1, lineHeight: 16 },
  forgotPassword: {
    marginTop: 8,
    alignItems: 'center',
    padding: 6,
    minHeight: 44,
    justifyContent: 'center',
  },
  forgotPasswordText: { fontSize: 13, color: theme.colors.primary, fontWeight: '600' },
  errorText: {
    fontSize: 12,
    color: theme.colors.danger,
    marginTop: 4,
    marginLeft: 4,
  },
});
import React, { useState, useEffect, useRef, useCallback } from 'react';
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
  Platform,
  Animated,
  Pressable,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Video, ResizeMode } from 'expo-av';
import { router } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import apiClient from '../../lib/api-client';
import { useAuthStore, AuthState } from '../../store/auth-store';
import { useMobileOAuth } from '../../hooks/useMobileOAuth';
import { registerForPushNotifications } from '../../lib/fcm';

// Logo resmi THS-THM (di-bundle bersama app)
const LOGO = require('../../../assets/images/logo.png');
// Video splash saat membuka aplikasi — videothsnew.mp4 (root repo, muted, PUTAR SEKALI lalu stop).
// Di APK release, video di-copy ke android/app/src/main/assets/videos/ (dan oleh config plugin
// saat prebuild/EAS) lalu diputar via asset:/// — lebih andal daripada require() Metro
// yang resolusi URI-nya rusak di build lokal (expo-asset hoisted tidak cocok).
const INTRO_VIDEO = { uri: 'asset:///videos/videothsnew.mp4' };
const REMEMBERED_IDENTIFIER_KEY = 'remembered_identifier';

// Video splash hanya diputar SEKALI per proses aplikasi (saat buka app), tidak berulang
// saat user kembali ke halaman login (mis. logout).
let splashPlayed = false;

export default function LoginScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [googleOAuthEnabled, setGoogleOAuthEnabled] = useState(true);
  const [showVideo, setShowVideo] = useState(!splashPlayed);
  const videoOpacity = useRef(new Animated.Value(1)).current;
  // Ref pemutar video agar bisa di-pause eksplisit (video TIDAK boleh loop di belakang login)
  const videoRef = useRef<Video>(null);
  // Timer cadangan untuk memastikan video di-unmount — tidak bergantung pada callback animasi
  const hideTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const login = useAuthStore((s: AuthState) => s.login);
  const { handleGoogleLogin, loading: oauthLoading } = useMobileOAuth();

  /** Matikan video SEKARANG (pause) lalu fade-out & unmount → halaman login tampil penuh. */
  const stopAndHide = useCallback(() => {
    if (hideTimerRef.current) clearTimeout(hideTimerRef.current);
    // 1) Hentikan pemutar — video langsung mati, tidak berputar/loop di belakang login
    videoRef.current?.pauseAsync().catch(() => {});
    // 2) Fade singkat (JS driver agar opacity benar-benar berlaku ke surface video)
    Animated.timing(videoOpacity, {
      toValue: 0,
      duration: 350,
      useNativeDriver: false,
    }).start(() => setShowVideo(false));
    // 3) Fallback: unmount dijamin terjadi meski callback animasi gagal/tertunda
    hideTimerRef.current = setTimeout(() => setShowVideo(false), 800);
  }, [videoOpacity]);

  useEffect(() => {
    // Tandai splash sudah diputar — jangan ulangi saat kembali ke login (logout)
    splashPlayed = true;
    // Cek apakah Google OAuth diaktifkan oleh admin
    apiClient
      .get('/auth/providers')
      .then(({ data }) => {
        if (typeof data?.googleOAuthEnabled === 'boolean') {
          setGoogleOAuthEnabled(data.googleOAuthEnabled);
        }
      })
      .catch(() => {});
    // Jaga-jaga: jika video gagal dimuat/diputar, login tetap muncul setelah 12 detik
    const safety = setTimeout(stopAndHide, 12000);
    return () => {
      clearTimeout(safety);
      if (hideTimerRef.current) clearTimeout(hideTimerRef.current);
    };
  }, [stopAndHide]);

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
          <Ionicons name="mail-outline" size={20} color="#94a3b8" style={styles.inputIcon} />
          <TextInput
            style={styles.input}
            value={email}
            onChangeText={setEmail}
            placeholder="email@ths-thm.org atau 08xxx"
            placeholderTextColor="#94a3b8"
            keyboardType="default"
            autoCapitalize="none"
          />
        </View>
        <Text style={styles.label}>Password</Text>
        <View style={styles.inputWrap}>
          <Ionicons name="lock-closed-outline" size={20} color="#94a3b8" style={styles.inputIcon} />
          <TextInput
            style={styles.input}
            value={password}
            onChangeText={setPassword}
            placeholder="Password"
            placeholderTextColor="#94a3b8"
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
              color="#94a3b8"
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
                <ActivityIndicator color="#374151" />
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

      {/* Video splash — full screen, diputar SEKALI saat app dibuka, lalu fade-out ke halaman login */}
      {showVideo && (
        <Animated.View style={[StyleSheet.absoluteFill, { opacity: videoOpacity }]}>
          <Video
            ref={videoRef}
            source={INTRO_VIDEO}
            style={StyleSheet.absoluteFill}
            resizeMode={ResizeMode.COVER}
            shouldPlay
            isMuted
            isLooping={false}
            onLoad={(status) => {
              // Setelah durasi video berlalu (buffer kecil), matikan splash — tidak menunggu status finish
              const dur = status.isLoaded ? status.durationMillis ?? 0 : 0;
              if (dur > 0) {
                hideTimerRef.current = setTimeout(stopAndHide, dur + 400);
              }
            }}
            onPlaybackStatusUpdate={(status) => {
              // Setelah video selesai diputar sekali, hentikan & masuk halaman login
              if (status && status.isLoaded && status.didJustFinish) stopAndHide();
            }}
          />
          {/* Overlay gelap tipis agar teks "Lewati" terbaca */}
          <View style={styles.videoOverlay} />
          {/* Tombol lewati splash */}
          <Pressable style={styles.skipButton} onPress={stopAndHide} hitSlop={12}>
            <Text style={styles.skipText}>Lewati ▸</Text>
          </Pressable>
        </Animated.View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f6f7fb', justifyContent: 'center', paddingHorizontal: 24, paddingVertical: 16 },
  topGlow: {
    position: 'absolute',
    top: -120,
    left: -80,
    right: -80,
    height: 280,
    backgroundColor: '#2563eb',
    borderRadius: 160,
    opacity: 0.10,
  },
  videoOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(15,23,42,0.55)' },
  skipButton: { position: 'absolute', bottom: 44, alignSelf: 'center', paddingVertical: 8, paddingHorizontal: 20, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.25)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.5)' },
  skipText: { color: '#fff', fontSize: 14, fontWeight: '600' },
  header: { alignItems: 'center', marginBottom: 24 },
  logo: { width: 116, height: 116, marginBottom: 14, borderRadius: 24, backgroundColor: '#fff', padding: 8 },
  title: { fontSize: 32, fontWeight: 'bold', color: '#1e3a8a', textAlign: 'center', letterSpacing: 0.5 },
  subtitle: { fontSize: 15, color: '#64748b', marginTop: 2, textAlign: 'center' },
  brandChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 14,
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: '#1d4ed8',
  },
  brandDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: '#93c5fd' },
  brandChipText: { fontSize: 12, fontWeight: '600', color: '#fff', letterSpacing: 0.3 },
  form: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 24,
    shadowColor: '#0f172a',
    shadowOpacity: 0.08,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 8 },
    elevation: 6,
    borderWidth: 1,
    borderColor: '#eef2f7',
  },
  label: { fontSize: 13, fontWeight: '600', color: '#334155', marginBottom: 6, marginTop: 14 },
  inputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 12,
    backgroundColor: '#f8fafc',
    paddingHorizontal: 14,
  },
  inputIcon: { marginRight: 10 },
  input: {
    flex: 1,
    paddingVertical: 13,
    fontSize: 16,
    color: '#0f172a',
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
  rememberText: { fontSize: 14, color: '#334155', fontWeight: '500' },
  button: {
    backgroundColor: '#2563eb',
    borderRadius: 12,
    padding: 15,
    alignItems: 'center',
    marginTop: 20,
    shadowColor: '#2563eb',
    shadowOpacity: 0.3,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 4,
  },
  buttonDisabled: { opacity: 0.5 },
  buttonText: { color: '#fff', fontSize: 16, fontWeight: '700', letterSpacing: 0.3 },
  divider: { flexDirection: 'row', alignItems: 'center', marginVertical: 16 },
  dividerLine: { flex: 1, height: 1, backgroundColor: '#e2e8f0' },
  dividerText: { marginHorizontal: 12, fontSize: 13, color: '#94a3b8' },
  oauthButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    backgroundColor: '#fff',
    marginBottom: 8,
  },
  oauthButtonDisabled: { opacity: 0.5 },
  oauthIcon: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1f2937',
    width: 24,
    height: 24,
    textAlign: 'center',
    lineHeight: 24,
    backgroundColor: '#f3f4f6',
    borderRadius: 6,
    overflow: 'hidden',
  },
  oauthButtonText: { fontSize: 14, fontWeight: '600', color: '#1f2937' },
  forgotPassword: {
    marginTop: 8,
    alignItems: 'center',
    padding: 6,
  },
  forgotPasswordText: { fontSize: 13, color: '#2563eb', fontWeight: '600' },
});
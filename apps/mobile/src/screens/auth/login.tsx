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
      <View style={styles.header}>
        {/* Logo organisasi — langsung tampil tanpa lingkaran putih, biar muat penuh */}
        <Image source={LOGO} style={styles.logo} resizeMode="contain" />
        <Text style={styles.title}>THS-THM</Text>
        <Text style={styles.subtitle}>Sistem Manajemen</Text>
      </View>
      <View style={styles.form}>
        <Text style={styles.label}>Email / No. HP</Text>
        <TextInput
          style={styles.input}
          value={email}
          onChangeText={setEmail}
          placeholder="email@ths-thm.org atau 08xxx"
          keyboardType="default"
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
  container: { flex: 1, backgroundColor: '#0f172a', justifyContent: 'center', paddingHorizontal: 24, paddingVertical: 16 },
  videoOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(15,23,42,0.55)' },
  skipButton: { position: 'absolute', bottom: 44, alignSelf: 'center', paddingVertical: 8, paddingHorizontal: 20, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.25)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.5)' },
  skipText: { color: '#fff', fontSize: 14, fontWeight: '600' },
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
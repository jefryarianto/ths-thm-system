import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Ionicons from '@expo/vector-icons/Ionicons';
import { router } from 'expo-router';
import { useAuthStore } from '../../store/auth-store';
import ProfileSection from './profile-section';
import PasswordSection from './password-section';
import { theme } from '../../theme';

export default function SettingsScreen() {
  const logout = useAuthStore((s) => s.logout);

  const handleLogout = async () => {
    Alert.alert('Konfirmasi', 'Yakin ingin keluar?', [
      { text: 'Batal', style: 'cancel' },
      {
        text: 'Keluar',
        style: 'destructive',
        onPress: async () => {
          await logout();
          router.replace('/login');
        },
      },
    ]);
  };

  const insets = useSafeAreaInsets();

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView style={styles.container}>
        {/* Header */}
        <View style={[styles.header, { paddingTop: insets.top + 20 }]}>
          <Text style={styles.headerTitle}>Pengaturan</Text>
          <Text style={styles.headerSub}>Kelola akun dan preferensi aplikasi Anda</Text>
        </View>

        {/* Profile Section */}
        <View style={styles.section}>
          <ProfileSection />
        </View>

        {/* Password Section */}
        <View style={styles.section}>
          <PasswordSection />
        </View>

        {/* Edit Profil tunggal ada di dalam ProfileSection — jangan duplikat di sini */}

        {/* Menu lainnya — digabung dalam satu kartu agar rapi */}
        <View style={styles.section}>
          <Text style={styles.groupLabel}>Preferensi</Text>
          <View style={styles.group}>
            {/* Notification Preferences */}
            <TouchableOpacity
              style={styles.linkButton}
              onPress={() => router.push('/notification-preferences' as never)}
              activeOpacity={0.6}
            >
              <View style={styles.iconChip}>
                <Ionicons name="notifications-outline" size={20} color={theme.colors.primary} />
              </View>
              <View style={styles.linkContent}>
                <Text style={styles.linkLabel}>Pengaturan Notifikasi</Text>
                <Text style={styles.linkDesc}>Aktifkan/nonaktifkan jenis notifikasi</Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color={theme.colors.border} />
            </TouchableOpacity>

            {/* Theme Toggle */}
            <View style={[styles.linkButton, styles.linkButtonNoBorder]}>
              <View style={styles.iconChip}>
                <Ionicons name="moon-outline" size={20} color={theme.colors.primary} />
              </View>
              <View style={styles.linkContent}>
                <Text style={styles.linkLabel}>Mode Gelap</Text>
                <Text style={styles.linkDesc}>Tersedia di pengaturan sistem</Text>
              </View>
              <Ionicons name="construct-outline" size={18} color={theme.colors.border} />
            </View>
          </View>
        </View>

        {/* Tentang Aplikasi */}
        <View style={styles.section}>
          <Text style={styles.groupLabel}>Informasi</Text>
          <View style={styles.group}>
            <TouchableOpacity
              style={styles.linkButton}
              onPress={() => router.push('/about' as never)}
              activeOpacity={0.6}
            >
              <View style={styles.iconChip}>
                <Ionicons name="information-circle-outline" size={20} color={theme.colors.primary} />
              </View>
              <View style={styles.linkContent}>
                <Text style={styles.linkLabel}>Tentang Aplikasi</Text>
                <Text style={styles.linkDesc}>Versi aplikasi &amp; pembaruan</Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color={theme.colors.border} />
            </TouchableOpacity>
          </View>
        </View>

        {/* Logout */}
        <View style={styles.section}>
          <TouchableOpacity style={styles.logoutButton} onPress={handleLogout} activeOpacity={0.6}>
            <Ionicons name="log-out-outline" size={20} color={theme.colors.danger} />
            <Text style={styles.logoutText}>Keluar</Text>
          </TouchableOpacity>
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  container: { flex: 1, backgroundColor: theme.colors.surfaceMuted },
  header: {
    backgroundColor: theme.colors.primary,
    padding: 24,
    paddingBottom: 28,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
  },
  headerTitle: { color: theme.colors.surface, fontSize: 24, fontWeight: 'bold' },
  headerSub: { color: theme.colors.headerSub, fontSize: 13, marginTop: 4 },
  section: { padding: 16, paddingBottom: 0 },
  groupLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: theme.colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 8,
    marginLeft: 4,
  },
  group: {
    backgroundColor: theme.colors.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: theme.colors.surfaceMuted,
    shadowColor: theme.colors.text,
    shadowOpacity: 0.05,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 3 },
    elevation: 2,
    overflow: 'hidden',
  },
  linkButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: theme.colors.surfaceMuted,
  },
  linkButtonNoBorder: { borderBottomWidth: 0 },
  iconChip: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: theme.colors.primarySofter,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  linkContent: { flex: 1 },
  linkLabel: { fontSize: 15, fontWeight: '600', color: theme.colors.text },
  linkDesc: { fontSize: 12, color: theme.colors.textMuted, marginTop: 2 },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: theme.colors.surface,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: theme.colors.dangerLight,
    shadowColor: theme.colors.text,
    shadowOpacity: 0.05,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 3 },
    elevation: 2,
  },
  logoutText: { fontSize: 16, fontWeight: '600', color: theme.colors.danger },
});

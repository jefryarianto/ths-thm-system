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
                <Ionicons name="notifications-outline" size={20} color="#2563eb" />
              </View>
              <View style={styles.linkContent}>
                <Text style={styles.linkLabel}>Pengaturan Notifikasi</Text>
                <Text style={styles.linkDesc}>Aktifkan/nonaktifkan jenis notifikasi</Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color="#cbd5e1" />
            </TouchableOpacity>

            {/* Theme Toggle */}
            <View style={[styles.linkButton, styles.linkButtonNoBorder]}>
              <View style={styles.iconChip}>
                <Ionicons name="moon-outline" size={20} color="#2563eb" />
              </View>
              <View style={styles.linkContent}>
                <Text style={styles.linkLabel}>Mode Gelap</Text>
                <Text style={styles.linkDesc}>Tersedia di pengaturan sistem</Text>
              </View>
              <Ionicons name="construct-outline" size={18} color="#cbd5e1" />
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
                <Ionicons name="information-circle-outline" size={20} color="#2563eb" />
              </View>
              <View style={styles.linkContent}>
                <Text style={styles.linkLabel}>Tentang Aplikasi</Text>
                <Text style={styles.linkDesc}>Versi aplikasi &amp; pembaruan</Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color="#cbd5e1" />
            </TouchableOpacity>
          </View>
        </View>

        {/* Logout */}
        <View style={styles.section}>
          <TouchableOpacity style={styles.logoutButton} onPress={handleLogout} activeOpacity={0.6}>
            <Ionicons name="log-out-outline" size={20} color="#dc2626" />
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
  container: { flex: 1, backgroundColor: '#f6f7fb' },
  header: {
    backgroundColor: '#2563eb',
    padding: 24,
    paddingBottom: 28,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
  },
  headerTitle: { color: '#fff', fontSize: 24, fontWeight: 'bold' },
  headerSub: { color: '#bfdbfe', fontSize: 13, marginTop: 4 },
  section: { padding: 16, paddingBottom: 0 },
  groupLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#64748b',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 8,
    marginLeft: 4,
  },
  group: {
    backgroundColor: '#fff',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#eef2f7',
    shadowColor: '#0f172a',
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
    borderBottomColor: '#eef2f7',
  },
  linkButtonNoBorder: { borderBottomWidth: 0 },
  iconChip: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: '#eff6ff',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  linkContent: { flex: 1 },
  linkLabel: { fontSize: 15, fontWeight: '600', color: '#0f172a' },
  linkDesc: { fontSize: 12, color: '#94a3b8', marginTop: 2 },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#fee2e2',
    shadowColor: '#0f172a',
    shadowOpacity: 0.05,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 3 },
    elevation: 2,
  },
  logoutText: { fontSize: 16, fontWeight: '600', color: '#dc2626' },
});

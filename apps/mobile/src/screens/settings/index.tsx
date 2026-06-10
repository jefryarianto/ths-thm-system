import React from 'react';
import {
  View, Text, StyleSheet, ScrollView,
  TouchableOpacity, Alert, KeyboardAvoidingView, Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
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

  return (
    <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Pengaturan</Text>
        </View>

        {/* Profile Section */}
        <View style={styles.section}>
          <ProfileSection />
        </View>

        {/* Password Section */}
        <View style={styles.section}>
          <PasswordSection />
        </View>

        {/* Edit Profile Link */}
        <View style={styles.section}>
          <TouchableOpacity style={styles.linkButton} onPress={() => router.push('/profile/edit' as never)}>
            <Ionicons name="person-circle" size={20} color="#2563eb" />
            <View style={styles.linkContent}>
              <Text style={styles.linkLabel}>Edit Profil</Text>
              <Text style={styles.linkDesc}>Ubah nama, alamat, no HP, dan foto</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color="#d1d5db" />
          </TouchableOpacity>
        </View>

        {/* Notification Preferences */}
        <View style={styles.section}>
          <TouchableOpacity style={styles.linkButton} onPress={() => router.push('/notification-preferences' as never)}>
            <Ionicons name="notifications" size={20} color="#2563eb" />
            <View style={styles.linkContent}>
              <Text style={styles.linkLabel}>Pengaturan Notifikasi</Text>
              <Text style={styles.linkDesc}>Aktifkan/nonaktifkan jenis notifikasi</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color="#d1d5db" />
          </TouchableOpacity>
        </View>

        {/* Theme Toggle */}
        <View style={styles.section}>
          <View style={styles.linkButton}>
            <Ionicons name="moon" size={20} color="#2563eb" />
            <View style={styles.linkContent}>
              <Text style={styles.linkLabel}>Mode Gelap</Text>
              <Text style={styles.linkDesc}>Tersedia di pengaturan sistem</Text>
            </View>
            <Ionicons name="construct" size={18} color="#d1d5db" />
          </View>
        </View>

        {/* Logout */}
        <View style={styles.section}>
          <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
            <Ionicons name="log-out" size={20} color="#dc2626" />
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
  container: { flex: 1, backgroundColor: '#f3f4f6' },
  header: { backgroundColor: '#2563eb', padding: 24, paddingTop: 60, paddingBottom: 20 },
  headerTitle: { color: '#fff', fontSize: 22, fontWeight: 'bold' },
  section: { padding: 16, paddingBottom: 0 },
  linkButton: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', borderRadius: 12, padding: 16, borderWidth: 1, borderColor: '#e5e7eb', shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 8, elevation: 2 },
  linkContent: { flex: 1, marginLeft: 10 },
  linkLabel: { fontSize: 15, fontWeight: '600', color: '#111827' },
  linkDesc: { fontSize: 12, color: '#9ca3af', marginTop: 2 },
  logoutButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: '#fff', borderRadius: 12, padding: 16, borderWidth: 1, borderColor: '#fecaca', shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 8, elevation: 2 },
  logoutText: { fontSize: 16, fontWeight: '600', color: '#dc2626' },
});

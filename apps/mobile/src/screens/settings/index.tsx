import React, { useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TextInput,
  TouchableOpacity, ActivityIndicator, Alert, KeyboardAvoidingView, Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import apiClient from '../../lib/api-client';
import { useAuthStore } from '../../store/auth-store';
import { router } from 'expo-router';

export default function SettingsScreen() {
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);

  // Profile state
  const [profile, setProfile] = useState<any>(null);
  const [loadingProfile, setLoadingProfile] = useState(true);
  const [editingProfile, setEditingProfile] = useState(false);
  const [profileForm, setProfileForm] = useState({ namaLengkap: '', email: '' });
  const [savingProfile, setSavingProfile] = useState(false);

  // Password state
  const [showPasswordForm, setShowPasswordForm] = useState(false);
  const [passwordForm, setPasswordForm] = useState({ oldPassword: '', newPassword: '', confirmPassword: '' });
  const [savingPassword, setSavingPassword] = useState(false);
  const [showOldPass, setShowOldPass] = useState(false);
  const [showNewPass, setShowNewPass] = useState(false);

  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    setLoadingProfile(true);
    try {
      const { data } = await apiClient.get('/auth/me');
      const p = data.data;
      setProfile(p);
      setProfileForm({ namaLengkap: p.namaLengkap || '', email: p.email || '' });
    } catch { /* ignore */ }
    setLoadingProfile(false);
  };

  const handleSaveProfile = async () => {
    if (!profileForm.namaLengkap.trim()) {
      Alert.alert('Error', 'Nama lengkap harus diisi');
      return;
    }
    setSavingProfile(true);
    try {
      const { data } = await apiClient.patch('/auth/me', { namaLengkap: profileForm.namaLengkap });
      setProfile(data.data);
      setEditingProfile(false);
      Alert.alert('Berhasil', 'Profil berhasil diperbarui');
    } catch (err: any) {
      Alert.alert('Error', err?.response?.data?.message || 'Gagal memperbarui profil');
    } finally {
      setSavingProfile(false);
    }
  };

  const handleChangePassword = async () => {
    if (!passwordForm.oldPassword || !passwordForm.newPassword) {
      Alert.alert('Error', 'Semua field password harus diisi');
      return;
    }
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      Alert.alert('Error', 'Password baru dan konfirmasi tidak cocok');
      return;
    }
    if (passwordForm.newPassword.length < 6) {
      Alert.alert('Error', 'Password baru minimal 6 karakter');
      return;
    }
    setSavingPassword(true);
    try {
      await apiClient.patch('/auth/change-password', {
        oldPassword: passwordForm.oldPassword,
        newPassword: passwordForm.newPassword,
      });
      setPasswordForm({ oldPassword: '', newPassword: '', confirmPassword: '' });
      setShowPasswordForm(false);
      Alert.alert('Berhasil', 'Password berhasil diganti');
    } catch (err: any) {
      Alert.alert('Error', err?.response?.data?.message || 'Gagal mengganti password');
    } finally {
      setSavingPassword(false);
    }
  };

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
          <View style={styles.sectionHeader}>
            <Ionicons name="person-circle" size={20} color="#2563eb" />
            <Text style={styles.sectionTitle}>Profil Saya</Text>
          </View>

          {loadingProfile ? (
            <ActivityIndicator style={{ padding: 20 }} />
          ) : (
            <View style={styles.card}>
              {/* Avatar */}
              <View style={styles.avatarContainer}>
                <View style={styles.avatar}>
                  <Text style={styles.avatarText}>
                    {(profile?.namaLengkap || 'U').charAt(0).toUpperCase()}
                  </Text>
                </View>
                <Text style={styles.roleBadge}>{profile?.role || 'anggota'}</Text>
              </View>

              {editingProfile ? (
                <>
                  <Text style={styles.fieldLabel}>Nama Lengkap</Text>
                  <TextInput
                    style={styles.input}
                    value={profileForm.namaLengkap}
                    onChangeText={(t) => setProfileForm((p) => ({ ...p, namaLengkap: t }))}
                    placeholder="Nama lengkap"
                  />
                  <Text style={styles.fieldLabel}>Email</Text>
                  <TextInput
                    style={[styles.input, styles.inputDisabled]}
                    value={profileForm.email}
                    editable={false}
                    placeholder="Email"
                  />
                  <View style={styles.buttonRow}>
                    <TouchableOpacity
                      style={styles.cancelButton}
                      onPress={() => {
                        setEditingProfile(false);
                        setProfileForm({ namaLengkap: profile?.namaLengkap || '', email: profile?.email || '' });
                      }}
                    >
                      <Text style={styles.cancelButtonText}>Batal</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.saveButton, savingProfile && styles.buttonDisabled]}
                      onPress={handleSaveProfile}
                      disabled={savingProfile}
                    >
                      {savingProfile ? (
                        <ActivityIndicator color="#fff" size="small" />
                      ) : (
                        <Text style={styles.saveButtonText}>Simpan</Text>
                      )}
                    </TouchableOpacity>
                  </View>
                </>
              ) : (
                <>
                  <View style={styles.infoRow}>
                    <Text style={styles.infoLabel}>Nama</Text>
                    <Text style={styles.infoValue}>{profile?.namaLengkap || '-'}</Text>
                  </View>
                  <View style={styles.infoRow}>
                    <Text style={styles.infoLabel}>Email</Text>
                    <Text style={styles.infoValue}>{profile?.email || '-'}</Text>
                  </View>
                  <View style={styles.infoRow}>
                    <Text style={styles.infoLabel}>Role</Text>
                    <Text style={styles.infoValue}>{profile?.role || '-'}</Text>
                  </View>
                  <TouchableOpacity style={styles.editButton} onPress={() => setEditingProfile(true)}>
                    <Ionicons name="pencil" size={14} color="#2563eb" />
                    <Text style={styles.editButtonText}>Edit Profil</Text>
                  </TouchableOpacity>
                </>
              )}
            </View>
          )}
        </View>

        {/* Password Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Ionicons name="lock-closed" size={20} color="#2563eb" />
            <Text style={styles.sectionTitle}>Ganti Password</Text>
          </View>

          <View style={styles.card}>
            {!showPasswordForm ? (
              <TouchableOpacity style={styles.editButton} onPress={() => setShowPasswordForm(true)}>
                <Ionicons name="key" size={14} color="#2563eb" />
                <Text style={styles.editButtonText}>Ganti Password</Text>
              </TouchableOpacity>
            ) : (
              <>
                <Text style={styles.fieldLabel}>Password Lama</Text>
                <View style={styles.passwordRow}>
                  <TextInput
                    style={[styles.input, { flex: 1 }]}
                    value={passwordForm.oldPassword}
                    onChangeText={(t) => setPasswordForm((p) => ({ ...p, oldPassword: t }))}
                    placeholder="Masukkan password lama"
                    secureTextEntry={!showOldPass}
                  />
                  <TouchableOpacity style={styles.eyeButton} onPress={() => setShowOldPass(!showOldPass)}>
                    <Ionicons name={showOldPass ? 'eye-off' : 'eye'} size={20} color="#6b7280" />
                  </TouchableOpacity>
                </View>

                <Text style={styles.fieldLabel}>Password Baru</Text>
                <View style={styles.passwordRow}>
                  <TextInput
                    style={[styles.input, { flex: 1 }]}
                    value={passwordForm.newPassword}
                    onChangeText={(t) => setPasswordForm((p) => ({ ...p, newPassword: t }))}
                    placeholder="Minimal 6 karakter"
                    secureTextEntry={!showNewPass}
                  />
                  <TouchableOpacity style={styles.eyeButton} onPress={() => setShowNewPass(!showNewPass)}>
                    <Ionicons name={showNewPass ? 'eye-off' : 'eye'} size={20} color="#6b7280" />
                  </TouchableOpacity>
                </View>

                <Text style={styles.fieldLabel}>Konfirmasi Password Baru</Text>
                <TextInput
                  style={styles.input}
                  value={passwordForm.confirmPassword}
                  onChangeText={(t) => setPasswordForm((p) => ({ ...p, confirmPassword: t }))}
                  placeholder="Ulangi password baru"
                  secureTextEntry
                />

                <View style={styles.buttonRow}>
                  <TouchableOpacity
                    style={styles.cancelButton}
                    onPress={() => {
                      setShowPasswordForm(false);
                      setPasswordForm({ oldPassword: '', newPassword: '', confirmPassword: '' });
                    }}
                  >
                    <Text style={styles.cancelButtonText}>Batal</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.saveButton, savingPassword && styles.buttonDisabled]}
                    onPress={handleChangePassword}
                    disabled={savingPassword}
                  >
                    {savingPassword ? (
                      <ActivityIndicator color="#fff" size="small" />
                    ) : (
                      <Text style={styles.saveButtonText}>Ganti</Text>
                    )}
                  </TouchableOpacity>
                </View>
              </>
            )}
          </View>
        </View>

        {/* Notification Preferences */}
        <View style={styles.section}>
          <TouchableOpacity style={styles.linkButton} onPress={() => router.push('/notification-preferences' as any)}>
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
  sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 },
  sectionTitle: { fontSize: 16, fontWeight: '600', color: '#111827' },
  card: { backgroundColor: '#fff', borderRadius: 12, padding: 16, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 8, elevation: 2 },
  avatarContainer: { alignItems: 'center', marginBottom: 16 },
  avatar: { width: 64, height: 64, borderRadius: 32, backgroundColor: '#dbeafe', alignItems: 'center', justifyContent: 'center' },
  avatarText: { fontSize: 24, fontWeight: 'bold', color: '#2563eb' },
  roleBadge: { fontSize: 12, color: '#6b7280', marginTop: 6, textTransform: 'capitalize' },
  fieldLabel: { fontSize: 13, fontWeight: '600', color: '#374151', marginBottom: 6, marginTop: 12 },
  input: { borderWidth: 1, borderColor: '#d1d5db', borderRadius: 8, padding: 12, fontSize: 15, backgroundColor: '#f9fafb' },
  inputDisabled: { backgroundColor: '#e5e7eb', color: '#6b7280' },
  infoRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#f3f4f6' },
  infoLabel: { fontSize: 14, color: '#6b7280' },
  infoValue: { fontSize: 14, fontWeight: '600', color: '#111827' },
  editButton: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 12, paddingVertical: 8 },
  editButtonText: { fontSize: 14, fontWeight: '600', color: '#2563eb' },
  buttonRow: { flexDirection: 'row', justifyContent: 'flex-end', gap: 8, marginTop: 16 },
  saveButton: { backgroundColor: '#2563eb', borderRadius: 8, paddingVertical: 10, paddingHorizontal: 20, alignItems: 'center' },
  saveButtonText: { color: '#fff', fontSize: 14, fontWeight: '600' },
  cancelButton: { borderWidth: 1, borderColor: '#d1d5db', borderRadius: 8, paddingVertical: 10, paddingHorizontal: 20, alignItems: 'center' },
  cancelButtonText: { color: '#374151', fontSize: 14, fontWeight: '600' },
  buttonDisabled: { opacity: 0.5 },
  passwordRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  eyeButton: { padding: 8 },
  linkButton: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', borderRadius: 12, padding: 16, borderWidth: 1, borderColor: '#e5e7eb', shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 8, elevation: 2 },
  linkContent: { flex: 1, marginLeft: 10 },
  linkLabel: { fontSize: 15, fontWeight: '600', color: '#111827' },
  linkDesc: { fontSize: 12, color: '#9ca3af', marginTop: 2 },
  logoutButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: '#fff', borderRadius: 12, padding: 16, borderWidth: 1, borderColor: '#fecaca', shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 8, elevation: 2 },
  logoutText: { fontSize: 16, fontWeight: '600', color: '#dc2626' },
});

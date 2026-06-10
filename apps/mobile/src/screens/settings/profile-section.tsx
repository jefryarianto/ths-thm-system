import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, TextInput,
  TouchableOpacity, Alert, ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import apiClient, { unwrap } from '../../lib/api-client';
import { LoadingView } from '../../components/ui/shared';

interface ProfileData {
  namaLengkap?: string;
  email?: string;
  role?: string;
}

export default function ProfileSection() {
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [loadingProfile, setLoadingProfile] = useState(true);
  const [editingProfile, setEditingProfile] = useState(false);
  const [profileForm, setProfileForm] = useState({ namaLengkap: '', email: '' });
  const [savingProfile, setSavingProfile] = useState(false);

  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    setLoadingProfile(true);
    try {
      const p = await apiClient.get('/auth/me').then(unwrap) as ProfileData;
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
      const updated = await apiClient.patch('/auth/me', { namaLengkap: profileForm.namaLengkap }).then(unwrap) as ProfileData;
      setProfile(updated);
      setEditingProfile(false);
      Alert.alert('Berhasil', 'Profil berhasil diperbarui');
    } catch (err: any) {
      Alert.alert('Error', err?.response?.data?.message || 'Gagal memperbarui profil');
    } finally {
      setSavingProfile(false);
    }
  };

  if (loadingProfile) return <LoadingView />;

  return (
    <View>
      <View style={styles.sectionHeader}>
        <Ionicons name="person-circle" size={20} color="#2563eb" />
        <Text style={styles.sectionTitle}>Profil Saya</Text>
      </View>

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
    </View>
  );
}

const styles = StyleSheet.create({
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
});

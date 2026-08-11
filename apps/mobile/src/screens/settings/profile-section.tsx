import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { router } from 'expo-router';
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

  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    setLoadingProfile(true);
    try {
      const p = (await apiClient.get('/auth/me').then(unwrap)) as ProfileData;
      setProfile(p);
    } catch {
      /* ignore */
    }
    setLoadingProfile(false);
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

        {/* Satu pintu edit: layar /profile/edit (nama, HP, alamat, TTL, foto, password) */}
        <TouchableOpacity style={styles.editButton} onPress={() => router.push('/profile/edit' as never)}>
          <Ionicons name="pencil" size={14} color="#2563eb" />
          <Text style={styles.editButtonText}>Edit Profil</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 },
  sectionTitle: { fontSize: 16, fontWeight: '600', color: '#111827' },
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  avatarContainer: { alignItems: 'center', marginBottom: 16 },
  avatar: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#dbeafe',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: { fontSize: 24, fontWeight: 'bold', color: '#2563eb' },
  roleBadge: { fontSize: 12, color: '#6b7280', marginTop: 6, textTransform: 'capitalize' },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  infoLabel: { fontSize: 14, color: '#6b7280' },
  infoValue: { fontSize: 14, fontWeight: '600', color: '#111827' },
  editButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 12,
    paddingVertical: 8,
  },
  editButtonText: { fontSize: 14, fontWeight: '600', color: '#2563eb' },
});

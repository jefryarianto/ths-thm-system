import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { router } from 'expo-router';
import apiClient, { unwrap } from '../../lib/api-client';
import { LoadingView } from '../../components/ui/shared';

const API_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3001';

/** Avatar dengan fallback ke initials */
function ProfileAvatar({ fotoPath, namaLengkap }: { fotoPath?: string | null; namaLengkap?: string }) {
  const [imgFailed, setImgFailed] = useState(false);
  const showImage = fotoPath && !imgFailed;

  return (
    <View style={styles.avatar}>
      {showImage ? (
        <Image
          source={{ uri: `${API_URL}/api/uploads/${encodeURIComponent(fotoPath!)}` }}
          style={[StyleSheet.absoluteFill, styles.avatarImg]}
          resizeMode="cover"
          onError={() => setImgFailed(true)}
        />
      ) : (
        <Text style={styles.avatarText}>
          {(namaLengkap || 'U').charAt(0).toUpperCase()}
        </Text>
      )}
    </View>
  );
}

interface ProfileData {
  namaLengkap?: string;
  email?: string;
  role?: string;
  fotoPath?: string | null;
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
          <ProfileAvatar fotoPath={profile?.fotoPath} namaLengkap={profile?.namaLengkap} />
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
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
    paddingHorizontal: 4,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: '#64748b',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#eef2f7',
    shadowColor: '#0f172a',
    shadowOpacity: 0.05,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 3 },
    elevation: 2,
  },
  avatarContainer: { alignItems: 'center', marginBottom: 16 },
  avatar: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: '#dbeafe',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    borderWidth: 3,
    borderColor: '#eff6ff',
  },
  avatarImg: {
    width: 72,
    height: 72,
    borderRadius: 36,
  },
  avatarText: { fontSize: 26, fontWeight: 'bold', color: '#2563eb' },
  roleBadge: {
    fontSize: 12,
    color: '#fff',
    marginTop: 8,
    textTransform: 'capitalize',
    backgroundColor: '#2563eb',
    paddingHorizontal: 12,
    paddingVertical: 3,
    borderRadius: 999,
    fontWeight: '600',
    overflow: 'hidden',
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  infoLabel: { fontSize: 14, color: '#64748b' },
  infoValue: { fontSize: 14, fontWeight: '600', color: '#0f172a' },
  editButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginTop: 14,
    paddingVertical: 11,
    borderRadius: 12,
    backgroundColor: '#eff6ff',
    borderWidth: 1,
    borderColor: '#dbeafe',
  },
  editButtonText: { fontSize: 14, fontWeight: '600', color: '#2563eb' },
});

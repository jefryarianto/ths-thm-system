import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, ActivityIndicator, TouchableOpacity, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, router } from 'expo-router';
import apiClient, { unwrap } from '../../lib/api-client';

interface CandidateDetail {
  id: string;
  namaLengkap: string;
  jenisKelamin: string;
  tempatLahir?: string;
  tanggalLahir?: string;
  status: string;
  createdAt: string;
  ranting?: { nama: string };
  alamat?: string;
  noHp?: string;
}

const STATUS_STYLES: Record<string, { label: string; bg: string; color: string }> = {
  diusulkan: { label: 'Diusulkan', bg: '#eff6ff', color: '#2563eb' },
  mengikuti_pendadaran: { label: 'Pendadaran', bg: '#fef3c7', color: '#d97706' },
  lulus: { label: 'Lulus', bg: '#ecfdf5', color: '#16a34a' },
  gagal: { label: 'Gagal', bg: '#fef2f2', color: '#dc2626' },
  dibatalkan: { label: 'Dibatalkan', bg: '#f3f4f6', color: '#6b7280' },
};

export default function CandidateDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [candidate, setCandidate] = useState<CandidateDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState('');

  useEffect(() => {
    (async () => {
      try {
        const res = await apiClient.get(`/candidates/${id}`);
        setCandidate(unwrap(res));
      } catch { /* ignore */ }
      setLoading(false);
    })();
  }, [id]);

  const handleApprove = () => {
    Alert.alert(
      'Setujui Calon',
      `Apakah Anda yakin ingin menyetujui "${candidate?.namaLengkap}" sebagai anggota?`,
      [
        { text: 'Batal', style: 'cancel' },
        {
          text: 'Ya, Setujui',
          onPress: async () => {
            setActionLoading('approve');
            try {
              await apiClient.post(`/candidates/${id}/approve`);
              Alert.alert('✅ Berhasil', 'Calon anggota telah disetujui');
              const res = await apiClient.get(`/candidates/${id}`);
              setCandidate(unwrap(res));
            } catch (err: any) {
              Alert.alert('Gagal', err.response?.data?.message || 'Terjadi kesalahan');
            }
            setActionLoading('');
          },
        },
      ],
    );
  };

  const handleReject = () => {
    Alert.prompt
      ? Alert.prompt(
          'Tolak Calon',
          'Alasan penolakan (opsional):',
          [
            { text: 'Batal', style: 'cancel' },
            {
              text: 'Tolak',
              style: 'destructive',
              onPress: async (reason?: string) => {
                setActionLoading('reject');
                try {
                  await apiClient.post(`/candidates/${id}/reject`, { reason });
                  Alert.alert('Ditolak', 'Calon anggota telah ditolak');
                  const res = await apiClient.get(`/candidates/${id}`);
                  setCandidate(unwrap(res));
                } catch (err: any) {
                  Alert.alert('Gagal', err.response?.data?.message || 'Terjadi kesalahan');
                }
                setActionLoading('');
              },
            },
          ],
          'plain-text',
        )
      : handleRejectFallback();
  };

  const handleRejectFallback = () => {
    Alert.alert(
      'Tolak Calon',
      'Konfirmasi penolakan calon anggota ini?',
      [
        { text: 'Batal', style: 'cancel' },
        {
          text: 'Ya, Tolak',
          style: 'destructive',
          onPress: async () => {
            setActionLoading('reject');
            try {
              await apiClient.post(`/candidates/${id}/reject`, {});
              Alert.alert('Ditolak', 'Calon anggota telah ditolak');
              const res = await apiClient.get(`/candidates/${id}`);
              setCandidate(unwrap(res));
            } catch (err: any) {
              Alert.alert('Gagal', err.response?.data?.message || 'Terjadi kesalahan');
            }
            setActionLoading('');
          },
        },
      ],
    );
  };

  if (loading) return <View style={styles.center}><ActivityIndicator size="large" color="#2563eb" /></View>;
  if (!candidate) return <View style={styles.center}><Text style={styles.errorText}>Calon tidak ditemukan</Text></View>;

  const ss = STATUS_STYLES[candidate.status] || { label: candidate.status, bg: '#f3f4f6', color: '#6b7280' };
  const isActionable = candidate.status === 'diusulkan';
  const isPending = actionLoading !== '';

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={22} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle} numberOfLines={1}>Detail Calon</Text>
      </View>

      <View style={styles.section}>
        {/* Profile Card */}
        <View style={styles.profileCard}>
          <View style={styles.avatarLarge}>
            <Text style={styles.avatarText}>{candidate.namaLengkap.charAt(0)}</Text>
          </View>
          <Text style={styles.name}>{candidate.namaLengkap}</Text>
          <View style={[styles.statusBadge, { backgroundColor: ss.bg }]}>
            <Text style={[styles.statusText, { color: ss.color }]}>{ss.label}</Text>
          </View>
          {candidate.ranting && (
            <Text style={styles.ranting}>{candidate.ranting.nama}</Text>
          )}
        </View>

        {/* Detail Info */}
        <View style={styles.infoCard}>
          <View style={styles.infoRow}>
            <Ionicons name="person" size={18} color="#6b7280" />
            <View style={styles.infoContent}>
              <Text style={styles.infoLabel}>Jenis Kelamin</Text>
              <Text style={styles.infoValue}>{candidate.jenisKelamin === 'L' ? 'Laki-laki' : 'Perempuan'}</Text>
            </View>
          </View>
          {candidate.tempatLahir && (
            <View style={styles.infoRow}>
              <Ionicons name="location" size={18} color="#6b7280" />
              <View style={styles.infoContent}>
                <Text style={styles.infoLabel}>Tempat Lahir</Text>
                <Text style={styles.infoValue}>{candidate.tempatLahir}</Text>
              </View>
            </View>
          )}
          {candidate.tanggalLahir && (
            <View style={styles.infoRow}>
              <Ionicons name="calendar" size={18} color="#6b7280" />
              <View style={styles.infoContent}>
                <Text style={styles.infoLabel}>Tanggal Lahir</Text>
                <Text style={styles.infoValue}>{new Date(candidate.tanggalLahir).toLocaleDateString('id-ID')}</Text>
              </View>
            </View>
          )}
          {candidate.alamat && (
            <View style={styles.infoRow}>
              <Ionicons name="home" size={18} color="#6b7280" />
              <View style={styles.infoContent}>
                <Text style={styles.infoLabel}>Alamat</Text>
                <Text style={styles.infoValue}>{candidate.alamat}</Text>
              </View>
            </View>
          )}
          {candidate.noHp && (
            <View style={styles.infoRow}>
              <Ionicons name="call" size={18} color="#6b7280" />
              <View style={styles.infoContent}>
                <Text style={styles.infoLabel}>No. HP</Text>
                <Text style={styles.infoValue}>{candidate.noHp}</Text>
              </View>
            </View>
          )}
          <View style={styles.infoRow}>
            <Ionicons name="calendar" size={18} color="#6b7280" />
            <View style={styles.infoContent}>
              <Text style={styles.infoLabel}>Diusulkan Tanggal</Text>
              <Text style={styles.infoValue}>
                {new Date(candidate.createdAt).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}
              </Text>
            </View>
          </View>
        </View>

        {/* Action Buttons */}
        {isActionable && (
          <View style={styles.actionRow}>
            <TouchableOpacity
              style={[styles.actionBtn, styles.approveBtn]}
              onPress={handleApprove}
              disabled={isPending}
            >
              {isPending && actionLoading === 'approve' ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <>
                  <Ionicons name="checkmark-circle" size={20} color="#fff" />
                  <Text style={styles.actionText}>Setujui</Text>
                </>
              )}
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.actionBtn, styles.rejectBtn]}
              onPress={handleReject}
              disabled={isPending}
            >
              {isPending && actionLoading === 'reject' ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <>
                  <Ionicons name="close-circle" size={20} color="#fff" />
                  <Text style={styles.actionText}>Tolak</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        )}
      </View>

      <View style={{ height: 40 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f3f4f6' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#f3f4f6' },
  errorText: { fontSize: 14, color: '#ef4444' },
  header: { backgroundColor: '#2563eb', padding: 24, paddingTop: 60, paddingBottom: 16, flexDirection: 'row', alignItems: 'center', gap: 12 },
  backBtn: { padding: 4 },
  headerTitle: { color: '#fff', fontSize: 18, fontWeight: '700', flex: 1 },

  section: { padding: 16 },
  profileCard: { backgroundColor: '#fff', borderRadius: 16, padding: 24, alignItems: 'center', marginBottom: 12, borderWidth: 1, borderColor: '#e5e7eb' },
  avatarLarge: { width: 64, height: 64, borderRadius: 32, backgroundColor: '#eff6ff', alignItems: 'center', justifyContent: 'center', marginBottom: 12 },
  avatarText: { fontSize: 24, fontWeight: '700', color: '#2563eb' },
  name: { fontSize: 20, fontWeight: '700', color: '#111827', textAlign: 'center' },
  statusBadge: { paddingHorizontal: 14, paddingVertical: 5, borderRadius: 12, marginTop: 8 },
  statusText: { fontSize: 12, fontWeight: '600' },
  ranting: { fontSize: 13, color: '#6b7280', marginTop: 6 },

  infoCard: { backgroundColor: '#fff', borderRadius: 14, padding: 16, borderWidth: 1, borderColor: '#e5e7eb' },
  infoRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 12, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#f3f4f6' },
  infoContent: { flex: 1 },
  infoLabel: { fontSize: 11, color: '#9ca3af', marginBottom: 2 },
  infoValue: { fontSize: 14, fontWeight: '500', color: '#111827' },

  actionRow: { flexDirection: 'row', gap: 12, marginTop: 16 },
  actionBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 14, borderRadius: 12 },
  approveBtn: { backgroundColor: '#16a34a' },
  rejectBtn: { backgroundColor: '#dc2626' },
  actionText: { color: '#fff', fontSize: 15, fontWeight: '600' },
});

import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
} from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useLocalSearchParams } from 'expo-router';
import apiClient, { unwrap } from '../../lib/api-client';
import { LoadingSpinner, ProfileCard, ScreenShell } from '../../components/ui/shared';
import { theme } from '../../theme';

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
  diusulkan: { label: 'Diusulkan', bg: theme.colors.primarySofter, color: theme.colors.primary },
  mengikuti_pendadaran: { label: 'Pendadaran', bg: theme.colors.warningLight, color: theme.colors.warning },
  lulus: { label: 'Lulus', bg: theme.colors.successLight, color: theme.colors.success },
  gagal: { label: 'Gagal', bg: theme.colors.dangerLight, color: theme.colors.danger },
  dibatalkan: { label: 'Dibatalkan', bg: theme.colors.surfaceMuted, color: theme.colors.textSecondary },
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
      } catch {
        /* ignore */
      }
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
    if (Alert.prompt) {
      Alert.prompt(
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
      );
    } else {
      handleRejectFallback();
    }
  };

  const handleRejectFallback = () => {
    Alert.alert('Tolak Calon', 'Konfirmasi penolakan calon anggota ini?', [
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
    ]);
  };

  if (loading)
    return (
      <View style={styles.center}>
        <LoadingSpinner size="large" color={theme.colors.primary} />
      </View>
    );
  if (!candidate)
    return (
      <View style={styles.center}>
        <Text style={styles.errorText}>Calon tidak ditemukan</Text>
      </View>
    );

  const ss = STATUS_STYLES[candidate.status] || {
    label: candidate.status,
    bg: theme.colors.surfaceMuted,
    color: theme.colors.textSecondary,
  };
  const isActionable = candidate.status === 'diusulkan';
  const isPending = actionLoading !== '';

  return (
    <ScreenShell title="Detail Calon" variant="detail" badgeLabel={ss.label} badgeColor={ss.color} badgeBg={ss.bg}>

      <View style={styles.section}>
        <ProfileCard
          name={candidate.namaLengkap}
          initial={candidate.namaLengkap.charAt(0)}
          badgeLabel={ss.label}
          badgeColor={ss.color}
          badgeBg={ss.bg}
          subtitle={candidate.ranting?.nama}
        />

        {/* Detail Info */}
        <View style={styles.infoCard}>
          <View style={styles.infoRow}>
            <Ionicons name="person" size={18} color={theme.colors.textSecondary} />
            <View style={styles.infoContent}>
              <Text style={styles.infoLabel}>Jenis Kelamin</Text>
              <Text style={styles.infoValue}>
                {candidate.jenisKelamin === 'L' ? 'Laki-laki' : 'Perempuan'}
              </Text>
            </View>
          </View>
          {candidate.tempatLahir && (
            <View style={styles.infoRow}>
              <Ionicons name="location" size={18} color={theme.colors.textSecondary} />
              <View style={styles.infoContent}>
                <Text style={styles.infoLabel}>Tempat Lahir</Text>
                <Text style={styles.infoValue}>{candidate.tempatLahir}</Text>
              </View>
            </View>
          )}
          {candidate.tanggalLahir && (
            <View style={styles.infoRow}>
              <Ionicons name="calendar" size={18} color={theme.colors.textSecondary} />
              <View style={styles.infoContent}>
                <Text style={styles.infoLabel}>Tanggal Lahir</Text>
                <Text style={styles.infoValue}>
                  {new Date(candidate.tanggalLahir).toLocaleDateString('id-ID', { day: '2-digit', month: 'long', year: 'numeric' })}
                </Text>
              </View>
            </View>
          )}
          {candidate.alamat && (
            <View style={styles.infoRow}>
              <Ionicons name="home" size={18} color={theme.colors.textSecondary} />
              <View style={styles.infoContent}>
                <Text style={styles.infoLabel}>Alamat</Text>
                <Text style={styles.infoValue}>{candidate.alamat}</Text>
              </View>
            </View>
          )}
          {candidate.noHp && (
            <View style={styles.infoRow}>
              <Ionicons name="call" size={18} color={theme.colors.textSecondary} />
              <View style={styles.infoContent}>
                <Text style={styles.infoLabel}>No. HP</Text>
                <Text style={styles.infoValue}>{candidate.noHp}</Text>
              </View>
            </View>
          )}
          <View style={styles.infoRow}>
            <Ionicons name="calendar" size={18} color={theme.colors.textSecondary} />
            <View style={styles.infoContent}>
              <Text style={styles.infoLabel}>Diusulkan Tanggal</Text>
              <Text style={styles.infoValue}>
                {new Date(candidate.createdAt).toLocaleDateString('id-ID', {
                  day: '2-digit',
                  month: 'long',
                  year: 'numeric',
                })}
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
                <LoadingSpinner size="small" color={theme.colors.surface} />
              ) : (
                <>
                  <Ionicons name="checkmark-circle" size={20} color={theme.colors.surface} />
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
                <LoadingSpinner size="small" color={theme.colors.surface} />
              ) : (
                <>
                  <Ionicons name="close-circle" size={20} color={theme.colors.surface} />
                  <Text style={styles.actionText}>Tolak</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        )}
      </View>

      <View style={{ height: 40 }} />
    </ScreenShell>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.surfaceMuted },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: theme.colors.surfaceMuted },
  errorText: { fontSize: 14, color: theme.colors.danger },

  section: { padding: 16 },


  infoCard: {
    backgroundColor: theme.colors.surface,
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.surfaceMuted,
  },
  infoContent: { flex: 1 },
  infoLabel: { fontSize: 11, color: theme.colors.textMuted, marginBottom: 2 },
  infoValue: { fontSize: 14, fontWeight: '500', color: theme.colors.text },

  actionRow: { flexDirection: 'row', gap: 12, marginTop: 16 },
  actionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    borderRadius: 12,
  },
  approveBtn: { backgroundColor: theme.colors.success },
  rejectBtn: { backgroundColor: theme.colors.danger },
  actionText: { color: theme.colors.surface, fontSize: 15, fontWeight: '600' },
});

import React, { useCallback, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  RefreshControl,
  Alert,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useFocusEffect, router } from 'expo-router';
import { safeIconName } from '../../src/lib/icons';
import apiClient, { unwrap } from '../../src/lib/api-client';
import { LoadingView } from '../../src/components/ui/shared';
import { theme } from '../../src/theme';

interface Invitation {
  id: string;
  status: 'dikirim' | 'hadir' | 'tidak_hadir';
  konfirmasiAt: string | null;
  kegiatan: {
    id: string;
    nama: string;
    lokasi: string | null;
    tanggalMulai: string;
    tanggalSelesai: string | null;
    status: string;
  };
}

const STATUS_STYLES: Record<string, { label: string; icon: string; color: string; bg: string }> = {
  dikirim: { label: 'Dikirim', icon: 'mail-outline', color: theme.colors.textSecondary, bg: theme.colors.surfaceMuted },
  hadir: { label: 'Hadir', icon: 'checkmark-circle', color: theme.colors.success, bg: theme.colors.successLight },
  tidak_hadir: { label: 'Tidak Hadir', icon: 'close-circle', color: theme.colors.danger, bg: theme.colors.dangerLight },
};

export default function InvitationsScreen() {
  const [invitations, setInvitations] = useState<Invitation[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [confirmingId, setConfirmingId] = useState<string | null>(null);

  const fetchInvitations = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const res = await apiClient.get('/graduations/invitations/me');
      setInvitations(unwrap(res) || []);
    } catch {
      /* ignore */
    }
    setLoading(false);
    setRefreshing(false);
  }, []);

  useFocusEffect(
    useCallback(() => {
      fetchInvitations();
    }, [fetchInvitations]),
  );

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchInvitations(true);
  }, [fetchInvitations]);

  const confirm = (inv: Invitation, hadir: boolean) => {
    Alert.alert(
      hadir ? 'Konfirmasi Hadir' : 'Konfirmasi Tidak Hadir',
      `Anda akan mengkonfirmasi ${hadir ? 'HADIR' : 'TIDAK HADIR'} untuk "${inv.kegiatan.nama}"?`,
      [
        { text: 'Batal', style: 'cancel' },
        {
          text: hadir ? 'Ya, Hadir' : 'Ya, Tidak Hadir',
          style: hadir ? 'default' : 'destructive',
          onPress: async () => {
            setConfirmingId(inv.id);
            try {
              await apiClient.post(
                `/graduations/${inv.kegiatan.id}/invitations/${inv.id}/confirm`,
                { hadir },
              );
              await fetchInvitations(true);
            } catch {
              Alert.alert('Gagal', 'Tidak dapat menyimpan konfirmasi. Coba lagi.');
            }
            setConfirmingId(null);
          },
        },
      ],
    );
  };

  const insets = useSafeAreaInsets();

  if (loading) return <LoadingView message="Memuat undangan..." />;

  return (
    <View style={styles.container}>
      <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.headerBack}>
          <Ionicons name="arrow-back" size={22} color={theme.colors.surface} />
        </TouchableOpacity>
        <View style={styles.headerRow}>
          <View>
            <Text style={styles.headerTitle}>Undangan Saya</Text>
            <Text style={styles.headerSub}>{invitations.length} undangan</Text>
          </View>
          <Ionicons name="mail-open" size={28} color={theme.colors.headerSub} />
        </View>
      </View>

      <FlatList
        data={invitations}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ padding: 16, paddingBottom: 32 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        ListHeaderComponent={
          invitations.length > 0 ? (
            <Text style={styles.hint}>
              Konfirmasi kehadiran Anda sebelum kegiatan pendadaran dimulai
            </Text>
          ) : null
        }
        ListEmptyComponent={
          <View style={styles.empty}>
            <Ionicons name="mail-open" size={48} color={theme.colors.borderStrong} />
            <Text style={styles.emptyTitle}>Belum ada undangan</Text>
            <Text style={styles.emptyText}>
              Undangan pendadaran dikirim otomatis H-7 ke anggota senior atau tingkat Pratama
            </Text>
          </View>
        }
        renderItem={({ item }) => {
          const ss = STATUS_STYLES[item.status] || STATUS_STYLES.dikirim;
          const d = new Date(item.kegiatan.tanggalMulai);
          return (
            <View style={styles.card}>
              <View style={styles.cardTop}>
                <View style={styles.iconBox}>
                  <Ionicons name="school" size={20} color={theme.colors.primary} />
                </View>
                <View style={styles.cardBody}>
                  <Text style={styles.title} numberOfLines={1}>
                    {item.kegiatan.nama}
                  </Text>
                  <Text style={styles.date}>
                    {d.toLocaleDateString('id-ID', {
                      weekday: 'long',
                      day: '2-digit',
                      month: 'long',
                      year: 'numeric',
                    })}
                  </Text>
                  {item.kegiatan.lokasi ? (
                    <Text style={styles.lokasi} numberOfLines={1}>
                      {item.kegiatan.lokasi}
                    </Text>
                  ) : null}
                </View>
                <View style={[styles.statusBadge, { backgroundColor: ss.bg }]}>
                  <Ionicons name={safeIconName(ss.icon)} size={11} color={ss.color} />
                  <Text style={[styles.statusText, { color: ss.color }]}>{ss.label}</Text>
                </View>
              </View>

              {item.status === 'dikirim' && (
                <View style={styles.actions}>
                  <TouchableOpacity
                    style={[styles.actionBtn, styles.hadirBtn]}
                    activeOpacity={0.7}
                    disabled={confirmingId === item.id}
                    onPress={() => confirm(item, true)}
                  >
                    <Ionicons name="checkmark-circle" size={16} color={theme.colors.surface} />
                    <Text style={styles.hadirText}>
                      {confirmingId === item.id ? 'Menyimpan...' : 'Hadir'}
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.actionBtn, styles.tidakBtn]}
                    activeOpacity={0.7}
                    disabled={confirmingId === item.id}
                    onPress={() => confirm(item, false)}
                  >
                    <Ionicons name="close-circle" size={16} color={theme.colors.danger} />
                    <Text style={styles.tidakText}>Tidak Hadir</Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>
          );
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.surfaceMuted },
  header: { backgroundColor: theme.colors.primary, padding: 24, paddingBottom: 20 },
  headerBack: { padding: 4, marginRight: 8 },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  headerTitle: { color: theme.colors.surface, fontSize: 22, fontWeight: '700' },
  headerSub: { color: theme.colors.headerSub, fontSize: 13, marginTop: 4 },
  hint: { fontSize: 12, color: theme.colors.textSecondary, marginBottom: 12 },
  card: {
    backgroundColor: theme.colors.surface,
    borderRadius: 14,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: theme.colors.surfaceMuted,
    shadowColor: theme.colors.dark,
    shadowOpacity: 0.03,
    shadowRadius: 4,
    elevation: 1,
  },
  cardTop: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  iconBox: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: theme.colors.primarySofter,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardBody: { flex: 1 },
  title: { fontSize: 15, fontWeight: '600', color: theme.colors.text },
  date: { fontSize: 12, color: theme.colors.textSecondary, marginTop: 4 },
  lokasi: { fontSize: 12, color: theme.colors.textMuted, marginTop: 2 },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    marginTop: 2,
  },
  statusText: { fontSize: 10, fontWeight: '600' },
  actions: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 12,
    borderTopWidth: 1,
    borderTopColor: theme.colors.surfaceMuted,
    paddingTop: 12,
  },
  actionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    borderRadius: 10,
  },
  hadirBtn: { backgroundColor: theme.colors.success },
  tidakBtn: { backgroundColor: theme.colors.surface, borderWidth: 1, borderColor: theme.colors.dangerLight },
  hadirText: { fontSize: 13, fontWeight: '600', color: theme.colors.surface },
  tidakText: { fontSize: 13, fontWeight: '600', color: theme.colors.danger },
  empty: { alignItems: 'center', paddingTop: 60, paddingHorizontal: 24 },
  emptyTitle: { fontSize: 15, fontWeight: '600', color: theme.colors.textSecondary, marginTop: 12 },
  emptyText: { fontSize: 13, color: theme.colors.textMuted, marginTop: 6, textAlign: 'center', lineHeight: 19 },
});

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
import apiClient, { unwrap } from '../../src/lib/api-client';
import { LoadingView } from '../../src/components/ui/shared';

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
  dikirim: { label: 'Dikirim', icon: 'mail-outline', color: '#6b7280', bg: '#f3f4f6' },
  hadir: { label: 'Hadir', icon: 'checkmark-circle', color: '#16a34a', bg: '#ecfdf5' },
  tidak_hadir: { label: 'Tidak Hadir', icon: 'close-circle', color: '#dc2626', bg: '#fef2f2' },
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
          <Ionicons name="arrow-back" size={22} color="#fff" />
        </TouchableOpacity>
        <View style={styles.headerRow}>
          <View>
            <Text style={styles.headerTitle}>Undangan Saya</Text>
            <Text style={styles.headerSub}>{invitations.length} undangan</Text>
          </View>
          <Ionicons name="mail-open" size={28} color="#bfdbfe" />
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
            <Ionicons name="mail-open" size={48} color="#d1d5db" />
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
                  <Ionicons name="school" size={20} color="#2563eb" />
                </View>
                <View style={styles.cardBody}>
                  <Text style={styles.title} numberOfLines={1}>
                    {item.kegiatan.nama}
                  </Text>
                  <Text style={styles.date}>
                    {d.toLocaleDateString('id-ID', {
                      weekday: 'long',
                      day: 'numeric',
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
                  <Ionicons name={ss.icon as any} size={11} color={ss.color} />
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
                    <Ionicons name="checkmark-circle" size={16} color="#fff" />
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
                    <Ionicons name="close-circle" size={16} color="#dc2626" />
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
  container: { flex: 1, backgroundColor: '#f3f4f6' },
  header: { backgroundColor: '#2563eb', padding: 24, paddingBottom: 20 },
  headerBack: { padding: 4, marginRight: 8 },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  headerTitle: { color: '#fff', fontSize: 22, fontWeight: '700' },
  headerSub: { color: '#bfdbfe', fontSize: 13, marginTop: 4 },
  hint: { fontSize: 12, color: '#6b7280', marginBottom: 12 },
  card: {
    backgroundColor: '#fff',
    borderRadius: 14,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#f3f4f6',
    shadowColor: '#000',
    shadowOpacity: 0.03,
    shadowRadius: 4,
    elevation: 1,
  },
  cardTop: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  iconBox: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: '#eff6ff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardBody: { flex: 1 },
  title: { fontSize: 15, fontWeight: '600', color: '#111827' },
  date: { fontSize: 12, color: '#6b7280', marginTop: 4 },
  lokasi: { fontSize: 12, color: '#9ca3af', marginTop: 2 },
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
    borderTopColor: '#f3f4f6',
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
  hadirBtn: { backgroundColor: '#059669' },
  tidakBtn: { backgroundColor: '#fff', borderWidth: 1, borderColor: '#fca5a5' },
  hadirText: { fontSize: 13, fontWeight: '600', color: '#fff' },
  tidakText: { fontSize: 13, fontWeight: '600', color: '#dc2626' },
  empty: { alignItems: 'center', paddingTop: 60, paddingHorizontal: 24 },
  emptyTitle: { fontSize: 15, fontWeight: '600', color: '#6b7280', marginTop: 12 },
  emptyText: { fontSize: 13, color: '#9ca3af', marginTop: 6, textAlign: 'center', lineHeight: 19 },
});

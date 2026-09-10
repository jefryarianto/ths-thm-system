import React, { useState } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Alert } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import Ionicons from '@expo/vector-icons/Ionicons';
import apiClient from '../../lib/api-client';
import { useNotifications, formatTime, TYPE_ICONS, NotificationItem } from '../../hooks/use-notifications';
import { useRefresh } from '../../hooks/use-refresh';
import { LoadingView } from '../../components/ui/shared';
import { theme } from '../../theme';

/** Terjemahkan field backend ke label yang bisa dibaca user. */
const MISSING_FIELD_LABELS: Record<string, string> = {
  nama_lengkap: 'Nama Lengkap',
  jenis_kelamin: 'Jenis Kelamin',
  tempat_lahir: 'Tempat Lahir',
  tanggal_lahir: 'Tanggal Lahir',
  no_hp: 'No. HP',
  alamat: 'Alamat',
  email: 'Email',
};

/** Navigasi saat notifikasi diklik: data_incomplete → edit profil; lain → mark read saja. */
function navigateToNotification(notif: NotificationItem) {
  if (notif.tipe === 'data_incomplete') {
    router.push('/profile/edit' as never);
    return;
  }
  const screen = notif.data?.screen;
  if (screen === 'profile/edit' || screen === 'profile') {
    router.push('/profile/edit' as never);
  }
}

export default function NotificationsScreen() {
  const [filter, setFilter] = useState<'all' | 'read' | 'unread'>('all');
  const { data: notifs, loading, refetch } = useNotifications();
  const { refreshing, onRefresh } = useRefresh(refetch);

  const notifsArray = Array.isArray(notifs) ? notifs : (notifs as any)?.data ?? [];
  const filtered = notifsArray.filter((n: { isRead: boolean }) =>
    filter === 'unread' ? !n.isRead : filter === 'read' ? n.isRead : true,
  );
  const unreadCount = notifsArray.filter((n: { isRead: boolean }) => !n.isRead).length;

  const markAllAsRead = async () => {
    try {
      await apiClient.patch('/notifications/read-all');
      refetch();
    } catch {
      /* ignore */
    }
  };

  const handlePress = async (item: NotificationItem) => {
    try {
      await apiClient.patch(`/notifications/${item.id}/read`);
      refetch();
    } catch {
      /* ignore */
    }
    navigateToNotification(item);
  };

  const deleteAll = async () => {
    Alert.alert('Hapus Semua', 'Yakin ingin menghapus semua notifikasi?', [
      { text: 'Batal', style: 'cancel' },
      {
        text: 'Hapus',
        style: 'destructive',
        onPress: async () => {
          try {
            await apiClient.delete('/notifications');
            refetch();
          } catch {
            Alert.alert('Gagal', 'Gagal menghapus notifikasi');
          }
        },
      },
    ]);
  };

  const insets = useSafeAreaInsets();

  if (loading) return <LoadingView message="Memuat notifikasi..." />;

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
        <TouchableOpacity onPress={() => router.navigate('/(tabs)/home' as never)} style={{ padding: 4, marginRight: 8 }}>
          <Ionicons name="arrow-back" size={22} color={theme.colors.text} />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={styles.headerTitle}>Notifikasi</Text>
        </View>
        <View style={styles.headerActions}>
          {unreadCount > 0 && (
            <TouchableOpacity onPress={markAllAsRead}>
              <Text style={styles.markAllRead}>Tandai semua dibaca ({unreadCount})</Text>
            </TouchableOpacity>
          )}
          {notifsArray.length > 0 && (
            <TouchableOpacity
              onPress={deleteAll}
              style={styles.deleteAll}
              accessibilityLabel="Hapus semua"
            >
              <Ionicons name="trash-outline" size={14} color="#dc2626" />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Filter status dibaca */}
      <View style={styles.filterBar}>
        <View style={styles.filterContent}>
          <FilterChip label="Semua" active={filter === 'all'} onPress={() => setFilter('all')} />
          <FilterChip label="Dibaca" active={filter === 'read'} onPress={() => setFilter('read')} />
          <FilterChip
            label="Belum Dibaca"
            active={filter === 'unread'}
            onPress={() => setFilter('unread')}
          />
        </View>
      </View>

      <FlatList
        data={filtered}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ padding: 16 }}
        refreshing={refreshing}
        onRefresh={onRefresh}
        ListEmptyComponent={
          <Text style={{ textAlign: 'center', color: theme.colors.textSecondary, marginTop: 40 }}>
            {filter !== 'all' ? 'Tidak ada notifikasi untuk filter ini' : 'Belum ada notifikasi'}
          </Text>
        }
        renderItem={({ item }) => {
          const missingFields = item.tipe === 'data_incomplete' ? item.data?.missingFields : undefined;
          return (
            <TouchableOpacity
              style={[styles.card, !item.isRead && styles.unread]}
              onPress={() => handlePress(item)}
            >
              <Text style={styles.icon}>{TYPE_ICONS[item.tipe] || '📢'}</Text>
              <View style={styles.content}>
                <Text style={styles.title}>{item.judul}</Text>
                <Text style={styles.body} numberOfLines={3}>
                  {item.isi}
                </Text>
                {missingFields && missingFields.length > 0 && (
                  <View style={styles.missingBox}>
                    <Text style={styles.missingLabel}>Belum lengkap:</Text>
                    <Text style={styles.missingValue}>
                      {missingFields
                        .map((f: string) => MISSING_FIELD_LABELS[f] || f.replace(/_/g, ' '))
                        .join(', ')}
                    </Text>
                  </View>
                )}
                {item.tipe === 'data_incomplete' && (
                  <Text style={styles.openEdit}>Ketuk untuk melengkapi profil →</Text>
                )}
                <Text style={styles.time}>{formatTime(item.createdAt)}</Text>
              </View>
              {!item.isRead && <View style={styles.dot} />}
            </TouchableOpacity>
          );
        }}
      />
    </View>
  );
}

function FilterChip({
  label,
  active,
  onPress,
}: {
  label: string;
  active: boolean;
  onPress: () => void;
}) {
  return (
    <TouchableOpacity style={[styles.chip, active && styles.chipActive]} onPress={onPress}>
      <Text style={[styles.chipText, active && styles.chipTextActive]}>{label}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.background },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingBottom: 8,
    backgroundColor: theme.colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  headerTitle: { fontSize: 18, fontWeight: theme.typography.weight.bold, color: theme.colors.text },
  headerActions: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  markAllRead: { fontSize: 13, color: theme.colors.primary, fontWeight: theme.typography.weight.medium },
  deleteAll: { padding: 2 },
  filterBar: { backgroundColor: theme.colors.surface, borderBottomWidth: 1, borderBottomColor: theme.colors.border },
  filterContent: { flexDirection: 'row', gap: 6, paddingHorizontal: 16, paddingVertical: 8 },
  chip: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.surface,
  },
  chipActive: { backgroundColor: theme.colors.primary, borderColor: theme.colors.primary },
  chipText: { fontSize: 11, color: theme.colors.textSecondary, fontWeight: '500' },
  chipTextActive: { color: '#fff' },
  card: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.md,
    padding: 14,
    marginBottom: 8,
    ...theme.shadow.card,
  },
  unread: { borderLeftWidth: 3, borderLeftColor: theme.colors.primary },
  icon: { fontSize: 24, marginRight: 12, marginTop: 2 },
  content: { flex: 1 },
  title: { fontSize: 14, fontWeight: theme.typography.weight.semibold, color: theme.colors.text },
  body: { fontSize: 13, color: theme.colors.textSecondary, marginTop: 4, lineHeight: 18 },
  time: { fontSize: 11, color: theme.colors.textMuted, marginTop: 6 },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: theme.colors.primary,
    marginTop: 6,
    marginLeft: 8,
  },
  missingBox: {
    backgroundColor: theme.colors.warningLight,
    borderWidth: 1,
    borderColor: theme.colors.warningLight,
    borderRadius: 8,
    padding: 8,
    marginTop: 6,
  },
  missingLabel: { fontSize: 11, fontWeight: theme.typography.weight.bold, color: theme.colors.warning },
  missingValue: { fontSize: 12, color: theme.colors.warning, marginTop: 2, lineHeight: 16 },
  openEdit: { fontSize: 12, color: theme.colors.primary, fontWeight: theme.typography.weight.semibold, marginTop: 6 },
});
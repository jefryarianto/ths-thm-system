import React from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity } from 'react-native';
import { router } from 'expo-router';
import apiClient from '../../lib/api-client';
import { useNotifications, formatTime, TYPE_ICONS, NotificationItem } from '../../hooks/use-notifications';
import { useRefresh } from '../../hooks/use-refresh';
import { LoadingView } from '../../components/ui/shared';

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
  const { data: notifs, loading, refetch } = useNotifications();
  const { refreshing, onRefresh } = useRefresh(refetch);

  const unreadCount = (notifs ?? []).filter((n) => !n.isRead).length;

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

  if (loading) return <LoadingView message="Memuat notifikasi..." />;

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Notifikasi</Text>
        {unreadCount > 0 && (
          <TouchableOpacity onPress={markAllAsRead}>
            <Text style={styles.markAllRead}>Tandai semua dibaca ({unreadCount})</Text>
          </TouchableOpacity>
        )}
      </View>
      <FlatList
        data={notifs}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ padding: 16 }}
        refreshing={refreshing}
        onRefresh={onRefresh}
        ListEmptyComponent={
          <Text style={{ textAlign: 'center', color: '#6b7280', marginTop: 40 }}>
            Belum ada notifikasi
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
                        .map((f) => MISSING_FIELD_LABELS[f] || f.replace(/_/g, ' '))
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

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f3f4f6' },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 8,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  headerTitle: { fontSize: 18, fontWeight: '700', color: '#111827' },
  markAllRead: { fontSize: 13, color: '#2563eb', fontWeight: '500' },
  card: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 14,
    marginBottom: 8,
    shadowColor: '#000',
    shadowOpacity: 0.02,
    shadowRadius: 4,
    elevation: 1,
  },
  unread: { borderLeftWidth: 3, borderLeftColor: '#2563eb' },
  icon: { fontSize: 24, marginRight: 12, marginTop: 2 },
  content: { flex: 1 },
  title: { fontSize: 14, fontWeight: '600', color: '#111827' },
  body: { fontSize: 13, color: '#6b7280', marginTop: 4, lineHeight: 18 },
  time: { fontSize: 11, color: '#9ca3af', marginTop: 6 },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#2563eb',
    marginTop: 6,
    marginLeft: 8,
  },
  missingBox: {
    backgroundColor: '#fff7ed',
    borderWidth: 1,
    borderColor: '#fed7aa',
    borderRadius: 8,
    padding: 8,
    marginTop: 6,
  },
  missingLabel: { fontSize: 11, fontWeight: '700', color: '#9a3412' },
  missingValue: { fontSize: 12, color: '#9a3412', marginTop: 2, lineHeight: 16 },
  openEdit: { fontSize: 12, color: '#2563eb', fontWeight: '600', marginTop: 6 },
});

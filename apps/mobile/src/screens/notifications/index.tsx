import React, { useState } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity } from 'react-native';
import apiClient, { unwrap } from '../../lib/api-client';
import { useApi } from '../../hooks/use-api';
import { LoadingView } from '../../components/ui/shared';

interface NotificationItem {
  id: string;
  judul: string;
  isi: string;
  tipe: string;
  isRead: boolean;
  createdAt: string;
}

function formatTime(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins} menit lalu`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours} jam lalu`;
  return new Date(dateStr).toLocaleDateString('id-ID');
}

export default function NotificationsScreen() {
  const [refreshing, setRefreshing] = useState(false);

  const { data: notifs, loading, refetch } = useApi<NotificationItem[]>(
    () => apiClient.get('/notifications', { params: { limit: 50 } }).then(unwrap).then(d => d || []),
    []
  );

  const unreadCount = (notifs || []).filter(n => !n.isRead).length;

  const onRefresh = async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  };

  const markAllAsRead = async () => {
    try {
      await apiClient.patch('/notifications/read-all');
      refetch();
    } catch { /* ignore */ }
  };

  const markAsRead = async (id: string) => {
    try {
      await apiClient.patch(`/notifications/${id}/read`);
      refetch();
    } catch { /* ignore */ }
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
        ListEmptyComponent={<Text style={{ textAlign: 'center', color: '#6b7280', marginTop: 40 }}>Belum ada notifikasi</Text>}
        renderItem={({ item }) => (
          <TouchableOpacity style={[styles.card, !item.isRead && styles.unread]} onPress={() => markAsRead(item.id)}>
            <Text style={styles.icon}>{typeIcons[item.tipe] || '📢'}</Text>
            <View style={styles.content}>
              <Text style={styles.title}>{item.judul}</Text>
              <Text style={styles.body} numberOfLines={2}>{item.isi}</Text>
              <Text style={styles.time}>{formatTime(item.createdAt)}</Text>
            </View>
            {!item.isRead && <View style={styles.dot} />}
          </TouchableOpacity>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f3f4f6' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, paddingTop: 12, paddingBottom: 8, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#e5e7eb' },
  headerTitle: { fontSize: 18, fontWeight: '700', color: '#111827' },
  markAllRead: { fontSize: 13, color: '#2563eb', fontWeight: '500' },
  card: { flexDirection: 'row', alignItems: 'flex-start', backgroundColor: '#fff', borderRadius: 12, padding: 14, marginBottom: 8, shadowColor: '#000', shadowOpacity: 0.02, shadowRadius: 4, elevation: 1 },
  unread: { borderLeftWidth: 3, borderLeftColor: '#2563eb' },
  icon: { fontSize: 24, marginRight: 12, marginTop: 2 },
  content: { flex: 1 },
  title: { fontSize: 14, fontWeight: '600', color: '#111827' },
  body: { fontSize: 13, color: '#6b7280', marginTop: 4, lineHeight: 18 },
  time: { fontSize: 11, color: '#9ca3af', marginTop: 6 },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#2563eb', marginTop: 6, marginLeft: 8 },
});
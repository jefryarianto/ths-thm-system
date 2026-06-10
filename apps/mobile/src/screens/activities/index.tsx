import React, { useState } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, RefreshControl } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useActivities, STATUS_STYLES, TIPE_ICONS, FILTER_OPTIONS } from '../../hooks/use-activities';
import { useRefresh } from '../../hooks/use-refresh';
import { LoadingView, FilterChips } from '../../components/ui/shared';

export default function ActivitiesScreen() {
  const [filter, setFilter] = useState<string>('');

  const { data: activities, loading, refetch } = useActivities(filter);
  const { refreshing, onRefresh } = useRefresh(refetch);

  if (loading) return <LoadingView message="Memuat kegiatan..." />;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Kegiatan</Text>
        <Text style={styles.headerSub}>{(activities ?? []).length} kegiatan</Text>
      </View>

      <FilterChips options={FILTER_OPTIONS} selected={filter} onChange={setFilter} />

      <FlatList
        data={activities}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ padding: 16 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Ionicons name="calendar" size={48} color="#d1d5db" />
            <Text style={styles.emptyText}>Belum ada kegiatan</Text>
          </View>
        }
        renderItem={({ item }) => {
          const icon = TIPE_ICONS[item.tipe] || 'ellipsis-horizontal';
          const statusStyle = STATUS_STYLES[item.status] || { label: item.status, bg: '#f3f4f6', color: '#6b7280' };
          const d = new Date(item.tanggalMulai);
          const months = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];
          return (
            <TouchableOpacity
              style={styles.card}
              activeOpacity={0.7}
              onPress={() => {
                const { router: r } = require('expo-router');
                r.push(`/activities/${item.id}`);
              }}
            >
              <View style={styles.dateBox}>
                <Text style={styles.dateDay}>{d.getDate()}</Text>
                <Text style={styles.dateMonth}>{months[d.getMonth()]}</Text>
              </View>
              <View style={styles.cardBody}>
                <Text style={styles.title} numberOfLines={1}>{item.nama}</Text>
                <View style={styles.metaRow}>
                  <Ionicons name={icon as any} size={13} color="#6b7280" />
                  <Text style={styles.metaText}>{item.tipe}</Text>
                  {item.lokasi && (
                    <>
                      <Ionicons name="location" size={13} color="#6b7280" />
                      <Text style={styles.metaText}>{item.lokasi}</Text>
                    </>
                  )}
                </View>
              </View>
              <View style={[styles.statusBadge, { backgroundColor: statusStyle.bg }]}>
                <Text style={[styles.statusText, { color: statusStyle.color }]}>{statusStyle.label}</Text>
              </View>
            </TouchableOpacity>
          );
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f3f4f6' },
  header: { backgroundColor: '#2563eb', padding: 24, paddingTop: 60, paddingBottom: 20 },
  headerTitle: { color: '#fff', fontSize: 22, fontWeight: '700' },
  headerSub: { color: '#bfdbfe', fontSize: 13, marginTop: 4 },

  card: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff',
    borderRadius: 14, padding: 14, marginBottom: 8,
    borderWidth: 1, borderColor: '#f3f4f6',
    shadowColor: '#000', shadowOpacity: 0.03, shadowRadius: 4, elevation: 1,
  },
  dateBox: { width: 44, alignItems: 'center', marginRight: 12 },
  dateDay: { fontSize: 20, fontWeight: '700', color: '#2563eb' },
  dateMonth: { fontSize: 10, color: '#6b7280', marginTop: -2 },
  cardBody: { flex: 1 },
  title: { fontSize: 15, fontWeight: '600', color: '#111827' },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 6 },
  metaText: { fontSize: 12, color: '#6b7280' },
  statusBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 10, marginLeft: 8 },
  statusText: { fontSize: 11, fontWeight: '600' },
  empty: { alignItems: 'center', paddingTop: 60 },
  emptyText: { fontSize: 14, color: '#9ca3af', marginTop: 12 },
});

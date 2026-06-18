import React, { useState } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, RefreshControl } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { router } from 'expo-router';
import { useAspects, STATUS_STYLES, FILTER_OPTIONS } from '../../hooks/use-assessments';
import { useRefresh } from '../../hooks/use-refresh';
import { LoadingView, FilterChips, SearchBar } from '../../components/ui/shared';

export default function AssessmentsScreen() {
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('');

  const { data: aspects, loading, refetch } = useAspects(search, filter);
  const { refreshing, onRefresh } = useRefresh(refetch);

  if (loading) return <LoadingView message="Memuat aspek penilaian..." />;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Aspek Penilaian</Text>
        <Text style={styles.headerSub}>{(aspects ?? []).length} aspek</Text>
      </View>

      <SearchBar value={search} onChangeText={setSearch} placeholder="Cari aspek penilaian..." />

      <FilterChips options={FILTER_OPTIONS} selected={filter} onChange={setFilter} />

      <FlatList
        data={aspects}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ padding: 16 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Ionicons name="clipboard" size={48} color="#d1d5db" />
            <Text style={styles.emptyText}>
              {search || filter ? 'Tidak ada aspek yang cocok' : 'Belum ada aspek penilaian'}
            </Text>
          </View>
        }
        renderItem={({ item }) => {
          const ss = STATUS_STYLES[item.status] || {
            label: item.status,
            color: '#6b7280',
            bg: '#f3f4f6',
          };
          return (
            <TouchableOpacity
              style={styles.card}
              activeOpacity={0.7}
              onPress={() => router.push(`/assessments/${item.id}` as any)}
            >
              <View style={styles.iconCircle}>
                <Ionicons name="clipboard" size={22} color="#2563eb" />
              </View>
              <View style={styles.cardBody}>
                <Text style={styles.title} numberOfLines={1}>
                  {item.nama}
                </Text>
                {item.deskripsi ? (
                  <Text style={styles.desc} numberOfLines={2}>
                    {item.deskripsi}
                  </Text>
                ) : null}
                <View style={styles.metaRow}>
                  <Ionicons name="list" size={13} color="#9ca3af" />
                  <Text style={styles.metaText}>{item.itemCount ?? 0} item</Text>
                </View>
              </View>
              <View style={[styles.statusBadge, { backgroundColor: ss.bg }]}>
                <Text style={[styles.statusText, { color: ss.color }]}>{ss.label}</Text>
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
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 14,
    padding: 14,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#f3f4f6',
    shadowColor: '#000',
    shadowOpacity: 0.03,
    shadowRadius: 4,
    elevation: 1,
  },
  iconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#eff6ff',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  cardBody: { flex: 1 },
  title: { fontSize: 15, fontWeight: '600', color: '#111827' },
  desc: { fontSize: 12, color: '#6b7280', marginTop: 3, lineHeight: 16 },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 6 },
  metaText: { fontSize: 12, color: '#6b7280' },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10,
    marginLeft: 8,
  },
  statusText: { fontSize: 11, fontWeight: '600' },
  empty: { alignItems: 'center', paddingTop: 60 },
  emptyText: { fontSize: 14, color: '#9ca3af', marginTop: 12 },
});

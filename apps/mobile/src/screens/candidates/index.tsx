import React, { useState } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, RefreshControl, TextInput } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useCandidates, STATUS_STYLES, STATUS_FILTERS } from '../../hooks/use-candidates';
import { LoadingView, FilterChips } from '../../components/ui/shared';

export default function CandidatesScreen() {
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('');

  const { data: candidates, loading, refetch } = useCandidates(search, filterStatus);

  const onRefresh = async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  };

  if (loading) return <LoadingView message="Memuat calon anggota..." />;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Calon Anggota</Text>
        <Text style={styles.headerSub}>{(candidates ?? []).length} calon</Text>
      </View>

      {/* Search */}
      <View style={styles.searchContainer}>
        <Ionicons name="search" size={16} color="#9ca3af" />
        <TextInput
          style={styles.searchInput}
          placeholder="Cari calon anggota..."
          placeholderTextColor="#9ca3af"
          value={search}
          onChangeText={setSearch}
        />
        {search.length > 0 && (
          <TouchableOpacity onPress={() => setSearch('')}>
            <Ionicons name="close-circle" size={16} color="#9ca3af" />
          </TouchableOpacity>
        )}
      </View>

      <FilterChips options={STATUS_FILTERS} selected={filterStatus} onChange={setFilterStatus} />

      <FlatList
        data={candidates}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ padding: 16 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Ionicons name="people" size={48} color="#d1d5db" />
            <Text style={styles.emptyText}>Belum ada calon anggota</Text>
          </View>
        }
        renderItem={({ item }) => {
          const ss = STATUS_STYLES[item.status] || { label: item.status, bg: '#f3f4f6', color: '#6b7280' };
          return (
            <TouchableOpacity
              style={styles.card}
              activeOpacity={0.7}
              onPress={() => {
                const { router: r } = require('expo-router');
                r.push(`/candidates/${item.id}`);
              }}
            >
              <View style={styles.avatar}>
                <Text style={styles.avatarText}>{item.namaLengkap.charAt(0)}</Text>
              </View>
              <View style={styles.cardBody}>
                <Text style={styles.name}>{item.namaLengkap}</Text>
                {item.ranting && (
                  <View style={styles.metaItem}>
                    <Ionicons name="location" size={11} color="#9ca3af" />
                    <Text style={styles.metaText}>{item.ranting.nama}</Text>
                  </View>
                )}
                <Text style={styles.date}>
                  {new Date(item.createdAt).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}
                </Text>
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
  searchContainer: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', margin: 16, marginBottom: 0,
    borderRadius: 10, borderWidth: 1, borderColor: '#e5e7eb', paddingHorizontal: 12, paddingVertical: 8,
  },
  searchInput: { flex: 1, fontSize: 14, color: '#111827', marginLeft: 8 },

  card: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff',
    borderRadius: 14, padding: 14, marginBottom: 8,
    borderWidth: 1, borderColor: '#f3f4f6',
    shadowColor: '#000', shadowOpacity: 0.03, shadowRadius: 4, elevation: 1,
  },
  avatar: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#eff6ff', alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  avatarText: { fontSize: 16, fontWeight: '700', color: '#2563eb' },
  cardBody: { flex: 1 },
  name: { fontSize: 15, fontWeight: '600', color: '#111827' },
  metaItem: { flexDirection: 'row', alignItems: 'center', gap: 3, marginTop: 3 },
  metaText: { fontSize: 12, color: '#6b7280' },
  date: { fontSize: 11, color: '#9ca3af', marginTop: 2 },
  statusBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 10, marginLeft: 8 },
  statusText: { fontSize: 11, fontWeight: '600' },
  empty: { alignItems: 'center', paddingTop: 60 },
  emptyText: { fontSize: 14, color: '#9ca3af', marginTop: 12 },
});

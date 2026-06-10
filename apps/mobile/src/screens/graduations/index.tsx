import React, { useState } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, RefreshControl, TextInput } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useGraduations, STATUS_STYLES, FILTERS } from '../../hooks/use-graduations';
import { useRefresh } from '../../hooks/use-refresh';
import { LoadingView, FilterChips } from '../../components/ui/shared';

const months = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];

export default function GraduationsScreen() {
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('');

  const { data, loading, refetch } = useGraduations(search, filterStatus);
  const { refreshing, onRefresh } = useRefresh(refetch);

  if (loading) return <LoadingView message="Memuat pendadaran..." />;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerRow}>
          <View>
            <Text style={styles.headerTitle}>Pendadaran</Text>
            <Text style={styles.headerSub}>{(data ?? []).length} ujian</Text>
          </View>
          <Ionicons name="school" size={28} color="#bfdbfe" />
        </View>
      </View>

      {/* Search */}
      <View style={styles.searchContainer}>
        <Ionicons name="search" size={16} color="#9ca3af" />
        <TextInput
          style={styles.searchInput}
          placeholder="Cari pendadaran..."
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

      <FilterChips options={FILTERS} selected={filterStatus} onChange={setFilterStatus} />

      <FlatList
        data={data}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ padding: 16 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Ionicons name="school" size={48} color="#d1d5db" />
            <Text style={styles.emptyText}>
              {search || filterStatus ? 'Tidak ada pendadaran yang cocok' : 'Belum ada pendadaran'}
            </Text>
          </View>
        }
        renderItem={({ item }) => {
          const ss = STATUS_STYLES[item.status] || { label: item.status, icon: 'ellipse', bg: '#f3f4f6', color: '#6b7280' };
          const d = new Date(item.tanggalMulai);
          return (
            <TouchableOpacity style={styles.card} activeOpacity={0.7}>
              <View style={styles.dateBox}>
                <Text style={styles.dateDay}>{d.getDate()}</Text>
                <Text style={styles.dateMonth}>{months[d.getMonth()]}</Text>
                <Text style={styles.dateYear}>{d.getFullYear()}</Text>
              </View>
              <View style={styles.cardBody}>
                <Text style={styles.title} numberOfLines={1}>{item.nama}</Text>
                {item.lokasi && (
                  <View style={styles.metaRow}>
                    <Ionicons name="location" size={13} color="#9ca3af" />
                    <Text style={styles.metaText}>{item.lokasi}</Text>
                  </View>
                )}
                {item.tanggalSelesai && (
                  <View style={styles.metaRow}>
                    <Ionicons name="time" size={13} color="#9ca3af" />
                    <Text style={styles.metaText}>
                      Selesai: {new Date(item.tanggalSelesai).toLocaleDateString('id-ID')}
                    </Text>
                  </View>
                )}
              </View>
              <View style={[styles.statusBadge, { backgroundColor: ss.bg }]}>
                <Ionicons name={ss.icon as any} size={12} color={ss.color} />
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
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  headerTitle: { color: '#fff', fontSize: 22, fontWeight: '700' },
  headerSub: { color: '#bfdbfe', fontSize: 13, marginTop: 4 },
  searchContainer: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', margin: 16, marginBottom: 0,
    borderRadius: 10, borderWidth: 1, borderColor: '#e5e7eb', paddingHorizontal: 12, paddingVertical: 8,
  },
  searchInput: { flex: 1, fontSize: 14, color: '#111827', marginLeft: 8 },
  card: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', borderRadius: 14,
    padding: 14, marginBottom: 8, borderWidth: 1, borderColor: '#f3f4f6',
    shadowColor: '#000', shadowOpacity: 0.03, shadowRadius: 4, elevation: 1,
  },
  dateBox: { width: 44, alignItems: 'center', marginRight: 12 },
  dateDay: { fontSize: 20, fontWeight: '700', color: '#2563eb' },
  dateMonth: { fontSize: 10, color: '#6b7280' },
  dateYear: { fontSize: 9, color: '#9ca3af', marginTop: -1 },
  cardBody: { flex: 1 },
  title: { fontSize: 15, fontWeight: '600', color: '#111827' },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 4 },
  metaText: { fontSize: 12, color: '#6b7280' },
  statusBadge: { flexDirection: 'row', alignItems: 'center', gap: 3, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 10, marginLeft: 8 },
  statusText: { fontSize: 11, fontWeight: '600' },
  empty: { alignItems: 'center', paddingTop: 60 },
  emptyText: { fontSize: 14, color: '#9ca3af', marginTop: 12 },
});

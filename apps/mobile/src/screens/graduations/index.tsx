import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  ActivityIndicator,
  TouchableOpacity,
  RefreshControl,
  TextInput,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import apiClient from '../../lib/api-client';

interface Graduation {
  id: string;
  nama: string;
  lokasi?: string;
  tanggalMulai: string;
  tanggalSelesai?: string;
  status: string;
}

const STATUS_STYLES: Record<string, { label: string; icon: string; bg: string; color: string }> = {
  draft: { label: 'Draft', icon: 'create', bg: '#f3f4f6', color: '#6b7280' },
  published: { label: 'Berlangsung', icon: 'checkmark-circle', bg: '#ecfdf5', color: '#16a34a' },
  closed: { label: 'Selesai', icon: 'flag', bg: '#eff6ff', color: '#2563eb' },
  cancelled: { label: 'Dibatalkan', icon: 'close-circle', bg: '#fef2f2', color: '#dc2626' },
};

const FILTERS = [
  { value: '', label: 'Semua' },
  { value: 'published', label: 'Berlangsung' },
  { value: 'closed', label: 'Selesai' },
  { value: 'draft', label: 'Draft' },
];

export default function GraduationsScreen() {
  const [data, setData] = useState<Graduation[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('');

  const fetchData = async (query?: string, status?: string) => {
    try {
      const params: Record<string, unknown> = { limit: 50 };
      if (query?.trim()) params.search = query.trim();
      if (status) params.status = status;
      const res = await apiClient.get('/graduations', { params });
      setData(res.data.data || []);
    } catch {
      /* ignore */
    }
    setLoading(false);
  };

  useEffect(() => {
    const timer = setTimeout(() => fetchData(search, filterStatus), 300);
    return () => clearTimeout(timer);
  }, [search, filterStatus]);

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchData(search, filterStatus);
    setRefreshing(false);
  };

  if (loading)
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#2563eb" />
      </View>
    );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerRow}>
          <View>
            <Text style={styles.headerTitle}>Pendadaran</Text>
            <Text style={styles.headerSub}>{data.length} ujian</Text>
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

      {/* Status Filter */}
      <View style={styles.filterRow}>
        {FILTERS.map((f) => (
          <TouchableOpacity
            key={f.value}
            style={[styles.filterChip, filterStatus === f.value && styles.filterChipActive]}
            onPress={() => {
              setFilterStatus(f.value);
              setLoading(true);
            }}
          >
            <Text style={[styles.filterText, filterStatus === f.value && styles.filterTextActive]}>
              {f.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

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
          const ss = STATUS_STYLES[item.status] || {
            label: item.status,
            icon: 'ellipse',
            bg: '#f3f4f6',
            color: '#6b7280',
          };
          const d = new Date(item.tanggalMulai);
          const months = [
            'Jan',
            'Feb',
            'Mar',
            'Apr',
            'Mei',
            'Jun',
            'Jul',
            'Agu',
            'Sep',
            'Okt',
            'Nov',
            'Des',
          ];
          return (
            <TouchableOpacity style={styles.card} activeOpacity={0.7}>
              <View style={styles.dateBox}>
                <Text style={styles.dateDay}>{d.getDate()}</Text>
                <Text style={styles.dateMonth}>{months[d.getMonth()]}</Text>
                <Text style={styles.dateYear}>{d.getFullYear()}</Text>
              </View>
              <View style={styles.cardBody}>
                <Text style={styles.title} numberOfLines={1}>
                  {item.nama}
                </Text>
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
                {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
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
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#f3f4f6' },
  header: { backgroundColor: '#2563eb', padding: 24, paddingTop: 60, paddingBottom: 20 },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  headerTitle: { color: '#fff', fontSize: 22, fontWeight: '700' },
  headerSub: { color: '#bfdbfe', fontSize: 13, marginTop: 4 },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    margin: 16,
    marginBottom: 0,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  searchInput: { flex: 1, fontSize: 14, color: '#111827', marginLeft: 8 },
  filterRow: {
    flexDirection: 'row',
    gap: 6,
    paddingHorizontal: 16,
    paddingVertical: 10,
    flexWrap: 'wrap',
  },
  filterChip: {
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 14,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  filterChipActive: { backgroundColor: '#2563eb', borderColor: '#2563eb' },
  filterText: { fontSize: 12, color: '#6b7280', fontWeight: '500' },
  filterTextActive: { color: '#fff' },
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
  dateBox: { width: 44, alignItems: 'center', marginRight: 12 },
  dateDay: { fontSize: 20, fontWeight: '700', color: '#2563eb' },
  dateMonth: { fontSize: 10, color: '#6b7280' },
  dateYear: { fontSize: 9, color: '#9ca3af', marginTop: -1 },
  cardBody: { flex: 1 },
  title: { fontSize: 15, fontWeight: '600', color: '#111827' },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 4 },
  metaText: { fontSize: 12, color: '#6b7280' },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10,
    marginLeft: 8,
  },
  statusText: { fontSize: 11, fontWeight: '600' },
  empty: { alignItems: 'center', paddingTop: 60 },
  emptyText: { fontSize: 14, color: '#9ca3af', marginTop: 12 },
});

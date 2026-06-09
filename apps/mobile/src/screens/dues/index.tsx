import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  ActivityIndicator,
  TouchableOpacity,
  RefreshControl,
} from 'react-native';
import apiClient from '../../lib/api-client';

interface DuesItem {
  id: string;
  periode: string;
  jumlah: number;
  status: string;
  tanggalBayar?: string;
  createdAt: string;
}

const STATUS_STYLES: Record<string, { label: string; color: string; bg: string }> = {
  lunas: { label: 'Lunas', color: '#16a34a', bg: '#ecfdf5' },
  menunggak: { label: 'Menunggak', color: '#dc2626', bg: '#fef2f2' },
  belum_dibayar: { label: 'Belum Dibayar', color: '#6b7280', bg: '#f3f4f6' },
  menunggu_verifikasi: { label: 'Menunggu', color: '#ca8a04', bg: '#fef3c7' },
};

const FILTERS = [
  { value: '', label: 'Semua' },
  { value: 'lunas', label: 'Lunas' },
  { value: 'menunggak', label: 'Menunggak' },
  { value: 'belum_dibayar', label: 'Belum Dibayar' },
  { value: 'menunggu_verifikasi', label: 'Menunggu' },
];

export default function DuesScreen() {
  const [dues, setDues] = useState<DuesItem[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filterStatus, setFilterStatus] = useState('');

  const fetchData = useCallback(async () => {
    try {
      const params: Record<string, unknown> = { limit: 50 };
      if (filterStatus) params.status = filterStatus;
      const res = await apiClient.get('/dues', { params });
      const data = res.data.data || [];
      setDues(data);
      setTotal(
        data
          .filter((d: DuesItem) => d.status === 'lunas')
          .reduce((s: number, d: DuesItem) => s + Number(d.jumlah), 0),
      );
    } catch {
      /* ignore */
    }
    setLoading(false);
  }, [filterStatus]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchData();
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
        <Text style={styles.totalLabel}>Total Pembayaran</Text>
        <Text style={styles.totalAmount}>Rp {total.toLocaleString('id-ID')}</Text>
        <Text style={styles.countLabel}>{dues.length} transaksi</Text>
      </View>

      {/* Filter Chips */}
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
        data={dues}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ padding: 16 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyText}>
              {filterStatus ? 'Tidak ada iuran dengan status ini' : 'Belum ada data iuran'}
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
            <View style={styles.card}>
              <View style={styles.cardLeft}>
                <Text style={styles.periode}>{item.periode}</Text>
                <Text style={styles.tanggal}>
                  {item.tanggalBayar
                    ? new Date(item.tanggalBayar).toLocaleDateString('id-ID')
                    : '-'}
                </Text>
              </View>
              <View style={styles.cardRight}>
                <Text style={styles.jumlah}>Rp {Number(item.jumlah).toLocaleString('id-ID')}</Text>
                <View style={[styles.statusBadge, { backgroundColor: ss.bg }]}>
                  <Text style={[styles.statusText, { color: ss.color }]}>{ss.label}</Text>
                </View>
              </View>
            </View>
          );
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f3f4f6' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#f3f4f6' },
  header: { backgroundColor: '#2563eb', padding: 24, paddingTop: 60, alignItems: 'center' },
  totalLabel: { color: '#bfdbfe', fontSize: 13 },
  totalAmount: { color: '#fff', fontSize: 28, fontWeight: '700', marginTop: 4 },
  countLabel: { color: '#bfdbfe', fontSize: 12, marginTop: 6 },
  filterRow: {
    flexDirection: 'row',
    gap: 6,
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
    flexWrap: 'wrap',
  },
  filterChip: {
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 14,
    backgroundColor: '#f3f4f6',
  },
  filterChipActive: { backgroundColor: '#2563eb' },
  filterText: { fontSize: 12, color: '#6b7280', fontWeight: '500' },
  filterTextActive: { color: '#fff' },
  card: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#f3f4f6',
    shadowColor: '#000',
    shadowOpacity: 0.03,
    shadowRadius: 4,
    elevation: 1,
  },
  cardLeft: { flex: 1 },
  periode: { fontSize: 15, fontWeight: '600', color: '#111827' },
  tanggal: { fontSize: 12, color: '#6b7280', marginTop: 2 },
  cardRight: { alignItems: 'flex-end' },
  jumlah: { fontSize: 15, fontWeight: '600', color: '#111827' },
  statusBadge: { paddingHorizontal: 10, paddingVertical: 3, borderRadius: 8, marginTop: 4 },
  statusText: { fontSize: 11, fontWeight: '600' },
  empty: { alignItems: 'center', paddingTop: 60 },
  emptyText: { fontSize: 14, color: '#9ca3af', marginTop: 12 },
});

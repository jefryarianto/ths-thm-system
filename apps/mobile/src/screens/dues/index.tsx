import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, RefreshControl, TouchableOpacity } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import apiClient from '../../lib/api-client';
import { usePaginatedList } from '../../hooks/use-api';
import { useRefresh } from '../../hooks/use-refresh';
import { LoadingView, StatusBadge, FilterChips } from '../../components/ui/shared';
import { router } from 'expo-router';

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
  const [total, setTotal] = useState(0);
  const [filterStatus, setFilterStatus] = useState('');

  const {
    data: dues,
    loading,
    refetch,
  } = usePaginatedList<DuesItem>(() => {
    const params: Record<string, unknown> = { limit: 50 };
    if (filterStatus) params.status = filterStatus;
    return apiClient.get('/dues', { params }).then((r) => r.data);
  }, [filterStatus]);

  // Calculate total from fetched data
  useEffect(() => {
    if (dues.length > 0) {
      const paid = dues
        .filter((d) => d.status === 'lunas')
        .reduce((s, d) => s + Number(d.jumlah), 0);
      setTotal(paid);
    }
  }, [dues]);

  const { refreshing, onRefresh } = useRefresh(refetch);

  if (loading) return <LoadingView message="Memuat iuran..." />;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={{ flex: 1, alignItems: 'center' }}>
          <Text style={styles.totalLabel}>Total Pembayaran</Text>
          <Text style={styles.totalAmount}>Rp {total.toLocaleString('id-ID')}</Text>
          <Text style={styles.countLabel}>{dues.length} transaksi</Text>
        </View>
        <TouchableOpacity
          style={styles.addBtn}
          activeOpacity={0.7}
          onPress={() => router.push('/payments/create')}
        >
          <Ionicons name="add" size={22} color="#fff" />
        </TouchableOpacity>
      </View>

      <FilterChips
        options={FILTERS}
        selected={filterStatus}
        onChange={(v) => {
          setFilterStatus(v);
        }}
      />

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
              <TouchableOpacity
                style={styles.cardTouchable}
                activeOpacity={0.7}
                onPress={() => router.push(`/dues/${item.id}` as any)}
              >
                <View style={styles.cardLeft}>
                  <Text style={styles.periode}>{item.periode}</Text>
                  <Text style={styles.tanggal}>
                    {item.tanggalBayar
                      ? new Date(item.tanggalBayar).toLocaleDateString('id-ID')
                      : '-'}
                  </Text>
                </View>
                <View style={styles.cardRight}>
                  <Text style={styles.jumlah}>
                    Rp {Number(item.jumlah).toLocaleString('id-ID')}
                  </Text>
                  <StatusBadge label={ss.label} color={ss.color} bg={ss.bg} />
                </View>
              </TouchableOpacity>
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
  header: { backgroundColor: '#2563eb', padding: 24, paddingTop: 60, flexDirection: 'row', alignItems: 'center' },
  addBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: 'rgba(255,255,255,0.2)', alignItems: 'center', justifyContent: 'center', position: 'absolute', right: 24, top: 60 },
  totalLabel: { color: '#bfdbfe', fontSize: 13 },
  totalAmount: { color: '#fff', fontSize: 28, fontWeight: '700', marginTop: 4 },
  countLabel: { color: '#bfdbfe', fontSize: 12, marginTop: 6 },
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#f3f4f6',
    shadowColor: '#000',
    shadowOpacity: 0.03,
    shadowRadius: 4,
    elevation: 1,
  },
  cardTouchable: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
  },
  cardLeft: { flex: 1 },
  periode: { fontSize: 15, fontWeight: '600', color: '#111827' },
  tanggal: { fontSize: 12, color: '#6b7280', marginTop: 2 },
  cardRight: { alignItems: 'flex-end' },
  jumlah: { fontSize: 15, fontWeight: '600', color: '#111827' },
  empty: { alignItems: 'center', paddingTop: 60 },
  emptyText: { fontSize: 14, color: '#9ca3af', marginTop: 12 },
});

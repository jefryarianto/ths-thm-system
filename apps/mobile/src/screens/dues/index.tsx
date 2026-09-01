import React, { useState, useEffect, useMemo } from 'react';
import { View, Text, StyleSheet, FlatList, RefreshControl, TouchableOpacity, Image } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Ionicons from '@expo/vector-icons/Ionicons';
import apiClient, { unwrap, toAbsoluteUrl } from '../../lib/api-client';
import { formatDate, formatPeriode, formatRupiah } from '../../lib/format';
import { usePaginatedList } from '../../hooks/use-api';
import { useRefresh } from '../../hooks/use-refresh';
import { LoadingView, StatusBadge, FilterChips, ErrorView } from '../../components/ui/shared';
import { router } from 'expo-router';

interface DuesItem {
  id: string;
  periode: string;
  jumlah: number;
  status: string;
  tanggalBayar?: string;
  createdAt: string;
}

interface BankInfo {
  bankName: string;
  accountNumber: string;
  accountName: string;
  qrisImageUrl: string | null;
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
  const [bankInfo, setBankInfo] = useState<BankInfo | null>(null);

  // Endpoint khusus anggota (self-scope): /dues (admin-only) tidak bisa dipakai anggota.
  const {
    data: allDues,
    loading,
    error,
    refetch,
  } = usePaginatedList<DuesItem>(() =>
    apiClient
      .get('/dues/members/me')
      .then((r) => ({
        data: unwrap<DuesItem[]>(r) || [],
        meta: { total: 0, totalPages: 0 },
      })),
    [],
  );

  // Filter chip diterapkan client-side (endpoint mengembalikan seluruh iuran sendiri)
  const dues = useMemo(() => {
    if (!filterStatus) return allDues;
    return allDues.filter((d) => d.status === filterStatus);
  }, [allDues, filterStatus]);

  // Muat rekening aktif untuk info transfer (API mengembalikan array — ambil elemen pertama)
  useEffect(() => {
    apiClient
      .get('/payments/bank-info')
      .then((r) => {
        const list = unwrap<BankInfo[] | null>(r) || [];
        setBankInfo(Array.isArray(list) && list.length > 0 ? list[0] : null);
      })
      .catch(() => {});
  }, []);

  // Total pembayaran = jumlah SEMUA iuran lunas (bukan hanya yang sedang difilter),
  // agar angka tidak berubah saat user memilih filter lain / data kosong.
  useEffect(() => {
    const paid = allDues
      .filter((d) => d.status === 'lunas')
      .reduce((s, d) => s + Number(d.jumlah), 0);
    setTotal(paid);
  }, [allDues]);

  const { refreshing, onRefresh } = useRefresh(refetch);

  const insets = useSafeAreaInsets();

  if (loading) return <LoadingView message="Memuat iuran..." />;

  // Gagal memuat data → tampilkan pesan jelas + tombol coba lagi
  // (daripada daftar kosong yang membingungkan).
  if (error && allDues.length === 0) {
    return (
      <View style={styles.container}>
        <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
          <TouchableOpacity onPress={() => router.navigate('/(tabs)/home' as never)} style={{ padding: 4, marginRight: 12 }}>
            <Ionicons name="arrow-back" size={22} color="#fff" />
          </TouchableOpacity>
          <View style={{ flex: 1, alignItems: 'center' }}>
            <Text style={styles.totalLabel}>Total Pembayaran</Text>
            <Text style={styles.totalAmount}>Rp 0</Text>
          </View>
        </View>
        <View style={{ flex: 1, justifyContent: 'center' }}>
          <ErrorView message="Gagal memuat data iuran" onRetry={refetch} />
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
        <TouchableOpacity onPress={() => router.back()} style={{ padding: 4, marginRight: 12 }}>
          <Ionicons name="arrow-back" size={22} color="#fff" />
        </TouchableOpacity>
        <View style={{ flex: 1, alignItems: 'center' }}>
          <Text style={styles.totalLabel}>Total Pembayaran</Text>
          <Text style={styles.totalAmount}>{formatRupiah(total)}</Text>
          <Text style={styles.countLabel}>{dues.length} transaksi</Text>
        </View>
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
        ListHeaderComponent={
          <>
            {/* Info rekening aktif untuk transfer */}
            {bankInfo && (
              <View style={styles.bankCard}>
                <View style={styles.bankCardHeader}>
                  <Ionicons name="business" size={16} color="#2563eb" />
                  <Text style={styles.bankCardTitle}>Pembayaran via Transfer</Text>
                </View>
                <View style={styles.bankRow}>
                  <Text style={styles.bankLabel}>Bank</Text>
                  <Text style={styles.bankValue}>{bankInfo.bankName}</Text>
                </View>
                <View style={styles.bankRow}>
                  <Text style={styles.bankLabel}>No. Rekening</Text>
                  <Text style={styles.bankAccNumber}>{bankInfo.accountNumber}</Text>
                </View>
                <View style={styles.bankRow}>
                  <Text style={styles.bankLabel}>Atas Nama</Text>
                  <Text style={styles.bankValue}>{bankInfo.accountName}</Text>
                </View>
                {toAbsoluteUrl(bankInfo.qrisImageUrl) && (
                  <View style={styles.qrisContainer}>
                    <Image
                      source={{ uri: toAbsoluteUrl(bankInfo.qrisImageUrl) as string }}
                      style={styles.qrisImage}
                      resizeMode="contain"
                    />
                    <Text style={styles.qrisLabel}>Scan QRIS</Text>
                  </View>
                )}
              </View>
            )}
          </>
        }
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
                  <Text style={styles.periode}>{formatPeriode(item.periode)}</Text>
                  <Text style={styles.tanggal}>
                    {item.tanggalBayar
                      ? formatDate(item.tanggalBayar)
                      : '-'}
                  </Text>
                </View>
                <View style={styles.cardRight}>
                  <Text style={styles.jumlah}>
                    {formatRupiah(item.jumlah)}
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
  header: { backgroundColor: '#2563eb', padding: 24, flexDirection: 'row', alignItems: 'center' },
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

  // ── Info rekening aktif ──
  bankCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  bankCardHeader: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 10 },
  bankCardTitle: { fontSize: 15, fontWeight: '700', color: '#111827' },
  bankRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 7,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  bankLabel: { fontSize: 13, color: '#6b7280', width: 100 },
  bankValue: { fontSize: 14, fontWeight: '600', color: '#111827', flex: 1 },
  bankAccNumber: { fontSize: 15, fontWeight: '700', color: '#2563eb', flex: 1, letterSpacing: 1 },
  qrisContainer: { alignItems: 'center', marginTop: 12, padding: 10, backgroundColor: '#f9fafb', borderRadius: 10 },
  qrisImage: { width: 160, height: 160 },
  qrisLabel: { fontSize: 12, color: '#6b7280', marginTop: 6 },
});

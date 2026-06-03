import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, FlatList, ActivityIndicator } from 'react-native';
import apiClient from '../../lib/api-client';

const statusColors: Record<string, string> = { lunas: '#16a34a', menunggak: '#dc2626', belum_dibayar: '#6b7280', menunggu_verifikasi: '#ca8a04' };

export default function DuesScreen() {
  const [dues, setDues] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const res = await apiClient.get('/dues', { params: { limit: 50 } });
        const data = res.data.data || [];
        setDues(data);
        setTotal(data.filter((d: any) => d.status === 'lunas').reduce((s: number, d: any) => s + Number(d.jumlah), 0));
      } catch { /* ignore */ }
      setLoading(false);
    })();
  }, []);

  if (loading) return <View style={styles.container}><ActivityIndicator size="large" /></View>;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.totalLabel}>Total Pembayaran</Text>
        <Text style={styles.totalAmount}>Rp {total.toLocaleString('id-ID')}</Text>
      </View>
      <FlatList
        data={dues}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ padding: 16 }}
        ListEmptyComponent={<Text style={{ textAlign: 'center', color: '#6b7280', marginTop: 40 }}>Belum ada data iuran</Text>}
        renderItem={({ item }) => (
          <View style={styles.card}>
            <View>
              <Text style={styles.periode}>{item.periode}</Text>
              <Text style={styles.tanggal}>{item.tanggalBayar ? new Date(item.tanggalBayar).toLocaleDateString('id-ID') : '-'}</Text>
            </View>
            <View style={{ alignItems: 'flex-end' }}>
              <Text style={styles.jumlah}>Rp {Number(item.jumlah).toLocaleString('id-ID')}</Text>
              <Text style={[styles.status, { color: statusColors[item.status] || '#6b7280' }]}>{item.status}</Text>
            </View>
          </View>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f3f4f6' },
  header: { backgroundColor: '#2563eb', padding: 24, paddingTop: 60, alignItems: 'center' },
  totalLabel: { color: '#bfdbfe', fontSize: 13 },
  totalAmount: { color: '#fff', fontSize: 28, fontWeight: '700', marginTop: 4 },
  card: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#fff', borderRadius: 12, padding: 16, marginBottom: 8 },
  periode: { fontSize: 15, fontWeight: '600', color: '#111827' },
  tanggal: { fontSize: 12, color: '#6b7280', marginTop: 2 },
  jumlah: { fontSize: 15, fontWeight: '600', color: '#111827' },
  status: { fontSize: 12, fontWeight: '600', marginTop: 2 },
});
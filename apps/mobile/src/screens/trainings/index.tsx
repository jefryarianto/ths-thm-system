import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, FlatList, ActivityIndicator, TouchableOpacity, RefreshControl } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import apiClient from '../../lib/api-client';

interface Training {
  id: string;
  hariTanggal: string;
  lokasi?: string;
  jenisMateri?: string;
  hasilLatihanGlobal?: string;
  ranting?: { nama: string };
  pelatih?: { id: string; namaLengkap: string };
}

export default function TrainingsScreen() {
  const [trainings, setTrainings] = useState<Training[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => { fetchData(); }, []);

  const fetchData = async () => {
    try {
      const res = await apiClient.get('/trainings', { params: { limit: 50 } });
      setTrainings(res.data.data || []);
    } catch { /* ignore */ }
    setLoading(false);
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchData();
    setRefreshing(false);
  };

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr);
    const days = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];
    return `${days[d.getDay()]}, ${d.getDate()} ${months[d.getMonth()]} ${d.getFullYear()}`;
  };

  if (loading) return <View style={styles.center}><ActivityIndicator size="large" color="#2563eb" /></View>;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Latihan</Text>
        <Text style={styles.headerSub}>{trainings.length} sesi latihan</Text>
      </View>
      <FlatList
        data={trainings}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ padding: 16 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Ionicons name="fitness" size={48} color="#d1d5db" />
            <Text style={styles.emptyText}>Belum ada data latihan</Text>
          </View>
        }
        renderItem={({ item }) => (
          <TouchableOpacity style={styles.card} activeOpacity={0.7} onPress={() => { const { router: r } = require('expo-router'); r.push(`/trainings/${item.id}`); }}>
            <View style={styles.cardLeft}>
              <View style={styles.iconCircle}>
                <Ionicons name="fitness" size={20} color="#2563eb" />
              </View>
            </View>
            <View style={styles.cardBody}>
              <Text style={styles.materi} numberOfLines={1}>
                {item.jenisMateri || 'Latihan'}
              </Text>
              <Text style={styles.date}>{formatDate(item.hariTanggal)}</Text>
              <View style={styles.metaRow}>
                {item.lokasi && (
                  <View style={styles.metaItem}>
                    <Ionicons name="location" size={11} color="#9ca3af" />
                    <Text style={styles.metaText}>{item.lokasi}</Text>
                  </View>
                )}
                {item.pelatih && (
                  <View style={styles.metaItem}>
                    <Ionicons name="person" size={11} color="#9ca3af" />
                    <Text style={styles.metaText}>{item.pelatih.namaLengkap}</Text>
                  </View>
                )}
              </View>
            </View>
            <Ionicons name="chevron-forward" size={18} color="#d1d5db" />
          </TouchableOpacity>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f3f4f6' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#f3f4f6' },
  header: { backgroundColor: '#2563eb', padding: 24, paddingTop: 60, paddingBottom: 20 },
  headerTitle: { color: '#fff', fontSize: 22, fontWeight: '700' },
  headerSub: { color: '#bfdbfe', fontSize: 13, marginTop: 4 },
  card: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff',
    borderRadius: 14, padding: 14, marginBottom: 8,
    borderWidth: 1, borderColor: '#f3f4f6',
    shadowColor: '#000', shadowOpacity: 0.03, shadowRadius: 4, elevation: 1,
  },
  cardLeft: { marginRight: 12 },
  iconCircle: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#eff6ff', alignItems: 'center', justifyContent: 'center' },
  cardBody: { flex: 1 },
  materi: { fontSize: 15, fontWeight: '600', color: '#111827' },
  date: { fontSize: 12, color: '#6b7280', marginTop: 4 },
  metaRow: { flexDirection: 'row', gap: 12, marginTop: 6 },
  metaItem: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  metaText: { fontSize: 11, color: '#9ca3af' },
  empty: { alignItems: 'center', paddingTop: 60 },
  emptyText: { fontSize: 14, color: '#9ca3af', marginTop: 12 },
});

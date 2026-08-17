/* eslint-disable @typescript-eslint/no-require-imports */
import React, { useState } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, RefreshControl } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { router } from 'expo-router';
import apiClient from '../../lib/api-client';
import { usePaginatedList } from '../../hooks/use-api';
import { useRefresh } from '../../hooks/use-refresh';
import { LoadingView, FilterChips, SearchBar } from '../../components/ui/shared';
import { BackButton } from '../../components/ui/shared';

interface Training {
  id: string;
  hariTanggal: string;
  lokasi?: string;
  jenisMateri?: string;
  hasilLatihanGlobal?: string;
  ranting?: { nama: string };
  pelatih?: { id: string; namaLengkap: string };
}

const MATERI_FILTERS = [
  { value: '', label: 'Semua' },
  { value: 'teknik_dasar', label: 'Teknik Dasar' },
  { value: 'kata', label: 'Kata' },
  { value: 'kumite', label: 'Kumite' },
  { value: 'fisik', label: 'Fisik' },
  { value: 'teori', label: 'Teori' },
];

export default function TrainingsScreen() {
  const [search, setSearch] = useState('');
  const [filterMateri, setFilterMateri] = useState('');

  const {
    data: trainings,
    loading,
    refetch,
  } = usePaginatedList<Training>(() => {
    const params: Record<string, unknown> = { limit: 50 };
    if (search.trim()) params.search = search.trim();
    if (filterMateri) params.jenisMateri = filterMateri;
    return apiClient.get('/trainings', { params }).then((r) => r.data);
  }, [search, filterMateri]);

  const { refreshing, onRefresh } = useRefresh(refetch);

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr);
    const days = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
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
    return `${days[d.getDay()]}, ${d.getDate()} ${months[d.getMonth()]} ${d.getFullYear()}`;
  };

  if (loading) return <LoadingView message="Memuat latihan..." />;

  return (
    <View style={styles.container}>
      <BackButton />
      <View style={styles.header}>
        <View style={{ flex: 1 }}>
          <Text style={styles.headerTitle}>Latihan</Text>
          <Text style={styles.headerSub}>{trainings.length} sesi latihan</Text>
        </View>
        <TouchableOpacity
          style={styles.addBtn}
          activeOpacity={0.7}
          onPress={() => router.push('/trainings/create')}
        >
          <Ionicons name="add" size={22} color="#fff" />
        </TouchableOpacity>
      </View>

      <SearchBar value={search} onChangeText={setSearch} placeholder="Cari latihan..." />

      <FilterChips
        options={MATERI_FILTERS}
        selected={filterMateri}
        onChange={(v) => {
          setFilterMateri(v);
        }}
      />

      <FlatList
        data={trainings}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ padding: 16 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Ionicons name="fitness" size={48} color="#d1d5db" />
            <Text style={styles.emptyText}>
              {search || filterMateri ? 'Tidak ada latihan yang cocok' : 'Belum ada data latihan'}
            </Text>
          </View>
        }
        renderItem={({ item }) => (
          <TouchableOpacity
            style={styles.card}
            activeOpacity={0.7}
            onPress={() => {
              const { router: r } = require('expo-router');
              r.push(`/trainings/${item.id}`);
            }}
          >
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
  header: { backgroundColor: '#2563eb', padding: 24, paddingTop: 60, paddingBottom: 20, flexDirection: 'row', alignItems: 'center' },
  addBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: 'rgba(255,255,255,0.2)', alignItems: 'center', justifyContent: 'center' },
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
  cardLeft: { marginRight: 12 },
  iconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#eff6ff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardBody: { flex: 1 },
  materi: { fontSize: 15, fontWeight: '600', color: '#111827' },
  date: { fontSize: 12, color: '#6b7280', marginTop: 4 },
  metaRow: { flexDirection: 'row', gap: 12, marginTop: 6 },
  metaItem: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  metaText: { fontSize: 11, color: '#9ca3af' },
  empty: { alignItems: 'center', paddingTop: 60 },
  emptyText: { fontSize: 14, color: '#9ca3af', marginTop: 12 },
});

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  TextInput,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import apiClient, { unwrap } from '../../lib/api-client';
import { useApi } from '../../hooks/use-api';
import { LoadingView, FilterChips } from '../../components/ui/shared';

type LetterTab = 'incoming' | 'outgoing';

interface BaseLetter {
  id: string;
  nomorSurat: string;
  perihal: string;
  tanggalSurat: string;
  status: string;
}

interface IncomingLetter extends BaseLetter {
  pengirim: string;
}

interface OutgoingLetter extends BaseLetter {
  tujuan: string;
}

const STATUS_STYLES: Record<string, { label: string; bg: string; color: string }> = {
  draft: { label: 'Draft', bg: '#f3f4f6', color: '#6b7280' },
  diterima: { label: 'Diterima', bg: '#eff6ff', color: '#2563eb' },
  diproses: { label: 'Diproses', bg: '#fef3c7', color: '#d97706' },
  terkirim: { label: 'Terkirim', bg: '#ecfdf5', color: '#16a34a' },
  diarsipkan: { label: 'Diarsipkan', bg: '#f3f4f6', color: '#6b7280' },
};

const STATUS_FILTERS = [
  { value: '', label: 'Semua' },
  { value: 'diterima', label: 'Diterima' },
  { value: 'diproses', label: 'Diproses' },
  { value: 'terkirim', label: 'Terkirim' },
  { value: 'draft', label: 'Draft' },
];

export default function LettersScreen() {
  const [tab, setTab] = useState<LetterTab>('incoming');
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('');

  const { data: incoming, loading: loadingIncoming, refetch: refetchIncoming } = useApi<IncomingLetter[]>(
    () => apiClient.get('/letters/incoming', { params: { limit: 50, search: search.trim() || undefined, status: filterStatus || undefined } }).then(unwrap).then(d => d || []),
    [search, filterStatus]
  );

  const { data: outgoing, loading: loadingOutgoing, refetch: refetchOutgoing } = useApi<OutgoingLetter[]>(
    () => apiClient.get('/letters/outgoing', { params: { limit: 50, search: search.trim() || undefined, status: filterStatus || undefined } }).then(unwrap).then(d => d || []),
    [search, filterStatus]
  );

  const loading = tab === 'incoming' ? loadingIncoming : loadingOutgoing;
  const refetch = tab === 'incoming' ? refetchIncoming : refetchOutgoing;
  const currentData = (tab === 'incoming' ? incoming : outgoing) || [];

  const onRefresh = async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('id-ID', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  };

  if (loading) return <LoadingView message="Memuat surat..." />;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Surat</Text>
        <Text style={styles.headerSub}>{currentData.length} surat</Text>
      </View>

      {/* Search */}
      <View style={styles.searchContainer}>
        <Ionicons name="search" size={16} color="#9ca3af" />
        <TextInput
          style={styles.searchInput}
          placeholder="Cari surat..."
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

      {/* Status Filter Chips */}
      <FilterChips options={STATUS_FILTERS} selected={filterStatus} onChange={setFilterStatus} />

      {/* Tab Selector */}
      <View style={styles.tabContainer}>
        <TouchableOpacity
          style={[styles.tab, tab === 'incoming' && styles.tabActive]}
          onPress={() => {
            setTab('incoming');
            setLoading(true);
          }}
        >
          <Ionicons name="mail-open" size={16} color={tab === 'incoming' ? '#fff' : '#6b7280'} />
          <Text style={[styles.tabText, tab === 'incoming' && styles.tabTextActive]}>Masuk</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, tab === 'outgoing' && styles.tabActive]}
          onPress={() => {
            setTab('outgoing');
            setLoading(true);
          }}
        >
          <Ionicons name="mail" size={16} color={tab === 'outgoing' ? '#fff' : '#6b7280'} />
          <Text style={[styles.tabText, tab === 'outgoing' && styles.tabTextActive]}>Keluar</Text>
        </TouchableOpacity>
      </View>

      <FlatList<IncomingLetter | OutgoingLetter>
        data={currentData}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ padding: 16 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Ionicons name="mail" size={48} color="#d1d5db" />
            <Text style={styles.emptyText}>
              Belum ada surat {tab === 'incoming' ? 'masuk' : 'keluar'}
            </Text>
          </View>
        }
        renderItem={({ item }) => {
          const s = STATUS_STYLES[item.status] || {
            label: item.status,
            bg: '#f3f4f6',
            color: '#6b7280',
          };
          return (
            <TouchableOpacity
              style={styles.card}
              activeOpacity={0.7}
              onPress={() => router.push(`/letters/${item.id}?type=${tab}` as never)}
            >
              <View style={styles.cardTop}>
                <View style={styles.iconCircle}>
                  <Ionicons name="document-text" size={18} color="#2563eb" />
                </View>
                <View style={styles.cardBody}>
                  <Text style={styles.perihal} numberOfLines={1}>
                    {item.perihal}
                  </Text>
                  <Text style={styles.nomorSurat}>{item.nomorSurat}</Text>
                  <Text style={styles.partner}>
                    {tab === 'incoming'
                      ? `Dari: ${(item as IncomingLetter).pengirim}`
                      : `Kepada: ${(item as OutgoingLetter).tujuan}`}
                  </Text>
                </View>
                <View style={[styles.statusBadge, { backgroundColor: s.bg }]}>
                  <Text style={[styles.statusText, { color: s.color }]}>{s.label}</Text>
                </View>
              </View>
              <Text style={styles.date}>{formatDate(item.tanggalSurat)}</Text>
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
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: '#e5e7eb',
    margin: 16,
    marginBottom: 0,
    borderRadius: 10,
    padding: 3,
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  tabActive: { backgroundColor: '#2563eb' },
  tabText: { fontSize: 13, fontWeight: '600', color: '#6b7280' },
  tabTextActive: { color: '#fff' },
  card: {
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
  cardTop: { flexDirection: 'row', alignItems: 'center' },
  iconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#eff6ff',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  cardBody: { flex: 1 },
  perihal: { fontSize: 14, fontWeight: '600', color: '#111827' },
  nomorSurat: { fontSize: 11, color: '#6b7280', marginTop: 2 },
  partner: { fontSize: 11, color: '#9ca3af', marginTop: 1 },

  statusBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 10, marginLeft: 8 },
  statusText: { fontSize: 11, fontWeight: '600' },
  date: { fontSize: 11, color: '#9ca3af', marginTop: 8 },
  empty: { alignItems: 'center', paddingTop: 60 },
  emptyText: { fontSize: 14, color: '#9ca3af', marginTop: 12 },
});

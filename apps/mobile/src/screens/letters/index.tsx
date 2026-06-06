import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, FlatList, ActivityIndicator, TouchableOpacity, RefreshControl } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import apiClient from '../../lib/api-client';

type LetterTab = 'incoming' | 'outgoing';

interface IncomingLetter {
  id: string;
  nomorSurat: string;
  pengirim: string;
  perihal: string;
  tanggalSurat: string;
  status: string;
}

interface OutgoingLetter {
  id: string;
  nomorSurat: string;
  tujuan: string;
  perihal: string;
  tanggalSurat: string;
  status: string;
}

const STATUS_STYLES: Record<string, { label: string; bg: string; color: string }> = {
  draft: { label: 'Draft', bg: '#f3f4f6', color: '#6b7280' },
  diterima: { label: 'Diterima', bg: '#eff6ff', color: '#2563eb' },
  diproses: { label: 'Diproses', bg: '#fef3c7', color: '#d97706' },
  terkirim: { label: 'Terkirim', bg: '#ecfdf5', color: '#16a34a' },
  diarsipkan: { label: 'Diarsipkan', bg: '#f3f4f6', color: '#6b7280' },
};

export default function LettersScreen() {
  const [tab, setTab] = useState<LetterTab>('incoming');
  const [incoming, setIncoming] = useState<IncomingLetter[]>([]);
  const [outgoing, setOutgoing] = useState<OutgoingLetter[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => { fetchData(); }, [tab]);

  const fetchData = async () => {
    try {
      if (tab === 'incoming') {
        const res = await apiClient.get('/letters/incoming', { params: { limit: 50 } });
        setIncoming(res.data.data || []);
      } else {
        const res = await apiClient.get('/letters/outgoing', { params: { limit: 50 } });
        setOutgoing(res.data.data || []);
      }
    } catch { /* ignore */ }
    setLoading(false);
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchData();
    setRefreshing(false);
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' });
  };

  const currentData = tab === 'incoming' ? incoming : outgoing;

  if (loading) return <View style={styles.center}><ActivityIndicator size="large" color="#2563eb" /></View>;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Surat</Text>
        <Text style={styles.headerSub}>{currentData.length} surat</Text>
      </View>

      {/* Tab Selector */}
      <View style={styles.tabContainer}>
        <TouchableOpacity
          style={[styles.tab, tab === 'incoming' && styles.tabActive]}
          onPress={() => { setTab('incoming'); setLoading(true); }}
        >
          <Ionicons name="mail-open" size={16} color={tab === 'incoming' ? '#fff' : '#6b7280'} />
          <Text style={[styles.tabText, tab === 'incoming' && styles.tabTextActive]}>Masuk</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, tab === 'outgoing' && styles.tabActive]}
          onPress={() => { setTab('outgoing'); setLoading(true); }}
        >
          <Ionicons name="mail" size={16} color={tab === 'outgoing' ? '#fff' : '#6b7280'} />
          <Text style={[styles.tabText, tab === 'outgoing' && styles.tabTextActive]}>Keluar</Text>
        </TouchableOpacity>
      </View>

      <FlatList
        data={currentData}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ padding: 16 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Ionicons name="mail" size={48} color="#d1d5db" />
            <Text style={styles.emptyText}>Belum ada surat {tab === 'incoming' ? 'masuk' : 'keluar'}</Text>
          </View>
        }
        renderItem={({ item }) => {
          const s = STATUS_STYLES[item.status] || { label: item.status, bg: '#f3f4f6', color: '#6b7280' };
          return (
            <TouchableOpacity style={styles.card} activeOpacity={0.7}>
              <View style={styles.cardTop}>
                <View style={styles.iconCircle}>
                  <Ionicons name="document-text" size={18} color="#2563eb" />
                </View>
                <View style={styles.cardBody}>
                  <Text style={styles.perihal} numberOfLines={1}>{item.perihal}</Text>
                  <Text style={styles.nomorSurat}>{item.nomorSurat}</Text>
                  <Text style={styles.partner}>
                    {tab === 'incoming' ? `Dari: ${(item as any).pengirim}` : `Kepada: ${(item as any).tujuan}`}
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
  tabContainer: { flexDirection: 'row', backgroundColor: '#e5e7eb', margin: 16, marginBottom: 0, borderRadius: 10, padding: 3 },
  tab: { flex: 1, flexDirection: 'row', paddingVertical: 10, borderRadius: 8, alignItems: 'center', justifyContent: 'center', gap: 6 },
  tabActive: { backgroundColor: '#2563eb' },
  tabText: { fontSize: 13, fontWeight: '600', color: '#6b7280' },
  tabTextActive: { color: '#fff' },
  card: {
    backgroundColor: '#fff', borderRadius: 14, padding: 14, marginBottom: 8,
    borderWidth: 1, borderColor: '#f3f4f6',
    shadowColor: '#000', shadowOpacity: 0.03, shadowRadius: 4, elevation: 1,
  },
  cardTop: { flexDirection: 'row', alignItems: 'center' },
  iconCircle: { width: 36, height: 36, borderRadius: 18, backgroundColor: '#eff6ff', alignItems: 'center', justifyContent: 'center', marginRight: 10 },
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

import React, { useState } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, RefreshControl, TextInput, Alert } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Ionicons from '@expo/vector-icons/Ionicons';
import { router } from 'expo-router';
import apiClient, { unwrap } from '../../lib/api-client';
import { useApi } from '../../hooks/use-api';
import { useRefresh } from '../../hooks/use-refresh';
import { LoadingView, FilterChips } from '../../components/ui/shared';
import { BackButton } from '../../components/ui/shared';
import { theme } from '../../theme';

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
  draft: { label: 'Draft', bg: theme.colors.surfaceMuted, color: theme.colors.textSecondary },
  diterima: { label: 'Diterima', bg: theme.colors.primarySofter, color: theme.colors.primary },
  diproses: { label: 'Diproses', bg: theme.colors.warningLight, color: theme.colors.warning },
  terkirim: { label: 'Terkirim', bg: theme.colors.successLight, color: theme.colors.success },
  diarsipkan: { label: 'Diarsipkan', bg: theme.colors.surfaceMuted, color: theme.colors.textSecondary },
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
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('');

  const {
    data: incoming,
    loading: loadingIncoming,
    refetch: refetchIncoming,
  } = useApi<IncomingLetter[]>(
    () =>
      apiClient
        .get('/letters/incoming', {
          params: {
            limit: 50,
            search: search.trim() || undefined,
            status: filterStatus || undefined,
          },
        })
        .then((r) => (unwrap(r) ?? []) as IncomingLetter[]),
    [search, filterStatus],
  );

  const {
    data: outgoing,
    loading: loadingOutgoing,
    refetch: refetchOutgoing,
  } = useApi<OutgoingLetter[]>(
    () =>
      apiClient
        .get('/letters/outgoing', {
          params: {
            limit: 50,
            search: search.trim() || undefined,
            status: filterStatus || undefined,
          },
        })
        .then((r) => (unwrap(r) ?? []) as OutgoingLetter[]),
    [search, filterStatus],
  );

  const loading = tab === 'incoming' ? loadingIncoming : loadingOutgoing;
  const refetch = tab === 'incoming' ? refetchIncoming : refetchOutgoing;
  const currentData = (tab === 'incoming' ? incoming : outgoing) || [];

  const { refreshing, onRefresh } = useRefresh(refetch);

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('id-ID', {
      day: '2-digit',
      month: 'long',
      year: 'numeric',
    });
  };

  const insets = useSafeAreaInsets();

  if (loading) return <LoadingView message="Memuat surat..." />;

  return (
    <View style={styles.container}>
      <BackButton />
      <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
        <View style={{ flex: 1 }}>
          <Text style={styles.headerTitle}>Surat</Text>
          <Text style={styles.headerSub}>{currentData.length} surat</Text>
        </View>
        <TouchableOpacity
          style={styles.addBtn}
          activeOpacity={0.7}
          onPress={() => Alert.alert('Belum Tersedia', 'Fitur pembuatan surat sedang dalam pengembangan.')}
        >
          <Ionicons name="add" size={22} color={theme.colors.surface} />
        </TouchableOpacity>
      </View>

      {/* Search */}
      <View style={styles.searchContainer}>
        <Ionicons name="search" size={16} color={theme.colors.textMuted} />
        <TextInput
          style={styles.searchInput}
          placeholder="Cari surat..."
          placeholderTextColor={theme.colors.textMuted}
          value={search}
          onChangeText={setSearch}
        />
        {search.length > 0 && (
          <TouchableOpacity onPress={() => setSearch('')}>
            <Ionicons name="close-circle" size={16} color={theme.colors.textMuted} />
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
          }}
        >
          <Ionicons name="mail-open" size={16} color={tab === 'incoming' ? theme.colors.surface : theme.colors.textSecondary} />
          <Text style={[styles.tabText, tab === 'incoming' && styles.tabTextActive]}>Masuk</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, tab === 'outgoing' && styles.tabActive]}
          onPress={() => {
            setTab('outgoing');
          }}
        >
          <Ionicons name="mail" size={16} color={tab === 'outgoing' ? theme.colors.surface : theme.colors.textSecondary} />
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
            <Ionicons name="mail" size={48} color={theme.colors.borderStrong} />
            <Text style={styles.emptyText}>
              Belum ada surat {tab === 'incoming' ? 'masuk' : 'keluar'}
            </Text>
          </View>
        }
        renderItem={({ item }) => {
          const s = STATUS_STYLES[item.status] || {
            label: item.status,
            bg: theme.colors.surfaceMuted,
            color: theme.colors.textSecondary,
          };
          return (
            <TouchableOpacity
              style={styles.card}
              activeOpacity={0.7}
              onPress={() => router.push(`/letters/${item.id}?type=${tab}` as never)}
            >
              <View style={styles.cardTop}>
                <View style={styles.iconCircle}>
                  <Ionicons name="document-text" size={18} color={theme.colors.primary} />
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
  container: { flex: 1, backgroundColor: theme.colors.surfaceMuted },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: theme.colors.surfaceMuted },
  header: { backgroundColor: theme.colors.primary, padding: 24, paddingBottom: 20, flexDirection: 'row', alignItems: 'center' },
  addBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: 'rgba(255,255,255,0.2)', alignItems: 'center', justifyContent: 'center', position: 'absolute', right: 24, top: 60 },
  headerTitle: { color: theme.colors.surface, fontSize: 22, fontWeight: '700' },
  headerSub: { color: theme.colors.headerSub, fontSize: 13, marginTop: 4 },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.surface,
    margin: 16,
    marginBottom: 0,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: theme.colors.border,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  searchInput: { flex: 1, fontSize: 14, color: theme.colors.text, marginLeft: 8 },
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: theme.colors.border,
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
  tabActive: { backgroundColor: theme.colors.primary },
  tabText: { fontSize: 13, fontWeight: '600', color: theme.colors.textSecondary },
  tabTextActive: { color: theme.colors.surface },
  card: {
    backgroundColor: theme.colors.surface,
    borderRadius: 14,
    padding: 14,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: theme.colors.surfaceMuted,
    shadowColor: theme.colors.dark,
    shadowOpacity: 0.03,
    shadowRadius: 4,
    elevation: 1,
  },
  cardTop: { flexDirection: 'row', alignItems: 'center' },
  iconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: theme.colors.primarySofter,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  cardBody: { flex: 1 },
  perihal: { fontSize: 14, fontWeight: '600', color: theme.colors.text },
  nomorSurat: { fontSize: 11, color: theme.colors.textSecondary, marginTop: 2 },
  partner: { fontSize: 11, color: theme.colors.textMuted, marginTop: 1 },

  statusBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 10, marginLeft: 8 },
  statusText: { fontSize: 11, fontWeight: '600' },
  date: { fontSize: 11, color: theme.colors.textMuted, marginTop: 8 },
  empty: { alignItems: 'center', paddingTop: 60 },
  emptyText: { fontSize: 14, color: theme.colors.textMuted, marginTop: 12 },
});

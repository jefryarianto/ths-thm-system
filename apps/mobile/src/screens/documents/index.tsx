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
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Ionicons from '@expo/vector-icons/Ionicons';
import { router } from 'expo-router';
import { safeIconName } from '../../lib/icons';
import {
  useDocuments,
  TIPE_LABELS,
  TIPE_ICONS,
  STATUS_STYLES,
  TIPE_FILTERS,
} from '../../hooks/use-documents';
import { useRefresh } from '../../hooks/use-refresh';
import { LoadingView, FilterChips } from '../../components/ui/shared';
import { theme } from '../../theme';

export default function DocumentsScreen() {
  const [search, setSearch] = useState('');
  const [filterTipe, setFilterTipe] = useState('');

  const { data: documents, loading, refetch } = useDocuments(search, filterTipe);
  const { refreshing, onRefresh } = useRefresh(refetch);

  const insets = useSafeAreaInsets();

  if (loading) return <LoadingView message="Memuat dokumen..." />;

  return (
    <View style={styles.container}>
      <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
        <TouchableOpacity onPress={() => router.navigate('/(tabs)/home' as never)} style={{ padding: 4, marginRight: 8 }}>
          <Ionicons name="arrow-back" size={22} color={theme.colors.textOnPrimary} />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={styles.headerTitle}>Dokumen</Text>
          <Text style={styles.headerSub}>{(documents ?? []).length} dokumen</Text>
        </View>
      </View>

      {/* Search */}
      <View style={styles.searchContainer}>
        <Ionicons name="search" size={16} color={theme.colors.textMuted} />
        <TextInput
          style={styles.searchInput}
          placeholder="Cari dokumen..."
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

      <FilterChips options={TIPE_FILTERS} selected={filterTipe} onChange={setFilterTipe} />

      <FlatList
        data={documents}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ padding: 16 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Ionicons name="document-text" size={48} color={theme.colors.borderStrong} />
            <Text style={styles.emptyText}>
              {search || filterTipe ? 'Tidak ada dokumen yang cocok' : 'Belum ada dokumen'}
            </Text>
          </View>
        }
        renderItem={({ item }) => {
          const ss = STATUS_STYLES[item.status] || {
            label: item.status,
            color: theme.colors.textSecondary,
            bg: theme.colors.surfaceMuted,
          };
          const iconName = TIPE_ICONS[item.tipe] || 'document-text';
          const tipeLabel = TIPE_LABELS[item.tipe] || item.tipe;
          return (
            <TouchableOpacity
              style={styles.card}
              onPress={() => router.push(`/documents/${item.id}` as any)}
              activeOpacity={0.7}
            >
              <View style={styles.iconCircle}>
                <Ionicons name={safeIconName(iconName)} size={22} color={theme.colors.primary} />
              </View>
              <View style={styles.cardInfo}>
                <Text style={styles.cardTitle}>{tipeLabel}</Text>
                <Text style={styles.cardMember}>{item.anggota?.namaLengkap || '-'}</Text>
                <Text style={styles.cardDate}>
                  {item.createdAt ? new Date(item.createdAt).toLocaleDateString('id-ID', { day: '2-digit', month: 'long', year: 'numeric' }) : '-'}
                </Text>
              </View>
              <View style={styles.cardRight}>
                <View style={[styles.statusBadge, { backgroundColor: ss.bg }]}>
                  <Text style={[styles.statusText, { color: ss.color }]}>{ss.label}</Text>
                </View>
                <Ionicons
                  name={item.filePath ? 'download-outline' : 'time-outline'}
                  size={18}
                  color={item.filePath ? theme.colors.primary : theme.colors.textMuted}
                  style={{ marginTop: 6 }}
                />
              </View>
            </TouchableOpacity>
          );
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.background },
  header: { backgroundColor: theme.colors.header, padding: 24, paddingBottom: 20 },
  headerTitle: { color: theme.colors.textOnPrimary, fontSize: theme.typography.size.xxl - 2, fontWeight: theme.typography.weight.bold },
  headerSub: { color: theme.colors.headerSub, fontSize: 13, marginTop: 4 },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.surface,
    margin: 16,
    marginBottom: 0,
    borderRadius: theme.radius.md - 2,
    borderWidth: 1,
    borderColor: theme.colors.border,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  searchInput: { flex: 1, fontSize: 14, color: theme.colors.text, marginLeft: 8 },

  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.lg - 2,
    padding: 14,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: theme.colors.surfaceMuted,
    ...theme.shadow.card,
  },
  iconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: theme.colors.primarySofter,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  cardInfo: { flex: 1 },
  cardTitle: { fontSize: 14, fontWeight: theme.typography.weight.semibold, color: theme.colors.text },
  cardMember: { fontSize: 11, color: theme.colors.textSecondary, marginTop: 2 },
  cardDate: { fontSize: 11, color: theme.colors.textMuted, marginTop: 1 },
  cardRight: { alignItems: 'center', marginLeft: 8 },
  statusBadge: { paddingHorizontal: 10, paddingVertical: 3, borderRadius: 8 },
  statusText: { fontSize: 10, fontWeight: theme.typography.weight.semibold },
  empty: { alignItems: 'center', paddingTop: 60 },
  emptyText: { fontSize: 14, color: theme.colors.textMuted, marginTop: 12 },
});

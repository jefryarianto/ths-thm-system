import React, { useState } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, RefreshControl } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useCandidates, STATUS_STYLES, STATUS_FILTERS } from '../../hooks/use-candidates';
import { useRefresh } from '../../hooks/use-refresh';
import { LoadingView, FilterChips, SearchBar } from '../../components/ui/shared';
import { BackButton } from '../../components/ui/shared';
import { theme } from '../../theme';

export default function CandidatesScreen() {
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('');

  const { data: candidates, loading, refetch } = useCandidates(search, filterStatus);
  const { refreshing, onRefresh } = useRefresh(refetch);

  const insets = useSafeAreaInsets();

  if (loading) return <LoadingView message="Memuat calon anggota..." />;

  return (
    <View style={styles.container}>
      <BackButton />
      <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
        <Text style={styles.headerTitle}>Calon Anggota</Text>
        <Text style={styles.headerSub}>{(candidates ?? []).length} calon</Text>
      </View>

      <SearchBar value={search} onChangeText={setSearch} placeholder="Cari calon anggota..." />

      <FilterChips options={STATUS_FILTERS} selected={filterStatus} onChange={setFilterStatus} />

      <FlatList
        data={candidates}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ padding: 16 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Ionicons name="people" size={48} color={theme.colors.borderStrong} />
            <Text style={styles.emptyText}>Belum ada calon anggota</Text>
          </View>
        }
        renderItem={({ item }) => {
          const ss = STATUS_STYLES[item.status] || {
            label: item.status,
            bg: theme.colors.surfaceMuted,
            color: theme.colors.textSecondary,
          };
          return (
            <TouchableOpacity
              style={styles.card}
              activeOpacity={0.7}
              onPress={() => {
                const { router: r } = require('expo-router');
                r.push(`/candidates/${item.id}`);
              }}
            >
              <View style={styles.avatar}>
                <Text style={styles.avatarText}>{item.namaLengkap.charAt(0)}</Text>
              </View>
              <View style={styles.cardBody}>
                <Text style={styles.name}>{item.namaLengkap}</Text>
                {item.ranting && (
                  <View style={styles.metaItem}>
                    <Ionicons name="location" size={11} color={theme.colors.textMuted} />
                    <Text style={styles.metaText}>{item.ranting.nama}</Text>
                  </View>
                )}
                <Text style={styles.date}>
                  {new Date(item.createdAt).toLocaleDateString('id-ID', {
                    day: '2-digit',
                    month: 'long',
                    year: 'numeric',
                  })}
                </Text>
              </View>
              <View style={[styles.statusBadge, { backgroundColor: ss.bg }]}>
                <Text style={[styles.statusText, { color: ss.color }]}>{ss.label}</Text>
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
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: theme.colors.primarySofter,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  avatarText: { fontSize: 16, fontWeight: theme.typography.weight.bold, color: theme.colors.primary },
  cardBody: { flex: 1 },
  name: { fontSize: 15, fontWeight: theme.typography.weight.semibold, color: theme.colors.text },
  metaItem: { flexDirection: 'row', alignItems: 'center', gap: 3, marginTop: 3 },
  metaText: { fontSize: 12, color: theme.colors.textSecondary },
  date: { fontSize: 11, color: theme.colors.textMuted, marginTop: 2 },
  statusBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 10, marginLeft: 8 },
  statusText: { fontSize: 11, fontWeight: theme.typography.weight.semibold },
  empty: { alignItems: 'center', paddingTop: 60 },
  emptyText: { fontSize: 14, color: theme.colors.textMuted, marginTop: 12 },
});

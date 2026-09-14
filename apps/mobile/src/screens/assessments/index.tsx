import React, { useState } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, RefreshControl } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Ionicons from '@expo/vector-icons/Ionicons';
import { router } from 'expo-router';
import { useRefresh } from '../../hooks/use-refresh';
import { useRole } from '../../hooks/use-role';
import { LoadingView, FilterChips } from '../../components/ui/shared';
import apiClient, { unwrap } from '../../lib/api-client';
import { BackButton } from '../../components/ui/shared';
import { theme } from '../../theme';
import type { AssessmentsAspect } from '../../types';

const FILTERS = [
  { value: '', label: 'Semua' },
  { value: 'aktif', label: 'Aktif' },
  { value: 'arsip', label: 'Arsip' },
];

export default function AssessmentsScreen() {
  const [filter, setFilter] = useState('');
  const { hasMinRole } = useRole();
  const [assessments, setAssessments] = useState<AssessmentsAspect[]>([]);
  const [loading, setLoading] = useState(true);

  const refetch = async () => {
    setLoading(true);
    try {
      const res = await apiClient.get('/assessments/aspects', { params: { limit: 100 } });
      const list = (unwrap(res) ?? []) as AssessmentsAspect[];
      setAssessments(list);
    } catch {
      /* ignore */
    }
    setLoading(false);
  };

  React.useEffect(() => {
    refetch();
  }, []);

  const { refreshing, onRefresh } = useRefresh(refetch);

  const insets = useSafeAreaInsets();

  const visible = assessments.filter((a) => {
    if (filter === 'aktif') return a.isActive !== false;
    if (filter === 'arsip') return a.isActive === false;
    return true;
  });

  if (loading) return <LoadingView message="Memuat aspek penilaian..." />;

  return (
    <View style={styles.container}>
      <BackButton />
      <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
        <View style={styles.headerRow}>
          <View>
            <Text style={styles.headerTitle}>Aspek Penilaian</Text>
            <Text style={styles.headerSub}>{visible.length} aspek</Text>
          </View>
          <View style={styles.headerActions}>
            {hasMinRole('admin_kegiatan') && (
              <TouchableOpacity
                style={styles.addBtn}
                onPress={() => router.push('/assessments/create' as any)}
                activeOpacity={0.8}
                accessibilityLabel="Buat aspek penilaian"
              >
                <Ionicons name="add" size={20} color={theme.colors.surface} />
                <Text style={styles.addText}>Buat</Text>
              </TouchableOpacity>
            )}
            <Ionicons name="clipboard" size={28} color={theme.colors.headerSub} />
          </View>
        </View>
      </View>

      <FilterChips options={FILTERS} selected={filter} onChange={setFilter} />

      <FlatList
        data={visible}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ padding: 16 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Ionicons name="clipboard" size={48} color={theme.colors.borderStrong} />
            <Text style={styles.emptyText}>Belum ada aspek penilaian</Text>
          </View>
        }
        renderItem={({ item }) => (
          <TouchableOpacity
            style={styles.card}
            activeOpacity={0.7}
            onPress={() => router.push(`/assessments/${item.id}` as any)}
          >
            <View style={styles.iconCircle}>
              <Ionicons name="clipboard" size={20} color={theme.colors.primary} />
            </View>
            <View style={styles.cardBody}>
              <Text style={styles.kode}>{item.kodeAspek}</Text>
              <Text style={styles.name} numberOfLines={1}>
                {item.namaAspek}
              </Text>
              <Text style={styles.meta}>
                Bobot: {Number(item.bobot)}% · {item.itemPenilaian?.length ?? 0} item
              </Text>
            </View>
            {item.isActive === false && (
              <View style={styles.archivedBadge}>
                <Text style={styles.archivedText}>Arsip</Text>
              </View>
            )}
            <Ionicons name="chevron-forward" size={18} color={theme.colors.textMuted} />
          </TouchableOpacity>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.surfaceMuted },
  header: { backgroundColor: theme.colors.primary, padding: 24, paddingBottom: 20 },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  headerActions: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  addBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(255,255,255,0.18)',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 7,
  },
  addText: { color: theme.colors.surface, fontSize: 13, fontWeight: '700' },
  headerTitle: { color: theme.colors.surface, fontSize: 22, fontWeight: '700' },
  headerSub: { color: theme.colors.headerSub, fontSize: 13, marginTop: 4 },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.surface,
    borderRadius: 14,
    padding: 14,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: theme.colors.surfaceMuted,
  },
  iconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: theme.colors.primarySofter,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  cardBody: { flex: 1 },
  kode: { fontSize: 11, fontWeight: '700', color: theme.colors.primary, textTransform: 'uppercase' },
  name: { fontSize: 15, fontWeight: '600', color: theme.colors.text, marginTop: 1 },
  meta: { fontSize: 12, color: theme.colors.textSecondary, marginTop: 2 },
  archivedBadge: {
    backgroundColor: theme.colors.warningLight,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    marginRight: 6,
  },
  archivedText: { fontSize: 10, fontWeight: '600', color: theme.colors.warning },
  empty: { alignItems: 'center', paddingTop: 60 },
  emptyText: { fontSize: 14, color: theme.colors.textMuted, marginTop: 12 },
});
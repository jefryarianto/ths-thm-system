import React, { useState } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, RefreshControl, Alert } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useApi } from '../../hooks/use-api';
import { useRefresh } from '../../hooks/use-refresh';
import { LoadingView, FilterChips } from '../../components/ui/shared';
import apiClient, { unwrap } from '../../lib/api-client';
import { BackButton } from '../../components/ui/shared';
import { theme } from '../../theme';

interface AssessmentItem {
  id: string;
  nama: string;
  keterangan?: string;
  bobot: number;
  createdAt: string;
}

const FILTERS = [
  { value: '', label: 'Semua' },
  { value: 'aktif', label: 'Aktif' },
  { value: 'arsip', label: 'Arsip' },
];

export default function AssessmentsScreen() {
  const [filter, setFilter] = useState('');
  const {
    data: assessments,
    loading,
    refetch,
  } = useApi<AssessmentItem[]>(() =>
    apiClient.get('/assessments/aspects').then((r) => (unwrap(r) ?? []) as AssessmentItem[]),
    [],
  );

  const { refreshing, onRefresh } = useRefresh(refetch);

  const insets = useSafeAreaInsets();

  if (loading) return <LoadingView message="Memuat aspek penilaian..." />;

  return (
    <View style={styles.container}>
      <BackButton />
      <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
        <View style={{ flex: 1 }}>
          <Text style={styles.headerTitle}>Aspek Penilaian</Text>
          <Text style={styles.headerSub}>{(assessments ?? []).length} aspek</Text>
        </View>
        <TouchableOpacity
          style={styles.addBtn}
          activeOpacity={0.7}
          onPress={() => Alert.alert('Belum Tersedia', 'Fitur pembuatan aspek penilaian sedang dalam pengembangan.')}
        >
          <Ionicons name="add" size={22} color={theme.colors.surface} />
        </TouchableOpacity>
      </View>

      <FilterChips options={FILTERS} selected={filter} onChange={setFilter} />

      <FlatList
        data={assessments}
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
          <View style={styles.card}>
            <View style={styles.iconCircle}>
              <Ionicons name="clipboard" size={20} color={theme.colors.primary} />
            </View>
            <View style={styles.cardBody}>
              <Text style={styles.name}>{item.nama}</Text>
              <Text style={styles.meta}>Bobot: {item.bobot}%</Text>
            </View>
          </View>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.background },
  header: {
    backgroundColor: theme.colors.header,
    padding: 24,
    paddingBottom: 20,
    flexDirection: 'row',
    alignItems: 'center',
  },
  addBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'absolute',
    right: 24,
    top: 60,
  },
  headerTitle: {
    color: theme.colors.textOnPrimary,
    fontSize: theme.typography.size.xxl - 2,
    fontWeight: theme.typography.weight.bold,
  },
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
  name: { fontSize: 15, fontWeight: theme.typography.weight.semibold, color: theme.colors.text },
  meta: { fontSize: 12, color: theme.colors.textSecondary, marginTop: 2 },
  empty: { alignItems: 'center', paddingTop: 60 },
  emptyText: { fontSize: 14, color: theme.colors.textMuted, marginTop: 12 },
});
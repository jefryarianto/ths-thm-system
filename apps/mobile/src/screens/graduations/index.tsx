import React, { useState } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, RefreshControl } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Ionicons from '@expo/vector-icons/Ionicons';
import { router } from 'expo-router';
import { safeIconName } from '../../lib/icons';
import { useGraduations, STATUS_STYLES, FILTERS } from '../../hooks/use-graduations';
import { useRefresh } from '../../hooks/use-refresh';
import { LoadingView, FilterChips, SearchBar } from '../../components/ui/shared';
import { BackButton } from '../../components/ui/shared';
import { theme } from '../../theme';

const months = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];

export default function GraduationsScreen() {
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('');

  const { data, loading, refetch } = useGraduations(search, filterStatus);
  const { refreshing, onRefresh } = useRefresh(refetch);

  const insets = useSafeAreaInsets();

  if (loading) return <LoadingView message="Memuat pendadaran..." />;

  return (
    <View style={styles.container}>
      <BackButton />
      <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
        <View style={styles.headerRow}>
          <View>
            <Text style={styles.headerTitle}>Pendadaran</Text>
            <Text style={styles.headerSub}>{(data ?? []).length} ujian</Text>
          </View>
          <Ionicons name="school" size={28} color={theme.colors.headerSub} />
        </View>
      </View>

      <SearchBar value={search} onChangeText={setSearch} placeholder="Cari pendadaran..." />

      <FilterChips options={FILTERS} selected={filterStatus} onChange={setFilterStatus} />

      <FlatList
        data={data}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ padding: 16 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Ionicons name="school" size={48} color={theme.colors.borderStrong} />
            <Text style={styles.emptyText}>
              {search || filterStatus ? 'Tidak ada pendadaran yang cocok' : 'Belum ada pendadaran'}
            </Text>
          </View>
        }
        renderItem={({ item }) => {
          const ss = STATUS_STYLES[item.status] || {
            label: item.status,
            icon: 'ellipse',
            bg: theme.colors.surfaceMuted,
            color: theme.colors.textSecondary,
          };
          const d = new Date(item.tanggalMulai);
          return (
            <TouchableOpacity
              style={styles.card}
              activeOpacity={0.7}
              onPress={() => router.push(`/graduations/${item.id}` as any)}
            >
              <View style={styles.dateBox}>
                <Text style={styles.dateDay}>{d.getDate()}</Text>
                <Text style={styles.dateMonth}>{months[d.getMonth()]}</Text>
                <Text style={styles.dateYear}>{d.getFullYear()}</Text>
              </View>
              <View style={styles.cardBody}>
                <Text style={styles.title} numberOfLines={1}>
                  {item.nama}
                </Text>
                {item.lokasi && (
                  <View style={styles.metaRow}>
                    <Ionicons name="location" size={13} color={theme.colors.textMuted} />
                    <Text style={styles.metaText}>{item.lokasi}</Text>
                  </View>
                )}
                {item.tanggalSelesai && (
                  <View style={styles.metaRow}>
                    <Ionicons name="time" size={13} color={theme.colors.textMuted} />
                    <Text style={styles.metaText}>
                      Selesai: {new Date(item.tanggalSelesai).toLocaleDateString('id-ID', { day: '2-digit', month: 'long', year: 'numeric' })}
                    </Text>
                  </View>
                )}
              </View>
              <View style={[styles.statusBadge, { backgroundColor: ss.bg }]}>
                <Ionicons name={safeIconName(ss.icon)} size={12} color={ss.color} />
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
  container: { flex: 1, backgroundColor: theme.colors.surfaceMuted },
  header: { backgroundColor: theme.colors.primary, padding: 24, paddingBottom: 20 },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
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
    shadowColor: theme.colors.dark,
    shadowOpacity: 0.03,
    shadowRadius: 4,
    elevation: 1,
  },
  dateBox: { width: 44, alignItems: 'center', marginRight: 12 },
  dateDay: { fontSize: 20, fontWeight: '700', color: theme.colors.primary },
  dateMonth: { fontSize: 10, color: theme.colors.textSecondary },
  dateYear: { fontSize: 9, color: theme.colors.textMuted, marginTop: -1 },
  cardBody: { flex: 1 },
  title: { fontSize: 15, fontWeight: '600', color: theme.colors.text },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 4 },
  metaText: { fontSize: 12, color: theme.colors.textSecondary },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10,
    marginLeft: 8,
  },
  statusText: { fontSize: 11, fontWeight: '600' },
  empty: { alignItems: 'center', paddingTop: 60 },
  emptyText: { fontSize: 14, color: theme.colors.textMuted, marginTop: 12 },
});

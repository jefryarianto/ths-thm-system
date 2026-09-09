import React, { useState } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, RefreshControl, Alert } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Ionicons from '@expo/vector-icons/Ionicons';
import { safeIconName } from '../../lib/icons';
import {
  useActivities,
  STATUS_STYLES,
  TIPE_ICONS,
  FILTER_OPTIONS,
} from '../../hooks/use-activities';
import { useRefresh } from '../../hooks/use-refresh';
import { LoadingView, FilterChips } from '../../components/ui/shared';
import { BackButton } from '../../components/ui/shared';
import { theme } from '../../theme';

export default function ActivitiesScreen() {
  const [filter, setFilter] = useState<string>('');

  const { data: activities, loading, refetch } = useActivities(filter);
  const { refreshing, onRefresh } = useRefresh(refetch);

  const insets = useSafeAreaInsets();

  if (loading) return <LoadingView message="Memuat kegiatan..." />;

  return (
    <View style={styles.container}>
      <BackButton />
      <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
        <View style={{ flex: 1 }}>
          <Text style={styles.headerTitle}>Kegiatan</Text>
          <Text style={styles.headerSub}>{(activities ?? []).length} kegiatan</Text>
        </View>
        <TouchableOpacity
          style={styles.addBtn}
          activeOpacity={0.7}
          onPress={() => Alert.alert('Belum Tersedia', 'Fitur pembuatan kegiatan sedang dalam pengembangan.')}
        >
          <Ionicons name="add" size={22} color={theme.colors.surface} />
        </TouchableOpacity>
      </View>

      <FilterChips options={FILTER_OPTIONS} selected={filter} onChange={setFilter} />

      <FlatList
        data={activities}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ padding: 16 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Ionicons name="calendar" size={48} color={theme.colors.borderStrong} />
            <Text style={styles.emptyText}>Belum ada kegiatan</Text>
          </View>
        }
        renderItem={({ item }) => {
          const icon = TIPE_ICONS[item.tipe] || 'ellipsis-horizontal';
          const statusStyle = STATUS_STYLES[item.status] || {
            label: item.status,
            bg: theme.colors.surfaceMuted,
            color: theme.colors.textSecondary,
          };
          const d = new Date(item.tanggalMulai);
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
          return (
            <TouchableOpacity
              style={styles.card}
              activeOpacity={0.7}
              onPress={() => {
                const { router: r } = require('expo-router');
                r.push(`/activities/${item.id}`);
              }}
            >
              <View style={styles.dateBox}>
                <Text style={styles.dateDay}>{d.getDate()}</Text>
                <Text style={styles.dateMonth}>{months[d.getMonth()]}</Text>
              </View>
              <View style={styles.cardBody}>
                <Text style={styles.title} numberOfLines={1}>
                  {item.nama}
                </Text>
                <View style={styles.metaRow}>
                  <Ionicons name={safeIconName(icon)} size={13} color={theme.colors.textSecondary} />
                  <Text style={styles.metaText}>{item.tipe}</Text>
                  {item.lokasi && (
                    <>
                      <Ionicons name="location" size={13} color={theme.colors.textSecondary} />
                      <Text style={styles.metaText}>{item.lokasi}</Text>
                    </>
                  )}
                </View>
              </View>
              <View style={[styles.statusBadge, { backgroundColor: statusStyle.bg }]}>
                <Text style={[styles.statusText, { color: statusStyle.color }]}>
                  {statusStyle.label}
                </Text>
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
  dateBox: { width: 44, alignItems: 'center', marginRight: 12 },
  dateDay: { fontSize: 20, fontWeight: theme.typography.weight.bold, color: theme.colors.primary },
  dateMonth: { fontSize: 10, color: theme.colors.textSecondary, marginTop: -2 },
  cardBody: { flex: 1 },
  title: {
    fontSize: 15,
    fontWeight: theme.typography.weight.semibold,
    color: theme.colors.text,
  },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 6 },
  metaText: { fontSize: 12, color: theme.colors.textSecondary },
  statusBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 10, marginLeft: 8 },
  statusText: { fontSize: 11, fontWeight: theme.typography.weight.semibold },
  empty: { alignItems: 'center', paddingTop: 60 },
  emptyText: { fontSize: 14, color: theme.colors.textMuted, marginTop: 12 },
});
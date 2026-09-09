import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, RefreshControl, Alert } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Ionicons from '@expo/vector-icons/Ionicons';
import { router } from 'expo-router';
import { useMembers } from '../../hooks/use-members';
import { useRefresh } from '../../hooks/use-refresh';
import { LoadingView, FilterChips, SearchBar } from '../../components/ui/shared';
import { useRole } from '../../hooks/use-role';
import apiClient from '../../lib/api-client';
import { BackButton } from '../../components/ui/shared';
import { theme } from '../../theme';

const STATUS_OPTIONS = [
  { value: '', label: 'Semua' },
  { value: 'aktif', label: 'Aktif' },
  { value: 'nonaktif', label: 'Nonaktif' },
];

interface TingkatanOption {
  id: string;
  nama: string;
}

export default function MembersScreen() {
  const { hasMinRole } = useRole();
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [filterTingkat, setFilterTingkat] = useState('');
  const [tingkatanOptions, setTingkatanOptions] = useState<TingkatanOption[]>([]);

  useEffect(() => {
    apiClient.get('/tingkatan').then((r) => setTingkatanOptions(r.data.data || [])).catch(() => {/* ignore */});
  }, []);

  const { data: members, loading, refetch } = useMembers(search, filterStatus, filterTingkat);
  const { refreshing, onRefresh } = useRefresh(refetch);

  const insets = useSafeAreaInsets();

  if (loading) return <LoadingView message="Memuat data anggota..." />;

  return (
    <View style={styles.container}>
      <BackButton />
      <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
        <View style={{ flex: 1 }}>
          <Text style={styles.headerTitle}>Anggota</Text>
          <Text style={styles.headerSub}>{(members ?? []).length} anggota</Text>
        </View>
        {hasMinRole('admin_ranting') && (
          <TouchableOpacity
            style={styles.addBtn}
            activeOpacity={0.7}
            onPress={() => Alert.alert('Belum Tersedia', 'Fitur penambahan anggota sedang dalam pengembangan.')}
          >
            <Ionicons name="add" size={22} color={theme.colors.surface} />
          </TouchableOpacity>
        )}
      </View>

      <SearchBar value={search} onChangeText={setSearch} placeholder="Cari anggota..." />

      <FilterChips options={STATUS_OPTIONS} selected={filterStatus} onChange={setFilterStatus} />
      <FilterChips
        options={[{ value: '', label: 'Semua' }, ...tingkatanOptions.map((t) => ({ value: t.nama, label: t.nama }))]}
        selected={filterTingkat}
        onChange={setFilterTingkat}
      />

      <FlatList
        data={members}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ padding: 16 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Ionicons name="people" size={48} color={theme.colors.borderStrong} />
            <Text style={styles.emptyText}>Belum ada anggota</Text>
          </View>
        }
        renderItem={({ item }) => {
          const statusColor = item.statusKeanggotaan === 'aktif' ? theme.colors.success : theme.colors.danger;
          const statusLabel = item.statusKeanggotaan === 'aktif' ? 'Aktif' : 'Nonaktif';
          const isIncomplete = item.statusData === 'incomplete';
          const validationStatus = item.statusValidasi;

          return (
            <TouchableOpacity
              style={styles.card}
              activeOpacity={0.7}
              onPress={() => {
                const { router: r } = require('expo-router');
                r.push(`/members/${item.id}`);
              }}
            >
              <View style={styles.avatar}>
                <Text style={styles.avatarText}>{item.namaLengkap?.charAt(0) || '?'}</Text>
              </View>
              <View style={styles.cardBody}>
                <View style={styles.nameRow}>
                  <Text style={styles.name}>{item.namaLengkap}</Text>
                  {isIncomplete && (
                    <View style={styles.warningBadge}>
                      <Ionicons name="warning" size={12} color={theme.colors.warning} />
                      <Text style={styles.warningText}>Data belum lengkap</Text>
                    </View>
                  )}
                  {validationStatus === 'pending' && (
                    <View style={styles.pendingBadge}>
                      <Ionicons name="time" size={12} color={theme.colors.primary} />
                      <Text style={styles.pendingText}>Menunggu persetujuan</Text>
                    </View>
                  )}
                </View>
                <View style={styles.metaRow}>
                  <Text style={styles.metaText}>{item.nomorAnggota || item.noAnggota}</Text>
                  {item.ranting && (
                    <>
                      <Text style={styles.metaDot}>·</Text>
                      <Ionicons name="location" size={11} color={theme.colors.textMuted} />
                      <Text style={styles.metaText}>{item.ranting.nama}</Text>
                    </>
                  )}
                </View>
                <View style={styles.metaRow}>
                  <Text style={styles.tingkatText}>{item.tingkat || '-'}</Text>
                  {item.statusValidasi && (
                    <Text
                      style={[
                        styles.validationBadge,
                        {
                          backgroundColor:
                            item.statusValidasi === 'approved'
                              ? theme.colors.successLight
                              : item.statusValidasi === 'rejected'
                              ? theme.colors.dangerLight
                              : theme.colors.primarySofter,
                          color:
                            item.statusValidasi === 'approved'
                              ? theme.colors.success
                              : item.statusValidasi === 'rejected'
                              ? theme.colors.danger
                              : theme.colors.primary,
                        },
                      ]}
                    >
                      {item.statusValidasi === 'approved'
                        ? 'Disetujui'
                        : item.statusValidasi === 'rejected'
                        ? 'Ditolak'
                        : 'Pending'}
                    </Text>
                  )}
                </View>
              </View>
              <View
                style={[
                  styles.statusBadge,
                  { backgroundColor: item.statusKeanggotaan === 'aktif' ? theme.colors.successLight : theme.colors.dangerLight },
                ]}
              >
                <Text style={[styles.statusText, { color: statusColor }]}>{statusLabel}</Text>
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
  header: { backgroundColor: theme.colors.primary, padding: 24, paddingBottom: 20, flexDirection: 'row', alignItems: 'center' },
  addBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: 'rgba(255,255,255,0.2)', alignItems: 'center', justifyContent: 'center' },
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
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: theme.colors.primarySofter,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  avatarText: { fontSize: 16, fontWeight: '700', color: theme.colors.primary },
  cardBody: { flex: 1 },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' },
  name: { fontSize: 15, fontWeight: '600', color: theme.colors.text },
  warningBadge: { flexDirection: 'row', alignItems: 'center', gap: 2, backgroundColor: theme.colors.warningLight, paddingHorizontal: 6, paddingVertical: 2, borderRadius: 8 },
  warningText: { fontSize: 10, color: theme.colors.warning, fontWeight: '600' },
  pendingBadge: { flexDirection: 'row', alignItems: 'center', gap: 2, backgroundColor: theme.colors.primaryLight, paddingHorizontal: 6, paddingVertical: 2, borderRadius: 8 },
  pendingText: { fontSize: 10, color: theme.colors.primary, fontWeight: '600' },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 3, marginTop: 3 },
  metaText: { fontSize: 12, color: theme.colors.textSecondary },
  metaDot: { fontSize: 12, color: theme.colors.textMuted },
  tingkatText: { fontSize: 11, color: theme.colors.primary, fontWeight: '500' },
  validationBadge: { fontSize: 10, fontWeight: '600', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6, marginLeft: 6 },
  statusBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 10, marginLeft: 8 },
  statusText: { fontSize: 11, fontWeight: '600' },
  empty: { alignItems: 'center', paddingTop: 60 },
  emptyText: { fontSize: 14, color: theme.colors.textMuted, marginTop: 12 },
});

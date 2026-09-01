import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Ionicons from '@expo/vector-icons/Ionicons';
import { router } from 'expo-router';
import { safeIconName } from '../../lib/icons';
import {
  usePendingApprovals,
  approveApproval,
  rejectApproval,
  REQUEST_TYPE_LABELS,
  REQUEST_TYPE_FILTERS,
  REQUEST_TYPE_ICONS,
  STATUS_STYLES,
  ApprovalRequest,
} from '../../hooks/use-approvals';
import { useRefresh } from '../../hooks/use-refresh';
import { LoadingView, ErrorView, FilterChips, SearchBar } from '../../components/ui/shared';
import { BackButton } from '../../components/ui/shared';

export default function ApprovalsListScreen() {
  const { data, loading, error, refetch } = usePendingApprovals();
  const { refreshing, onRefresh } = useRefresh(refetch);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [filterType, setFilterType] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  // Client-side filter by requestType
  // Group member_create & member_update under single 'Anggota' chip
  const typeFiltered = filterType === 'member_create'
    ? (data ?? []).filter((item) => item.requestType === 'member_create' || item.requestType === 'member_update')
    : filterType
      ? (data ?? []).filter((item) => item.requestType === filterType)
      : (data ?? []);

  // Client-side text search by itemId, requestType label, or item ID
  const query = searchQuery.toLowerCase().trim();
  const filteredData = query
    ? typeFiltered.filter((item) =>
        (REQUEST_TYPE_LABELS[item.requestType] || item.requestType).toLowerCase().includes(query) ||
        item.itemId.toLowerCase().includes(query) ||
        item.id.toLowerCase().includes(query)
      )
    : typeFiltered;

  const activeFilterLabel = searchQuery.trim()
    ? `"${searchQuery.trim()}"`
    : filterType
      ? (REQUEST_TYPE_LABELS[filterType]?.toLowerCase() || filterType)
      : '';

  const handleAction = useCallback(
    async (id: string, action: 'approve' | 'reject') => {
      const label = action === 'approve' ? 'Setujui' : 'Tolak';
      Alert.alert(
        `${label} Pengajuan`,
        action === 'approve'
          ? 'Apakah Anda yakin ingin menyetujui pengajuan ini?'
          : 'Apakah Anda yakin ingin menolak pengajuan ini?',
        [
          { text: 'Batal', style: 'cancel' },
          {
            text: label,
            style: action === 'reject' ? 'destructive' : 'default',
            onPress: async () => {
              setActionLoading(`${id}-${action}`);
              try {
                if (action === 'approve') {
                  await approveApproval(id);
                } else {
                  await rejectApproval(id);
                }
                refetch();
              } catch {
                Alert.alert('Gagal', `Gagal ${action === 'approve' ? 'menyetujui' : 'menolak'} pengajuan`);
              }
              setActionLoading(null);
            },
          },
        ],
      );
    },
    [refetch],
  );

  const insets = useSafeAreaInsets();

  if (loading) return <LoadingView message="Memuat persetujuan..." />;

  if (error) return <ErrorView message={error} onRetry={refetch} />;

  return (
    <View style={styles.container}>
      <BackButton />
      <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
        <View style={styles.headerRow}>
          <View>
            <Text style={styles.headerTitle}>Persetujuan</Text>
            <Text style={styles.headerSub}>{(data ?? []).length} menunggu</Text>
          </View>
          <Ionicons name="shield-checkmark" size={28} color="#bfdbfe" />
        </View>
      </View>

      <FlatList
        data={filteredData}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ padding: 16 }}
        ListHeaderComponent={
          <View>
            <SearchBar
              value={searchQuery}
              onChangeText={setSearchQuery}
              placeholder="Cari berdasarkan ID atau tipe pengajuan..."
            />
            <FilterChips options={REQUEST_TYPE_FILTERS} selected={filterType} onChange={setFilterType} />
          </View>
        }
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Ionicons name="checkmark-circle" size={48} color="#d1d5db" />
            <Text style={styles.emptyTitle}>
              {searchQuery.trim()
                ? 'Tidak ditemukan'
                : activeFilterLabel
                  ? `Tidak ada pengajuan ${activeFilterLabel} menunggu`
                  : 'Tidak ada pengajuan menunggu'}
            </Text>
            <Text style={styles.emptySub}>
              {searchQuery.trim()
                ? `Tidak ada pengajuan dengan kata kunci "${searchQuery.trim()}"`
                : 'Semua pengajuan telah diproses'}
            </Text>
          </View>
        }
        renderItem={({ item }) => (
          <ApprovalCard
            item={item}
            actionLoading={actionLoading}
            onAction={handleAction}
            onPress={() => router.push(`/approvals/${item.id}` as any)}
          />
        )}
      />
    </View>
  );
}

function ApprovalCard({
  item,
  actionLoading,
  onAction,
  onPress,
}: {
  item: ApprovalRequest;
  actionLoading: string | null;
  onAction: (id: string, action: 'approve' | 'reject') => void;
  onPress: () => void;
}) {
  const iconName = REQUEST_TYPE_ICONS[item.requestType] || 'document';
  const st = STATUS_STYLES[item.status] || { label: item.status, color: '#6b7280', bg: '#f3f4f6' };
  const isPending = item.status === 'pending';

  return (
    <TouchableOpacity style={styles.card} activeOpacity={0.7} onPress={onPress}>
      <View style={styles.cardHeader}>
        <View style={[styles.typeIcon, { backgroundColor: st.bg }]}>
          <Ionicons name={safeIconName(iconName)} size={18} color={st.color} />
        </View>
        <View style={styles.cardTitleArea}>
          <Text style={styles.cardTitle} numberOfLines={1}>
            {REQUEST_TYPE_LABELS[item.requestType] || item.requestType}
          </Text>
          <Text style={styles.cardDate}>
            {new Date(item.createdAt).toLocaleDateString('id-ID', {
              day: '2-digit',
              month: 'long',
              year: 'numeric',
            })}
          </Text>
        </View>
        <View style={[styles.statusBadge, { backgroundColor: st.bg }]}>
          <Text style={[styles.statusText, { color: st.color }]}>{st.label}</Text>
        </View>
      </View>

      <View style={styles.cardBody}>
        <View style={styles.metaRow}>
          <Ionicons name="finger-print" size={13} color="#9ca3af" />
          <Text style={styles.metaText}>ID: {item.itemId}</Text>
        </View>
      </View>

      {item.levels && item.levels.length > 0 && (
        <View style={styles.levelsRow}>
          {item.levels.map((l, i) => {
            const ls = STATUS_STYLES[l.status] || { label: l.status, color: '#6b7280', bg: '#f3f4f6' };
            return (
              <View key={i} style={[styles.levelDot, { backgroundColor: ls.bg, borderColor: ls.color }]}>
                <Text style={[styles.levelDotText, { color: ls.color }]}>
                  {l.status === 'approved' ? '✓' : l.status === 'rejected' ? '✗' : `${i + 1}`}
                </Text>
              </View>
            );
          })}
        </View>
      )}

      {isPending && (
        <View style={styles.actionRow}>
          <TouchableOpacity
            style={[styles.actionBtn, styles.approveBtn]}
            disabled={actionLoading === `${item.id}-approve`}
            onPress={() => onAction(item.id, 'approve')}
          >
            {actionLoading === `${item.id}-approve` ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <>
                <Ionicons name="checkmark-circle" size={16} color="#fff" />
                <Text style={styles.actionBtnText}>Setujui</Text>
              </>
            )}
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.actionBtn, styles.rejectBtn]}
            disabled={actionLoading === `${item.id}-reject`}
            onPress={() => onAction(item.id, 'reject')}
          >
            {actionLoading === `${item.id}-reject` ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <>
                <Ionicons name="close-circle" size={16} color="#fff" />
                <Text style={styles.actionBtnText}>Tolak</Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f3f4f6' },
  header: { backgroundColor: '#2563eb', padding: 24, paddingBottom: 20 },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  headerTitle: { color: '#fff', fontSize: 22, fontWeight: '700' },
  headerSub: { color: '#bfdbfe', fontSize: 13, marginTop: 4 },
  card: {
    backgroundColor: '#fff',
    borderRadius: 14,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#f3f4f6',
    shadowColor: '#000',
    shadowOpacity: 0.03,
    shadowRadius: 4,
    elevation: 1,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  typeIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardTitleArea: { flex: 1 },
  cardTitle: { fontSize: 15, fontWeight: '600', color: '#111827' },
  cardDate: { fontSize: 11, color: '#9ca3af', marginTop: 2 },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10,
  },
  statusText: { fontSize: 11, fontWeight: '600' },
  cardBody: { marginTop: 8 },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  metaText: { fontSize: 12, color: '#6b7280' },
  levelsRow: {
    flexDirection: 'row',
    gap: 6,
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#f3f4f6',
  },
  levelDot: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  levelDotText: { fontSize: 10, fontWeight: '700' },
  actionRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#f3f4f6',
  },
  actionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    borderRadius: 10,
  },
  approveBtn: { backgroundColor: '#16a34a' },
  rejectBtn: { backgroundColor: '#dc2626' },
  actionBtnText: { color: '#fff', fontSize: 13, fontWeight: '600' },
  empty: { alignItems: 'center', paddingTop: 60 },
  emptyTitle: { fontSize: 16, fontWeight: '600', color: '#6b7280', marginTop: 12 },
  emptySub: { fontSize: 13, color: '#9ca3af', marginTop: 4 },
});

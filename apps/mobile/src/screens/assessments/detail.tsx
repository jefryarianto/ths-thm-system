import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useLocalSearchParams } from 'expo-router';
import apiClient, { unwrap } from '../../lib/api-client';
import { LoadingView, StatusBadge, ScreenShell, TabBar } from '../../components/ui/shared';
import { STATUS_STYLES } from '../../hooks/use-assessments';
import { theme } from '../../theme';
import type { AssessmentsAspect, AssessmentsItem, AssessmentsScore } from '../../types';

export default function AssessmentDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [aspect, setAspect] = useState<AssessmentsAspect | null>(null);
  const [items, setItems] = useState<AssessmentsItem[]>([]);
  const [scores, setScores] = useState<AssessmentsScore[]>([]);
  const [activeTab, setActiveTab] = useState<'items' | 'scores'>('items');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const [aspectRes, itemsRes, scoresRes] = await Promise.all([
          apiClient.get(`/assessments/aspects/${id}`),
          apiClient.get('/assessments/items', { params: { aspekId: id, limit: 100 } }),
          apiClient.get('/assessments/scores', { params: { aspekId: id, limit: 100 } }),
        ]);
        setAspect(unwrap(aspectRes));
        setItems(unwrap(itemsRes) || []);
        setScores(unwrap(scoresRes) || []);
      } catch {
        /* ignore */
      }
      setLoading(false);
    })();
  }, [id]);

  if (loading) return <LoadingView message="Memuat detail aspek..." />;
  if (!aspect)
    return (
      <View style={styles.center}>
        <Text style={styles.errorText}>Aspek tidak ditemukan</Text>
      </View>
    );

  const ss = STATUS_STYLES[aspect.status] || {
    label: aspect.status,
    color: theme.colors.textSecondary,
    bg: theme.colors.surfaceMuted,
  };

  const tabs = [
    { key: 'items', label: `Item (${items.length})`, icon: 'list' as const },
    { key: 'scores', label: `Nilai (${scores.length})`, icon: 'school' as const },
  ];

  return (
    <ScreenShell title={aspect.nama} variant="detail" badgeLabel={ss.label} badgeColor={ss.color} badgeBg={ss.bg}>

      <View style={styles.section}>
        <View style={styles.infoCard}>
          {aspect.deskripsi ? (
            <View style={styles.infoRow}>
              <Ionicons name="document-text" size={18} color={theme.colors.primary} />
              <View style={styles.infoContent}>
                <Text style={styles.infoLabel}>Deskripsi</Text>
                <Text style={styles.infoValue}>{aspect.deskripsi}</Text>
              </View>
            </View>
          ) : null}
          <View style={styles.infoRow}>
            <Ionicons name="list" size={18} color={theme.colors.primary} />
            <View style={styles.infoContent}>
              <Text style={styles.infoLabel}>Jumlah Item</Text>
              <Text style={styles.infoValue}>{items.length} item</Text>
            </View>
          </View>
          <View style={styles.infoRow}>
            <Ionicons name="flag" size={18} color={theme.colors.primary} />
            <View style={styles.infoContent}>
              <Text style={styles.infoLabel}>Status</Text>
              <StatusBadge label={ss.label} color={ss.color} bg={ss.bg} />
            </View>
          </View>
        </View>
      </View>

      <TabBar tabs={tabs} activeKey={activeTab} onChange={(key) => setActiveTab(key as typeof activeTab)} />

      {activeTab === 'items' && (
        <View style={styles.section}>
          {items.length > 0 ? (
            items.map((item) => (
              <View key={item.id} style={styles.itemCard}>
                <View style={styles.itemLeft}>
                  <View style={styles.itemIcon}>
                    <Ionicons name="create" size={16} color={theme.colors.primary} />
                  </View>
                  <View style={styles.itemInfo}>
                    <Text style={styles.itemName}>{item.nama}</Text>
                    <Text style={styles.itemType}>{item.tipe}</Text>
                  </View>
                </View>
                <View style={styles.itemWeight}>
                  <Text style={styles.itemWeightText}>Bobot: {item.bobot}</Text>
                </View>
              </View>
            ))
          ) : (
            <Text style={styles.emptyText}>Belum ada item penilaian</Text>
          )}
        </View>
      )}

      {activeTab === 'scores' && (
        <View style={styles.section}>
          {scores.length > 0 ? (
            scores.map((score) => (
              <View key={score.id} style={styles.scoreCard}>
                <View style={styles.scoreLeft}>
                  <View style={styles.scoreAvatar}>
                    <Text style={styles.scoreAvatarText}>
                      {score.anggota?.namaLengkap?.charAt(0) || '?'}
                    </Text>
                  </View>
                  <View style={styles.scoreInfo}>
                    <Text style={styles.scoreName}>{score.anggota?.namaLengkap || 'Unknown'}</Text>
                    {score.item && (
                      <Text style={styles.scoreItem}>
                        {score.item.nama} (bobot: {score.item.bobot})
                      </Text>
                    )}
                    {score.catatan ? (
                      <Text style={styles.scoreNote} numberOfLines={2}>
                        {score.catatan}
                      </Text>
                    ) : null}
                    {score.tanggal ? (
                      <Text style={styles.scoreDate}>
                        {new Date(score.tanggal).toLocaleDateString('id-ID', { day: '2-digit', month: 'long', year: 'numeric' })}
                      </Text>
                    ) : null}
                  </View>
                </View>
                <View style={styles.scoreBadge}>
                  <Text style={styles.scoreBadgeText}>{score.nilai}</Text>
                </View>
              </View>
            ))
          ) : (
            <Text style={styles.emptyText}>Belum ada nilai</Text>
          )}
        </View>
      )}

    </ScreenShell>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: theme.colors.background },
  errorText: { fontSize: 14, color: theme.colors.danger },

  section: { padding: 16 },

  infoCard: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.lg - 2,
    padding: 16,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.surfaceMuted,
  },
  infoContent: { flex: 1 },
  infoLabel: { fontSize: 11, color: theme.colors.textMuted, marginBottom: 2 },
  infoValue: { fontSize: 14, fontWeight: theme.typography.weight.medium, color: theme.colors.text },

  // Tabs removed — using shared TabBar component

  itemCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.md,
    padding: 14,
    marginBottom: 6,
    borderWidth: 1,
    borderColor: theme.colors.surfaceMuted,
  },
  itemLeft: { flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1 },
  itemIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: theme.colors.primarySofter,
    alignItems: 'center',
    justifyContent: 'center',
  },
  itemInfo: { flex: 1 },
  itemName: { fontSize: 14, fontWeight: theme.typography.weight.medium, color: theme.colors.text },
  itemType: { fontSize: 11, color: theme.colors.textSecondary, marginTop: 2 },
  itemWeight: {
    backgroundColor: theme.colors.surfaceMuted,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  itemWeightText: { fontSize: 12, fontWeight: theme.typography.weight.semibold, color: theme.colors.textSecondary },

  scoreCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.md,
    padding: 14,
    marginBottom: 6,
    borderWidth: 1,
    borderColor: theme.colors.surfaceMuted,
  },
  scoreLeft: { flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1 },
  scoreAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: theme.colors.primarySofter,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scoreAvatarText: { fontSize: 14, fontWeight: theme.typography.weight.bold, color: theme.colors.primary },
  scoreInfo: { flex: 1 },
  scoreName: { fontSize: 14, fontWeight: theme.typography.weight.medium, color: theme.colors.text },
  scoreItem: { fontSize: 11, color: theme.colors.textSecondary, marginTop: 2 },
  scoreNote: { fontSize: 11, color: theme.colors.textMuted, marginTop: 2 },
  scoreDate: { fontSize: 10, color: theme.colors.textMuted, marginTop: 2 },
  scoreBadge: {
    backgroundColor: theme.colors.primarySofter,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 10,
  },
  scoreBadgeText: { fontSize: 16, fontWeight: theme.typography.weight.bold, color: theme.colors.primary },

  emptyText: { fontSize: 13, color: theme.colors.textMuted, textAlign: 'center', paddingVertical: 30 },
});

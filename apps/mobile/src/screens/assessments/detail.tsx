import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useLocalSearchParams, router } from 'expo-router';
import apiClient, { unwrap } from '../../lib/api-client';
import { LoadingView, StatusBadge } from '../../components/ui/shared';
import { STATUS_STYLES } from '../../hooks/use-assessments';
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
    color: '#6b7280',
    bg: '#f3f4f6',
  };

  const tabs = [
    { key: 'items', label: `Item (${items.length})`, icon: 'list' as const },
    { key: 'scores', label: `Nilai (${scores.length})`, icon: 'school' as const },
  ];

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={22} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle} numberOfLines={1}>
          {aspect.nama}
        </Text>
      </View>

      <View style={styles.section}>
        <View style={styles.infoCard}>
          {aspect.deskripsi ? (
            <View style={styles.infoRow}>
              <Ionicons name="document-text" size={18} color="#2563eb" />
              <View style={styles.infoContent}>
                <Text style={styles.infoLabel}>Deskripsi</Text>
                <Text style={styles.infoValue}>{aspect.deskripsi}</Text>
              </View>
            </View>
          ) : null}
          <View style={styles.infoRow}>
            <Ionicons name="list" size={18} color="#2563eb" />
            <View style={styles.infoContent}>
              <Text style={styles.infoLabel}>Jumlah Item</Text>
              <Text style={styles.infoValue}>{items.length} item</Text>
            </View>
          </View>
          <View style={styles.infoRow}>
            <Ionicons name="flag" size={18} color="#2563eb" />
            <View style={styles.infoContent}>
              <Text style={styles.infoLabel}>Status</Text>
              <StatusBadge label={ss.label} color={ss.color} bg={ss.bg} />
            </View>
          </View>
        </View>
      </View>

      <View style={styles.tabContainer}>
        {tabs.map((tab) => (
          <TouchableOpacity
            key={tab.key}
            style={[styles.tab, activeTab === tab.key && styles.tabActive]}
            onPress={() => setActiveTab(tab.key as any)}
          >
            <Ionicons
              name={tab.icon}
              size={14}
              color={activeTab === tab.key ? '#fff' : '#6b7280'}
            />
            <Text style={[styles.tabText, activeTab === tab.key && styles.tabTextActive]}>
              {tab.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {activeTab === 'items' && (
        <View style={styles.section}>
          {items.length > 0 ? (
            items.map((item) => (
              <View key={item.id} style={styles.itemCard}>
                <View style={styles.itemLeft}>
                  <View style={styles.itemIcon}>
                    <Ionicons name="create" size={16} color="#2563eb" />
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
                        {new Date(score.tanggal).toLocaleDateString('id-ID')}
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

      <View style={{ height: 40 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f3f4f6' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#f3f4f6' },
  errorText: { fontSize: 14, color: '#ef4444' },
  header: {
    backgroundColor: '#2563eb',
    padding: 24,
    paddingTop: 60,
    paddingBottom: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  backBtn: { padding: 4 },
  headerTitle: { color: '#fff', fontSize: 18, fontWeight: '700', flex: 1 },

  section: { padding: 16 },

  infoCard: {
    backgroundColor: '#fff',
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  infoContent: { flex: 1 },
  infoLabel: { fontSize: 11, color: '#9ca3af', marginBottom: 2 },
  infoValue: { fontSize: 14, fontWeight: '500', color: '#111827' },

  tabContainer: {
    flexDirection: 'row',
    backgroundColor: '#e5e7eb',
    margin: 16,
    marginBottom: 0,
    borderRadius: 10,
    padding: 3,
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    paddingVertical: 8,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  tabActive: { backgroundColor: '#2563eb' },
  tabText: { fontSize: 11, fontWeight: '600', color: '#6b7280' },
  tabTextActive: { color: '#fff' },

  itemCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 14,
    marginBottom: 6,
    borderWidth: 1,
    borderColor: '#f3f4f6',
  },
  itemLeft: { flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1 },
  itemIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#eff6ff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  itemInfo: { flex: 1 },
  itemName: { fontSize: 14, fontWeight: '500', color: '#111827' },
  itemType: { fontSize: 11, color: '#6b7280', marginTop: 2 },
  itemWeight: {
    backgroundColor: '#f3f4f6',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  itemWeightText: { fontSize: 12, fontWeight: '600', color: '#374151' },

  scoreCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 14,
    marginBottom: 6,
    borderWidth: 1,
    borderColor: '#f3f4f6',
  },
  scoreLeft: { flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1 },
  scoreAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#eff6ff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  scoreAvatarText: { fontSize: 14, fontWeight: '700', color: '#2563eb' },
  scoreInfo: { flex: 1 },
  scoreName: { fontSize: 14, fontWeight: '500', color: '#111827' },
  scoreItem: { fontSize: 11, color: '#6b7280', marginTop: 2 },
  scoreNote: { fontSize: 11, color: '#9ca3af', marginTop: 2 },
  scoreDate: { fontSize: 10, color: '#9ca3af', marginTop: 2 },
  scoreBadge: {
    backgroundColor: '#eff6ff',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 10,
  },
  scoreBadgeText: { fontSize: 16, fontWeight: '700', color: '#2563eb' },

  emptyText: { fontSize: 13, color: '#9ca3af', textAlign: 'center', paddingVertical: 30 },
});

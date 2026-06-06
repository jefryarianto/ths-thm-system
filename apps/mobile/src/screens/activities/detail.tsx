import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, ActivityIndicator, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, router } from 'expo-router';
import apiClient from '../../lib/api-client';

interface ActivityDetail {
  id: string;
  nama: string;
  tipe: string;
  lokasi?: string;
  tanggalMulai: string;
  tanggalSelesai?: string;
  status: string;
  deskripsi?: string;
  scopeType?: string;
}

interface Participant {
  id: string;
  namaLengkap?: string;
  anggotaId?: string;
  hadir?: boolean;
}

interface ActivityDocument {
  id: string;
  nama: string;
  url?: string;
  tipe?: string;
}

const STATUS_STYLES: Record<string, { label: string; bg: string; color: string }> = {
  draft: { label: 'Draft', bg: '#f3f4f6', color: '#6b7280' },
  published: { label: 'Berlangsung', bg: '#ecfdf5', color: '#16a34a' },
  closed: { label: 'Selesai', bg: '#eff6ff', color: '#2563eb' },
  cancelled: { label: 'Dibatalkan', bg: '#fef2f2', color: '#dc2626' },
};

const TIPE_ICONS: Record<string, string> = {
  latihan: 'fitness', pendadaran: 'school', ujian_tingkat: 'trending-up',
  rapat: 'people', retret: 'sunny', pelantikan: 'ribbon', lainnya: 'ellipsis-horizontal',
};

export default function ActivityDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [activity, setActivity] = useState<ActivityDetail | null>(null);
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [documents, setDocuments] = useState<ActivityDocument[]>([]);
  const [activeTab, setActiveTab] = useState<'info' | 'participants' | 'documents'>('info');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const [actRes, partRes, docRes] = await Promise.all([
          apiClient.get(`/activities/${id}`),
          apiClient.get(`/activities/${id}/presence`).catch(() => ({ data: { data: [] } })),
          apiClient.get(`/activities/${id}/documents`).catch(() => ({ data: { data: [] } })),
        ]);
        setActivity(actRes.data.data);
        setParticipants(partRes.data.data || []);
        setDocuments(docRes.data.data || []);
      } catch { /* ignore */ }
      setLoading(false);
    })();
  }, [id]);

  if (loading) return <View style={styles.center}><ActivityIndicator size="large" color="#2563eb" /></View>;
  if (!activity) return <View style={styles.center}><Text style={styles.errorText}>Kegiatan tidak ditemukan</Text></View>;

  const icon = TIPE_ICONS[activity.tipe] || 'ellipsis-horizontal';
  const statusStyle = STATUS_STYLES[activity.status] || { label: activity.status, bg: '#f3f4f6', color: '#6b7280' };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
  };

  const tabs = [
    { key: 'info' as const, label: 'Info', icon: 'information-circle' as const },
    { key: 'participants' as const, label: `Peserta (${participants.length})`, icon: 'people' as const },
    { key: 'documents' as const, label: `Dokumen (${documents.length})`, icon: 'document-text' as const },
  ];

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={22} color="#fff" />
        </TouchableOpacity>
        <View style={styles.headerContent}>
          <Text style={styles.headerTitle} numberOfLines={1}>{activity.nama}</Text>
          <View style={[styles.headerBadge, { backgroundColor: statusStyle.bg }]}>
            <Text style={[styles.headerBadgeText, { color: statusStyle.color }]}>{statusStyle.label}</Text>
          </View>
        </View>
      </View>

      {/* Tab Selector */}
      <View style={styles.tabContainer}>
        {tabs.map((tab) => (
          <TouchableOpacity
            key={tab.key}
            style={[styles.tab, activeTab === tab.key && styles.tabActive]}
            onPress={() => setActiveTab(tab.key)}
          >
            <Ionicons name={tab.icon} size={14} color={activeTab === tab.key ? '#fff' : '#6b7280'} />
            <Text style={[styles.tabText, activeTab === tab.key && styles.tabTextActive]}>{tab.label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Info Tab */}
      {activeTab === 'info' && (
        <View style={styles.section}>
          <View style={styles.infoCard}>
            <View style={styles.infoRow}>
              <Ionicons name={icon as any} size={20} color="#2563eb" />
              <View style={styles.infoContent}>
                <Text style={styles.infoLabel}>Tipe Kegiatan</Text>
                <Text style={styles.infoValue}>{activity.tipe}</Text>
              </View>
            </View>
            <View style={styles.infoRow}>
              <Ionicons name="calendar" size={20} color="#2563eb" />
              <View style={styles.infoContent}>
                <Text style={styles.infoLabel}>Tanggal Mulai</Text>
                <Text style={styles.infoValue}>{formatDate(activity.tanggalMulai)}</Text>
              </View>
            </View>
            {activity.tanggalSelesai && (
              <View style={styles.infoRow}>
                <Ionicons name="calendar-outline" size={20} color="#2563eb" />
                <View style={styles.infoContent}>
                  <Text style={styles.infoLabel}>Tanggal Selesai</Text>
                  <Text style={styles.infoValue}>{formatDate(activity.tanggalSelesai)}</Text>
                </View>
              </View>
            )}
            {activity.lokasi && (
              <View style={styles.infoRow}>
                <Ionicons name="location" size={20} color="#2563eb" />
                <View style={styles.infoContent}>
                  <Text style={styles.infoLabel}>Lokasi</Text>
                  <Text style={styles.infoValue}>{activity.lokasi}</Text>
                </View>
              </View>
            )}
            {activity.deskripsi && (
              <View style={styles.infoRow}>
                <Ionicons name="document-text" size={20} color="#2563eb" />
                <View style={styles.infoContent}>
                  <Text style={styles.infoLabel}>Deskripsi</Text>
                  <Text style={styles.infoValue}>{activity.deskripsi}</Text>
                </View>
              </View>
            )}
          </View>
        </View>
      )}

      {/* Participants Tab */}
      {activeTab === 'participants' && (
        <View style={styles.section}>
          <Text style={styles.subTitle}>Peserta ({participants.length})</Text>
          {participants.length > 0 ? (
            participants.map((p, idx) => (
              <View key={p.id || idx} style={styles.participantCard}>
                <View style={styles.participantAvatar}>
                  <Text style={styles.participantAvatarText}>
                    {(p.namaLengkap || p.anggotaId || '?').charAt(0)}
                  </Text>
                </View>
                <View style={styles.participantInfo}>
                  <Text style={styles.participantName}>{p.namaLengkap || p.anggotaId || 'Unknown'}</Text>
                </View>
                {p.hadir !== undefined && (
                  <Ionicons
                    name={p.hadir ? 'checkmark-circle' : 'close-circle'}
                    size={20}
                    color={p.hadir ? '#22c55e' : '#ef4444'}
                  />
                )}
              </View>
            ))
          ) : (
            <Text style={styles.emptyText}>Belum ada peserta</Text>
          )}
        </View>
      )}

      {/* Documents Tab */}
      {activeTab === 'documents' && (
        <View style={styles.section}>
          <Text style={styles.subTitle}>Dokumen ({documents.length})</Text>
          {documents.length > 0 ? (
            documents.map((doc) => (
              <TouchableOpacity key={doc.id} style={styles.docCard} activeOpacity={0.7}>
                <View style={styles.docIcon}>
                  <Ionicons
                    name={doc.tipe?.includes('pdf') ? 'document' : 'document-text'}
                    size={24}
                    color="#2563eb"
                  />
                </View>
                <View style={styles.docInfo}>
                  <Text style={styles.docName} numberOfLines={1}>{doc.nama}</Text>
                  {doc.tipe && <Text style={styles.docType}>{doc.tipe}</Text>}
                </View>
                <Ionicons name="download-outline" size={20} color="#6b7280" />
              </TouchableOpacity>
            ))
          ) : (
            <Text style={styles.emptyText}>Belum ada dokumen</Text>
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
  header: { backgroundColor: '#2563eb', padding: 24, paddingTop: 60, paddingBottom: 16, flexDirection: 'row', alignItems: 'center', gap: 12 },
  backBtn: { padding: 4 },
  headerContent: { flex: 1 },
  headerTitle: { color: '#fff', fontSize: 18, fontWeight: '700' },
  headerBadge: { alignSelf: 'flex-start', paddingHorizontal: 10, paddingVertical: 3, borderRadius: 8, marginTop: 6 },
  headerBadgeText: { fontSize: 11, fontWeight: '600' },

  tabContainer: { flexDirection: 'row', backgroundColor: '#e5e7eb', margin: 16, marginBottom: 0, borderRadius: 10, padding: 3 },
  tab: { flex: 1, flexDirection: 'row', paddingVertical: 8, borderRadius: 8, alignItems: 'center', justifyContent: 'center', gap: 4 },
  tabActive: { backgroundColor: '#2563eb' },
  tabText: { fontSize: 11, fontWeight: '600', color: '#6b7280' },
  tabTextActive: { color: '#fff' },

  section: { padding: 16 },
  infoCard: { backgroundColor: '#fff', borderRadius: 14, padding: 16, borderWidth: 1, borderColor: '#e5e7eb' },
  infoRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 12, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#f3f4f6' },
  infoContent: { flex: 1 },
  infoLabel: { fontSize: 11, color: '#9ca3af', marginBottom: 2 },
  infoValue: { fontSize: 14, fontWeight: '500', color: '#111827' },
  subTitle: { fontSize: 15, fontWeight: '600', color: '#1f2937', marginBottom: 12 },

  participantCard: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', borderRadius: 12,
    padding: 14, marginBottom: 6, borderWidth: 1, borderColor: '#f3f4f6',
  },
  participantAvatar: { width: 36, height: 36, borderRadius: 18, backgroundColor: '#eff6ff', alignItems: 'center', justifyContent: 'center', marginRight: 10 },
  participantAvatarText: { fontSize: 14, fontWeight: '700', color: '#2563eb' },
  participantInfo: { flex: 1 },
  participantName: { fontSize: 14, fontWeight: '500', color: '#111827' },

  docCard: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', borderRadius: 12,
    padding: 14, marginBottom: 6, borderWidth: 1, borderColor: '#f3f4f6',
  },
  docIcon: { marginRight: 12 },
  docInfo: { flex: 1 },
  docName: { fontSize: 14, fontWeight: '500', color: '#111827' },
  docType: { fontSize: 11, color: '#9ca3af', marginTop: 2 },

  emptyText: { fontSize: 13, color: '#9ca3af', textAlign: 'center', paddingVertical: 30 },
});

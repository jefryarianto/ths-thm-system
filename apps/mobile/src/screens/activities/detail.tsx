import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  TouchableOpacity,
} from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useLocalSearchParams } from 'expo-router';
import QRCode from 'react-native-qrcode-svg';
import apiClient, { unwrap } from '../../lib/api-client';
import { LoadingView, ScreenShell, TabBar } from '../../components/ui/shared';

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
  latihan: 'fitness',
  pendadaran: 'school',
  ujian_tingkat: 'trending-up',
  rapat: 'people',
  retret: 'sunny',
  pelantikan: 'ribbon',
  lainnya: 'ellipsis-horizontal',
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
          apiClient
            .get(`/activities/${id}/presence`)
            .catch(() => ({ data: { data: { data: [] as Participant[] } } })),
          apiClient
            .get(`/activities/${id}/documents`)
            .catch(() => ({ data: { data: { data: [] as ActivityDocument[] } } })),
        ]);
        setActivity(unwrap(actRes));
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        setParticipants((partRes as any)?.data?.data ?? []);
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        setDocuments((docRes as any)?.data?.data ?? []);
      } catch {
        /* ignore */
      }
      setLoading(false);
    })();
  }, [id]);

  if (loading) return <LoadingView message="Memuat detail kegiatan..." />;
  if (!activity)
    return (
      <View style={styles.center}>
        <Text style={styles.errorText}>Kegiatan tidak ditemukan</Text>
      </View>
    );

  const icon = TIPE_ICONS[activity.tipe] || 'ellipsis-horizontal';
  const statusStyle = STATUS_STYLES[activity.status] || {
    label: activity.status,
    bg: '#f3f4f6',
    color: '#6b7280',
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('id-ID', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
  };

  const tabs = [
    { key: 'info' as const, label: 'Info', icon: 'information-circle' as const },
    {
      key: 'participants' as const,
      label: `Peserta (${participants.length})`,
      icon: 'people' as const,
    },
    {
      key: 'documents' as const,
      label: `Dokumen (${documents.length})`,
      icon: 'document-text' as const,
    },
  ];

  return (
    <ScreenShell
      title={activity.nama}
      variant="detail"
      badgeLabel={statusStyle.label}
      badgeColor={statusStyle.color}
      badgeBg={statusStyle.bg}
    >

      <TabBar tabs={tabs} activeKey={activeTab} onChange={(key) => setActiveTab(key as typeof activeTab)} />

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

          {/* QR Code for Check-in */}
          {activity.status === 'published' && (
            <View style={styles.qrSection}>
              <View style={styles.qrCard}>
                <View style={styles.qrHeader}>
                  <Ionicons name="qr-code" size={18} color="#2563eb" />
                  <Text style={styles.qrTitle}>QR Check-in</Text>
                </View>
                <Text style={styles.qrHint}>Scan QR ini untuk check-in kegiatan</Text>
                <View style={styles.qrContainer}>
                  <QRCode
                    value={JSON.stringify({ id: activity.id, type: 'activity' })}
                    size={140}
                  />
                </View>
              </View>
            </View>
          )}
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
                  <Text style={styles.participantName}>
                    {p.namaLengkap || p.anggotaId || 'Unknown'}
                  </Text>
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
                  <Text style={styles.docName} numberOfLines={1}>
                    {doc.nama}
                  </Text>
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

    </ScreenShell>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#f3f4f6' },
  errorText: { fontSize: 14, color: '#ef4444' },

  // Tabs removed — using shared TabBar component

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
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  infoContent: { flex: 1 },
  infoLabel: { fontSize: 11, color: '#9ca3af', marginBottom: 2 },
  infoValue: { fontSize: 14, fontWeight: '500', color: '#111827' },
  subTitle: { fontSize: 15, fontWeight: '600', color: '#1f2937', marginBottom: 12 },

  participantCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 14,
    marginBottom: 6,
    borderWidth: 1,
    borderColor: '#f3f4f6',
  },
  participantAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#eff6ff',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  participantAvatarText: { fontSize: 14, fontWeight: '700', color: '#2563eb' },
  participantInfo: { flex: 1 },
  participantName: { fontSize: 14, fontWeight: '500', color: '#111827' },

  docCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 14,
    marginBottom: 6,
    borderWidth: 1,
    borderColor: '#f3f4f6',
  },
  docIcon: { marginRight: 12 },
  docInfo: { flex: 1 },
  docName: { fontSize: 14, fontWeight: '500', color: '#111827' },
  docType: { fontSize: 11, color: '#9ca3af', marginTop: 2 },

  emptyText: { fontSize: 13, color: '#9ca3af', textAlign: 'center', paddingVertical: 30 },

  // QR Code
  qrSection: { padding: 16, paddingBottom: 0 },
  qrCard: {
    backgroundColor: '#fff',
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    alignItems: 'center',
  },
  qrHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 },
  qrTitle: { fontSize: 15, fontWeight: '600', color: '#111827' },
  qrHint: { fontSize: 12, color: '#6b7280', marginBottom: 16, textAlign: 'center' },
  qrContainer: {
    padding: 12,
    backgroundColor: '#f9fafb',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
});

import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
} from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useLocalSearchParams } from 'expo-router';
import { safeIconName } from '../../lib/icons';
import QRCode from 'react-native-qrcode-svg';
import apiClient, { unwrap } from '../../lib/api-client';
import { LoadingView, ScreenShell, TabBar } from '../../components/ui/shared';
import { theme } from '../../theme';

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
  draft: { label: 'Draft', bg: theme.colors.surfaceMuted, color: theme.colors.textSecondary },
  published: { label: 'Berlangsung', bg: theme.colors.successLight, color: theme.colors.success },
  closed: { label: 'Selesai', bg: theme.colors.primarySofter, color: theme.colors.primary },
  cancelled: { label: 'Dibatalkan', bg: theme.colors.dangerLight, color: theme.colors.danger },
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
    bg: theme.colors.surfaceMuted,
    color: theme.colors.textSecondary,
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('id-ID', {
      weekday: 'long',
      day: '2-digit',
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
              <Ionicons name={safeIconName(icon)} size={20} color={theme.colors.primary} />
              <View style={styles.infoContent}>
                <Text style={styles.infoLabel}>Tipe Kegiatan</Text>
                <Text style={styles.infoValue}>{activity.tipe}</Text>
              </View>
            </View>
            <View style={styles.infoRow}>
              <Ionicons name="calendar" size={20} color={theme.colors.primary} />
              <View style={styles.infoContent}>
                <Text style={styles.infoLabel}>Tanggal Mulai</Text>
                <Text style={styles.infoValue}>{formatDate(activity.tanggalMulai)}</Text>
              </View>
            </View>
            {activity.tanggalSelesai && (
              <View style={styles.infoRow}>
                <Ionicons name="calendar-outline" size={20} color={theme.colors.primary} />
                <View style={styles.infoContent}>
                  <Text style={styles.infoLabel}>Tanggal Selesai</Text>
                  <Text style={styles.infoValue}>{formatDate(activity.tanggalSelesai)}</Text>
                </View>
              </View>
            )}
            {activity.lokasi && (
              <View style={styles.infoRow}>
                <Ionicons name="location" size={20} color={theme.colors.primary} />
                <View style={styles.infoContent}>
                  <Text style={styles.infoLabel}>Lokasi</Text>
                  <Text style={styles.infoValue}>{activity.lokasi}</Text>
                </View>
              </View>
            )}
            {activity.deskripsi && (
              <View style={styles.infoRow}>
                <Ionicons name="document-text" size={20} color={theme.colors.primary} />
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
                  <Ionicons name="qr-code" size={18} color={theme.colors.primary} />
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
                    color={p.hadir ? theme.colors.success : theme.colors.danger}
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
                    color={theme.colors.primary}
                  />
                </View>
                <View style={styles.docInfo}>
                  <Text style={styles.docName} numberOfLines={1}>
                    {doc.nama}
                  </Text>
                  {doc.tipe && <Text style={styles.docType}>{doc.tipe}</Text>}
                </View>
                <Ionicons name="download-outline" size={20} color={theme.colors.textSecondary} />
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
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: theme.colors.background },
  errorText: { fontSize: 14, color: theme.colors.danger },

  // Tabs removed — using shared TabBar component

  section: { padding: 16 },
  infoCard: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.lg - 2,
    padding: 16,
    borderWidth: 1,
    borderColor: theme.colors.border,
    ...theme.shadow.card,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.surfaceMuted,
  },
  infoContent: { flex: 1 },
  infoLabel: { fontSize: 11, color: theme.colors.textMuted, marginBottom: 2 },
  infoValue: { fontSize: 14, fontWeight: theme.typography.weight.medium, color: theme.colors.text },
  subTitle: { fontSize: 15, fontWeight: theme.typography.weight.semibold, color: theme.colors.text, marginBottom: 12 },

  participantCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.md,
    padding: 14,
    marginBottom: 6,
    borderWidth: 1,
    borderColor: theme.colors.surfaceMuted,
    ...theme.shadow.card,
  },
  participantAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: theme.colors.primarySofter,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  participantAvatarText: { fontSize: 14, fontWeight: theme.typography.weight.bold, color: theme.colors.primary },
  participantInfo: { flex: 1 },
  participantName: { fontSize: 14, fontWeight: theme.typography.weight.medium, color: theme.colors.text },

  docCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.md,
    padding: 14,
    marginBottom: 6,
    borderWidth: 1,
    borderColor: theme.colors.surfaceMuted,
    ...theme.shadow.card,
  },
  docIcon: { marginRight: 12 },
  docInfo: { flex: 1 },
  docName: { fontSize: 14, fontWeight: theme.typography.weight.medium, color: theme.colors.text },
  docType: { fontSize: 11, color: theme.colors.textMuted, marginTop: 2 },

  emptyText: { fontSize: 13, color: theme.colors.textMuted, textAlign: 'center', paddingVertical: 30 },

  // QR Code
  qrSection: { padding: 16, paddingBottom: 0 },
  qrCard: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.lg - 2,
    padding: 16,
    borderWidth: 1,
    borderColor: theme.colors.border,
    alignItems: 'center',
  },
  qrHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 },
  qrTitle: { fontSize: 15, fontWeight: theme.typography.weight.semibold, color: theme.colors.text },
  qrHint: { fontSize: 12, color: theme.colors.textSecondary, marginBottom: 16, textAlign: 'center' },
  qrContainer: {
    padding: 12,
    backgroundColor: theme.colors.background,
    borderRadius: theme.radius.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
});

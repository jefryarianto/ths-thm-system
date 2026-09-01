import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  ActivityIndicator,
  TouchableOpacity,
  Alert,
  Linking,
} from 'react-native';
import * as FileSystem from 'expo-file-system';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { safeIconName } from '../../lib/icons';
import apiClient, { unwrap } from '../../lib/api-client';
import { formatRupiah } from '../../lib/format';
import { ProfileCard, ScreenShell } from '../../components/ui/shared';

interface MemberDetail {
  id: string;
  namaLengkap: string;
  noAnggota: string;
  tingkat: string;
  statusKeanggotaan: string;
  alamat?: string;
  noHp?: string;
  email?: string;
  ranting?: { nama: string };
}

interface DuesItem {
  id: string;
  tahun: number;
  bulan: number;
  jumlah: number;
  status: string;
  tag?: string;
}

interface TrainingItem {
  id: string;
  nama: string;
  tanggal: string;
  statusKehadiran: string;
}

interface DocumentItem {
  id: string;
  tipe: string;
  nomorDokumen: string;
  status: string;
  filePath?: string | null;
  verificationUrl?: string | null;
  createdAt: string;
  updatedAt?: string;
}

/** Label tipe dokumen — sesuai enum TipeDokumen di Prisma. */
const DOKUMEN_TIPE_LABEL: Record<string, string> = {
  kartu_anggota: 'Kartu Anggota (KTA)',
  sertifikat_pendadaran: 'Sertifikat Pendadaran',
  sertifikat_pelatihan: 'Sertifikat Pelatihan',
  piagam_prestasi: 'Piagam Prestasi',
};

/** Label & warna badge status dokumen (enum StatusDokumen). */
const DOKUMEN_STATUS_META: Record<string, { label: string; color: string; bg: string }> = {
  generated: { label: 'Ter-generate', color: '#047857', bg: '#ecfdf5' },
  downloaded: { label: 'Diunduh', color: '#1d4ed8', bg: '#eff6ff' },
  revoked: { label: 'Dicabut', color: '#dc2626', bg: '#fef2f2' },
};

const TIPE_ICONS: Record<string, string> = {
  kartu_anggota: 'card',
  sertifikat_pendadaran: 'ribbon',
  sertifikat_pelatihan: 'school',
  piagam_prestasi: 'trophy',
};

const TABS = [
  { key: 'info', label: 'Info', icon: 'person' },
  { key: 'dues', label: 'Iuran', icon: 'cash' },
  { key: 'trainings', label: 'Latihan', icon: 'fitness' },
  { key: 'documents', label: 'Dokumen', icon: 'document-text' },
];

export default function MemberDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const [member, setMember] = useState<MemberDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('info');

  const [dues, setDues] = useState<DuesItem[]>([]);
  const [duesLoading, setDuesLoading] = useState(false);

  const [trainings, setTrainings] = useState<TrainingItem[]>([]);
  const [trainingsLoading, setTrainingsLoading] = useState(false);

  const [documents, setDocuments] = useState<DocumentItem[]>([]);
  const [docsLoading, setDocsLoading] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const res = await apiClient.get(`/members/${id}`);
        setMember(unwrap(res));
      } catch {
        /* ignore */
      }
      setLoading(false);
    })();
  }, [id]);

  useEffect(() => {
    if (activeTab === 'dues' && dues.length === 0) {
      setDuesLoading(true);
      apiClient
        .get(`/members/${id}/dues`)
        .then((r) => setDues((unwrap(r) ?? []) as DuesItem[]))
        .catch(() => {})
        .finally(() => setDuesLoading(false));
    }
    if (activeTab === 'trainings' && trainings.length === 0) {
      setTrainingsLoading(true);
      apiClient
        .get(`/members/${id}/trainings`)
        .then((r) => setTrainings((unwrap(r) ?? []) as TrainingItem[]))
        .catch(() => {})
        .finally(() => setTrainingsLoading(false));
    }
    if (activeTab === 'documents' && documents.length === 0) {
      setDocsLoading(true);
      apiClient
        .get(`/members/${id}/documents`)
        .then((r) => setDocuments((unwrap(r) ?? []) as DocumentItem[]))
        .catch(() => {})
        .finally(() => setDocsLoading(false));
    }
  }, [activeTab, id]);

  if (loading)
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#2563eb" />
      </View>
    );
  if (!member)
    return (
      <View style={styles.center}>
        <Text style={styles.errorText}>Anggota tidak ditemukan</Text>
      </View>
    );

  const statusColor = member.statusKeanggotaan === 'aktif' ? '#16a34a' : '#dc2626';
  const statusLabel = member.statusKeanggotaan === 'aktif' ? 'Aktif' : 'Nonaktif';

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

  const renderInfo = () => (
    <View style={styles.infoCard}>
      <View style={styles.infoRow}>
        <Ionicons name="card" size={18} color="#6b7280" />
        <View style={styles.infoContent}>
          <Text style={styles.infoLabel}>No. Anggota</Text>
          <Text style={styles.infoValue}>{member.noAnggota}</Text>
        </View>
      </View>
      <View style={styles.infoRow}>
        <Ionicons name="trending-up" size={18} color="#6b7280" />
        <View style={styles.infoContent}>
          <Text style={styles.infoLabel}>Tingkat</Text>
          <Text style={styles.infoValue}>{member.tingkat}</Text>
        </View>
      </View>
      <View style={styles.infoRow}>
        <Ionicons name="shield-checkmark" size={18} color="#6b7280" />
        <View style={styles.infoContent}>
          <Text style={styles.infoLabel}>Status</Text>
          <Text style={[styles.infoValue, { color: statusColor }]}>{statusLabel}</Text>
        </View>
      </View>
      {member.ranting && (
        <View style={styles.infoRow}>
          <Ionicons name="location" size={18} color="#6b7280" />
          <View style={styles.infoContent}>
            <Text style={styles.infoLabel}>Ranting</Text>
            <Text style={styles.infoValue}>{member.ranting.nama}</Text>
          </View>
        </View>
      )}
      {member.alamat && (
        <View style={styles.infoRow}>
          <Ionicons name="home" size={18} color="#6b7280" />
          <View style={styles.infoContent}>
            <Text style={styles.infoLabel}>Alamat</Text>
            <Text style={styles.infoValue}>{member.alamat}</Text>
          </View>
        </View>
      )}
      {member.noHp && (
        <View style={styles.infoRow}>
          <Ionicons name="call" size={18} color="#6b7280" />
          <View style={styles.infoContent}>
            <Text style={styles.infoLabel}>No. HP</Text>
            <Text style={styles.infoValue}>{member.noHp}</Text>
          </View>
        </View>
      )}
      {member.email && (
        <View style={styles.infoRow}>
          <Ionicons name="mail" size={18} color="#6b7280" />
          <View style={styles.infoContent}>
            <Text style={styles.infoLabel}>Email</Text>
            <Text style={styles.infoValue}>{member.email}</Text>
          </View>
        </View>
      )}
    </View>
  );

  const renderDues = () => {
    if (duesLoading)
      return <ActivityIndicator size="small" color="#2563eb" style={{ marginTop: 24 }} />;
    if (dues.length === 0)
      return (
        <View style={styles.empty}>
          <Ionicons name="cash" size={48} color="#d1d5db" />
          <Text style={styles.emptyText}>Belum ada data iuran</Text>
        </View>
      );
    return (
      <FlatList
        data={dues}
        keyExtractor={(item) => item.id}
        scrollEnabled={false}
        contentContainerStyle={{ paddingBottom: 8 }}
        renderItem={({ item }) => {
          const dueStatus = item.status === 'lunas' ? '#16a34a' : '#dc2626';
          const dueLabel = item.status === 'lunas' ? 'Lunas' : 'Belum Lunas';
          return (
            <View style={styles.listCard}>
              <View style={styles.listCardBody}>
                <Text style={styles.listCardTitle}>
                  {months[item.bulan - 1]} {item.tahun}
                </Text>
                <Text style={styles.listCardMeta}>
                  {item.jumlah != null ? formatRupiah(item.jumlah) : ''}
                  {item.tag ? ` · ${item.tag}` : ''}
                </Text>
              </View>
              <View
                style={[
                  styles.statusBadge,
                  { backgroundColor: item.status === 'lunas' ? '#ecfdf5' : '#fef2f2' },
                ]}
              >
                <Text style={[styles.statusText, { color: dueStatus }]}>{dueLabel}</Text>
              </View>
            </View>
          );
        }}
      />
    );
  };

  const renderTrainings = () => {
    if (trainingsLoading)
      return <ActivityIndicator size="small" color="#2563eb" style={{ marginTop: 24 }} />;
    if (trainings.length === 0)
      return (
        <View style={styles.empty}>
          <Ionicons name="fitness" size={48} color="#d1d5db" />
          <Text style={styles.emptyText}>Belum ada data latihan</Text>
        </View>
      );
    return (
      <FlatList
        data={trainings}
        keyExtractor={(item) => item.id}
        scrollEnabled={false}
        contentContainerStyle={{ paddingBottom: 8 }}
        renderItem={({ item }) => {
          const hadirColor =
            item.statusKehadiran === 'hadir'
              ? '#16a34a'
              : item.statusKehadiran === 'izin'
                ? '#d97706'
                : '#dc2626';
          const hadirLabel =
            item.statusKehadiran === 'hadir'
              ? 'Hadir'
              : item.statusKehadiran === 'izin'
                ? 'Izin'
                : 'Absen';
          return (
            <View style={styles.listCard}>
              <View style={styles.listCardBody}>
                <Text style={styles.listCardTitle}>{item.nama}</Text>
                <Text style={styles.listCardMeta}>
                  {new Date(item.tanggal).toLocaleDateString('id-ID', {
                    day: '2-digit',
                    month: 'long',
                    year: 'numeric',
                  })}
                </Text>
              </View>
              <View
                style={[
                  styles.statusBadge,
                  {
                    backgroundColor:
                      item.statusKehadiran === 'hadir'
                        ? '#ecfdf5'
                        : item.statusKehadiran === 'izin'
                          ? '#fef3c7'
                          : '#fef2f2',
                  },
                ]}
              >
                <Text style={[styles.statusText, { color: hadirColor }]}>{hadirLabel}</Text>
              </View>
            </View>
          );
        }}
      />
    );
  };

  /** Ambil token verifikasi dari verificationUrl (/verify/<token> atau /api/documents/verify/<token>). */
  const docVerificationToken = (verificationUrl?: string | null): string | null => {
    if (!verificationUrl) return null;
    const m = verificationUrl.match(/\/verify\/([^/?#]+)/);
    return m ? m[1] : null;
  };

  /** Verifikasi dokumen via endpoint publik (tanpa login). */
  const verifyDocument = async (doc: DocumentItem) => {
    const token = docVerificationToken(doc.verificationUrl);
    if (!token) {
      Alert.alert('Verifikasi', 'Token verifikasi tidak tersedia untuk dokumen ini.');
      return;
    }
    try {
      const { data } = await apiClient.get(`/documents/verify/${token}`);
      const d = data?.data || {};
      Alert.alert(
        d.valid ? '✓ Dokumen Valid' : 'Dokumen Tidak Valid',
        `No: ${d.nomorDokumen || '-'}\nAnggota: ${d.namaAnggota || '-'}\nTipe: ${DOKUMEN_TIPE_LABEL[d.tipe] || d.tipe || '-'}`,
      );
    } catch {
      Alert.alert('Verifikasi', 'Gagal memverifikasi dokumen.');
    }
  };

  /** Download file dokumen (KTA → digital-card endpoint; lain → /documents/:id/file). */
  const downloadDocument = async (doc: DocumentItem) => {
    try {
      const token = await AsyncStorage.getItem('accessToken');
      const headers: Record<string, string> = token ? { Authorization: `Bearer ${token}` } : {};
      let url = '';
      let filename = '';

      if (doc.tipe === 'kartu_anggota') {
        url = `${apiClient.defaults.baseURL}/members/${id}/digital-card/pdf`;
        filename = `KTA-${doc.nomorDokumen || id}.pdf`;
      } else {
        url = `${apiClient.defaults.baseURL}/documents/${doc.id}/file`;
        const ext = doc.filePath?.toLowerCase().endsWith('.png') ? '.png' : '.pdf';
        filename = `${doc.nomorDokumen || 'dokumen'}${ext}`;
      }

      const fileUri = `${FileSystem.cacheDirectory}${filename}`;
      const res = await FileSystem.downloadAsync(url, fileUri, { headers });
      if (res.status !== 200) {
        Alert.alert('Gagal', 'File dokumen belum tersedia. Generate ulang dokumen.');
        return;
      }
      await Linking.openURL(fileUri);
    } catch {
      Alert.alert('Gagal', 'Tidak dapat mengunduh dokumen. Coba lagi.');
    }
  };

  const renderDocuments = () => {
    if (docsLoading)
      return <ActivityIndicator size="small" color="#2563eb" style={{ marginTop: 24 }} />;
    if (documents.length === 0)
      return (
        <View style={styles.empty}>
          <Ionicons name="document-text" size={48} color="#d1d5db" />
          <Text style={styles.emptyText}>Belum ada dokumen</Text>
        </View>
      );

    // Ringkasan per tipe dokumen
    const types = ['kartu_anggota', 'sertifikat_pendadaran', 'sertifikat_pelatihan', 'piagam_prestasi'] as const;
    const summary = types.map((t) => ({
      tipe: t,
      count: documents.filter((d) => d.tipe === t).length,
    }));

    return (
      <>
        {/* Summary cards per tipe */}
        <View style={styles.docSummaryRow}>
          {summary.map((s) => (
            <View key={s.tipe} style={styles.docSummaryCard}>
              <Ionicons name={safeIconName(TIPE_ICONS[s.tipe] || 'document-text')} size={16} color="#2563eb" />
              <Text style={styles.docSummaryLabel} numberOfLines={1}>
                {DOKUMEN_TIPE_LABEL[s.tipe] || s.tipe}
              </Text>
              <Text style={styles.docSummaryCount}>{s.count}</Text>
            </View>
          ))}
        </View>

        <FlatList
          data={documents}
          keyExtractor={(item) => item.id}
          scrollEnabled={false}
          contentContainerStyle={{ paddingBottom: 8 }}
          renderItem={({ item }) => {
            const statusMeta = DOKUMEN_STATUS_META[item.status] || {
              label: item.status || '-',
              color: '#6b7280',
              bg: '#f3f4f6',
            };
            return (
              <View style={styles.docCard}>
                <View style={styles.docCardTop}>
                  <Ionicons
                    name={safeIconName(TIPE_ICONS[item.tipe] || 'document-text')}
                    size={22}
                    color="#2563eb"
                    style={{ marginRight: 10 }}
                  />
                  <View style={styles.listCardBody}>
                    <Text style={styles.docTitle}>
                      {DOKUMEN_TIPE_LABEL[item.tipe] || item.tipe || '-'}
                    </Text>
                    <Text style={styles.docNumber}>{item.nomorDokumen || '-'}</Text>
                  </View>
                  <View style={[styles.statusBadge, { backgroundColor: statusMeta.bg }]}>
                    <Text style={[styles.statusText, { color: statusMeta.color }]}>{statusMeta.label}</Text>
                  </View>
                </View>
                <View style={styles.docCardMeta}>
                  <Text style={styles.docMetaText}>
                    Dibuat:{' '}
                    {new Date(item.createdAt).toLocaleDateString('id-ID', {
                      day: '2-digit',
                      month: 'long',
                      year: 'numeric',
                    })}
                  </Text>
                  {item.updatedAt ? (
                    <Text style={styles.docMetaText}>
                      · Diperbarui:{' '}
                      {new Date(item.updatedAt).toLocaleDateString('id-ID', {
                        day: '2-digit',
                        month: 'long',
                        year: 'numeric',
                      })}
                    </Text>
                  ) : null}
                </View>
                <View style={styles.docActions}>
                  {(item.tipe === 'kartu_anggota' || item.filePath) && (
                    <TouchableOpacity
                      style={styles.docActionBtn}
                      onPress={() => downloadDocument(item)}
                    >
                      <Ionicons name="download" size={15} color="#2563eb" />
                      <Text style={styles.docActionText}>Download</Text>
                    </TouchableOpacity>
                  )}
                  {docVerificationToken(item.verificationUrl) && (
                    <TouchableOpacity
                      style={styles.docActionBtn}
                      onPress={() => verifyDocument(item)}
                    >
                      <Ionicons name="shield-checkmark" size={15} color="#047857" />
                      <Text style={[styles.docActionText, { color: '#047857' }]}>Verifikasi</Text>
                    </TouchableOpacity>
                  )}
                  <TouchableOpacity
                    style={styles.docActionBtn}
                    onPress={() => router.push(`/documents/${item.id}` as any)}
                  >
                    <Ionicons name="open-outline" size={15} color="#6b7280" />
                    <Text style={[styles.docActionText, { color: '#6b7280' }]}>Detail</Text>
                  </TouchableOpacity>
                </View>
              </View>
            );
          }}
        />
      </>
    );
  };

  const tabContent = () => {
    switch (activeTab) {
      case 'info':
        return renderInfo();
      case 'dues':
        return renderDues();
      case 'trainings':
        return renderTrainings();
      case 'documents':
        return renderDocuments();
      default:
        return null;
    }
  };

  return (
    <ScreenShell title="Detail Anggota" variant="detail" badgeLabel={statusLabel} badgeColor={statusColor} badgeBg={member.statusKeanggotaan === 'aktif' ? '#ecfdf5' : '#fef2f2'}>

      <ProfileCard
        name={member.namaLengkap}
        initial={member.namaLengkap.charAt(0)}
        badgeLabel={statusLabel}
        badgeColor={statusColor}
        badgeBg={member.statusKeanggotaan === 'aktif' ? '#ecfdf5' : '#fef2f2'}
        subtitle={member.ranting?.nama}
        containerStyle={{ margin: 16, marginBottom: 0 }}
      />

      <View style={styles.tabRow}>
        {TABS.map((tab) => (
          <TouchableOpacity
            key={tab.key}
            style={[styles.tab, activeTab === tab.key && styles.tabActive]}
            onPress={() => setActiveTab(tab.key)}
          >
            <Ionicons
              name={safeIconName(tab.icon)}
              size={16}
              color={activeTab === tab.key ? '#2563eb' : '#6b7280'}
            />
            <Text style={[styles.tabLabel, activeTab === tab.key && styles.tabLabelActive]}>
              {tab.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <View style={styles.tabContent}>{tabContent()}</View>

    </ScreenShell>
  );
}const styles = StyleSheet.create({
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#f3f4f6' },
  errorText: { fontSize: 14, color: '#ef4444' },

  tabRow: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    marginHorizontal: 16,
    marginTop: 12,
    borderRadius: 12,
    padding: 4,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    paddingVertical: 8,
    borderRadius: 10,
  },
  tabActive: { backgroundColor: '#eff6ff' },
  tabLabel: { fontSize: 12, fontWeight: '500', color: '#6b7280' },
  tabLabelActive: { color: '#2563eb', fontWeight: '600' },

  tabContent: { paddingHorizontal: 16, marginTop: 12 },

  // Used by renderDues() and renderTrainings() list items
  statusBadge: { paddingHorizontal: 14, paddingVertical: 5, borderRadius: 12 },
  statusText: { fontSize: 12, fontWeight: '600' },

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

  listCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 14,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#f3f4f6',
  },
  listCardBody: { flex: 1 },
  listCardTitle: { fontSize: 14, fontWeight: '600', color: '#111827' },
  listCardMeta: { fontSize: 12, color: '#6b7280', marginTop: 2 },

  empty: { alignItems: 'center', paddingTop: 40 },
  emptyText: { fontSize: 14, color: '#9ca3af', marginTop: 12 },

  // ── Dokumen tab ──
  docSummaryRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 12,
  },
  docSummaryCard: {
    width: '48%',
    flexGrow: 1,
    backgroundColor: '#fff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    padding: 12,
    gap: 2,
  },
  docSummaryLabel: { fontSize: 11, color: '#6b7280' },
  docSummaryCount: { fontSize: 20, fontWeight: '700', color: '#111827' },

  docCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 14,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#f3f4f6',
  },
  docCardTop: { flexDirection: 'row', alignItems: 'center' },
  docTitle: { fontSize: 14, fontWeight: '600', color: '#111827' },
  docNumber: { fontSize: 12, fontFamily: 'monospace', color: '#2563eb', marginTop: 2 },
  docCardMeta: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 4,
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#f3f4f6',
  },
  docMetaText: { fontSize: 11, color: '#9ca3af' },
  docActions: { flexDirection: 'row', gap: 8, marginTop: 10 },
  docActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: '#eff6ff',
  },
  docActionText: { fontSize: 12, fontWeight: '600', color: '#2563eb' },
});

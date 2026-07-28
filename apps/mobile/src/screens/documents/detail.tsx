import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  Linking,
  Image,
} from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useLocalSearchParams } from 'expo-router';
import apiClient, { unwrap } from '../../lib/api-client';
import { LoadingView, InfoRow, StatusBadge, ScreenShell, referenceStyles } from '../../components/ui/shared';
import type { Document } from '../../types';

const TIPE_LABELS: Record<string, string> = {
  kartu_anggota: 'Kartu Anggota',
  sertifikat_pendadaran: 'Sertifikat Pendadaran',
  sertifikat_pelatihan: 'Sertifikat Pelatihan',
  piagam_prestasi: 'Piagam Prestasi',
  surat_keterangan: 'Surat Keterangan',
};

const STATUS_STYLES: Record<string, { label: string; color: string; bg: string }> = {
  draft: { label: 'Draft', color: '#6b7280', bg: '#f3f4f6' },
  published: { label: 'Published', color: '#16a34a', bg: '#ecfdf5' },
  archived: { label: 'Diarsipkan', color: '#d97706', bg: '#fef3c7' },
};

export default function DocumentDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [document, setDocument] = useState<Document | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const res = await apiClient.get(`/documents/${id}`);
        setDocument(unwrap(res));
      } catch {
        /* ignore */
      }
      setLoading(false);
    })();
  }, [id]);

  if (loading) return <LoadingView message="Memuat dokumen..." />;
  if (!document)
    return (
      <View style={styles.center}>
        <Text style={styles.errorText}>Dokumen tidak ditemukan</Text>
      </View>
    );

  const ss = STATUS_STYLES[document.status] || {
    label: document.status,
    color: '#6b7280',
    bg: '#f3f4f6',
  };

  const handleDownload = async () => {
    if (document.filePath) {
      try {
        const url = `${apiClient.defaults.baseURL}${document.filePath}`;
        await Linking.openURL(url);
      } catch {
        Alert.alert('Error', 'Tidak bisa membuka dokumen');
      }
    }
  };

  return (
    <ScreenShell title="Detail Dokumen" variant="detail" badgeLabel={ss.label} badgeColor={ss.color} badgeBg={ss.bg}>

      <View style={styles.section}>
        <View style={referenceStyles.cardSection}>
          <InfoRow icon="document-text" label="Tipe" value={TIPE_LABELS[document.tipe] || document.tipe} />
          <InfoRow icon="document" label="Nomor Dokumen" value={document.nomorDokumen} />
          {document.anggota && <InfoRow icon="person" label="Anggota" value={document.anggota.namaLengkap} />}
          <InfoRow icon="calendar" label="Tanggal Generate" value={new Date(document.createdAt).toLocaleDateString('id-ID')} />
          <View style={styles.statusRow}>
            <Ionicons name="flag" size={15} color="#9ca3af" />
            <View style={{ flex: 1 }}>
              <Text style={referenceStyles.infoLabel}>Status</Text>
              <StatusBadge label={ss.label} color={ss.color} bg={ss.bg} />
            </View>
          </View>
        </View>
      </View>

      {document.filePath && (
        <View style={styles.section}>
          <TouchableOpacity style={styles.downloadBtn} onPress={handleDownload}>
            <Ionicons name="download" size={18} color="#fff" />
            <Text style={styles.downloadBtnText}>Download / Lihat Dokumen</Text>
          </TouchableOpacity>
        </View>
      )}

      {document.qrCode && (
        <View style={styles.section}>
          <Text style={styles.subTitle}>QR Code</Text>
          <View style={styles.qrContainer}>
            <Image source={{ uri: document.qrCode }} style={styles.qrImage} resizeMode="contain" />
          </View>
        </View>
      )}

    </ScreenShell>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#f3f4f6' },
  errorText: { fontSize: 14, color: '#ef4444' },

  section: { padding: 16 },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 10,
    paddingHorizontal: 12,
  },

  downloadBtn: {
    backgroundColor: '#2563eb',
    borderRadius: 12,
    paddingVertical: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  downloadBtnText: { fontSize: 15, fontWeight: '600', color: '#fff' },

  subTitle: { fontSize: 15, fontWeight: '600', color: '#1f2937', marginBottom: 12 },
  qrContainer: {
    backgroundColor: '#fff',
    borderRadius: 14,
    padding: 24,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  qrImage: { width: 200, height: 200 },
});

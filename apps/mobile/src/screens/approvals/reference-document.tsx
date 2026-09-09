import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert, Linking, Image } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useLocalSearchParams } from 'expo-router';
import { useReferenceDetail } from '../../hooks/use-reference-detail';
import { InfoRow, SectionTitle, StatusCard, ScreenShell, ReferenceScreenState, referenceStyles } from '../../components/ui/shared';
import apiClient from '../../lib/api-client';
import type { Document } from '../../types';
import { theme } from '../../theme';

// ─── Constants ──────────────────────────────────────────────

const TIPE_LABELS: Record<string, string> = {
  kartu_anggota: 'Kartu Anggota',
  sertifikat_pendadaran: 'Sertifikat Pendadaran',
  sertifikat_pelatihan: 'Sertifikat Pelatihan',
  piagam_prestasi: 'Piagam Prestasi',
  surat_keterangan: 'Surat Keterangan',
};

const STATUS_STYLES: Record<string, { label: string; color: string; bg: string; icon: string }> = {
  draft: { label: 'Draft', color: theme.colors.textSecondary, bg: theme.colors.surfaceMuted, icon: 'document' },
  published: { label: 'Published', color: theme.colors.success, bg: theme.colors.successLight, icon: 'checkmark-circle' },
  archived: { label: 'Diarsipkan', color: theme.colors.warning, bg: theme.colors.warningLight, icon: 'archive' },
};

// ─── Screen ─────────────────────────────────────────────────

export default function ReferenceDocumentScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { data: document, loading, error, refetch } = useReferenceDetail<Document>(id, '/documents/', 'dokumen');

  const stateView = (
    <ReferenceScreenState id={id} loading={loading} error={error} title="Detail Dokumen" onRetry={refetch} />
  );
  if (stateView) return stateView;
  if (!document) return null;

  const st = STATUS_STYLES[document.status] || { label: document.status, color: theme.colors.textSecondary, bg: theme.colors.surfaceMuted, icon: 'document' };
  const tipeLabel = TIPE_LABELS[document.tipe] || document.tipe;

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
    <ScreenShell title="Detail Dokumen" variant="reference" onRefresh={refetch} badgeLabel={st.label} badgeColor={st.color} badgeBg={st.bg}>
      <StatusCard
        icon={st.icon}
        color={st.color}
        bg={st.bg}
        title={tipeLabel}
        badgeLabel={st.label}
        subtitle={`No: ${document.nomorDokumen}`}
        createdAt={document.createdAt}
      />

      {/* Document Info */}
      <View style={referenceStyles.cardSection}>
        <SectionTitle icon="document-text" text="Informasi Dokumen" />
        <InfoRow icon="file-tray" label="Tipe" value={tipeLabel} />
        <InfoRow icon="document" label="Nomor Dokumen" value={document.nomorDokumen} />
        {document.anggota && <InfoRow icon="person" label="Anggota" value={document.anggota.namaLengkap} />}
        <InfoRow icon="flag" label="Status" value={st.label} />
      </View>

      {/* Download */}
      {document.filePath && (
        <View style={referenceStyles.cardSection}>
          <TouchableOpacity style={styles.downloadBtn} onPress={handleDownload} activeOpacity={0.7}>
            <Ionicons name="download" size={18} color={theme.colors.surface} />
            <Text style={styles.downloadBtnText}>Download / Lihat Dokumen</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* QR Code */}
      {document.qrCode && (
        <View style={referenceStyles.cardSection}>
          <SectionTitle icon="qr-code" text="QR Code" />
          <View style={styles.qrContainer}>
            <Image source={{ uri: document.qrCode }} style={styles.qrImage} resizeMode="contain" />
          </View>
        </View>
      )}
    </ScreenShell>
  );
}

// ─── Styles ─────────────────────────────────────────────────

const styles = StyleSheet.create({
  downloadBtn: { backgroundColor: theme.colors.primary, borderRadius: 12, paddingVertical: 14, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  downloadBtnText: { fontSize: 15, fontWeight: '600', color: theme.colors.surface },
  qrContainer: { backgroundColor: theme.colors.surfaceMuted, borderRadius: 10, padding: 16, alignItems: 'center' },
  qrImage: { width: 200, height: 200 },
});

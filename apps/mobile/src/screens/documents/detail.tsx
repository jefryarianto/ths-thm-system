import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  Linking,
  Image,
} from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useLocalSearchParams, router } from 'expo-router';
import apiClient, { unwrap } from '../../lib/api-client';
import { LoadingView } from '../../components/ui/shared';
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
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={22} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Detail Dokumen</Text>
      </View>

      <View style={styles.section}>
        <View style={styles.infoCard}>
          <View style={styles.infoRow}>
            <Ionicons name="document-text" size={18} color="#2563eb" />
            <View style={styles.infoContent}>
              <Text style={styles.infoLabel}>Tipe</Text>
              <Text style={styles.infoValue}>{TIPE_LABELS[document.tipe] || document.tipe}</Text>
            </View>
          </View>
          <View style={styles.infoRow}>
            <Ionicons name="document" size={18} color="#2563eb" />
            <View style={styles.infoContent}>
              <Text style={styles.infoLabel}>Nomor Dokumen</Text>
              <Text style={styles.infoValue}>{document.nomorDokumen}</Text>
            </View>
          </View>
          {document.anggota && (
            <View style={styles.infoRow}>
              <Ionicons name="person" size={18} color="#2563eb" />
              <View style={styles.infoContent}>
                <Text style={styles.infoLabel}>Anggota</Text>
                <Text style={styles.infoValue}>{document.anggota.namaLengkap}</Text>
              </View>
            </View>
          )}
          <View style={styles.infoRow}>
            <Ionicons name="calendar" size={18} color="#2563eb" />
            <View style={styles.infoContent}>
              <Text style={styles.infoLabel}>Tanggal Generate</Text>
              <Text style={styles.infoValue}>
                {new Date(document.createdAt).toLocaleDateString('id-ID')}
              </Text>
            </View>
          </View>
          <View style={styles.infoRow}>
            <Ionicons name="flag" size={18} color="#2563eb" />
            <View style={styles.infoContent}>
              <Text style={styles.infoLabel}>Status</Text>
              <View style={[styles.statusBadge, { backgroundColor: ss.bg }]}>
                <Text style={[styles.statusText, { color: ss.color }]}>{ss.label}</Text>
              </View>
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
  headerTitle: { color: '#fff', fontSize: 18, fontWeight: '700' },

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
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 8,
    alignSelf: 'flex-start',
  },
  statusText: { fontSize: 11, fontWeight: '600' },

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

import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, ActivityIndicator, TouchableOpacity, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, router } from 'expo-router';
import apiClient, { unwrap } from '../../lib/api-client';
import { LoadingView } from '../../components/ui/shared';

interface LetterDetail {
  id: string;
  nomorSurat: string;
  perihal: string;
  tanggalSurat: string;
  status: string;
  pengirim?: string;
  tujuan?: string;
  lampiran?: string;
  isiSurat?: string;
  disposisi?: Array<{
    id: string;
    tujuan: string;
    catatan?: string;
    status: string;
  }>;
}

const STATUS_STYLES: Record<string, { label: string; bg: string; color: string }> = {
  draft: { label: 'Draft', bg: '#f3f4f6', color: '#6b7280' },
  diterima: { label: 'Diterima', bg: '#eff6ff', color: '#2563eb' },
  diproses: { label: 'Diproses', bg: '#fef3c7', color: '#d97706' },
  terkirim: { label: 'Terkirim', bg: '#ecfdf5', color: '#16a34a' },
  diarsipkan: { label: 'Diarsipkan', bg: '#f3f4f6', color: '#6b7280' },
};

export default function LetterDetailScreen() {
  const { id, type } = useLocalSearchParams<{ id: string; type: string }>();
  const isIncoming = type === 'incoming';
  const [letter, setLetter] = useState<LetterDetail | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const endpoint = isIncoming ? `/letters/incoming/${id}` : `/letters/outgoing/${id}`;
        const res = await apiClient.get(endpoint);
        setLetter(unwrap(res));
      } catch { /* ignore */ }
      setLoading(false);
    })();
  }, [id, type]);

  if (loading) return <LoadingView message="Memuat detail surat..." />;
  if (!letter) return <View style={styles.center}><Text style={styles.errorText}>Surat tidak ditemukan</Text></View>;

  const statusStyle = STATUS_STYLES[letter.status] || { label: letter.status, bg: '#f3f4f6', color: '#6b7280' };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={22} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Detail Surat</Text>
      </View>

      <View style={styles.section}>
        {/* Status & Number */}
        <View style={styles.statusCard}>
          <View style={[styles.statusBadgeLarge, { backgroundColor: statusStyle.bg }]}>
            <Ionicons
              name={isIncoming ? 'mail-open' : 'mail'}
              size={28}
              color={statusStyle.color}
            />
          </View>
          <Text style={styles.nomorSurat}>{letter.nomorSurat}</Text>
          <View style={[styles.statusBadge, { backgroundColor: statusStyle.bg }]}>
            <Text style={[styles.statusText, { color: statusStyle.color }]}>{statusStyle.label}</Text>
          </View>
        </View>

        {/* Detail Info */}
        <View style={styles.infoCard}>
          <View style={styles.infoRow}>
            <Ionicons name="document-text" size={18} color="#6b7280" />
            <View style={styles.infoContent}>
              <Text style={styles.infoLabel}>Perihal</Text>
              <Text style={styles.infoValue}>{letter.perihal}</Text>
            </View>
          </View>
          <View style={styles.infoRow}>
            <Ionicons name="calendar" size={18} color="#6b7280" />
            <View style={styles.infoContent}>
              <Text style={styles.infoLabel}>Tanggal Surat</Text>
              <Text style={styles.infoValue}>{formatDate(letter.tanggalSurat)}</Text>
            </View>
          </View>
          {isIncoming && letter.pengirim && (
            <View style={styles.infoRow}>
              <Ionicons name="person" size={18} color="#6b7280" />
              <View style={styles.infoContent}>
                <Text style={styles.infoLabel}>Pengirim</Text>
                <Text style={styles.infoValue}>{letter.pengirim}</Text>
              </View>
            </View>
          )}
          {!isIncoming && letter.tujuan && (
            <View style={styles.infoRow}>
              <Ionicons name="person" size={18} color="#6b7280" />
              <View style={styles.infoContent}>
                <Text style={styles.infoLabel}>Tujuan</Text>
                <Text style={styles.infoValue}>{letter.tujuan}</Text>
              </View>
            </View>
          )}
          {letter.lampiran && (
            <View style={styles.infoRow}>
              <Ionicons name="attach" size={18} color="#6b7280" />
              <View style={styles.infoContent}>
                <Text style={styles.infoLabel}>Lampiran</Text>
                <Text style={styles.infoValue}>{letter.lampiran}</Text>
              </View>
            </View>
          )}
        </View>

        {/* Content */}
        {letter.isiSurat && (
          <View style={styles.contentCard}>
            <Text style={styles.contentLabel}>Isi Surat</Text>
            <Text style={styles.contentText}>{letter.isiSurat}</Text>
          </View>
        )}

        {/* Disposition (for incoming) */}
        {isIncoming && letter.disposisi && letter.disposisi.length > 0 && (
          <View style={styles.disposisiSection}>
            <Text style={styles.subTitle}>Disposisi ({letter.disposisi.length})</Text>
            {letter.disposisi.map((d) => (
              <View key={d.id} style={styles.disposisiCard}>
                <View style={styles.disposisiHeader}>
                  <Ionicons name="arrow-forward-circle" size={18} color="#d97706" />
                  <Text style={styles.disposisiTujuan}>{d.tujuan}</Text>
                </View>
                {d.catatan && <Text style={styles.disposisiCatatan}>{d.catatan}</Text>}
                <Text style={styles.disposisiStatus}>Status: {d.status}</Text>
              </View>
            ))}
          </View>
        )}
      </View>

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
  headerTitle: { color: '#fff', fontSize: 18, fontWeight: '700' },

  section: { padding: 16 },
  statusCard: { backgroundColor: '#fff', borderRadius: 16, padding: 24, alignItems: 'center', marginBottom: 12, borderWidth: 1, borderColor: '#e5e7eb' },
  statusBadgeLarge: { width: 56, height: 56, borderRadius: 28, alignItems: 'center', justifyContent: 'center', marginBottom: 12 },
  nomorSurat: { fontSize: 16, fontWeight: '700', color: '#111827', textAlign: 'center' },
  statusBadge: { paddingHorizontal: 14, paddingVertical: 5, borderRadius: 12, marginTop: 8 },
  statusText: { fontSize: 12, fontWeight: '600' },

  infoCard: { backgroundColor: '#fff', borderRadius: 14, padding: 16, marginBottom: 12, borderWidth: 1, borderColor: '#e5e7eb' },
  infoRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 12, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#f3f4f6' },
  infoContent: { flex: 1 },
  infoLabel: { fontSize: 11, color: '#9ca3af', marginBottom: 2 },
  infoValue: { fontSize: 14, fontWeight: '500', color: '#111827' },

  contentCard: { backgroundColor: '#fff', borderRadius: 14, padding: 16, marginBottom: 12, borderWidth: 1, borderColor: '#e5e7eb' },
  contentLabel: { fontSize: 13, fontWeight: '600', color: '#374151', marginBottom: 8 },
  contentText: { fontSize: 14, color: '#4b5563', lineHeight: 22 },

  disposisiSection: { marginTop: 4 },
  subTitle: { fontSize: 15, fontWeight: '600', color: '#1f2937', marginBottom: 12 },
  disposisiCard: { backgroundColor: '#fff', borderRadius: 12, padding: 14, marginBottom: 6, borderWidth: 1, borderColor: '#fef3c7', borderLeftWidth: 3, borderLeftColor: '#d97706' },
  disposisiHeader: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  disposisiTujuan: { fontSize: 14, fontWeight: '600', color: '#111827' },
  disposisiCatatan: { fontSize: 13, color: '#6b7280', marginTop: 6, marginLeft: 26 },
  disposisiStatus: { fontSize: 11, color: '#9ca3af', marginTop: 6, marginLeft: 26 },
});

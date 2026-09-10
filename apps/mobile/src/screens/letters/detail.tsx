import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
} from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useLocalSearchParams } from 'expo-router';
import apiClient, { unwrap } from '../../lib/api-client';
import { LoadingView, ScreenShell } from '../../components/ui/shared';
import { theme } from '../../theme';

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
  draft: { label: 'Draft', bg: theme.colors.surfaceMuted, color: theme.colors.textSecondary },
  diterima: { label: 'Diterima', bg: theme.colors.primarySofter, color: theme.colors.primary },
  diproses: { label: 'Diproses', bg: theme.colors.warningLight, color: theme.colors.warning },
  terkirim: { label: 'Terkirim', bg: theme.colors.successLight, color: theme.colors.success },
  diarsipkan: { label: 'Diarsipkan', bg: theme.colors.surfaceMuted, color: theme.colors.textSecondary },
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
      } catch {
        /* ignore */
      }
      setLoading(false);
    })();
  }, [id, type]);

  if (loading) return <LoadingView message="Memuat detail surat..." />;
  if (!letter)
    return (
      <View style={styles.center}>
        <Text style={styles.errorText}>Surat tidak ditemukan</Text>
      </View>
    );

  const statusStyle = STATUS_STYLES[letter.status] || {
    label: letter.status,
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

  return (
    <ScreenShell title="Detail Surat" variant="detail" badgeLabel={statusStyle.label} badgeColor={statusStyle.color} badgeBg={statusStyle.bg}>

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
            <Text style={[styles.statusText, { color: statusStyle.color }]}>
              {statusStyle.label}
            </Text>
          </View>
        </View>

        {/* Detail Info */}
        <View style={styles.infoCard}>
          <View style={styles.infoRow}>
            <Ionicons name="document-text" size={18} color={theme.colors.textSecondary} />
            <View style={styles.infoContent}>
              <Text style={styles.infoLabel}>Perihal</Text>
              <Text style={styles.infoValue}>{letter.perihal}</Text>
            </View>
          </View>
          <View style={styles.infoRow}>
            <Ionicons name="calendar" size={18} color={theme.colors.textSecondary} />
            <View style={styles.infoContent}>
              <Text style={styles.infoLabel}>Tanggal Surat</Text>
              <Text style={styles.infoValue}>{formatDate(letter.tanggalSurat)}</Text>
            </View>
          </View>
          {isIncoming && letter.pengirim && (
            <View style={styles.infoRow}>
              <Ionicons name="person" size={18} color={theme.colors.textSecondary} />
              <View style={styles.infoContent}>
                <Text style={styles.infoLabel}>Pengirim</Text>
                <Text style={styles.infoValue}>{letter.pengirim}</Text>
              </View>
            </View>
          )}
          {!isIncoming && letter.tujuan && (
            <View style={styles.infoRow}>
              <Ionicons name="person" size={18} color={theme.colors.textSecondary} />
              <View style={styles.infoContent}>
                <Text style={styles.infoLabel}>Tujuan</Text>
                <Text style={styles.infoValue}>{letter.tujuan}</Text>
              </View>
            </View>
          )}
          {letter.lampiran && (
            <View style={styles.infoRow}>
              <Ionicons name="attach" size={18} color={theme.colors.textSecondary} />
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
                  <Ionicons name="arrow-forward-circle" size={18} color={theme.colors.warning} />
                  <Text style={styles.disposisiTujuan}>{d.tujuan}</Text>
                </View>
                {d.catatan && <Text style={styles.disposisiCatatan}>{d.catatan}</Text>}
                <Text style={styles.disposisiStatus}>Status: {d.status}</Text>
              </View>
            ))}
          </View>
        )}
      </View>

    </ScreenShell>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: theme.colors.surfaceMuted },
  errorText: { fontSize: 14, color: theme.colors.danger },

  section: { padding: 16 },
  statusCard: {
    backgroundColor: theme.colors.surface,
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    marginBottom: 12,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  statusBadgeLarge: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  nomorSurat: { fontSize: 16, fontWeight: '700', color: theme.colors.text, textAlign: 'center' },
  statusBadge: { paddingHorizontal: 14, paddingVertical: 5, borderRadius: 12, marginTop: 8 },
  statusText: { fontSize: 12, fontWeight: '600' },

  infoCard: {
    backgroundColor: theme.colors.surface,
    borderRadius: 14,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: theme.colors.border,
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
  infoValue: { fontSize: 14, fontWeight: '500', color: theme.colors.text },

  contentCard: {
    backgroundColor: theme.colors.surface,
    borderRadius: 14,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  contentLabel: { fontSize: 13, fontWeight: '600', color: theme.colors.textSecondary, marginBottom: 8 },
  contentText: { fontSize: 14, color: theme.colors.textSecondary, lineHeight: 22 },

  disposisiSection: { marginTop: 4 },
  subTitle: { fontSize: 15, fontWeight: '600', color: theme.colors.text, marginBottom: 12 },
  disposisiCard: {
    backgroundColor: theme.colors.surface,
    borderRadius: 12,
    padding: 14,
    marginBottom: 6,
    borderWidth: 1,
    borderColor: theme.colors.warningLight,
    borderLeftWidth: 3,
    borderLeftColor: theme.colors.warning,
  },
  disposisiHeader: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  disposisiTujuan: { fontSize: 14, fontWeight: '600', color: theme.colors.text },
  disposisiCatatan: { fontSize: 13, color: theme.colors.textSecondary, marginTop: 6, marginLeft: 26 },
  disposisiStatus: { fontSize: 11, color: theme.colors.textMuted, marginTop: 6, marginLeft: 26 },
});

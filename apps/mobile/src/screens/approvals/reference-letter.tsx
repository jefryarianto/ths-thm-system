import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useLocalSearchParams } from 'expo-router';
import { useReferenceDetail } from '../../hooks/use-reference-detail';
import { InfoRow, SectionTitle, StatusCard, ScreenShell, ReferenceScreenState, referenceStyles } from '../../components/ui/shared';
import { theme } from '../../theme';

// ─── Types ──────────────────────────────────────────────────

interface DisposisiItem {
  id: string;
  tujuan: string;
  catatan?: string;
  status: string;
}

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
  disposisi?: DisposisiItem[];
}

// ─── Constants ──────────────────────────────────────────────

const STATUS_STYLES: Record<string, { label: string; bg: string; color: string; icon: string }> = {
  draft: { label: 'Draft', bg: theme.colors.surfaceMuted, color: theme.colors.textSecondary, icon: 'document' },
  diterima: { label: 'Diterima', bg: theme.colors.primarySofter, color: theme.colors.primary, icon: 'mail-open' },
  diproses: { label: 'Diproses', bg: theme.colors.warningLight, color: theme.colors.warning, icon: 'sync' },
  terkirim: { label: 'Terkirim', bg: theme.colors.successLight, color: theme.colors.success, icon: 'mail' },
  diarsipkan: { label: 'Diarsipkan', bg: theme.colors.surfaceMuted, color: theme.colors.textSecondary, icon: 'archive' },
};

// ─── Screen ─────────────────────────────────────────────────

export default function ReferenceLetterScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { data: letter, loading, error, refetch } = useReferenceDetail<LetterDetail>(id, '/letters/outgoing/', 'surat');

  const stateView = (
    <ReferenceScreenState id={id} loading={loading} error={error} title="Detail Surat" onRetry={refetch} />
  );
  if (stateView) return stateView;
  if (!letter) return null;

  const st = STATUS_STYLES[letter.status] || { label: letter.status, bg: theme.colors.surfaceMuted, color: theme.colors.textSecondary, icon: 'document' };

  return (
    <ScreenShell title="Detail Surat" variant="reference" onRefresh={refetch} badgeLabel={st.label} badgeColor={st.color} badgeBg={st.bg}>
      <StatusCard
        variant="centered"
        icon={st.icon}
        color={st.color}
        bg={st.bg}
        title={letter.nomorSurat}
        badgeLabel={st.label}
      />

      {/* Letter Info */}
      <View style={referenceStyles.cardSection}>
        <SectionTitle icon="document-text" text="Informasi Surat" />
        <InfoRow icon="document-text" label="Perihal" value={letter.perihal} />
        <InfoRow icon="calendar" label="Tanggal Surat" value={fmtFullDate(letter.tanggalSurat)} />
        {letter.pengirim && <InfoRow icon="person" label="Pengirim" value={letter.pengirim} />}
        {letter.tujuan && <InfoRow icon="person" label="Tujuan" value={letter.tujuan} />}
        {letter.lampiran && <InfoRow icon="attach" label="Lampiran" value={letter.lampiran} />}
      </View>

      {/* Content */}
      {letter.isiSurat && (
        <View style={referenceStyles.cardSection}>
          <SectionTitle icon="text" text="Isi Surat" />
          <View style={styles.contentCard}>
            <Text style={styles.contentText}>{letter.isiSurat}</Text>
          </View>
        </View>
      )}

      {/* Disposition */}
      {letter.disposisi && letter.disposisi.length > 0 && (
        <View style={referenceStyles.cardSection}>
          <SectionTitle icon="arrow-forward-circle" text={`Disposisi (${letter.disposisi.length})`} />
          {letter.disposisi.map((d) => (
            <View key={d.id} style={styles.disposisiCard}>
              <View style={styles.disposisiHeader}>
                <Ionicons name="arrow-forward-circle" size={16} color={theme.colors.warning} />
                <Text style={styles.disposisiTujuan}>{d.tujuan}</Text>
              </View>
              {d.catatan && <Text style={styles.disposisiCatatan}>{d.catatan}</Text>}
              <Text style={styles.disposisiStatus}>Status: {d.status}</Text>
            </View>
          ))}
        </View>
      )}
    </ScreenShell>
  );
}

// ─── Helpers ────────────────────────────────────────────────

function fmtFullDate(s: string) {
  return new Date(s).toLocaleDateString('id-ID', {
    weekday: 'long', day: '2-digit', month: 'long', year: 'numeric',
  });
}

// ─── Styles ─────────────────────────────────────────────────

const styles = StyleSheet.create({
  contentCard: { backgroundColor: theme.colors.surfaceMuted, borderRadius: 10, padding: 12 },
  contentText: { fontSize: 14, color: theme.colors.textSecondary, lineHeight: 22 },
  disposisiCard: { backgroundColor: theme.colors.surfaceMuted, borderRadius: 10, padding: 12, marginBottom: 6, borderLeftWidth: 3, borderLeftColor: theme.colors.warning },
  disposisiHeader: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  disposisiTujuan: { fontSize: 14, fontWeight: '600', color: theme.colors.text },
  disposisiCatatan: { fontSize: 13, color: theme.colors.textSecondary, marginTop: 4, marginLeft: 22 },
  disposisiStatus: { fontSize: 11, color: theme.colors.textMuted, marginTop: 4, marginLeft: 22 },
});

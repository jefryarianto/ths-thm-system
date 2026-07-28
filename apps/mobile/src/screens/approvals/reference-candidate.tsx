import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { useReferenceDetail } from '../../hooks/use-reference-detail';
import { InfoRow, SectionTitle, ProfileCard, ScreenShell, ReferenceScreenState, referenceStyles } from '../../components/ui/shared';

// ─── Types ──────────────────────────────────────────────────

interface CandidateDetail {
  id: string;
  namaLengkap: string;
  jenisKelamin: string;
  tempatLahir?: string;
  tanggalLahir?: string;
  status: string;
  createdAt: string;
  ranting?: { nama: string };
  alamat?: string;
  noHp?: string;
  email?: string;
}

// ─── Constants ──────────────────────────────────────────────

const CANDIDATE_STATUS_STYLES: Record<string, { label: string; bg: string; color: string }> = {
  diusulkan: { label: 'Diusulkan', bg: '#eff6ff', color: '#2563eb' },
  mengikuti_pendadaran: { label: 'Pendadaran', bg: '#fef3c7', color: '#d97706' },
  lulus: { label: 'Lulus', bg: '#ecfdf5', color: '#16a34a' },
  gagal: { label: 'Gagal', bg: '#fef2f2', color: '#dc2626' },
  dibatalkan: { label: 'Dibatalkan', bg: '#f3f4f6', color: '#6b7280' },
};

// ─── Screen ─────────────────────────────────────────────────

export default function ReferenceCandidateScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { data: candidate, loading, error, refetch } = useReferenceDetail<CandidateDetail>(id, '/candidates/', 'calon');

  const stateView = (
    <ReferenceScreenState id={id} loading={loading} error={error} title="Detail Calon" onRetry={refetch} />
  );
  if (stateView) return stateView;
  if (!candidate) return null;

  const ss = CANDIDATE_STATUS_STYLES[candidate.status] || {
    label: candidate.status,
    bg: '#f3f4f6',
    color: '#6b7280',
  };
  const genderLabel = candidate.jenisKelamin === 'L' ? 'Laki-laki' : candidate.jenisKelamin === 'P' ? 'Perempuan' : candidate.jenisKelamin;

  return (
    <ScreenShell title="Detail Calon" variant="reference" onRefresh={refetch}>
      <ProfileCard
        name={candidate.namaLengkap}
        initial={candidate.namaLengkap.charAt(0)}
        badgeLabel={ss.label}
        badgeColor={ss.color}
        badgeBg={ss.bg}
        subtitle={candidate.ranting?.nama}
      />

      {/* Data Calon */}
      <View style={referenceStyles.cardSection}>
        <SectionTitle icon="person" text="Data Calon" />
        <InfoRow icon="male-female" label="Jenis Kelamin" value={genderLabel} />
        {candidate.tempatLahir && <InfoRow icon="location" label="Tempat Lahir" value={candidate.tempatLahir} />}
        {candidate.tanggalLahir && (
          <InfoRow icon="calendar" label="Tanggal Lahir" value={fmtDate(candidate.tanggalLahir)} />
        )}
        {candidate.ranting && <InfoRow icon="location" label="Ranting" value={candidate.ranting.nama} />}
      </View>

      {/* Kontak */}
      <View style={referenceStyles.cardSection}>
        <SectionTitle icon="chatbubbles" text="Kontak" />
        {candidate.alamat && <InfoRow icon="home" label="Alamat" value={candidate.alamat} />}
        {candidate.noHp && <InfoRow icon="call" label="No. HP" value={candidate.noHp} />}
        {candidate.email && <InfoRow icon="mail" label="Email" value={candidate.email} />}
        {!candidate.alamat && !candidate.noHp && !candidate.email && (
          <Text style={styles.emptyText}>Tidak ada data kontak</Text>
        )}
      </View>

      {/* Timeline */}
      <View style={referenceStyles.cardSection}>
        <SectionTitle icon="time" text="Riwayat" />
        <InfoRow icon="calendar" label="Diusulkan Tanggal" value={fmtDate(candidate.createdAt)} />
      </View>
    </ScreenShell>
  );
}

// ─── Helpers ────────────────────────────────────────────────

function fmtDate(s: string) {
  return new Date(s).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });
}

// ─── Styles ─────────────────────────────────────────────────

const styles = StyleSheet.create({
  emptyText: { fontSize: 13, color: '#9ca3af', textAlign: 'center', paddingVertical: 8 },
});

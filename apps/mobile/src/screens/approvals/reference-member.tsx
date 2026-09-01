import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { useReferenceDetail } from '../../hooks/use-reference-detail';
import { InfoRow, SectionTitle, ProfileCard, ScreenShell, ReferenceScreenState, referenceStyles } from '../../components/ui/shared';

// ─── Types ──────────────────────────────────────────────────

interface MemberDetail {
  id: string;
  namaLengkap: string;
  nomorAnggota?: string;
  noAnggota?: string;
  tingkat: string;
  statusKeanggotaan: string;
  alamat?: string;
  noHp?: string;
  email?: string;
  tempatLahir?: string;
  tanggalLahir?: string;
  ranting?: { nama: string };
  jenisKelamin?: string;
}

// ─── Screen ─────────────────────────────────────────────────

export default function ReferenceMemberScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { data: member, loading, error, refetch } = useReferenceDetail<MemberDetail>(id, '/members/', 'anggota');

  const stateView = (
    <ReferenceScreenState id={id} loading={loading} error={error} title="Detail Anggota" onRetry={refetch} />
  );
  if (stateView) return stateView;
  if (!member) return null;

  const isActive = member.statusKeanggotaan === 'aktif';
  const statusColor = isActive ? '#16a34a' : '#dc2626';
  const statusLabel = isActive ? 'Aktif' : 'Nonaktif';
  const memberNumber = member.nomorAnggota || member.noAnggota || '-';

  const genderLabel = member.jenisKelamin === 'L' ? 'Laki-laki' : member.jenisKelamin === 'P' ? 'Perempuan' : undefined;

  return (
    <ScreenShell title="Detail Anggota" variant="reference" onRefresh={refetch} badgeLabel={statusLabel} badgeColor={statusColor} badgeBg={isActive ? '#ecfdf5' : '#fef2f2'}>
      <ProfileCard
        name={member.namaLengkap}
        initial={member.namaLengkap.charAt(0)}
        badgeLabel={statusLabel}
        badgeColor={statusColor}
        badgeBg={isActive ? '#ecfdf5' : '#fef2f2'}
        subtitle={member.ranting?.nama}
      />

      {/* Member Info */}
      <View style={referenceStyles.cardSection}>
        <SectionTitle icon="person" text="Data Anggota" />
        <InfoRow icon="card" label="No. Anggota" value={memberNumber} />
        <InfoRow icon="trending-up" label="Tingkat" value={member.tingkat || '-'} />
        {genderLabel && <InfoRow icon="male-female" label="Jenis Kelamin" value={genderLabel} />}
        {member.tempatLahir && <InfoRow icon="location" label="Tempat Lahir" value={member.tempatLahir} />}
        {member.tanggalLahir && (
          <InfoRow icon="calendar" label="Tanggal Lahir" value={fmtDate(member.tanggalLahir)} />
        )}
        {member.ranting && <InfoRow icon="location" label="Ranting" value={member.ranting.nama} />}
      </View>

      {/* Contact Info */}
      <View style={referenceStyles.cardSection}>
        <SectionTitle icon="chatbubbles" text="Kontak" />
        {member.alamat && <InfoRow icon="home" label="Alamat" value={member.alamat} />}
        {member.noHp && <InfoRow icon="call" label="No. HP" value={member.noHp} />}
        {member.email && <InfoRow icon="mail" label="Email" value={member.email} />}
        {!member.alamat && !member.noHp && !member.email && (
          <Text style={styles.emptyText}>Tidak ada data kontak</Text>
        )}
      </View>
    </ScreenShell>
  );
}

// ─── Helpers ────────────────────────────────────────────────

function fmtDate(s: string) {
  return new Date(s).toLocaleDateString('id-ID', { day: '2-digit', month: 'long', year: 'numeric' });
}

// ─── Styles ─────────────────────────────────────────────────

const styles = StyleSheet.create({
  emptyText: { fontSize: 13, color: '#9ca3af', textAlign: 'center', paddingVertical: 8 },
});

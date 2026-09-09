import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { router, useLocalSearchParams } from 'expo-router';
import { useReferenceDetail } from '../../hooks/use-reference-detail';
import { InfoRow, SectionTitle, StatusCard, ScreenShell, ReferenceScreenState, referenceStyles } from '../../components/ui/shared';
import { theme } from '../../theme';

// ─── Types ──────────────────────────────────────────────────

interface ClaimAnggota {
  id: string;
  nomorAnggota: string;
  namaLengkap: string;
  email: string | null;
  noHp: string | null;
}

interface ClaimDetail {
  id: string;
  tipe: string;
  status: string;
  catatan: string | null;
  alasanPenolakan: string | null;
  anggotaId: string;
  anggota: ClaimAnggota;
  createdAt: string;
  updatedAt: string;
}

// ─── Constants ──────────────────────────────────────────────

const CLAIM_TIPE_LABELS: Record<string, string> = {
  sertifikat: 'Sertifikat',
  piagam: 'Piagam',
  kartu_anggota: 'Kartu Anggota',
  dokumen_lainnya: 'Dokumen Lainnya',
};

const CLAIM_STATUS_LABELS: Record<string, string> = {
  pending: 'Menunggu',
  diproses: 'Diproses',
  disetujui: 'Disetujui',
  ditolak: 'Ditolak',
};

const CLAIM_STATUS_STYLES: Record<string, { color: string; bg: string; icon: string }> = {
  pending: { color: theme.colors.warning, bg: theme.colors.warningLight, icon: 'time' },
  diproses: { color: theme.colors.primary, bg: theme.colors.primaryLight, icon: 'sync' },
  disetujui: { color: theme.colors.success, bg: theme.colors.successLight, icon: 'checkmark-circle' },
  ditolak: { color: 'theme.colors.danger', bg: theme.colors.dangerLight, icon: 'close-circle' },
};

// ─── Screen ─────────────────────────────────────────────────

export default function ReferenceClaimScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { data: claim, loading, error, refetch } = useReferenceDetail<ClaimDetail>(id, '/claims/', 'klaim');

  // Shared states: ID guard, loading, error
  const stateView = (
    <ReferenceScreenState id={id} loading={loading} error={error} title="Detail Klaim" onRetry={refetch} />
  );
  if (stateView) return stateView;
  if (!claim) return null;

  const st = CLAIM_STATUS_STYLES[claim.status] || { color: theme.colors.textSecondary, bg: theme.colors.surfaceMuted, icon: 'help-circle' };

  return (
    <ScreenShell title="Detail Klaim" variant="reference" onRefresh={refetch} badgeLabel={CLAIM_STATUS_LABELS[claim.status] || claim.status} badgeColor={st.color} badgeBg={st.bg}>
      <StatusCard
        icon={st.icon}
        color={st.color}
        bg={st.bg}
        title={CLAIM_TIPE_LABELS[claim.tipe] || claim.tipe}
        badgeLabel={CLAIM_STATUS_LABELS[claim.status] || claim.status}
        createdAt={claim.createdAt}
        updatedAt={claim.updatedAt}
        id={claim.id}
      />

      {/* Claim Info */}
      <View style={referenceStyles.cardSection}>
        <SectionTitle icon="document-text" text="Informasi Klaim" />
        <InfoRow icon="file-tray" label="Tipe" value={CLAIM_TIPE_LABELS[claim.tipe] || claim.tipe} />
        {claim.catatan && <InfoRow icon="chatbubble-ellipses" label="Catatan" value={claim.catatan} />}
        {claim.alasanPenolakan && (
          <View style={[styles.infoRowAlert]}>
            <Ionicons name="close-circle" size={15} color="theme.colors.danger" />
            <View style={{ flex: 1 }}>
              <Text style={styles.alertLabel}>ALASAN DITOLAK</Text>
              <Text style={styles.alertValue}>{claim.alasanPenolakan}</Text>
            </View>
          </View>
        )}
      </View>

      {/* Member Info */}
      <View style={referenceStyles.cardSection}>
        <SectionTitle icon="person" text="Data Anggota" />
        <InfoRow icon="person" label="Nama" value={claim.anggota.namaLengkap} />
        <InfoRow icon="finger-print" label="No. Anggota" value={claim.anggota.nomorAnggota} />
        {claim.anggota.email && <InfoRow icon="mail" label="Email" value={claim.anggota.email} />}
        {claim.anggota.noHp && <InfoRow icon="call" label="No. HP" value={claim.anggota.noHp} />}
        <TouchableOpacity style={styles.memberLinkBtn} activeOpacity={0.7} onPress={() => router.push(`/approvals/reference-member?id=${claim.anggota.id}` as any)}>
          <Ionicons name="open-outline" size={16} color={theme.colors.primary} />
          <Text style={styles.memberLinkText}>Lihat Detail Anggota</Text>
        </TouchableOpacity>
      </View>
    </ScreenShell>
  );
}

// ─── Styles ─────────────────────────────────────────────────

const styles = StyleSheet.create({
  memberLinkBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 10, paddingHorizontal: 12, backgroundColor: theme.colors.primarySofter, borderRadius: 10, borderWidth: 1, borderColor: theme.colors.headerSub, marginTop: 4 },
  memberLinkText: { fontSize: 13, fontWeight: '600', color: theme.colors.primary },
  infoRowAlert: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 10, paddingHorizontal: 12, backgroundColor: theme.colors.dangerLight, borderRadius: 10, borderWidth: 1, borderColor: theme.colors.dangerLight },
  alertLabel: { fontSize: 11, color: theme.colors.danger, textTransform: 'uppercase' },
  alertValue: { fontSize: 14, color: theme.colors.danger, fontWeight: '500' },
});

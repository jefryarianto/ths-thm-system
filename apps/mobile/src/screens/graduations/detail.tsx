import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useLocalSearchParams, router } from 'expo-router';
import apiClient, { unwrap } from '../../lib/api-client';
import { LoadingView, ScreenShell, TabBar } from '../../components/ui/shared';
import { useRole } from '../../hooks/use-role';
import type { Graduation, GraduationParticipant, GraduationEvaluation } from '../../types';

const STATUS_STYLES: Record<string, { label: string; color: string; bg: string }> = {
  draft: { label: 'Draft', color: '#6b7280', bg: '#f3f4f6' },
  published: { label: 'Berlangsung', color: '#16a34a', bg: '#ecfdf5' },
  closed: { label: 'Selesai', color: '#2563eb', bg: '#eff6ff' },
  cancelled: { label: 'Dibatalkan', color: '#dc2626', bg: '#fef2f2' },
};

export default function GraduationDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { isAdmin, isPenguji, role } = useRole();
  const [graduation, setGraduation] = useState<Graduation | null>(null);
  const [participants, setParticipants] = useState<GraduationParticipant[]>([]);
  const [evaluations, setEvaluations] = useState<GraduationEvaluation[]>([]);
  const [activeTab, setActiveTab] = useState<'info' | 'participants' | 'evaluations'>('info');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const [gradRes, partRes, evalRes] = await Promise.all([
          apiClient.get(`/graduations/${id}`),
          apiClient.get(`/graduations/${id}/participants`),
          apiClient.get(`/graduations/${id}/evaluations`),
        ]);
        setGraduation(unwrap(gradRes));
        setParticipants(unwrap(partRes) || []);
        setEvaluations(unwrap(evalRes) || []);
      } catch {
        /* ignore */
      }
      setLoading(false);
    })();
  }, [id]);

  if (loading) return <LoadingView message="Memuat detail pendadaran..." />;
  if (!graduation)
    return (
      <View style={styles.center}>
        <Text style={styles.errorText}>Pendadaran tidak ditemukan</Text>
      </View>
    );

  const ss = STATUS_STYLES[graduation.status] || {
    label: graduation.status,
    color: '#6b7280',
    bg: '#f3f4f6',
  };

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr);
    const days = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
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
    return `${days[d.getDay()]}, ${d.getDate()} ${months[d.getMonth()]} ${d.getFullYear()}`;
  };

  const tabs = [
    { key: 'info', label: 'Info', icon: 'information-circle' as const },
    { key: 'participants', label: `Peserta (${participants.length})`, icon: 'people' as const },
    { key: 'evaluations', label: `Nilai (${evaluations.length})`, icon: 'school' as const },
  ];

  return (
    <ScreenShell title={graduation.nama} variant="detail" badgeLabel={ss.label} badgeColor={ss.color} badgeBg={ss.bg}>

      <TabBar tabs={tabs} activeKey={activeTab} onChange={(key) => setActiveTab(key as typeof activeTab)} />

      {activeTab === 'info' && (
        <View style={styles.section}>
          <View style={styles.infoCard}>
            <View style={styles.infoRow}>
              <Ionicons name="calendar" size={18} color="#2563eb" />
              <View style={styles.infoContent}>
                <Text style={styles.infoLabel}>Tanggal Mulai</Text>
                <Text style={styles.infoValue}>{formatDate(graduation.tanggalMulai)}</Text>
              </View>
            </View>
            {graduation.tanggalSelesai && (
              <View style={styles.infoRow}>
                <Ionicons name="time" size={18} color="#2563eb" />
                <View style={styles.infoContent}>
                  <Text style={styles.infoLabel}>Tanggal Selesai</Text>
                  <Text style={styles.infoValue}>{formatDate(graduation.tanggalSelesai)}</Text>
                </View>
              </View>
            )}
            {graduation.lokasi && (
              <View style={styles.infoRow}>
                <Ionicons name="location" size={18} color="#2563eb" />
                <View style={styles.infoContent}>
                  <Text style={styles.infoLabel}>Lokasi</Text>
                  <Text style={styles.infoValue}>{graduation.lokasi}</Text>
                </View>
              </View>
            )}
            {graduation.penguji && (
              <View style={styles.infoRow}>
                <Ionicons name="person" size={18} color="#2563eb" />
                <View style={styles.infoContent}>
                  <Text style={styles.infoLabel}>Penguji</Text>
                  <Text style={styles.infoValue}>{graduation.penguji.namaLengkap}</Text>
                </View>
              </View>
            )}
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
      )}

      {activeTab === 'participants' && (
        <View style={styles.section}>
          {participants.length > 0 ? (
            participants.map((p) => (
              <View key={p.id} style={styles.partCard}>
                <View style={styles.partLeft}>
                  <View style={styles.partAvatar}>
                    <Text style={styles.partAvatarText}>
                      {p.anggota?.namaLengkap?.charAt(0) || '?'}
                    </Text>
                  </View>
                  <View>
                    <Text style={styles.partName}>{p.anggota?.namaLengkap || 'Unknown'}</Text>
                    {p.anggota?.nomorAnggota && (
                      <Text style={styles.partNo}>{p.anggota.nomorAnggota}</Text>
                    )}
                  </View>
                </View>
                <View
                  style={[
                    styles.partStatus,
                    { backgroundColor: p.statusKelulusan === 'lulus' ? '#ecfdf5' : '#fef2f2' },
                  ]}
                >
                  <Text
                    style={[
                      styles.partStatusText,
                      { color: p.statusKelulusan === 'lulus' ? '#16a34a' : '#dc2626' },
                    ]}
                  >
                    {p.statusKelulusan === 'lulus' ? 'Lulus' : 'Belum Lulus'}
                  </Text>
                </View>
              </View>
            ))
          ) : (
            <Text style={styles.emptyText}>Belum ada peserta</Text>
          )}
        </View>
      )}

      {activeTab === 'evaluations' && (
        <View style={styles.section}>
          {/* Input Nilai Button — visible for penguji, admin, and admin_kegiatan */}
          {(isPenguji || isAdmin || role === 'admin_kegiatan') && (
            <TouchableOpacity
              style={styles.inputNilaiBtn}
              activeOpacity={0.7}
              onPress={() => router.push(`/graduations/input-score?id=${graduation.id}` as any)}
            >
              <Ionicons name="create" size={20} color="#fff" />
              <View style={{ flex: 1 }}>
                <Text style={styles.inputNilaiTitle}>Input Nilai</Text>
                <Text style={styles.inputNilaiSub}>Pilih peserta dan isi nilai ujian praktek</Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color="#93c5fd" />
            </TouchableOpacity>
          )}

          {evaluations.length > 0 ? (
            evaluations.map((ev) => (
              <View key={ev.id} style={styles.evalCard}>
                <View style={styles.evalLeft}>
                  <View style={styles.evalAvatar}>
                    <Text style={styles.evalAvatarText}>
                      {ev.anggota?.namaLengkap?.charAt(0) || '?'}
                    </Text>
                  </View>
                  <View style={styles.evalInfo}>
                    <Text style={styles.evalName}>{ev.anggota?.namaLengkap || 'Unknown'}</Text>
                    {ev.aspek && <Text style={styles.evalAspek}>{ev.aspek.nama}</Text>}
                    {ev.catatan && (
                      <Text style={styles.evalNote} numberOfLines={2}>
                        {ev.catatan}
                      </Text>
                    )}
                  </View>
                </View>
                <View style={styles.evalScore}>
                  <Text style={styles.evalScoreText}>{ev.nilai}</Text>
                </View>
              </View>
            ))
          ) : (
            <Text style={styles.emptyText}>Belum ada nilai</Text>
          )}
        </View>
      )}

    </ScreenShell>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#f3f4f6' },
  errorText: { fontSize: 14, color: '#ef4444' },

  // Tabs removed — using shared TabBar component

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

  partCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 14,
    marginBottom: 6,
    borderWidth: 1,
    borderColor: '#f3f4f6',
  },
  partLeft: { flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1 },
  partAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#eff6ff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  partAvatarText: { fontSize: 14, fontWeight: '700', color: '#2563eb' },
  partName: { fontSize: 14, fontWeight: '500', color: '#111827' },
  partNo: { fontSize: 11, color: '#6b7280', marginTop: 2 },
  partStatus: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  partStatusText: { fontSize: 11, fontWeight: '600' },

  evalCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 14,
    marginBottom: 6,
    borderWidth: 1,
    borderColor: '#f3f4f6',
  },
  evalLeft: { flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1 },
  evalAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#eff6ff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  evalAvatarText: { fontSize: 14, fontWeight: '700', color: '#2563eb' },
  evalInfo: { flex: 1 },
  evalName: { fontSize: 14, fontWeight: '500', color: '#111827' },
  evalAspek: { fontSize: 11, color: '#6b7280', marginTop: 2 },
  evalNote: { fontSize: 11, color: '#9ca3af', marginTop: 2 },
  evalScore: {
    backgroundColor: '#eff6ff',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 10,
  },
  evalScoreText: { fontSize: 16, fontWeight: '700', color: '#2563eb' },

  emptyText: { fontSize: 13, color: '#9ca3af', textAlign: 'center', paddingVertical: 30 },

  // Input Nilai Button
  inputNilaiBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#2563eb',
    borderRadius: 14,
    padding: 16,
    marginBottom: 16,
    gap: 12,
    shadowColor: '#2563eb',
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 4,
  },
  inputNilaiTitle: { color: '#fff', fontSize: 15, fontWeight: '700' },
  inputNilaiSub: { color: '#bfdbfe', fontSize: 12, marginTop: 2 },
});

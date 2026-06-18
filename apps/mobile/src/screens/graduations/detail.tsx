import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useLocalSearchParams, router } from 'expo-router';
import apiClient, { unwrap } from '../../lib/api-client';
import { LoadingView } from '../../components/ui/shared';
import type { Graduation, GraduationParticipant, GraduationEvaluation } from '../../types';

const STATUS_STYLES: Record<string, { label: string; color: string; bg: string }> = {
  draft: { label: 'Draft', color: '#6b7280', bg: '#f3f4f6' },
  published: { label: 'Berlangsung', color: '#16a34a', bg: '#ecfdf5' },
  closed: { label: 'Selesai', color: '#2563eb', bg: '#eff6ff' },
  cancelled: { label: 'Dibatalkan', color: '#dc2626', bg: '#fef2f2' },
};

export default function GraduationDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
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
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={22} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle} numberOfLines={1}>
          {graduation.nama}
        </Text>
      </View>

      <View style={styles.tabContainer}>
        {tabs.map((tab) => (
          <TouchableOpacity
            key={tab.key}
            style={[styles.tab, activeTab === tab.key && styles.tabActive]}
            onPress={() => setActiveTab(tab.key as any)}
          >
            <Ionicons
              name={tab.icon}
              size={14}
              color={activeTab === tab.key ? '#fff' : '#6b7280'}
            />
            <Text style={[styles.tabText, activeTab === tab.key && styles.tabTextActive]}>
              {tab.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

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
  headerTitle: { color: '#fff', fontSize: 18, fontWeight: '700', flex: 1 },

  tabContainer: {
    flexDirection: 'row',
    backgroundColor: '#e5e7eb',
    margin: 16,
    marginBottom: 0,
    borderRadius: 10,
    padding: 3,
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    paddingVertical: 8,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  tabActive: { backgroundColor: '#2563eb' },
  tabText: { fontSize: 11, fontWeight: '600', color: '#6b7280' },
  tabTextActive: { color: '#fff' },

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
});

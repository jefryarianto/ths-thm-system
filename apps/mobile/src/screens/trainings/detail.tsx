import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, router } from 'expo-router';
import apiClient, { unwrap } from '../../lib/api-client';
import { LoadingView } from '../../components/ui/shared';

interface TrainingDetail {
  id: string;
  hariTanggal: string;
  lokasi?: string;
  jenisMateri?: string;
  hasilLatihanGlobal?: string;
  ranting?: { nama: string };
  pelatih?: { id: string; namaLengkap: string };
  createdAt?: string;
}

interface Attendance {
  id: string;
  hadir: boolean;
  anggota?: { namaLengkap: string; nomorAnggota?: string };
}

interface Evaluation {
  id: string;
  nilai?: number;
  catatan?: string;
  anggota?: { namaLengkap: string };
}

export default function TrainingDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [training, setTraining] = useState<TrainingDetail | null>(null);
  const [attendances, setAttendances] = useState<Attendance[]>([]);
  const [evaluations, setEvaluations] = useState<Evaluation[]>([]);
  const [activeTab, setActiveTab] = useState<'info' | 'attendance' | 'evaluation'>('info');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const [trainRes, attRes, evalRes] = await Promise.all([
          apiClient.get(`/trainings/${id}`),
          apiClient.get(`/trainings/${id}/attendances`),
          apiClient.get(`/trainings/${id}/evaluations`),
        ]);
        setTraining(unwrap(trainRes));
        setAttendances(unwrap(attRes) || []);
        setEvaluations(unwrap(evalRes) || []);
      } catch { /* ignore */ }
      setLoading(false);
    })();
  }, [id]);

  if (loading) return <LoadingView message="Memuat detail latihan..." />;
  if (!training) return <View style={styles.center}><Text style={styles.errorText}>Latihan tidak ditemukan</Text></View>;

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr);
    const days = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];
    return `${days[d.getDay()]}, ${d.getDate()} ${months[d.getMonth()]} ${d.getFullYear()}`;
  };

  const tabs = [
    { key: 'info', label: 'Info', icon: 'information-circle' as const },
    { key: 'attendance', label: `Hadir (${attendances.filter(a => a.hadir).length})`, icon: 'checkmark-circle' as const },
    { key: 'evaluation', label: `Nilai (${evaluations.length})`, icon: 'school' as const },
  ];

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={22} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle} numberOfLines={1}>{training.jenisMateri || 'Detail Latihan'}</Text>
      </View>

      {/* Tab Selector */}
      <View style={styles.tabContainer}>
        {tabs.map((tab) => (
          <TouchableOpacity
            key={tab.key}
            style={[styles.tab, activeTab === tab.key && styles.tabActive]}
            onPress={() => setActiveTab(tab.key as any)}
          >
            <Ionicons name={tab.icon} size={14} color={activeTab === tab.key ? '#fff' : '#6b7280'} />
            <Text style={[styles.tabText, activeTab === tab.key && styles.tabTextActive]}>{tab.label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Info Tab */}
      {activeTab === 'info' && (
        <View style={styles.section}>
          <View style={styles.infoCard}>
            <View style={styles.infoRow}>
              <Ionicons name="calendar" size={18} color="#2563eb" />
              <View style={styles.infoContent}>
                <Text style={styles.infoLabel}>Tanggal</Text>
                <Text style={styles.infoValue}>{formatDate(training.hariTanggal)}</Text>
              </View>
            </View>
            {training.lokasi && (
              <View style={styles.infoRow}>
                <Ionicons name="location" size={18} color="#2563eb" />
                <View style={styles.infoContent}>
                  <Text style={styles.infoLabel}>Lokasi</Text>
                  <Text style={styles.infoValue}>{training.lokasi}</Text>
                </View>
              </View>
            )}
            {training.pelatih && (
              <View style={styles.infoRow}>
                <Ionicons name="person" size={18} color="#2563eb" />
                <View style={styles.infoContent}>
                  <Text style={styles.infoLabel}>Pelatih</Text>
                  <Text style={styles.infoValue}>{training.pelatih.namaLengkap}</Text>
                </View>
              </View>
            )}
            {training.ranting && (
              <View style={styles.infoRow}>
                <Ionicons name="flag" size={18} color="#2563eb" />
                <View style={styles.infoContent}>
                  <Text style={styles.infoLabel}>Ranting</Text>
                  <Text style={styles.infoValue}>{training.ranting.nama}</Text>
                </View>
              </View>
            )}
            {training.hasilLatihanGlobal && (
              <View style={styles.infoRow}>
                <Ionicons name="document-text" size={18} color="#2563eb" />
                <View style={styles.infoContent}>
                  <Text style={styles.infoLabel}>Hasil Latihan</Text>
                  <Text style={styles.infoValue}>{training.hasilLatihanGlobal}</Text>
                </View>
              </View>
            )}
          </View>
        </View>
      )}

      {/* Attendance Tab */}
      {activeTab === 'attendance' && (
        <View style={styles.section}>
          <Text style={styles.subTitle}>Daftar Hadir ({attendances.length})</Text>
          {attendances.length > 0 ? (
            attendances.map((att) => (
              <View key={att.id} style={styles.attCard}>
                <View style={styles.attLeft}>
                  <View style={[styles.attDot, { backgroundColor: att.hadir ? '#22c55e' : '#ef4444' }]} />
                  <Text style={styles.attName}>{att.anggota?.namaLengkap || 'Unknown'}</Text>
                </View>
                <Text style={[styles.attStatus, { color: att.hadir ? '#16a34a' : '#dc2626' }]}>
                  {att.hadir ? 'Hadir' : 'Tidak Hadir'}
                </Text>
              </View>
            ))
          ) : (
            <Text style={styles.emptyText}>Belum ada data kehadiran</Text>
          )}
        </View>
      )}

      {/* Evaluation Tab */}
      {activeTab === 'evaluation' && (
        <View style={styles.section}>
          <Text style={styles.subTitle}>Nilai ({evaluations.length})</Text>
          {evaluations.length > 0 ? (
            evaluations.map((evalItem) => (
              <View key={evalItem.id} style={styles.evalCard}>
                <View style={styles.evalLeft}>
                  <View style={styles.evalAvatar}>
                    <Text style={styles.evalAvatarText}>
                      {evalItem.anggota?.namaLengkap?.charAt(0) || '?'}
                    </Text>
                  </View>
                  <View style={styles.evalInfo}>
                    <Text style={styles.evalName}>{evalItem.anggota?.namaLengkap || 'Unknown'}</Text>
                    {evalItem.catatan && (
                      <Text style={styles.evalNote} numberOfLines={2}>{evalItem.catatan}</Text>
                    )}
                  </View>
                </View>
                {evalItem.nilai !== undefined && (
                  <View style={styles.evalScore}>
                    <Text style={styles.evalScoreText}>{evalItem.nilai}</Text>
                  </View>
                )}
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
  header: { backgroundColor: '#2563eb', padding: 24, paddingTop: 60, paddingBottom: 16, flexDirection: 'row', alignItems: 'center', gap: 12 },
  backBtn: { padding: 4 },
  headerTitle: { color: '#fff', fontSize: 18, fontWeight: '700', flex: 1 },

  // Tabs
  tabContainer: { flexDirection: 'row', backgroundColor: '#e5e7eb', margin: 16, marginBottom: 0, borderRadius: 10, padding: 3 },
  tab: { flex: 1, flexDirection: 'row', paddingVertical: 8, borderRadius: 8, alignItems: 'center', justifyContent: 'center', gap: 4 },
  tabActive: { backgroundColor: '#2563eb' },
  tabText: { fontSize: 11, fontWeight: '600', color: '#6b7280' },
  tabTextActive: { color: '#fff' },

  section: { padding: 16 },

  // Info
  infoCard: { backgroundColor: '#fff', borderRadius: 14, padding: 16, borderWidth: 1, borderColor: '#e5e7eb' },
  infoRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 12, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#f3f4f6' },
  infoContent: { flex: 1 },
  infoLabel: { fontSize: 11, color: '#9ca3af', marginBottom: 2 },
  infoValue: { fontSize: 14, fontWeight: '500', color: '#111827' },
  subTitle: { fontSize: 15, fontWeight: '600', color: '#1f2937', marginBottom: 12 },

  // Attendance
  attCard: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: '#fff', borderRadius: 12, padding: 14, marginBottom: 6,
    borderWidth: 1, borderColor: '#f3f4f6',
  },
  attLeft: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  attDot: { width: 8, height: 8, borderRadius: 4 },
  attName: { fontSize: 14, fontWeight: '500', color: '#111827' },
  attStatus: { fontSize: 12, fontWeight: '600' },

  // Evaluation
  evalCard: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: '#fff', borderRadius: 12, padding: 14, marginBottom: 6,
    borderWidth: 1, borderColor: '#f3f4f6',
  },
  evalLeft: { flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1 },
  evalAvatar: { width: 36, height: 36, borderRadius: 18, backgroundColor: '#eff6ff', alignItems: 'center', justifyContent: 'center' },
  evalAvatarText: { fontSize: 14, fontWeight: '700', color: '#2563eb' },
  evalInfo: { flex: 1 },
  evalName: { fontSize: 14, fontWeight: '500', color: '#111827' },
  evalNote: { fontSize: 11, color: '#6b7280', marginTop: 2 },
  evalScore: { backgroundColor: '#eff6ff', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 10 },
  evalScoreText: { fontSize: 16, fontWeight: '700', color: '#2563eb' },

  emptyText: { fontSize: 13, color: '#9ca3af', textAlign: 'center', paddingVertical: 30 },
});

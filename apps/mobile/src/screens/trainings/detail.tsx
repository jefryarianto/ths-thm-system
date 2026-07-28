import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useLocalSearchParams } from 'expo-router';
import QRCode from 'react-native-qrcode-svg';
import apiClient, { unwrap } from '../../lib/api-client';
import { LoadingView, InfoRow, ScreenShell, referenceStyles } from '../../components/ui/shared';

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
      } catch {
        /* ignore */
      }
      setLoading(false);
    })();
  }, [id]);

  if (loading) return <LoadingView message="Memuat detail latihan..." />;
  if (!training)
    return (
      <View style={styles.center}>
        <Text style={styles.errorText}>Latihan tidak ditemukan</Text>
      </View>
    );

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
    {
      key: 'attendance',
      label: `Hadir (${attendances.filter((a) => a.hadir).length})`,
      icon: 'checkmark-circle' as const,
    },
    { key: 'evaluation', label: `Nilai (${evaluations.length})`, icon: 'school' as const },
  ];

  return (
    <ScreenShell title={training.jenisMateri || 'Detail Latihan'} variant="detail">

      {/* Tab Selector */}
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

      {/* Info Tab */}
      {activeTab === 'info' && (
        <View style={styles.section}>
          <View style={referenceStyles.cardSection}>
            <InfoRow icon="calendar" label="Tanggal" value={formatDate(training.hariTanggal)} />
            {training.lokasi && <InfoRow icon="location" label="Lokasi" value={training.lokasi} />}
            {training.pelatih && <InfoRow icon="person" label="Pelatih" value={training.pelatih.namaLengkap} />}
            {training.ranting && <InfoRow icon="flag" label="Ranting" value={training.ranting.nama} />}
            {training.hasilLatihanGlobal && <InfoRow icon="document-text" label="Hasil Latihan" value={training.hasilLatihanGlobal} />}
          </View>

          {/* QR Code for Check-in */}
          <View style={styles.qrSection}>
            <View style={styles.qrCard}>
              <View style={styles.qrHeader}>
                <Ionicons name="qr-code" size={18} color="#2563eb" />
                <Text style={styles.qrTitle}>QR Check-in</Text>
              </View>
              <Text style={styles.qrHint}>Scan QR ini untuk check-in latihan</Text>
              <View style={styles.qrContainer}>
                <QRCode
                  value={JSON.stringify({ id: training.id, type: 'training' })}
                  size={140}
                />
              </View>
            </View>
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
                  <View
                    style={[styles.attDot, { backgroundColor: att.hadir ? '#22c55e' : '#ef4444' }]}
                  />
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
                    <Text style={styles.evalName}>
                      {evalItem.anggota?.namaLengkap || 'Unknown'}
                    </Text>
                    {evalItem.catatan && (
                      <Text style={styles.evalNote} numberOfLines={2}>
                        {evalItem.catatan}
                      </Text>
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
    </ScreenShell>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f3f4f6' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#f3f4f6' },
  errorText: { fontSize: 14, color: '#ef4444' },

  // Tabs
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
  subTitle: { fontSize: 15, fontWeight: '600', color: '#1f2937', marginBottom: 12 },

  // Attendance
  attCard: {
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
  attLeft: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  attDot: { width: 8, height: 8, borderRadius: 4 },
  attName: { fontSize: 14, fontWeight: '500', color: '#111827' },
  attStatus: { fontSize: 12, fontWeight: '600' },

  // Evaluation
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
  evalNote: { fontSize: 11, color: '#6b7280', marginTop: 2 },
  evalScore: {
    backgroundColor: '#eff6ff',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 10,
  },
  evalScoreText: { fontSize: 16, fontWeight: '700', color: '#2563eb' },

  emptyText: { fontSize: 13, color: '#9ca3af', textAlign: 'center', paddingVertical: 30 },

  // QR Code
  qrSection: { padding: 16, paddingBottom: 0 },
  qrCard: {
    backgroundColor: '#fff',
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    alignItems: 'center',
  },
  qrHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 },
  qrTitle: { fontSize: 15, fontWeight: '600', color: '#111827' },
  qrHint: { fontSize: 12, color: '#6b7280', marginBottom: 16, textAlign: 'center' },
  qrContainer: {
    padding: 12,
    backgroundColor: '#f9fafb',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
});

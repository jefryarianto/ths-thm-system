import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, RefreshControl, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import apiClient, { unwrap } from '../../lib/api-client';
import { useApi } from '../../hooks/use-api';
import { LoadingView } from '../../components/ui/shared';

interface DashboardStats {
  totalMembers: number;
  totalCandidates: number;
  totalGraduated: number;
  totalDuesCollected: number;
  pendingValidasi: number;
  incompleteData: number;
  memberStatus: Array<{ status: string; count: number }>;
  monthlyDues: Array<{ bulan: string; jumlah: number; transaksi: number }>;
}

export default function ReportsScreen() {
  const [refreshing, setRefreshing] = useState(false);

  const { data: stats, loading, refetch } = useApi<DashboardStats>(
    () => apiClient.get('/reports/dashboard').then(unwrap),
    []
  );

  const onRefresh = async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  };

  if (loading) return <LoadingView message="Memuat laporan..." />;
  if (!stats) return (
    <View style={styles.center}>
      <Text style={styles.errorText}>Gagal memuat laporan</Text>
    </View>
  );

  const statCards = [
    { icon: 'people', label: 'Total Anggota', value: stats.totalMembers, color: '#2563eb', bg: '#eff6ff' },
    { icon: 'person-add', label: 'Calon Anggota', value: stats.totalCandidates, color: '#7c3aed', bg: '#f5f3ff' },
    { icon: 'school', label: 'Lulus Pendadaran', value: stats.totalGraduated, color: '#16a34a', bg: '#f0fdf4' },
    { icon: 'cash', label: 'Total Iuran', value: `Rp ${Number(stats.totalDuesCollected).toLocaleString('id-ID')}`, color: '#d97706', bg: '#fef3c7' },
  ];

  const alertCards = [
    { icon: 'alert-circle', label: 'Validasi Pending', value: stats.pendingValidasi, color: '#dc2626', bg: '#fef2f2' },
    { icon: 'warning', label: 'Data Tidak Lengkap', value: stats.incompleteData, color: '#ea580c', bg: '#fff7ed' },
  ];

  return (
    <ScrollView
      style={styles.container}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
    >
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Laporan & Statistik</Text>
        <Text style={styles.headerSub}>Overview data organisasi</Text>
      </View>

      <View style={styles.content}>
        {/* Main Stat Cards */}
        <View style={styles.cardGrid}>
          {statCards.map((card, idx) => (
            <View key={idx} style={[styles.statCard, { backgroundColor: card.bg }]}>
              <Ionicons name={card.icon as any} size={24} color={card.color} />
              <Text style={[styles.statValue, { color: card.color }]}>{card.value}</Text>
              <Text style={styles.statLabel}>{card.label}</Text>
            </View>
          ))}
        </View>

        {/* Alert Cards */}
        {(stats.pendingValidasi > 0 || stats.incompleteData > 0) && (
          <View style={styles.alertSection}>
            <Text style={styles.sectionTitle}>Perlu Perhatian</Text>
            {alertCards.filter(c => c.value > 0).map((card, idx) => (
              <TouchableOpacity key={idx} style={[styles.alertCard, { backgroundColor: card.bg }]}>
                <Ionicons name={card.icon as any} size={22} color={card.color} />
                <View style={styles.alertBody}>
                  <Text style={styles.alertValue}>{card.value}</Text>
                  <Text style={styles.alertLabel}>{card.label}</Text>
                </View>
                <Ionicons name="chevron-forward" size={18} color={card.color} />
              </TouchableOpacity>
            ))}
          </View>
        )}

        {/* Member Status Distribution */}
        {stats.memberStatus.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Status Keanggotaan</Text>
            <View style={styles.statusList}>
              {stats.memberStatus.map((ms, idx) => (
                <View key={idx} style={styles.statusRow}>
                  <Text style={styles.statusLabel}>{ms.status}</Text>
                  <View style={styles.statusBarBg}>
                    <View
                      style={[styles.statusBar, { width: `${(ms.count / stats.totalMembers) * 100}%` }]}
                    />
                  </View>
                  <Text style={styles.statusCount}>{ms.count}</Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* Monthly Dues Chart */}
        {stats.monthlyDues.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Iuran 6 Bulan Terakhir</Text>
            {stats.monthlyDues.map((m, idx) => {
              const maxJumlah = Math.max(...stats.monthlyDues.map(x => x.jumlah), 1);
              return (
                <View key={idx} style={styles.duesRow}>
                  <Text style={styles.duesMonth}>{m.bulan}</Text>
                  <View style={styles.duesBarBg}>
                    <View style={[styles.duesBar, { width: `${(m.jumlah / maxJumlah) * 100}%` }]} />
                  </View>
                  <Text style={styles.duesAmount}>Rp {m.jumlah.toLocaleString('id-ID')}</Text>
                </View>
              );
            })}
          </View>
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f3f4f6' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#f3f4f6' },
  errorText: { fontSize: 14, color: '#dc2626' },
  header: { backgroundColor: '#2563eb', padding: 24, paddingTop: 60, paddingBottom: 20 },
  headerTitle: { color: '#fff', fontSize: 22, fontWeight: '700' },
  headerSub: { color: '#bfdbfe', fontSize: 13, marginTop: 4 },
  content: { padding: 16 },
  cardGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 16 },
  statCard: { width: '48%', borderRadius: 14, padding: 16, alignItems: 'center', gap: 6 },
  statValue: { fontSize: 22, fontWeight: '700' },
  statLabel: { fontSize: 12, color: '#6b7280', textAlign: 'center' },
  alertSection: { marginBottom: 16 },
  sectionTitle: { fontSize: 15, fontWeight: '600', color: '#111827', marginBottom: 10 },
  alertCard: { flexDirection: 'row', alignItems: 'center', borderRadius: 12, padding: 14, marginBottom: 6 },
  alertBody: { flex: 1, marginLeft: 10 },
  alertValue: { fontSize: 18, fontWeight: '700', color: '#111827' },
  alertLabel: { fontSize: 12, color: '#6b7280' },
  section: { marginBottom: 16 },
  statusList: { backgroundColor: '#fff', borderRadius: 12, padding: 14 },
  statusRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: '#f3f4f6' },
  statusLabel: { width: 90, fontSize: 13, color: '#374151', fontWeight: '500' },
  statusBarBg: { flex: 1, height: 8, backgroundColor: '#e5e7eb', borderRadius: 4, marginHorizontal: 8 },
  statusBar: { height: 8, backgroundColor: '#2563eb', borderRadius: 4 },
  statusCount: { width: 30, textAlign: 'right', fontSize: 13, fontWeight: '600', color: '#111827' },
  duesRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 6 },
  duesMonth: { width: 60, fontSize: 11, color: '#6b7280' },
  duesBarBg: { flex: 1, height: 6, backgroundColor: '#e5e7eb', borderRadius: 3, marginHorizontal: 6 },
  duesBar: { height: 6, backgroundColor: '#16a34a', borderRadius: 3 },
  duesAmount: { width: 80, textAlign: 'right', fontSize: 11, color: '#374151', fontWeight: '500' },
});

import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, ActivityIndicator, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import apiClient from '../../lib/api-client';
import { useAuthStore } from '../../store/auth-store';


const menuItems = [
  { icon: 'person', label: 'Profil Saya', route: '/profile' },
  { icon: 'card', label: 'Kartu Digital', route: '/digital-card' },
  { icon: 'qr-code', label: 'Scan QR', route: '/qr-scan' },
  { icon: 'document-text', label: 'Dokumen', route: '/documents' },
  { icon: 'cash', label: 'Iuran', route: '/dues' },
  { icon: 'fitness', label: 'Latihan', route: '/trainings' },
  { icon: 'calendar', label: 'Kegiatan', route: '/activities' },
  { icon: 'people', label: 'Calon', route: '/candidates' },
  { icon: 'school', label: 'Pendadaran', route: '/graduations' },
  { icon: 'mail', label: 'Surat', route: '/letters' },
  { icon: 'stats-chart', label: 'Laporan', route: '/reports' },
  { icon: 'notifications', label: 'Notifikasi', route: '/notifications' },
  { icon: 'settings', label: 'Set. Notifikasi', route: '/notification-preferences' },
];

export default function HomeScreen() {
  const user = useAuthStore((s) => s.user);
  const [member, setMember] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const res = await apiClient.get('/members', { params: { limit: 1 } });
        if (res.data.data?.length > 0) setMember(res.data.data[0]);
      } catch { /* ignore */ }
      setLoading(false);
    })();
  }, []);


  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.greeting}>Selamat Datang,</Text>
        <Text style={styles.name}>{member?.namaLengkap || user?.namaLengkap || 'Anggota THS-THM'}</Text>
      </View>

      <View style={styles.cardContainer}>
        {menuItems.map((item, index) => (
          <TouchableOpacity key={index} style={styles.card} onPress={() => router.push(item.route as any)}>
            <Ionicons name={item.icon as any} size={32} color="#2563eb" />
            <Text style={styles.cardLabel}>{item.label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <View style={styles.infoSection}>
        <Text style={styles.sectionTitle}>Status Keanggotaan</Text>
        {loading ? (
          <ActivityIndicator style={{ padding: 20 }} />
        ) : (
          <View style={styles.statusCard}>
            <View style={styles.statusRow}>
              <Text style={styles.statusLabel}>Status</Text>
              <Text style={[styles.statusValue, { color: member?.statusKeanggotaan === 'aktif' ? '#16a34a' : '#dc2626' }]}>
                {member?.statusKeanggotaan || 'Aktif'}
              </Text>
            </View>
            <View style={styles.statusRow}>
              <Text style={styles.statusLabel}>No. Anggota</Text>
              <Text style={styles.statusValue}>{member?.nomorAnggota || '-'}</Text>
            </View>
            <View style={styles.statusRow}>
              <Text style={styles.statusLabel}>Tingkat</Text>
              <Text style={styles.statusValue}>{member?.tingkat || '-'}</Text>
            </View>
          </View>
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f3f4f6' },
  header: { backgroundColor: '#2563eb', padding: 24, paddingTop: 60, paddingBottom: 32 },
  greeting: { color: '#bfdbfe', fontSize: 14 },
  name: { color: '#fff', fontSize: 22, fontWeight: 'bold', marginTop: 4 },
  cardContainer: { flexDirection: 'row', flexWrap: 'wrap', padding: 12, marginTop: -20 },
  card: {
    width: '30%', backgroundColor: '#fff', borderRadius: 12, padding: 14, margin: '1.5%',
    alignItems: 'center', shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 8, elevation: 2,
  },
  cardLabel: { fontSize: 12, color: '#374151', marginTop: 8, textAlign: 'center', fontWeight: '500' },
  infoSection: { padding: 16 },
  sectionTitle: { fontSize: 16, fontWeight: '600', color: '#111827', marginBottom: 12 },
  statusCard: { backgroundColor: '#fff', borderRadius: 12, padding: 16, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 8, elevation: 2 },
  statusRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#f3f4f6' },
  statusLabel: { fontSize: 14, color: '#6b7280' },
  statusValue: { fontSize: 14, fontWeight: '600', color: '#111827' },
});
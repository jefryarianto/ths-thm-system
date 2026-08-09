import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, RefreshControl } from 'react-native';
import { LoadingView } from '../../components/ui/shared';
import { useRefresh } from '../../hooks/use-refresh';
import { useMemberProfile } from '../../hooks/use-member-profile';
import { useRole } from '../../hooks/use-role';
import Ionicons from '@expo/vector-icons/Ionicons';
import { router } from 'expo-router';
import { useAuthStore } from '../../store/auth-store';

const memberItems = [
  { icon: 'chatbubbles', label: 'Forum', route: '/forum' },
  { icon: 'person', label: 'Profil Saya', route: '/(tabs)/settings' },
  { icon: 'card', label: 'Kartu Digital', route: '/digital-card' },
  { icon: 'qr-code', label: 'Scan QR', route: '/qr-scan' },
  { icon: 'document-text', label: 'Dokumen', route: '/documents' },
  { icon: 'cash', label: 'Iuran', route: '/dues' },
  { icon: 'mail-open', label: 'Undangan Pendadaran', route: '/graduations/invitations' },
  { icon: 'notifications', label: 'Notifikasi', route: '/notifications' },
  { icon: 'settings', label: 'Set. Notifikasi', route: '/notification-preferences' },
];

// minRole = minimum role level to see the menu (same hierarchy as web layout.tsx):
//   superadmin > admin_distrik > admin_wilayah > admin_ranting > admin_kegiatan > penguji > anggota
// admin_kegiatan memasukkan calon & mengelola pendadaran (alur langkah 3-6).
interface AdminItem {
  icon: string;
  label: string;
  route: string;
  minRole: string;
  /** Extra roles allowed even if below minRole (e.g. penguji needs Pendadaran to input scores) */
  extraRoles?: string[];
}

const adminItems: AdminItem[] = [
  { icon: 'people', label: 'Anggota', route: '/members', minRole: 'admin_ranting' },
  { icon: 'fitness', label: 'Latihan', route: '/trainings', minRole: 'admin_ranting' },
  { icon: 'calendar', label: 'Kegiatan', route: '/activities', minRole: 'anggota' },
  { icon: 'people', label: 'Calon', route: '/candidates', minRole: 'admin_kegiatan' },
  // Penguji butuh Pendadaran untuk input nilai (tombolnya ada di detail pendadaran)
  { icon: 'school', label: 'Pendadaran', route: '/graduations', minRole: 'admin_kegiatan', extraRoles: ['penguji'] },
  { icon: 'mail', label: 'Surat', route: '/letters', minRole: 'admin_ranting' },
  { icon: 'stats-chart', label: 'Laporan', route: '/reports', minRole: 'admin_ranting' },
  { icon: 'clipboard', label: 'Aspek', route: '/assessments', minRole: 'penguji' },
  { icon: 'cloud-upload', label: 'Import', route: '/member-import', minRole: 'admin_ranting' },
  { icon: 'shield-checkmark', label: 'Persetujuan', route: '/approvals', minRole: 'admin_ranting' },
];

export default function HomeScreen() {
  const user = useAuthStore((s) => s.user);
  const { role, isAnggota, hasMinRole } = useRole();
  const { data: member, loading, refetch } = useMemberProfile();
  const { refreshing, onRefresh } = useRefresh(refetch);

  // Anggota murni hanya melihat menu anggota; role lain melihat menu sesuai minRole
  // (admin_kegiatan kini melihat Calon & Pendadaran, sama seperti web).
  const visibleAdminItems = isAnggota
    ? []
    : adminItems.filter(
        (item) => hasMinRole(item.minRole) || !!item.extraRoles?.includes(role),
      );
  const menuItems = [...memberItems, ...visibleAdminItems];

  return (
    <ScrollView
      style={styles.container}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
    >
      <View style={styles.header}>
        <Text style={styles.greeting}>Selamat Datang,</Text>
        <Text style={styles.name}>
          {member?.namaLengkap || user?.namaLengkap || 'Anggota THS-THM'}
        </Text>
      </View>

      <View style={styles.cardContainer}>
        {menuItems.map((item, index) => (
          <TouchableOpacity
            key={index}
            style={styles.card}
            onPress={() => router.push(item.route as any)}
          >
            <Ionicons name={item.icon as any} size={32} color="#2563eb" />
            <Text style={styles.cardLabel}>{item.label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <View style={styles.infoSection}>
        <Text style={styles.sectionTitle}>Status Keanggotaan</Text>
        {loading ? (
          <LoadingView message="Memuat data anggota..." />
        ) : (
          <View style={styles.statusCard}>
            <View style={styles.statusRow}>
              <Text style={styles.statusLabel}>Status</Text>
              <Text
                style={[
                  styles.statusValue,
                  { color: member?.statusKeanggotaan === 'aktif' ? '#16a34a' : '#dc2626' },
                ]}
              >
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
    width: '30%',
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 14,
    margin: '1.5%',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  cardLabel: {
    fontSize: 12,
    color: '#374151',
    marginTop: 8,
    textAlign: 'center',
    fontWeight: '500',
  },
  infoSection: { padding: 16 },
  sectionTitle: { fontSize: 16, fontWeight: '600', color: '#111827', marginBottom: 12 },
  statusCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  statusRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  statusLabel: { fontSize: 14, color: '#6b7280' },
  statusValue: { fontSize: 14, fontWeight: '600', color: '#111827' },
});

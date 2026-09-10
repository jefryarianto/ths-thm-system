import React, { useCallback, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, RefreshControl, Image } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LoadingView } from '../../components/ui/shared';
import { useRefresh } from '../../hooks/use-refresh';
import { useMemberProfile } from '../../hooks/use-member-profile';
import { useKtaCardData } from '../../hooks/use-kta-card';
import { useRole } from '../../hooks/use-role';
import Ionicons from '@expo/vector-icons/Ionicons';
import { router, useFocusEffect } from 'expo-router';
import { safeIconName } from '../../lib/icons';
import { useAuthStore } from '../../store/auth-store';
import apiClient, { API_URL, unwrap } from '../../lib/api-client';
import { theme } from '../../theme';
import { MemberCardFront } from '../digital-card/card';

// Menu yang sudah jadi tab di bottom nav (Forum, Iuran, Scan QR, Profil) tidak diulang di kapsul.
const quickItems = [
  { icon: 'card', label: 'Digital ID', route: '/(tabs)/digital-card' },
  { icon: 'document-text', label: 'Dokumen', route: '/documents' },
  { icon: 'mail-open', label: 'Undangan Pendadaran', route: '/graduations/invitations' },
  { icon: 'notifications', label: 'Notifikasi', route: '/notifications' },
  { icon: 'settings', label: 'Set. Notifikasi', route: '/notification-preferences' },
  { icon: 'trophy', label: 'Poin', route: '/gamification' },
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
  { icon: 'ribbon', label: 'Penguji', route: '/examiners', minRole: 'admin_ranting' },
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
  const { cardData } = useKtaCardData(member?.id);
  const [unreadCount, setUnreadCount] = useState(0);

  // Jumlah notifikasi belum dibaca untuk badge bell (di-refetch tiap layar difokuskan).
  const loadUnread = useCallback(() => {
    apiClient
      .get('/notifications/count')
      .then((r) => {
        const d = unwrap<{ count?: number }>(r) as { count?: number };
        setUnreadCount(Number(d?.count ?? d ?? 0) || 0);
      })
      .catch(() => setUnreadCount(0));
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadUnread();
    }, [loadUnread]),
  );

  // Anggota murni hanya melihat menu anggota; role lain melihat menu sesuai minRole
  // (admin_kegiatan kini melihat Calon & Pendadaran, sama seperti web).
  const visibleAdminItems = isAnggota
    ? []
    : adminItems.filter(
        (item) => hasMinRole(item.minRole) || !!item.extraRoles?.includes(role),
      );
  const menuItems = [...quickItems, ...visibleAdminItems];

  const insets = useSafeAreaInsets();

  const initials = (member?.namaLengkap || user?.namaLengkap || 'A')
    .split(' ')
    .filter((w) => w)
    .slice(0, 2)
    .map((w) => w[0])
    .join('')
    .toUpperCase();

  const fotoUri = member?.fotoPath ? `${API_URL}/api/uploads/${encodeURIComponent(member.fotoPath)}` : null;

  const validUntil = new Date();
  validUntil.setFullYear(validUntil.getFullYear() + 5);
  const validUntilText = validUntil.toLocaleDateString('id-ID', { day: '2-digit', month: 'long', year: 'numeric' });

  return (
    <ScrollView
      style={styles.container}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
    >
      <View style={[styles.header, { paddingTop: insets.top + 16 }]}>
        {/* Aksen dekoratif lembut di header */}
        <View style={styles.headerGlow} pointerEvents="none" />
        <TouchableOpacity
          style={styles.avatarBtn}
          onPress={() => router.navigate('/(tabs)/settings' as never)}
          activeOpacity={0.8}
          accessibilityLabel="Profil saya"
        >
          {fotoUri ? (
            <Image source={{ uri: fotoUri }} style={styles.avatar} resizeMode="cover" />
          ) : (
            <View style={styles.avatarFallback}>
              <Text style={styles.avatarInitials}>{initials}</Text>
            </View>
          )}
        </TouchableOpacity>
        <View style={styles.headerTextWrap}>
          <Text style={styles.greeting}>Gloria, Selamat Datang</Text>
          <Text style={styles.name}>
            {member?.namaLengkap || user?.namaLengkap || 'Anggota THS-THM'}
          </Text>
          <Text style={styles.roleHint}>{member?.nomorAnggota || 'Anggota THS-THM'}</Text>
        </View>
        <TouchableOpacity
          style={[styles.bellBtn, { top: insets.top + 6 }]}
          onPress={() => router.navigate('/(tabs)/notifications' as never)}
          activeOpacity={0.75}
          accessibilityLabel="Notifikasi"
        >
          <Ionicons name="notifications-outline" size={24} color={theme.colors.surface} />
          {unreadCount > 0 && (
            <View style={styles.bellBadge}>
              <Text style={styles.bellBadgeText}>{unreadCount > 99 ? '99+' : unreadCount}</Text>
            </View>
          )}
        </TouchableOpacity>
      </View>

      {/* Menu kapsul — geser horizontal untuk melihat semua menu */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.chipScroller}
        contentContainerStyle={styles.chipScrollerContent}
      >
        {menuItems.map((item, index) => (
          <TouchableOpacity
            key={index}
            style={styles.chip}
            onPress={() => router.push(item.route as any)}
            activeOpacity={0.7}
          >
            <Ionicons name={safeIconName(item.icon)} size={16} color={theme.colors.primary} />
            <Text style={styles.chipLabel} numberOfLines={1}>
              {item.label}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* KTA sisi depan */}
      <View style={styles.ktaSection}>
        <View style={styles.ktaHeader}>
          <Text style={styles.sectionTitle}>Kartu Anggota (KTA)</Text>
          <TouchableOpacity onPress={() => router.navigate('/(tabs)/digital-card' as never)} activeOpacity={0.7}>
            <Text style={styles.ktaSeeAll}>Lihat Detail</Text>
          </TouchableOpacity>
        </View>
        {loading ? (
          <LoadingView message="Memuat data anggota..." />
        ) : member ? (
          <TouchableOpacity
            activeOpacity={0.85}
            onPress={() => router.navigate('/(tabs)/digital-card' as never)}
          >
            <MemberCardFront member={member} cardData={cardData} validUntilText={validUntilText} />
          </TouchableOpacity>
        ) : (
          <View style={styles.ktaEmpty}>
            <Text style={styles.ktaEmptyText}>Data kartu belum tersedia.</Text>
          </View>
        )}
      </View>

      <View style={styles.infoSection}>
        <Text style={styles.sectionTitle}>Status Keanggotaan</Text>
        {loading ? (
          <LoadingView message="Memuat data anggota..." />
        ) : (
          <View style={styles.statusCard}>
            <View style={styles.statusHeader}>
              <View style={styles.statusAvatar}>
                <Ionicons name="person" size={22} color={theme.colors.primary} />
              </View>
              <View style={styles.statusTitleWrap}>
                <Text style={styles.statusTitle}>Profil Anggota</Text>
                <Text style={styles.statusSubtitle}>
                  {member?.statusKeanggotaan === 'aktif' ? 'Anggota aktif' : 'Perlu perhatian'}
                </Text>
              </View>
              <View
                style={[
                  styles.statusPill,
                  { backgroundColor: member?.statusKeanggotaan === 'aktif' ? theme.colors.successLight : theme.colors.dangerLight },
                ]}
              >
                <Text
                  style={[
                    styles.statusPillText,
                    { color: member?.statusKeanggotaan === 'aktif' ? theme.colors.success : theme.colors.danger },
                  ]}
                >
                  {member?.statusKeanggotaan || 'Aktif'}
                </Text>
              </View>
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
  container: { flex: 1, backgroundColor: theme.colors.surfaceMuted },
  header: { backgroundColor: theme.colors.primary, padding: 24, paddingBottom: 36, borderBottomLeftRadius: 24, borderBottomRightRadius: 24, flexDirection: 'row', alignItems: 'center' },
  headerGlow: {
    position: 'absolute',
    top: -40,
    right: -30,
    width: 160,
    height: 160,
    borderRadius: 80,
    backgroundColor: theme.colors.primaryLight,
    opacity: 0.18,
  },
  avatarBtn: { width: 44, height: 44, borderRadius: 22, marginRight: 14, overflow: 'hidden' },
  avatar: { width: 44, height: 44, borderRadius: 22 },
  avatarFallback: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: theme.colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: theme.colors.primaryLight,
  },
  avatarInitials: { fontSize: 15, fontWeight: '800', color: theme.colors.primary },
  headerTextWrap: { flex: 1 },
  greeting: { color: theme.colors.headerSub, fontSize: 14 },
  name: { color: theme.colors.surface, fontSize: 20, fontWeight: 'bold', marginTop: 2, marginRight: 12 },
  roleHint: { color: theme.colors.primaryLight, fontSize: 13, marginTop: 2, fontWeight: '500' },
  bellBtn: {
    position: 'absolute',
    right: 20,
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.14)',
    zIndex: 10,
  },
  bellBadge: {
    position: 'absolute',
    top: -2,
    right: -2,
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    paddingHorizontal: 4,
    backgroundColor: theme.colors.danger,
    borderWidth: 2,
    borderColor: theme.colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bellBadgeText: { color: theme.colors.surface, fontSize: 10, fontWeight: '800' },
  chipScroller: { marginTop: -14, flexGrow: 0 },
  chipScrollerContent: { paddingHorizontal: 16, paddingVertical: 6, gap: 8 },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: theme.colors.surface,
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: theme.colors.surfaceMuted,
    shadowColor: theme.colors.text,
    shadowOpacity: 0.05,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
    elevation: 2,
  },
  chipLabel: { fontSize: 12, fontWeight: '600', color: theme.colors.text },
  ktaSection: { padding: 16, paddingTop: 12 },
  ktaHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  ktaSeeAll: { fontSize: 13, fontWeight: '700', color: theme.colors.primary },
  ktaEmpty: {
    backgroundColor: theme.colors.surface,
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: theme.colors.surfaceMuted,
  },
  ktaEmptyText: { fontSize: 14, color: theme.colors.textMuted },
  infoSection: { padding: 16, paddingTop: 4 },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: theme.colors.text, marginBottom: 12 },
  statusCard: {
    backgroundColor: theme.colors.surface,
    borderRadius: 16,
    padding: 16,
    shadowColor: theme.colors.text,
    shadowOpacity: 0.06,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 3,
    borderWidth: 1,
    borderColor: theme.colors.surfaceMuted,
  },
  statusHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.surfaceMuted,
  },
  statusAvatar: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: theme.colors.primarySofter,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  statusTitleWrap: { flex: 1 },
  statusTitle: { fontSize: 15, fontWeight: '700', color: theme.colors.text },
  statusSubtitle: { fontSize: 12, color: theme.colors.textMuted, marginTop: 2 },
  statusPill: {
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 999,
  },
  statusPillText: { fontSize: 12, fontWeight: '700' },
  statusRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.surfaceMuted,
  },
  statusLabel: { fontSize: 14, color: theme.colors.textMuted },
  statusValue: { fontSize: 14, fontWeight: '600', color: theme.colors.text },
});
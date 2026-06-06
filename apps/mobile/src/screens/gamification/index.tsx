import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import apiClient from '../../lib/api-client';

interface Badge {
  id: string;
  name: string;
  description: string;
  icon: string;
  threshold: number;
  category: string;
}

interface GamificationProfile {
  anggotaId: string;
  points: number;
  badges: Badge[];
  streaks: { latihan: number; iuran: number };
  lastActivity: string;
}

interface LeaderboardEntry {
  rank: number;
  anggotaId: string;
  points: number;
  badges: number;
  streaks: { latihan: number; iuran: number };
}

const CATEGORY_COLORS: Record<string, string> = {
  latihan: '#3b82f6',
  iuran: '#22c55e',
  prestasi: '#a855f7',
  keaktifan: '#f59e0b',
};

const RANK_ICONS: Record<number, string> = { 1: '🥇', 2: '🥈', 3: '🥉' };

export default function GamificationScreen() {
  const [profile, setProfile] = useState<GamificationProfile | null>(null);
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [allBadges, setAllBadges] = useState<Badge[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'profile' | 'leaderboard' | 'badges'>('profile');

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setError(null);
      // Get the anggotaId from the user stored in AsyncStorage
      const userStr = await AsyncStorage.getItem('user');
      const user = userStr ? JSON.parse(userStr) : null;
      const anggotaId = user?.anggotaId || user?.id;

      const [badgesRes, leaderboardRes] = await Promise.all([
        apiClient.get('/gamification/badges'),
        apiClient.get('/gamification/leaderboard?limit=10'),
      ]);
      setAllBadges(badgesRes.data.data);
      setLeaderboard(leaderboardRes.data.data);

      if (anggotaId) {
        const profileRes = await apiClient.get(`/gamification/profile/${anggotaId}`);
        setProfile(profileRes.data.data);
      }
    } catch (err) {
      console.error('Failed to fetch gamification:', err);
      setError('Gagal memuat data gamifikasi');
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchData();
    setRefreshing(false);
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#3b82f6" />
        <Text style={styles.loadingText}>Memuat gamifikasi...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.center}>
        <Ionicons name="alert-circle" size={48} color="#ef4444" />
        <Text style={styles.errorText}>{error}</Text>
        <TouchableOpacity onPress={fetchData} style={styles.retryButton}>
          <Text style={styles.retryText}>Coba Lagi</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#3b82f6']} />}
    >
      {/* Tab Selector */}
      <View style={styles.tabContainer}>
        {(['profile', 'leaderboard', 'badges'] as const).map((tab) => (
          <TouchableOpacity
            key={tab}
            onPress={() => setActiveTab(tab)}
            style={[styles.tab, activeTab === tab && styles.tabActive]}
          >
            <Text style={[styles.tabText, activeTab === tab && styles.tabTextActive]}>
              {tab === 'profile' ? 'Profil' : tab === 'leaderboard' ? 'Peringkat' : 'Badge'}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Profile Tab */}
      {activeTab === 'profile' && profile && (
        <View style={styles.section}>
          {/* Points Card */}
          <View style={styles.pointsCard}>
            <Ionicons name="zap" size={32} color="#f59e0b" />
            <Text style={styles.pointsValue}>{profile.points.toLocaleString('id-ID')}</Text>
            <Text style={styles.pointsLabel}>Total Poin</Text>
          </View>

          {/* Streaks */}
          <View style={styles.streaksRow}>
            <View style={styles.streakCard}>
              <Ionicons name="flame" size={24} color="#3b82f6" />
              <Text style={styles.streakValue}>{profile.streaks.latihan}</Text>
              <Text style={styles.streakLabel}>Streak Latihan</Text>
            </View>
            <View style={styles.streakCard}>
              <Ionicons name="star" size={24} color="#22c55e" />
              <Text style={styles.streakValue}>{profile.streaks.iuran}</Text>
              <Text style={styles.streakLabel}>Streak Iuran</Text>
            </View>
          </View>

          {/* Earned Badges */}
          <View style={styles.subSection}>
            <Text style={styles.subTitle}>Badge Diraih ({profile.badges.length})</Text>
            {profile.badges.length > 0 ? (
              <View style={styles.badgeGrid}>
                {profile.badges.map((badge) => (
                  <View key={badge.id} style={styles.badgeItem}>
                    <Text style={styles.badgeIcon}>{badge.icon}</Text>
                    <Text style={styles.badgeName}>{badge.name}</Text>
                  </View>
                ))}
              </View>
            ) : (
              <Text style={styles.emptyText}>Belum ada badge. Mulai latihan dan bayar iuran tepat waktu!</Text>
            )}
          </View>
        </View>
      )}

      {/* Leaderboard Tab */}
      {activeTab === 'leaderboard' && (
        <View style={styles.section}>
          <View style={styles.leaderboardHeader}>
            <Ionicons name="trophy" size={24} color="#f59e0b" />
            <Text style={styles.leaderboardTitle}>Top 10 Anggota</Text>
          </View>
          {leaderboard.length > 0 ? (
            leaderboard.map((entry) => (
              <View key={entry.anggotaId} style={[styles.leaderboardItem, entry.rank <= 3 && styles.topThree]}>
                <Text style={styles.rankIcon}>{RANK_ICONS[entry.rank] || `#${entry.rank}`}</Text>
                <View style={styles.leaderboardInfo}>
                  <Text style={styles.leaderboardName}>{entry.anggotaId}</Text>
                  <View style={styles.leaderboardMeta}>
                    <Text style={styles.metaItem}>🔥 {entry.streaks.latihan}</Text>
                    <Text style={styles.metaItem}>⭐ {entry.streaks.iuran}</Text>
                  </View>
                </View>
                <View style={styles.leaderboardPoints}>
                  <Ionicons name="zap" size={14} color="#f59e0b" />
                  <Text style={styles.pointsText}>{entry.points.toLocaleString('id-ID')}</Text>
                </View>
              </View>
            ))
          ) : (
            <Text style={styles.emptyText}>Belum ada data leaderboard</Text>
          )}
        </View>
      )}

      {/* Badges Tab */}
      {activeTab === 'badges' && (
        <View style={styles.section}>
          <Text style={styles.subTitle}>Semua Badge ({allBadges.length})</Text>
          {allBadges.map((badge) => {
            const isEarned = profile?.badges.some((b) => b.id === badge.id);
            return (
              <View key={badge.id} style={[styles.badgeCard, isEarned && styles.badgeEarned]}>
                <Text style={styles.badgeCardIcon}>{badge.icon}</Text>
                <View style={styles.badgeCardInfo}>
                  <Text style={styles.badgeCardName}>{badge.name}</Text>
                  <Text style={styles.badgeCardDesc}>{badge.description}</Text>
                </View>
                {isEarned ? (
                  <Ionicons name="checkmark-circle" size={24} color="#22c55e" />
                ) : (
                  <View style={[styles.categoryBadge, { backgroundColor: CATEGORY_COLORS[badge.category] || '#6b7280' }]}>
                    <Text style={styles.categoryText}>{badge.category}</Text>
                  </View>
                )}
              </View>
            );
          })}
        </View>
      )}

      <View style={{ height: 40 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24 },
  loadingText: { marginTop: 12, fontSize: 14, color: '#6b7280' },
  errorText: { marginTop: 12, fontSize: 14, color: '#ef4444', textAlign: 'center' },
  retryButton: { marginTop: 16, paddingHorizontal: 24, paddingVertical: 10, backgroundColor: '#3b82f6', borderRadius: 8 },
  retryText: { color: '#fff', fontWeight: '600' },
  tabContainer: { flexDirection: 'row', paddingHorizontal: 16, paddingTop: 12, gap: 8 },
  tab: { flex: 1, paddingVertical: 10, borderRadius: 8, backgroundColor: '#fff', alignItems: 'center', borderWidth: 1, borderColor: '#e5e7eb' },
  tabActive: { backgroundColor: '#3b82f6', borderColor: '#3b82f6' },
  tabText: { fontSize: 13, fontWeight: '600', color: '#6b7280' },
  tabTextActive: { color: '#fff' },
  section: { paddingHorizontal: 16, paddingTop: 16 },
  pointsCard: { backgroundColor: '#fff', borderRadius: 16, padding: 24, alignItems: 'center', borderWidth: 1, borderColor: '#e5e7eb', marginBottom: 12 },
  pointsValue: { fontSize: 36, fontWeight: '800', color: '#f59e0b', marginTop: 8 },
  pointsLabel: { fontSize: 14, color: '#6b7280', marginTop: 4 },
  streaksRow: { flexDirection: 'row', gap: 12, marginBottom: 16 },
  streakCard: { flex: 1, backgroundColor: '#fff', borderRadius: 12, padding: 16, alignItems: 'center', borderWidth: 1, borderColor: '#e5e7eb' },
  streakValue: { fontSize: 24, fontWeight: '700', color: '#1f2937', marginTop: 8 },
  streakLabel: { fontSize: 12, color: '#6b7280', marginTop: 4 },
  subSection: { marginBottom: 16 },
  subTitle: { fontSize: 16, fontWeight: '600', color: '#1f2937', marginBottom: 12 },
  badgeGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  badgeItem: { backgroundColor: '#fff', borderRadius: 12, padding: 12, alignItems: 'center', width: 80, borderWidth: 1, borderColor: '#e5e7eb' },
  badgeIcon: { fontSize: 28 },
  badgeName: { fontSize: 10, color: '#374151', marginTop: 4, textAlign: 'center', fontWeight: '500' },
  leaderboardHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 },
  leaderboardTitle: { fontSize: 16, fontWeight: '600', color: '#1f2937' },
  leaderboardItem: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', borderRadius: 12, padding: 14, marginBottom: 8, borderWidth: 1, borderColor: '#e5e7eb' },
  topThree: { backgroundColor: '#fffbeb', borderColor: '#fde68a' },
  rankIcon: { fontSize: 20, width: 36, textAlign: 'center' },
  leaderboardInfo: { flex: 1 },
  leaderboardName: { fontSize: 14, fontWeight: '600', color: '#1f2937' },
  leaderboardMeta: { flexDirection: 'row', gap: 12, marginTop: 4 },
  metaItem: { fontSize: 11, color: '#6b7280' },
  leaderboardPoints: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#fef3c7', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  pointsText: { fontSize: 13, fontWeight: '700', color: '#92400e' },
  badgeCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', borderRadius: 12, padding: 14, marginBottom: 8, borderWidth: 1, borderColor: '#e5e7eb' },
  badgeEarned: { backgroundColor: '#f0fdf4', borderColor: '#bbf7d0' },
  badgeCardIcon: { fontSize: 28, width: 40, textAlign: 'center' },
  badgeCardInfo: { flex: 1, marginLeft: 8 },
  badgeCardName: { fontSize: 14, fontWeight: '600', color: '#1f2937' },
  badgeCardDesc: { fontSize: 12, color: '#6b7280', marginTop: 2 },
  categoryBadge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 8 },
  categoryText: { fontSize: 10, color: '#fff', fontWeight: '600' },
  emptyText: { fontSize: 13, color: '#9ca3af', textAlign: 'center', paddingVertical: 20 },
});

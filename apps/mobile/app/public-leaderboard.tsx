import React, { useEffect, useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Animated,
  Easing,
  Linking,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import apiClient from '../src/lib/api-client';

interface LeaderboardEntry {
  rank: number;
  namaLengkap?: string;
  points: number;
  badges: number;
  streaks: { latihan: number; iuran: number };
}

const RANK_ICONS: Record<number, string> = { 1: '🥇', 2: '🥈', 3: '🥉' };
const LEVELS = [
  { name: 'Bronze', minPoints: 0, icon: '🥉', color: '#cd7f32' },
  { name: 'Silver', minPoints: 100, icon: '🥈', color: '#c0c0c0' },
  { name: 'Gold', minPoints: 300, icon: '🥇', color: '#ffd700' },
  { name: 'Platinum', minPoints: 500, icon: '💎', color: '#e5e4e2' },
  { name: 'Diamond', minPoints: 1000, icon: '🔥', color: '#b9f2ff' },
];

function getLevel(points: number) {
  let level = LEVELS[0];
  for (const l of LEVELS) {
    if (points >= l.minPoints) level = l;
  }
  return level;
}

export default function PublicLeaderboardScreen() {
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    fetchLeaderboard();
  }, []);

  const fetchLeaderboard = async () => {
    setLoading(true);
    try {
      const res = await apiClient.get('/gamification/public/leaderboard?limit=20');
      setLeaderboard(res.data.data || []);
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 400,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }).start();
    } catch {
      // fallback
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#3b82f6" />
        <Text style={styles.loadingText}>Memuat leaderboard...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Peringkat Publik</Text>
        <TouchableOpacity onPress={fetchLeaderboard} style={styles.refreshButton}>
          <Ionicons name="refresh" size={22} color="#fff" />
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.scrollView}>
        {/* Podium */}
        {leaderboard.length >= 3 && (
          <View style={styles.podiumContainer}>
            <View style={styles.podiumRow}>
              {/* 2nd */}
              <View style={styles.podiumItem}>
                <Text style={styles.podiumIcon}>🥈</Text>
                <Text style={styles.podiumName} numberOfLines={1}>
                  {leaderboard[1]?.namaLengkap || '-'}
                </Text>
                <Text style={styles.podiumPoints}>{leaderboard[1]?.points?.toLocaleString('id-ID') || 0}</Text>
                <View style={[styles.podiumBar, { height: 60, backgroundColor: '#e5e7eb' }]} />
              </View>
              {/* 1st */}
              <View style={styles.podiumItem}>
                <Text style={styles.podiumIconFirst}>🥇</Text>
                <Text style={styles.podiumNameFirst} numberOfLines={1}>
                  {leaderboard[0]?.namaLengkap || '-'}
                </Text>
                <Text style={styles.podiumPointsFirst}>{leaderboard[0]?.points?.toLocaleString('id-ID') || 0}</Text>
                <View style={[styles.podiumBar, { height: 80, backgroundColor: '#fbbf24' }]} />
              </View>
              {/* 3rd */}
              <View style={styles.podiumItem}>
                <Text style={styles.podiumIcon}>🥉</Text>
                <Text style={styles.podiumName} numberOfLines={1}>
                  {leaderboard[2]?.namaLengkap || '-'}
                </Text>
                <Text style={styles.podiumPoints}>{leaderboard[2]?.points?.toLocaleString('id-ID') || 0}</Text>
                <View style={[styles.podiumBar, { height: 40, backgroundColor: '#fed7aa' }]} />
              </View>
            </View>
          </View>
        )}

        {/* Leaderboard List */}
        <View style={styles.listContainer}>
          {leaderboard.map((entry) => {
            const level = getLevel(entry.points);
            return (
              <Animated.View
                key={`${entry.rank}`}
                style={[
                  styles.listItem,
                  entry.rank <= 3 && styles.topThree,
                ]}
              >
                <View style={styles.rankSection}>
                  <Text style={styles.rankText}>
                    {RANK_ICONS[entry.rank] || `#${entry.rank}`}
                  </Text>
                </View>
                <View style={styles.infoSection}>
                  <Text style={styles.nameText} numberOfLines={1}>
                    {entry.namaLengkap || 'Anonymous'}
                  </Text>
                  <View style={styles.metaRow}>
                    <Text style={styles.metaItem}>🔥 {entry.streaks.latihan}</Text>
                    <Text style={styles.metaItem}>⭐ {entry.streaks.iuran}</Text>
                    <Text style={styles.metaItem}>🏅 {entry.badges}</Text>
                  </View>
                </View>
                <View style={styles.pointsSection}>
                  <Text style={styles.levelIcon}>{level.icon}</Text>
                  <Text style={styles.pointsValue}>
                    {entry.points.toLocaleString('id-ID')}
                  </Text>
                </View>
              </Animated.View>
            );
          })}
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#f5f5f5' },
  loadingText: { marginTop: 12, fontSize: 14, color: '#6b7280' },
  scrollView: { flex: 1 },

  // Header
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: '#3b82f6', paddingTop: 50, paddingBottom: 16, paddingHorizontal: 16 },
  backButton: { padding: 4 },
  headerTitle: { fontSize: 18, fontWeight: '700', color: '#fff' },
  refreshButton: { padding: 4 },

  // Podium
  podiumContainer: { paddingHorizontal: 16, paddingTop: 20, paddingBottom: 16 },
  podiumRow: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'center', gap: 12 },
  podiumItem: { alignItems: 'center', flex: 1 },
  podiumIcon: { fontSize: 24 },
  podiumIconFirst: { fontSize: 32 },
  podiumName: { fontSize: 11, color: '#6b7280', marginTop: 4, textAlign: 'center', maxWidth: 80 },
  podiumNameFirst: { fontSize: 12, fontWeight: '700', color: '#1f2937', marginTop: 4, textAlign: 'center', maxWidth: 90 },
  podiumPoints: { fontSize: 11, color: '#92400e', fontWeight: '600', marginTop: 2 },
  podiumPointsFirst: { fontSize: 13, color: '#92400e', fontWeight: '700', marginTop: 2 },
  podiumBar: { width: 40, borderRadius: 8, marginTop: 8 },

  // List
  listContainer: { paddingHorizontal: 16 },
  listItem: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', borderRadius: 14, padding: 14, marginBottom: 8, borderWidth: 1, borderColor: '#e5e7eb' },
  topThree: { backgroundColor: '#fffbeb', borderColor: '#fde68a' },
  rankSection: { width: 36, alignItems: 'center' },
  rankText: { fontSize: 16 },
  infoSection: { flex: 1, marginLeft: 8 },
  nameText: { fontSize: 14, fontWeight: '600', color: '#1f2937' },
  metaRow: { flexDirection: 'row', gap: 10, marginTop: 4 },
  metaItem: { fontSize: 11, color: '#6b7280' },
  pointsSection: { alignItems: 'center' },
  levelIcon: { fontSize: 16 },
  pointsValue: { fontSize: 13, fontWeight: '700', color: '#92400e' },
});

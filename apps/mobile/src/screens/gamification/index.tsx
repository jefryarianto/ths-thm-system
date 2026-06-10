import React, { useEffect, useState, useRef, useMemo, useCallback } from 'react';
import apiClient from '../../lib/api-client';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
  ActivityIndicator,
  Animated,
  Easing,
  Dimensions,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { TextInput } from 'react-native';
import { Svg, Path, Circle, Line, Text as SvgText } from 'react-native-svg';
import { router } from 'expo-router';
import { useGamificationProfile, usePointsHistory, useBadges, useRecentEvents, useRewards, useOrgStructure, useLeaderboard, useGamificationData } from '../../hooks/use-gamification';
import type { Reward, LeaderboardEntry, PointEvent } from '../../hooks/use-gamification';
import Confetti from './confetti';
import GamificationTour from './tour';

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
  namaLengkap?: string;
  points: number;
  level?: { name: string; icon: string; color: string };
  badges: Badge[];
  streaks: { latihan: number; iuran: number };
  lastActivity: string;
}

interface OrgNode {
  id: string;
  nama: string;
  wilayahs?: OrgNode[];
  rantings?: { id: string; nama: string }[];
}

const CATEGORY_COLORS: Record<string, string> = {
  latihan: '#3b82f6',
  iuran: '#22c55e',
  prestasi: '#a855f7',
  keaktifan: '#f59e0b',
};

const RANK_ICONS: Record<number, string> = { 1: '🥇', 2: '🥈', 3: '🥉' };

const EVENT_ICONS: Record<string, string> = {
  training: '🥋',
  dues: '💰',
  badge: '🏅',
  achievement: '🎯',
};

type TabType = 'profile' | 'leaderboard' | 'badges' | 'rewards';

function AnimatedTabContent({ active, children }: { active: boolean; children: React.ReactNode }) {
  const opacity = useRef(new Animated.Value(active ? 1 : 0)).current;
  const translateY = useRef(new Animated.Value(active ? 0 : 20)).current;
  const wasEverActive = useRef(active);

  useEffect(() => {
    if (active) wasEverActive.current = true;
    Animated.parallel([
      Animated.timing(opacity, { toValue: active ? 1 : 0, duration: 250, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
      Animated.timing(translateY, { toValue: active ? 0 : 20, duration: 250, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
    ]).start();
  }, [active]);

  if (!active && !wasEverActive.current) return null;
  return <Animated.View style={{ opacity, transform: [{ translateY }] }}>{children}</Animated.View>;
}

function AnimatedNumber({ value }: { value: number }) {
  const scale = useRef(new Animated.Value(1)).current;
  useEffect(() => {
    Animated.sequence([
      Animated.timing(scale, { toValue: 1.2, duration: 100, useNativeDriver: true }),
      Animated.timing(scale, { toValue: 1, duration: 100, easing: Easing.elastic(1), useNativeDriver: true }),
    ]).start();
  }, [value]);
  return <Animated.Text style={[styles.pointsValue, { transform: [{ scale }] }]}>{value.toLocaleString('id-ID')}</Animated.Text>;
}

function PulseDot() {
  const opacity = useRef(new Animated.Value(1)).current;
  useEffect(() => {
    const anim = Animated.loop(Animated.sequence([
      Animated.timing(opacity, { toValue: 0.3, duration: 1000, useNativeDriver: true }),
      Animated.timing(opacity, { toValue: 1, duration: 1000, useNativeDriver: true }),
    ]));
    anim.start();
    return () => anim.stop();
  }, []);
  return <Animated.View style={[styles.liveDot, { opacity }]} />;
}

function PointsChart({ data }: { data: Array<{ month: string; cumulative: number }> }) {
  const screenWidth = Dimensions.get('window').width;
  const width = Math.min(screenWidth - 64, 320);
  const height = 120;
  const padding = 20;

  const pathData = useMemo(() => {
    if (!data || data.length < 2) return null;
    const maxVal = Math.max(...data.map((d) => d.cumulative), 1);
    const stepX = (width - padding * 2) / (data.length - 1);
    let d = '';
    data.forEach((point, i) => {
      const x = padding + i * stepX;
      const y = height - padding - (point.cumulative / maxVal) * (height - padding * 2);
      d += i === 0 ? `M${x},${y}` : ` L${x},${y}`;
    });
    return { d, maxVal, stepX };
  }, [data]);

  if (!pathData) return null;
  const labels = data.filter((_, i) => i % Math.max(1, Math.floor(data.length / 4)) === 0 || i === data.length - 1);

  return (
    <View style={styles.chartContainer}>
      <Svg width={width} height={height}>
        {[0, 0.25, 0.5, 0.75, 1].map((ratio) => {
          const y = height - padding - ratio * (height - padding * 2);
          return <Line key={ratio} x1={padding} y1={y} x2={width - padding} y2={y} stroke="#e5e7eb" strokeWidth={0.5} />;
        })}
        <Path d={pathData.d} stroke="#3b82f6" strokeWidth={2} fill="none" strokeLinecap="round" />
        {data.map((point, i) => {
          const x = padding + i * pathData.stepX;
          const y = height - padding - (point.cumulative / pathData.maxVal) * (height - padding * 2);
          return <Circle key={i} cx={x} cy={y} r={2.5} fill="#3b82f6" />;
        })}
        {labels.map((point, i) => {
          const idx = data.indexOf(point);
          const x = padding + idx * pathData.stepX;
          const [y, m] = point.month.split('-');
          const months = ['Jan','Feb','Mar','Apr','Mei','Jun','Jul','Agu','Sep','Okt','Nov','Des'];
          return <SvgText key={i} x={x} y={height - 4} fontSize={8} fill="#9ca3af" textAnchor="middle">{months[parseInt(m) - 1]} {y.slice(2)}</SvgText>;
        })}
      </Svg>
    </View>
  );
}

function getTimeAgo(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'baru saja';
  if (mins < 60) return `${mins}m lalu`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}j lalu`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}h lalu`;
  return new Date(dateStr).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' });
}

export default function GamificationScreen() {
  const [anggotaId, setAnggotaId] = useState<string | null>(null);
  const [loadingUser, setLoadingUser] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState<TabType>('profile');
  const [showConfetti, setShowConfetti] = useState(false);
  const [tourVisible, setTourVisible] = useState(false);

  // Filter state
  const [selectedDistrik, setSelectedDistrik] = useState('');
  const [selectedWilayah, setSelectedWilayah] = useState('');
  const [selectedRanting, setSelectedRanting] = useState('');

  // Search state
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [page, setPage] = useState(0);
  const pageSize = 10;
  const [hasMore, setHasMore] = useState(true);

  // Leaderboard data (manual pagination)
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);

  // Load anggotaId from AsyncStorage once
  useEffect(() => {
    AsyncStorage.getItem('user').then((userStr) => {
      const user = userStr ? JSON.parse(userStr) : null;
      setAnggotaId(user?.anggotaId || user?.id || null);
      setLoadingUser(false);
    });
  }, []);

  // Hooks for independent data sources
  const { data: profile, refetch: refetchProfile } = useGamificationProfile(anggotaId);
  const { data: pointsHistory, refetch: refetchHistory } = usePointsHistory(anggotaId);
  const { data: allBadges, loading: badgesLoading } = useBadges();
  const { data: recentEvents, refetch: refetchEvents } = useRecentEvents(10);
  const { data: rewards, refetch: refetchRewards } = useRewards();
  const { data: orgTree, refetch: refetchOrgTree } = useOrgStructure();

  // Confetti on first profile load
  const previousBadgeCount = useRef(0);
  useEffect(() => {
    if (profile?.badges?.length > 0 && previousBadgeCount.current === 0) {
      setShowConfetti(true);
    }
    previousBadgeCount.current = profile?.badges?.length ?? 0;
  }, [profile?.badges?.length]);

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(searchQuery), 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Reset page on search/filter change
  useEffect(() => { setPage(0); }, [debouncedSearch, selectedDistrik, selectedWilayah, selectedRanting]);

  // Fetch leaderboard when filters or search change
  const fetchLeaderboard = useCallback(async (isLoadMore = false) => {
    try {
      let url = `/gamification/leaderboard?limit=${pageSize}`;
      if (selectedRanting) url += `&rantingId=${selectedRanting}`;
      else if (selectedWilayah) url += `&wilayahId=${selectedWilayah}`;
      else if (selectedDistrik) url += `&distrikId=${selectedDistrik}`;
      if (debouncedSearch.trim()) url += `&search=${encodeURIComponent(debouncedSearch.trim())}`;
      if (isLoadMore) url += `&skip=${(page + 1) * pageSize}`;

      const res = await apiClient.get(url);
      const newData = res.data.data || [];
      if (isLoadMore) {
        setLeaderboard((prev) => [...prev, ...newData]);
      } else {
        setLeaderboard(newData);
      }
      setHasMore(newData.length >= pageSize);
    } catch { /* ignore */ }
  }, [page, pageSize, selectedDistrik, selectedWilayah, selectedRanting, debouncedSearch]);

  // Load leaderboard on mount and when filters change
  useEffect(() => {
    if (!debouncedSearch || debouncedSearch === '') {
      fetchLeaderboard(false);
    } else {
      fetchLeaderboard(false);
    }
  }, [fetchLeaderboard]);

  const loadMore = async () => {
    setPage((p) => p + 1);
    await fetchLeaderboard(true);
  };

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    refetchProfile();
    refetchHistory();
    refetchEvents();
    refetchRewards();
    refetchOrgTree();
    fetchLeaderboard(false);
    setRefreshing(false);
  }, []);

  const animateTab = (tab: TabType) => {
    setActiveTab(tab);
  };

  const loading = loadingUser || badgesLoading;
  const error = null; // Handled by individual hooks

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#3b82f6" />
        <Text style={styles.loadingText}>Memuat gamifikasi...</Text>
      </View>
    );
  }

  const tabs = [
    { key: 'profile' as TabType, label: 'Profil', icon: 'person' as const },
    { key: 'leaderboard' as TabType, label: 'Peringkat', icon: 'trophy' as const },
    { key: 'badges' as TabType, label: 'Badge', icon: 'medal' as const },
    { key: 'rewards' as TabType, label: 'Reward', icon: 'gift' as const },
  ];

  return (
    <ScrollView style={styles.container}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#3b82f6']} />}>
      {/* Tab Selector */}
      <View style={styles.tabContainer}>
        <View style={styles.tabRow}>
          {tabs.map((tab) => (
            <TouchableOpacity key={tab.key} onPress={() => animateTab(tab.key)}
              style={[styles.tab, activeTab === tab.key && styles.tabActive]} activeOpacity={0.7}>
              <Ionicons name={tab.icon} size={16} color={activeTab === tab.key ? '#fff' : '#6b7280'} />
              <Text style={[styles.tabText, activeTab === tab.key && styles.tabTextActive]}>{tab.label}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Profile Tab */}
      <AnimatedTabContent active={activeTab === 'profile'}>
        <View style={styles.section}>
          {profile ? (
            <>
              <View style={styles.pointsCard}>
                <View style={styles.pointsHeader}>
                  <Ionicons name={'zap' as any} size={28} color="#f59e0b" />
                  <View style={styles.liveIndicator}><PulseDot /><Text style={styles.liveText}>Live</Text></View>
                </View>
                <AnimatedNumber value={profile.points} />
                <Text style={styles.pointsLabel}>Total Poin</Text>
                {profile.level && (
                  <View style={styles.levelBadge}>
                    <Text style={styles.levelIcon}>{profile.level.icon}</Text>
                    <Text style={[styles.levelName, { color: profile.level.color }]}>{profile.level.name}</Text>
                  </View>
                )}
              </View>
              {pointsHistory && pointsHistory.length > 1 && (
                <View style={styles.chartSection}>
                  <Text style={styles.chartTitle}>Perkembangan Poin</Text>
                  <View style={styles.chartWrapper}><PointsChart data={pointsHistory} /></View>
                </View>
              )}
              <View style={styles.streaksRow}>
                <TouchableOpacity style={styles.streakCard} activeOpacity={0.7}>
                  <Ionicons name="flame" size={24} color="#3b82f6" />
                  <Text style={styles.streakValue}>{profile.streaks.latihan}</Text>
                  <Text style={styles.streakLabel}>Streak Latihan</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.streakCard} activeOpacity={0.7}>
                  <Ionicons name="star" size={24} color="#22c55e" />
                  <Text style={styles.streakValue}>{profile.streaks.iuran}</Text>
                  <Text style={styles.streakLabel}>Streak Iuran</Text>
                </TouchableOpacity>
              </View>
              {profile.badges.length > 0 && (
                <View style={styles.subSection}>
                  <Text style={styles.subTitle}>Badge Diraih ({profile.badges.length})</Text>
                  <View style={styles.badgeGrid}>
                    {profile.badges.map((badge) => (
                      <View key={badge.id} style={styles.badgeItem}>
                        <Text style={styles.badgeIcon}>{badge.icon}</Text>
                        <Text style={styles.badgeName}>{badge.name}</Text>
                      </View>
                    ))}
                  </View>
                </View>
              )}
              {recentEvents && recentEvents.length > 0 && (
                <View style={styles.subSection}>
                  <Text style={styles.subTitle}>Aktivitas Terbaru</Text>
                  {recentEvents.slice(0, 5).map((event) => (
                    <View key={event.id} style={styles.eventItem}>
                      <View style={styles.eventIconWrap}><Text style={styles.eventIcon}>{EVENT_ICONS[event.type] || '📌'}</Text></View>
                      <View style={styles.eventInfo}>
                        <Text style={styles.eventDesc} numberOfLines={1}>{event.description}</Text>
                        <Text style={styles.eventTime}>{getTimeAgo(event.timestamp)}</Text>
                      </View>
                      <View style={styles.eventPoints}><Text style={styles.eventPointsText}>+{event.points}</Text></View>
                    </View>
                  ))}
                </View>
              )}
            </>
          ) : (
            <Text style={styles.emptyText}>Login untuk melihat profil gamifikasi Anda</Text>
          )}
        </View>
      </AnimatedTabContent>

      {/* Leaderboard Tab */}
      <AnimatedTabContent active={activeTab === 'leaderboard'}>
        <View style={styles.section}>
          <View style={styles.leaderboardHeader}>
            <Ionicons name="trophy" size={24} color="#f59e0b" />
            <Text style={styles.leaderboardTitle}>Peringkat Anggota</Text>
          </View>
          <View style={styles.searchContainer}>
            <Ionicons name="search" size={16} color="#9ca3af" style={styles.searchIcon} />
            <TextInput style={styles.searchInput} placeholder="Cari anggota..." placeholderTextColor="#9ca3af"
              value={searchQuery} onChangeText={setSearchQuery} returnKeyType="search" />
            {searchQuery.length > 0 && (
              <TouchableOpacity onPress={() => setSearchQuery('')} style={styles.searchClear}>
                <Ionicons name="close-circle" size={16} color="#9ca3af" />
              </TouchableOpacity>
            )}
          </View>
          <View style={styles.filterRow}>
            <TouchableOpacity style={[styles.filterChip, selectedDistrik !== '' && styles.filterChipActive]}
              onPress={() => {
                const options = [{ label: 'Semua Distrik', value: '' }, ...(orgTree || []).map(d => ({ label: d.nama, value: d.id }))];
                const idx = options.findIndex(o => o.value === selectedDistrik);
                const next = options[(idx + 1) % options.length];
                setSelectedDistrik(next.value); setSelectedWilayah(''); setSelectedRanting('');
              }}>
              <Text style={[styles.filterChipText, selectedDistrik !== '' && styles.filterChipTextActive]} numberOfLines={1}>
                {selectedDistrik ? (orgTree || []).find(d => d.id === selectedDistrik)?.nama || 'Distrik' : '📌 Distrik'}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.filterChip, selectedWilayah !== '' && styles.filterChipActive, selectedDistrik === '' && styles.filterChipDisabled]}
              onPress={() => {
                const wilayahs = (orgTree || []).find(d => d.id === selectedDistrik)?.wilayahs || [];
                if (!wilayahs.length) return;
                const options = [{ label: 'Semua Wilayah', value: '' }, ...wilayahs.map(w => ({ label: w.nama, value: w.id }))];
                const idx = options.findIndex(o => o.value === selectedWilayah);
                const next = options[(idx + 1) % options.length];
                setSelectedWilayah(next.value); setSelectedRanting('');
              }}>
              <Text style={[styles.filterChipText, selectedWilayah !== '' && styles.filterChipTextActive]} numberOfLines={1}>
                {selectedWilayah ? (orgTree || []).find(d => d.id === selectedDistrik)?.wilayahs?.find(w => w.id === selectedWilayah)?.nama || 'Wilayah' : '📍 Wilayah'}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.filterChip, selectedRanting !== '' && styles.filterChipActive, selectedWilayah === '' && styles.filterChipDisabled]}
              onPress={() => {
                const wilayahs = (orgTree || []).find(d => d.id === selectedDistrik)?.wilayahs || [];
                const rantings = wilayahs.find(w => w.id === selectedWilayah)?.rantings || [];
                if (!rantings.length) return;
                const options = [{ label: 'Semua Ranting', value: '' }, ...rantings.map(r => ({ label: r.nama, value: r.id }))];
                const idx = options.findIndex(o => o.value === selectedRanting);
                const next = options[(idx + 1) % options.length];
                setSelectedRanting(next.value);
              }}>
              <Text style={[styles.filterChipText, selectedRanting !== '' && styles.filterChipTextActive]} numberOfLines={1}>
                {selectedRanting ? (orgTree || []).find(d => d.id === selectedDistrik)?.wilayahs?.find(w => w.id === selectedWilayah)?.rantings?.find(r => r.id === selectedRanting)?.nama || 'Ranting' : '🔴 Ranting'}
              </Text>
            </TouchableOpacity>
            {(selectedDistrik || selectedWilayah || selectedRanting) && (
              <TouchableOpacity onPress={() => { setSelectedDistrik(''); setSelectedWilayah(''); setSelectedRanting(''); }} style={styles.filterChipClear}>
                <Text style={styles.filterChipClearText}>✕</Text>
              </TouchableOpacity>
            )}
          </View>
          {leaderboard.length > 0 ? leaderboard.map((entry) => (
            <TouchableOpacity key={entry.anggotaId} style={[styles.leaderboardItem, entry.rank <= 3 && styles.topThree]} activeOpacity={0.7}>
              <Text style={styles.rankIcon}>{RANK_ICONS[entry.rank] || `#${entry.rank}`}</Text>
              <View style={styles.leaderboardInfo}>
                <Text style={styles.leaderboardName} numberOfLines={1}>{entry.namaLengkap || entry.anggotaId}</Text>
                <View style={styles.leaderboardMeta}>
                  <Text style={styles.metaItem}>🔥 {entry.streaks.latihan}</Text>
                  <Text style={styles.metaItem}>⭐ {entry.streaks.iuran}</Text>
                </View>
              </View>
              <View style={styles.leaderboardPoints}>
                <Ionicons name={'zap' as any} size={14} color="#f59e0b" />
                <Text style={styles.pointsText}>{entry.points.toLocaleString('id-ID')}</Text>
              </View>
            </TouchableOpacity>
          )) : <Text style={styles.emptyText}>Belum ada data leaderboard</Text>}
          {hasMore && leaderboard.length > 0 && (
            <TouchableOpacity style={styles.loadMoreButton} onPress={loadMore}>
              <Ionicons name={'arrow-down' as any} size={16} color="#3b82f6" />
              <Text style={styles.loadMoreText}>Muat Lainnya</Text>
            </TouchableOpacity>
          )}
        </View>
      </AnimatedTabContent>

      {/* Rewards Tab */}
      <AnimatedTabContent active={activeTab === 'rewards'}>
        <View style={styles.section}>
          <Text style={styles.subTitle}>Reward ({(rewards || []).filter(r => r.isActive).length})</Text>
          {(rewards || []).filter(r => r.isActive).map((reward) => (
            <TouchableOpacity key={reward.id} style={styles.rewardCard} activeOpacity={0.7}
              onPress={() => {
                if (!profile) return;
                Alert.alert(`${reward.icon} Redeem Reward`, `Anda akan menukarkan ${reward.pointCost.toLocaleString('id-ID')} poin untuk "${reward.name}".\n\nStok tersedia: ${reward.stock}\n\nLanjutkan?`, [
                  { text: 'Batal', style: 'cancel' },
                  { text: 'Ya, Redeem', style: 'destructive', onPress: async () => {
                    try {
                      await apiClient.post(`/gamification/rewards/${reward.id}/redeem`, { anggotaId });
                      alert(`✅ ${reward.name} berhasil diredeem!`);
                      refetchRewards();
                    } catch (err: any) { alert(err?.response?.data?.message || 'Gagal redeem'); }
                  }},
                ]);
              }}
              disabled={reward.stock <= 0}>
              <Text style={styles.rewardIcon}>{reward.icon}</Text>
              <View style={styles.badgeCardInfo}>
                <Text style={styles.badgeCardName}>{reward.name}</Text>
                {reward.description && <Text style={styles.badgeCardDesc}>{reward.description}</Text>}
                <View style={styles.rewardMeta}>
                  <View style={styles.rewardPoints}><Ionicons name={'zap' as any} size={12} color="#f59e0b" /><Text style={styles.rewardPointsText}>{reward.pointCost.toLocaleString('id-ID')}</Text></View>
                  <Text style={styles.rewardStock}>{reward.stock > 0 ? `Stok: ${reward.stock}` : 'Habis'}</Text>
                </View>
              </View>
              <Ionicons name={reward.stock > 0 ? 'gift' : 'close-circle'} size={24} color={reward.stock > 0 ? '#8b5cf6' : '#ef4444'} />
            </TouchableOpacity>
          ))}
          {(rewards || []).filter(r => r.isActive).length === 0 && <Text style={styles.emptyText}>Belum ada reward tersedia</Text>}
        </View>
      </AnimatedTabContent>

      {/* Badges Tab */}
      <AnimatedTabContent active={activeTab === 'badges'}>
        <View style={styles.section}>
          <Text style={styles.subTitle}>Semua Badge ({(allBadges || []).length})</Text>
          {(allBadges || []).map((badge) => {
            const isEarned = profile?.badges.some((b) => b.id === badge.id);
            return (
              <TouchableOpacity key={badge.id} style={[styles.badgeCard, isEarned && styles.badgeEarned]} activeOpacity={0.7}>
                <Text style={styles.badgeCardIcon}>{badge.icon}</Text>
                <View style={styles.badgeCardInfo}>
                  <Text style={styles.badgeCardName}>{badge.name}</Text>
                  <Text style={styles.badgeCardDesc}>{badge.description}</Text>
                </View>
                {isEarned ? <Ionicons name="checkmark-circle" size={24} color="#22c55e" /> : (
                  <View style={[styles.categoryBadge, { backgroundColor: CATEGORY_COLORS[badge.category] || '#6b7280' }]}>
                    <Text style={styles.categoryText}>{badge.category}</Text>
                  </View>
                )}
              </TouchableOpacity>
            );
          })}
        </View>
      </AnimatedTabContent>

      <Confetti visible={showConfetti} onFinish={() => setShowConfetti(false)} />
      <TouchableOpacity style={styles.adminButton} onPress={() => router.push('/admin-rewards' as never)}>
        <Ionicons name="settings" size={16} color="#6b7280" />
        <Text style={styles.adminButtonText}>Admin Reward</Text>
      </TouchableOpacity>
      <GamificationTour show={tourVisible} onClose={() => setTourVisible(false)} />
      <TouchableOpacity style={styles.tourButton} onPress={() => setTourVisible(true)}>
        <Ionicons name="help-circle" size={18} color="#3b82f6" />
        <Text style={styles.tourButtonText}>Panduan Fitur</Text>
      </TouchableOpacity>
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

  tabContainer: { paddingHorizontal: 16, paddingTop: 12 },
  tabRow: { flexDirection: 'row', backgroundColor: '#e5e7eb', borderRadius: 12, padding: 3 },
  tab: { flex: 1, flexDirection: 'row', paddingVertical: 10, borderRadius: 10, alignItems: 'center', justifyContent: 'center', gap: 6 },
  tabActive: { backgroundColor: '#3b82f6', shadowColor: '#3b82f6', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.3, shadowRadius: 4, elevation: 4 },
  tabText: { fontSize: 13, fontWeight: '600', color: '#6b7280' },
  tabTextActive: { color: '#fff' },

  section: { paddingHorizontal: 16, paddingTop: 16 },

  pointsCard: { backgroundColor: '#fff', borderRadius: 20, padding: 24, alignItems: 'center', borderWidth: 1, borderColor: '#e5e7eb', marginBottom: 12, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 8, elevation: 2 },
  pointsHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', width: '100%' },
  liveIndicator: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  liveDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#22c55e' },
  liveText: { fontSize: 10, color: '#22c55e', fontWeight: '600' },
  pointsValue: { fontSize: 42, fontWeight: '800', color: '#f59e0b', marginTop: 8 },
  pointsLabel: { fontSize: 14, color: '#6b7280', marginTop: 4 },

  streaksRow: { flexDirection: 'row', gap: 12, marginBottom: 16 },
  streakCard: { flex: 1, backgroundColor: '#fff', borderRadius: 16, padding: 16, alignItems: 'center', borderWidth: 1, borderColor: '#e5e7eb', shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.04, shadowRadius: 4, elevation: 1 },
  streakValue: { fontSize: 28, fontWeight: '700', color: '#1f2937', marginTop: 8 },
  streakLabel: { fontSize: 12, color: '#6b7280', marginTop: 4 },

  subSection: { marginBottom: 16 },
  subTitle: { fontSize: 16, fontWeight: '600', color: '#1f2937', marginBottom: 12 },
  badgeGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  badgeItem: { backgroundColor: '#fff', borderRadius: 14, padding: 12, alignItems: 'center', width: 80, borderWidth: 1, borderColor: '#e5e7eb' },
  badgeIcon: { fontSize: 28 },
  badgeName: { fontSize: 10, color: '#374151', marginTop: 4, textAlign: 'center', fontWeight: '500' },

  eventItem: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', borderRadius: 12, padding: 12, marginBottom: 6, borderWidth: 1, borderColor: '#e5e7eb' },
  eventIconWrap: { width: 32, height: 32, borderRadius: 16, backgroundColor: '#f3f4f6', alignItems: 'center', justifyContent: 'center' },
  eventIcon: { fontSize: 16 },
  eventInfo: { flex: 1, marginLeft: 10 },
  eventDesc: { fontSize: 13, color: '#1f2937', fontWeight: '500' },
  eventTime: { fontSize: 11, color: '#9ca3af', marginTop: 2 },
  eventPoints: { backgroundColor: '#fef3c7', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 },
  eventPointsText: { fontSize: 11, fontWeight: '700', color: '#92400e' },

  leaderboardHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 },
  leaderboardTitle: { fontSize: 16, fontWeight: '600', color: '#1f2937' },
  leaderboardItem: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', borderRadius: 14, padding: 14, marginBottom: 8, borderWidth: 1, borderColor: '#e5e7eb' },
  topThree: { backgroundColor: '#fffbeb', borderColor: '#fde68a' },
  rankIcon: { fontSize: 20, width: 36, textAlign: 'center' },
  leaderboardInfo: { flex: 1 },
  leaderboardName: { fontSize: 14, fontWeight: '600', color: '#1f2937' },
  leaderboardMeta: { flexDirection: 'row', gap: 12, marginTop: 4 },
  metaItem: { fontSize: 11, color: '#6b7280' },
  leaderboardPoints: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#fef3c7', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  pointsText: { fontSize: 13, fontWeight: '700', color: '#92400e' },

  badgeCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', borderRadius: 14, padding: 14, marginBottom: 8, borderWidth: 1, borderColor: '#e5e7eb' },
  badgeEarned: { backgroundColor: '#f0fdf4', borderColor: '#bbf7d0' },
  badgeCardIcon: { fontSize: 28, width: 40, textAlign: 'center' },
  badgeCardInfo: { flex: 1, marginLeft: 8 },
  badgeCardName: { fontSize: 14, fontWeight: '600', color: '#1f2937' },
  badgeCardDesc: { fontSize: 12, color: '#6b7280', marginTop: 2 },
  categoryBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 10 },
  categoryText: { fontSize: 10, color: '#fff', fontWeight: '600' },

  rewardCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', borderRadius: 14, padding: 14, marginBottom: 8, borderWidth: 1, borderColor: '#e5e7eb' },
  rewardIcon: { fontSize: 32, width: 44, textAlign: 'center' },
  rewardMeta: { flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 4 },
  rewardPoints: { flexDirection: 'row', alignItems: 'center', gap: 3, backgroundColor: '#fef3c7', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 8 },
  rewardPointsText: { fontSize: 11, fontWeight: '700', color: '#92400e' },
  rewardStock: { fontSize: 11, color: '#6b7280' },

  searchContainer: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', borderRadius: 10, borderWidth: 1, borderColor: '#e5e7eb', paddingHorizontal: 10, marginBottom: 10 },
  searchIcon: { marginRight: 6 },
  searchInput: { flex: 1, paddingVertical: 10, fontSize: 14, color: '#1f2937' },
  searchClear: { padding: 4 },

  filterRow: { flexDirection: 'row', gap: 6, marginBottom: 12, flexWrap: 'wrap' },
  filterChip: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8, backgroundColor: '#fff', borderWidth: 1, borderColor: '#e5e7eb' },
  filterChipActive: { backgroundColor: '#3b82f6', borderColor: '#3b82f6' },
  filterChipDisabled: { opacity: 0.4 },
  filterChipText: { fontSize: 11, color: '#6b7280', fontWeight: '500' },
  filterChipTextActive: { color: '#fff' },
  filterChipClear: { paddingHorizontal: 8, paddingVertical: 6, borderRadius: 8, backgroundColor: '#fee2e2', borderWidth: 1, borderColor: '#fecaca' },
  filterChipClearText: { fontSize: 12, color: '#ef4444', fontWeight: '700' },

  chartSection: { marginBottom: 16 },
  chartTitle: { fontSize: 16, fontWeight: '600', color: '#1f2937', marginBottom: 8 },
  chartContainer: { alignItems: 'center', paddingVertical: 8 },
  chartWrapper: { backgroundColor: '#fff', borderRadius: 14, padding: 12, borderWidth: 1, borderColor: '#e5e7eb', alignItems: 'center' },

  levelBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 8, backgroundColor: '#f3f4f6', paddingHorizontal: 12, paddingVertical: 4, borderRadius: 12 },
  levelIcon: { fontSize: 16 },
  levelName: { fontSize: 13, fontWeight: '700' },

  loadMoreButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 14, backgroundColor: '#eff6ff', borderRadius: 12, marginBottom: 8, borderWidth: 1, borderColor: '#bfdbfe' },
  loadMoreText: { fontSize: 13, fontWeight: '600', color: '#3b82f6' },
  adminButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 12, marginHorizontal: 16, marginTop: 8, backgroundColor: '#f3f4f6', borderRadius: 12, borderWidth: 1, borderColor: '#e5e7eb' },
  adminButtonText: { fontSize: 13, fontWeight: '500', color: '#6b7280' },
  tourButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 10, marginHorizontal: 16, marginTop: 6, backgroundColor: '#eff6ff', borderRadius: 12, borderWidth: 1, borderColor: '#bfdbfe' },
  tourButtonText: { fontSize: 13, fontWeight: '500', color: '#3b82f6' },
  emptyText: { fontSize: 13, color: '#9ca3af', textAlign: 'center', paddingVertical: 20 },
});

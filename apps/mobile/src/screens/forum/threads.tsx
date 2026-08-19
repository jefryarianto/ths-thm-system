import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  TextInput,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Ionicons from '@expo/vector-icons/Ionicons';
import { router, useLocalSearchParams } from 'expo-router';
import { useForumThreads } from '../../hooks/use-forum';
import { useRefresh } from '../../hooks/use-refresh';
import { LoadingView } from '../../components/ui/shared';

export default function ForumThreadsScreen() {
  const { categoryId, categoryName } = useLocalSearchParams<{
    categoryId: string;
    categoryName?: string;
  }>();
  const [search, setSearch] = useState('');

  const { data: threads, loading, refetch } = useForumThreads(categoryId!, search);
  const { refreshing, onRefresh } = useRefresh(refetch);

  const insets = useSafeAreaInsets();

  if (loading) return <LoadingView message="Memuat thread..." />;

  return (
    <View style={styles.container}>
      <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={22} color="#fff" />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={styles.headerTitle}>{categoryName || 'Thread'}</Text>
          <Text style={styles.headerSub}>{(threads ?? []).length} thread</Text>
        </View>
        <TouchableOpacity
          style={styles.addBtn}
          activeOpacity={0.7}
          onPress={() => router.push('/forum/create')}
        >
          <Ionicons name="add" size={22} color="#fff" />
        </TouchableOpacity>
      </View>

      {/* Search */}
      <View style={styles.searchContainer}>
        <Ionicons name="search" size={16} color="#9ca3af" />
        <TextInput
          style={styles.searchInput}
          placeholder="Cari thread..."
          placeholderTextColor="#9ca3af"
          value={search}
          onChangeText={setSearch}
        />
        {search.length > 0 && (
          <TouchableOpacity onPress={() => setSearch('')}>
            <Ionicons name="close-circle" size={16} color="#9ca3af" />
          </TouchableOpacity>
        )}
      </View>

      <FlatList
        data={threads}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ padding: 16 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Ionicons name="chatbubbles" size={48} color="#d1d5db" />
            <Text style={styles.emptyText}>
              {search
                ? 'Tidak ada thread yang cocok'
                : 'Belum ada thread di kategori ini'}
            </Text>
          </View>
        }
        renderItem={({ item }) => (
          <TouchableOpacity
            style={styles.card}
            activeOpacity={0.7}
            onPress={() => router.push(`/forum/t/${item.id}` as any)}
          >
            <View style={styles.cardContent}>
              <View style={styles.titleRow}>
                {item.isPinned && (
                  <Ionicons name="pin" size={14} color="#2563eb" />
                )}
                <Text style={styles.title} numberOfLines={1}>
                  {item.judul}
                </Text>
                {item.isLocked && (
                  <Ionicons name="lock-closed" size={12} color="#ef4444" />
                )}
              </View>
              <Text style={styles.excerpt} numberOfLines={2}>
                {item.konten}
              </Text>
              <View style={styles.metaRow}>
                <View style={styles.metaLeft}>
                  <View style={styles.avatarSmall}>
                    <Text style={styles.avatarText}>
                      {item.author?.namaLengkap?.charAt(0) || '?'}
                    </Text>
                  </View>
                  <Text style={styles.metaText}>{item.author?.namaLengkap}</Text>
                </View>
                <View style={styles.metaRight}>
                  <Ionicons name="chatbubble" size={11} color="#9ca3af" />
                  <Text style={styles.metaText}>{item._count?.posts ?? 0}</Text>
                  <Ionicons name="eye" size={11} color="#9ca3af" style={{ marginLeft: 8 }} />
                  <Text style={styles.metaText}>{item.viewCount}</Text>
                </View>
              </View>
            </View>
          </TouchableOpacity>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f3f4f6' },
  header: {
    backgroundColor: '#2563eb',
    padding: 24,
    paddingBottom: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  backBtn: { padding: 4 },
  addBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: { color: '#fff', fontSize: 18, fontWeight: '700' },
  headerSub: { color: '#bfdbfe', fontSize: 12, marginTop: 2 },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    margin: 16,
    marginBottom: 0,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  searchInput: { flex: 1, fontSize: 14, color: '#111827', marginLeft: 8 },
  card: {
    backgroundColor: '#fff',
    borderRadius: 14,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#f3f4f6',
    shadowColor: '#000',
    shadowOpacity: 0.03,
    shadowRadius: 4,
    elevation: 1,
  },
  cardContent: { padding: 14 },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  title: { fontSize: 15, fontWeight: '600', color: '#111827', flex: 1 },
  excerpt: {
    fontSize: 12,
    color: '#6b7280',
    marginTop: 6,
    lineHeight: 17,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 10,
  },
  metaLeft: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  metaRight: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  avatarSmall: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#eff6ff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: { fontSize: 10, fontWeight: '700', color: '#2563eb' },
  metaText: { fontSize: 11, color: '#9ca3af' },
  empty: { alignItems: 'center', paddingTop: 60 },
  emptyText: { fontSize: 14, color: '#9ca3af', marginTop: 12 },
});

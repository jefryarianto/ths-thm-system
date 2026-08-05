import React from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, RefreshControl } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { router } from 'expo-router';
import { useForumCategories } from '../../hooks/use-forum';
import { useRefresh } from '../../hooks/use-refresh';
import { LoadingView } from '../../components/ui/shared';

export default function ForumScreen() {
  const { data: categories, loading, refetch } = useForumCategories();
  const { refreshing, onRefresh } = useRefresh(refetch);

  if (loading) return <LoadingView message="Memuat forum..." />;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>Forum Komunitas</Text>
          <Text style={styles.headerSub}>{(categories ?? []).length} kategori</Text>
        </View>
        <TouchableOpacity
          style={styles.addBtn}
          activeOpacity={0.7}
          onPress={() => router.push('/forum/create')}
        >
          <Ionicons name="add" size={22} color="#fff" />
        </TouchableOpacity>
      </View>

      <FlatList
        data={categories}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ padding: 16 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Ionicons name="chatbubbles" size={48} color="#d1d5db" />
            <Text style={styles.emptyText}>Belum ada kategori forum</Text>
          </View>
        }
        renderItem={({ item }) => (
          <TouchableOpacity
            style={styles.card}
            activeOpacity={0.7}
            onPress={() => router.push(`/forum/c/${item.id}?categoryName=${encodeURIComponent(item.nama)}` as any)}
          >
            <View style={styles.iconCircle}>
              <Ionicons name="folder-open" size={22} color="#2563eb" />
            </View>
            <View style={styles.cardBody}>
              <Text style={styles.title}>{item.nama}</Text>
              {item.deskripsi && (
                <Text style={styles.desc} numberOfLines={2}>
                  {item.deskripsi}
                </Text>
              )}
              <View style={styles.metaRow}>
                <Ionicons name="chatbubble-ellipses" size={12} color="#9ca3af" />
                <Text style={styles.metaText}>
                  {item._count?.threads ?? 0} thread
                </Text>
              </View>
            </View>
            <Ionicons name="chevron-forward" size={18} color="#d1d5db" />
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
    paddingTop: 60,
    paddingBottom: 20,
    flexDirection: 'row',
    alignItems: 'center',
  },
  addBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'absolute',
    right: 24,
    top: 60,
  },
  headerTitle: { color: '#fff', fontSize: 22, fontWeight: '700' },
  headerSub: { color: '#bfdbfe', fontSize: 13, marginTop: 4 },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 14,
    padding: 16,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#f3f4f6',
    shadowColor: '#000',
    shadowOpacity: 0.03,
    shadowRadius: 4,
    elevation: 1,
  },
  iconCircle: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: '#eff6ff',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  cardBody: { flex: 1 },
  title: { fontSize: 15, fontWeight: '600', color: '#111827' },
  desc: { fontSize: 12, color: '#6b7280', marginTop: 4, lineHeight: 17 },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 8 },
  metaText: { fontSize: 12, color: '#9ca3af' },
  empty: { alignItems: 'center', paddingTop: 60 },
  emptyText: { fontSize: 14, color: '#9ca3af', marginTop: 12 },
});

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  TextInput,
  Alert,
  Linking,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import apiClient from '../../lib/api-client';
import { useDocuments, TIPE_LABELS, TIPE_ICONS, STATUS_STYLES, TIPE_FILTERS, DocumentItem } from '../../hooks/use-documents';
import { LoadingView, FilterChips } from '../../components/ui/shared';

export default function DocumentsScreen() {
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState('');
  const [filterTipe, setFilterTipe] = useState('');

  const { data: documents, loading, refetch } = useDocuments(search, filterTipe);

  const onRefresh = async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  };

  const handleDownload = async (item: DocumentItem) => {
    if (item.filePath) {
      try {
        const url = `${apiClient.defaults.baseURL}${item.filePath}`;
        await Linking.openURL(url);
      } catch {
        Alert.alert('Error', 'Tidak bisa membuka dokumen');
      }
    }
  };

  if (loading) return <LoadingView message="Memuat dokumen..." />;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Dokumen</Text>
        <Text style={styles.headerSub}>{(documents ?? []).length} dokumen</Text>
      </View>

      {/* Search */}
      <View style={styles.searchContainer}>
        <Ionicons name="search" size={16} color="#9ca3af" />
        <TextInput
          style={styles.searchInput}
          placeholder="Cari dokumen..."
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

      <FilterChips options={TIPE_FILTERS} selected={filterTipe} onChange={setFilterTipe} />

      <FlatList
        data={documents}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ padding: 16 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Ionicons name="document-text" size={48} color="#d1d5db" />
            <Text style={styles.emptyText}>
              {search || filterTipe ? 'Tidak ada dokumen yang cocok' : 'Belum ada dokumen'}
            </Text>
          </View>
        }
        renderItem={({ item }) => {
          const ss = STATUS_STYLES[item.status] || { label: item.status, color: '#6b7280', bg: '#f3f4f6' };
          const iconName = TIPE_ICONS[item.tipe] || 'document-text';
          const tipeLabel = TIPE_LABELS[item.tipe] || item.tipe;
          return (
            <TouchableOpacity style={styles.card} onPress={() => handleDownload(item)} activeOpacity={0.7}>
              <View style={styles.iconCircle}>
                <Ionicons name={iconName as any} size={22} color="#2563eb" />
              </View>
              <View style={styles.cardInfo}>
                <Text style={styles.cardTitle}>{tipeLabel}</Text>
                <Text style={styles.cardMember}>{item.anggota?.namaLengkap || '-'}</Text>
                <Text style={styles.cardDate}>
                  {item.createdAt ? new Date(item.createdAt).toLocaleDateString('id-ID') : '-'}
                </Text>
              </View>
              <View style={styles.cardRight}>
                <View style={[styles.statusBadge, { backgroundColor: ss.bg }]}>
                  <Text style={[styles.statusText, { color: ss.color }]}>{ss.label}</Text>
                </View>
                <Ionicons
                  name={item.filePath ? 'download-outline' : 'time-outline'}
                  size={18}
                  color={item.filePath ? '#2563eb' : '#9ca3af'}
                  style={{ marginTop: 6 }}
                />
              </View>
            </TouchableOpacity>
          );
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f3f4f6' },
  header: { backgroundColor: '#2563eb', padding: 24, paddingTop: 60, paddingBottom: 20 },
  headerTitle: { color: '#fff', fontSize: 22, fontWeight: '700' },
  headerSub: { color: '#bfdbfe', fontSize: 13, marginTop: 4 },
  searchContainer: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', margin: 16, marginBottom: 0,
    borderRadius: 10, borderWidth: 1, borderColor: '#e5e7eb', paddingHorizontal: 12, paddingVertical: 8,
  },
  searchInput: { flex: 1, fontSize: 14, color: '#111827', marginLeft: 8 },

  card: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', borderRadius: 14,
    padding: 14, marginBottom: 8, borderWidth: 1, borderColor: '#f3f4f6',
    shadowColor: '#000', shadowOpacity: 0.03, shadowRadius: 4, elevation: 1,
  },
  iconCircle: {
    width: 40, height: 40, borderRadius: 20, backgroundColor: '#eff6ff',
    alignItems: 'center', justifyContent: 'center', marginRight: 10,
  },
  cardInfo: { flex: 1 },
  cardTitle: { fontSize: 14, fontWeight: '600', color: '#111827' },
  cardMember: { fontSize: 11, color: '#6b7280', marginTop: 2 },
  cardDate: { fontSize: 11, color: '#9ca3af', marginTop: 1 },
  cardRight: { alignItems: 'center', marginLeft: 8 },
  statusBadge: { paddingHorizontal: 10, paddingVertical: 3, borderRadius: 8 },
  statusText: { fontSize: 10, fontWeight: '600' },
  empty: { alignItems: 'center', paddingTop: 60 },
  emptyText: { fontSize: 14, color: '#9ca3af', marginTop: 12 },
});

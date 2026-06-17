import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  Linking,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useOrgDocuments, TIPE_OPTIONS } from '../../hooks/use-org-documents';
import { useRefresh } from '../../hooks/use-refresh';
import { LoadingView, FilterChips } from '../../components/ui/shared';

export default function OrgDocumentsScreen() {
  const [filter, setFilter] = useState('');

  const { data: documents, loading, refetch } = useOrgDocuments(filter);
  const { refreshing, onRefresh } = useRefresh(refetch);

  const handleDownload = async (url: string, nama: string) => {
    try {
      const supported = await Linking.canOpenURL(url);
      if (supported) {
        await Linking.openURL(url);
      } else {
        Alert.alert('Error', 'Tidak dapat membuka dokumen');
      }
    } catch {
      Alert.alert('Error', 'Gagal membuka dokumen');
    }
  };

  if (loading) return <LoadingView message="Memuat dokumen..." />;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Dokumen Organisasi</Text>
        <Text style={styles.headerSub}>{(documents ?? []).length} dokumen</Text>
      </View>

      <FilterChips options={TIPE_OPTIONS} selected={filter} onChange={setFilter} />

      <FlatList
        data={documents}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ padding: 16 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Ionicons name="document-text" size={48} color="#d1d5db" />
            <Text style={styles.emptyText}>Belum ada dokumen</Text>
          </View>
        }
        renderItem={({ item }) => {
          const tipeIcons: Record<string, string> = {
            sk: 'ribbon',
            piagam: 'star',
            sertifikat: 'trophy',
            lainnya: 'document-text',
          };
          const icon = tipeIcons[item.tipe] || 'document-text';
          return (
            <TouchableOpacity
              style={styles.card}
              activeOpacity={0.7}
              onPress={() => item.fileUrl && handleDownload(item.fileUrl, item.nama)}
            >
              <View style={styles.iconBox}>
                <Ionicons name={icon as any} size={22} color="#2563eb" />
              </View>
              <View style={styles.cardBody}>
                <Text style={styles.name} numberOfLines={2}>
                  {item.nama}
                </Text>
                <View style={styles.metaRow}>
                  <Text style={styles.metaText}>{item.tipe}</Text>
                  <Text style={styles.metaDot}>·</Text>
                  <Text style={styles.metaText}>
                    {new Date(item.createdAt).toLocaleDateString('id-ID', {
                      day: 'numeric',
                      month: 'short',
                      year: 'numeric',
                    })}
                  </Text>
                </View>
              </View>
              {item.fileUrl && <Ionicons name="download-outline" size={20} color="#6b7280" />}
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
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 14,
    padding: 14,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#f3f4f6',
    shadowColor: '#000',
    shadowOpacity: 0.03,
    shadowRadius: 4,
    elevation: 1,
  },
  iconBox: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: '#eff6ff',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  cardBody: { flex: 1 },
  name: { fontSize: 15, fontWeight: '600', color: '#111827' },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 4 },
  metaText: { fontSize: 12, color: '#6b7280' },
  metaDot: { fontSize: 12, color: '#9ca3af' },
  empty: { alignItems: 'center', paddingTop: 60 },
  emptyText: { fontSize: 14, color: '#9ca3af', marginTop: 12 },
});

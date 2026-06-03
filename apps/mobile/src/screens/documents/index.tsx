import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, FlatList, ActivityIndicator, TouchableOpacity, Linking, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import apiClient from '../../lib/api-client';

export default function DocumentsScreen() {
  const [documents, setDocuments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const res = await apiClient.get('/documents', { params: { limit: 50 } });
        setDocuments(res.data.data || []);
      } catch { /* ignore */ }
      setLoading(false);
    })();
  }, []);

  const tipeLabel: Record<string, string> = {
    kartu_anggota: 'Kartu Anggota', sertifikat_pendadaran: 'Sertifikat Pendadaran',
    sertifikat_pelatihan: 'Sertifikat Pelatihan', piagam_prestasi: 'Piagam Prestasi',
  };

  const handleDownload = async (item: any) => {
    if (item.filePath) {
      try {
        const url = `${apiClient.defaults.baseURL}${item.filePath}`;
        await Linking.openURL(url);
      } catch {
        Alert.alert('Error', 'Tidak bisa membuka dokumen');
      }
    }
  };

  if (loading) return <View style={styles.container}><ActivityIndicator size="large" /></View>;

  return (
    <View style={styles.container}>
      <FlatList
        data={documents}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ padding: 16 }}
        ListEmptyComponent={<Text style={{ textAlign: 'center', color: '#6b7280', marginTop: 40 }}>Belum ada dokumen</Text>}
        renderItem={({ item }) => (
          <TouchableOpacity style={styles.card} onPress={() => handleDownload(item)}>
            <Ionicons name="document-text" size={28} color="#2563eb" />
            <View style={styles.cardInfo}>
              <Text style={styles.cardTitle}>{tipeLabel[item.tipe] || item.tipe}</Text>
              <Text style={styles.cardDate}>{item.createdAt ? new Date(item.createdAt).toLocaleDateString('id-ID') : '-'}</Text>
            </View>
            <Ionicons name={item.filePath ? "download-outline" : "time-outline"} size={22} color="#6b7280" />
          </TouchableOpacity>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f3f4f6' },
  card: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', borderRadius: 12, padding: 16, marginBottom: 8, shadowColor: '#000', shadowOpacity: 0.03, shadowRadius: 4, elevation: 1 },
  cardInfo: { flex: 1, marginLeft: 12 },
  cardTitle: { fontSize: 15, fontWeight: '600', color: '#111827' },
  cardDate: { fontSize: 13, color: '#6b7280', marginTop: 2 },
});
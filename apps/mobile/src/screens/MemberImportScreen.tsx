import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import DocumentPicker from 'react-native-document-picker';
import { uploadCsv } from '../services/memberService';
import { LoadingView, ErrorView } from '../components/ui/shared';

export default function MemberImportScreen() {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{
    success: number;
    incomplete: number;
    errors: number;
  } | null>(null);

  const pickFile = async () => {
    try {
      const res = await DocumentPicker.pickSingle({
        type: DocumentPicker.types.plainText,
      });
      if (!res.name.endsWith('.csv')) {
        Alert.alert('Error', 'File harus CSV');
        return;
      }
      setLoading(true);
      setResult(null);
      const uploadResult = await uploadCsv(res);
      setResult(uploadResult);
      Alert.alert('Berhasil', 'File CSV berhasil diimport');
    } catch (e) {
      if (DocumentPicker.isCancel(e)) {
        return;
      }
      Alert.alert('Gagal Upload', String(e));
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <LoadingView message="Mengupload file CSV..." />;

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={22} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Import Anggota</Text>
      </View>

      <View style={styles.section}>
        <View style={styles.infoCard}>
          <Ionicons name="information-circle" size={20} color="#2563eb" />
          <Text style={styles.infoText}>
            Upload file CSV berisi data anggota baru. Format: namaLengkap, email, noHp, alamat,
            tanggalLahir, tempatLahir
          </Text>
        </View>

        <TouchableOpacity
          style={styles.uploadBtn}
          onPress={pickFile}
          disabled={loading}
          activeOpacity={0.7}
        >
          <Ionicons name="cloud-upload" size={22} color="#fff" />
          <Text style={styles.uploadBtnText}>Pilih File CSV</Text>
        </TouchableOpacity>

        {result && (
          <View style={styles.resultCard}>
            <Text style={styles.resultTitle}>Hasil Import</Text>
            <View style={styles.resultRow}>
              <View style={[styles.resultBadge, { backgroundColor: '#ecfdf5' }]}>
                <Text style={[styles.resultBadgeText, { color: '#16a34a' }]}>
                  Berhasil: {result.success}
                </Text>
              </View>
              <View style={[styles.resultBadge, { backgroundColor: '#fef3c7' }]}>
                <Text style={[styles.resultBadgeText, { color: '#ca8a04' }]}>
                  Incomplete: {result.incomplete}
                </Text>
              </View>
              <View style={[styles.resultBadge, { backgroundColor: '#fef2f2' }]}>
                <Text style={[styles.resultBadgeText, { color: '#dc2626' }]}>
                  Error: {result.errors}
                </Text>
              </View>
            </View>
          </View>
        )}
      </View>

      <View style={{ height: 40 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f3f4f6' },
  header: {
    backgroundColor: '#2563eb',
    padding: 24,
    paddingTop: 60,
    paddingBottom: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  backBtn: { padding: 4 },
  headerTitle: { color: '#fff', fontSize: 18, fontWeight: '700' },

  section: { padding: 16 },

  infoCard: {
    flexDirection: 'row',
    gap: 10,
    backgroundColor: '#eff6ff',
    borderRadius: 12,
    padding: 14,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#bfdbfe',
  },
  infoText: { flex: 1, fontSize: 12, color: '#1e40af', lineHeight: 18 },

  uploadBtn: {
    backgroundColor: '#2563eb',
    borderRadius: 12,
    paddingVertical: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  uploadBtnText: { fontSize: 16, fontWeight: '600', color: '#fff' },

  resultCard: {
    backgroundColor: '#fff',
    borderRadius: 14,
    padding: 16,
    marginTop: 20,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  resultTitle: { fontSize: 15, fontWeight: '600', color: '#111827', marginBottom: 12 },
  resultRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  resultBadge: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8 },
  resultBadgeText: { fontSize: 12, fontWeight: '600' },
});

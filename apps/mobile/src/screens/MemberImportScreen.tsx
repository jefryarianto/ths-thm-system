import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ScrollView,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Ionicons from '@expo/vector-icons/Ionicons';
import { router } from 'expo-router';
import DocumentPicker from 'react-native-document-picker';
import { uploadCsv } from '../services/memberService';
import { LoadingView, ErrorView } from '../components/ui/shared';
import { theme } from '../theme';

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

  const insets = useSafeAreaInsets();

  if (loading) return <LoadingView message="Mengupload file CSV..." />;

  return (
    <ScrollView style={styles.container}>
      <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={22} color={theme.colors.surface} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Import Anggota</Text>
      </View>

      <View style={styles.section}>
        <View style={styles.infoCard}>
          <Ionicons name="information-circle" size={20} color={theme.colors.primary} />
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
          <Ionicons name="cloud-upload" size={22} color={theme.colors.surface} />
          <Text style={styles.uploadBtnText}>Pilih File CSV</Text>
        </TouchableOpacity>

        {result && (
          <View style={styles.resultCard}>
            <Text style={styles.resultTitle}>Hasil Import</Text>
            <View style={styles.resultRow}>
              <View style={[styles.resultBadge, { backgroundColor: theme.colors.successLight }]}>
                <Text style={[styles.resultBadgeText, { color: theme.colors.success }]}>
                  Berhasil: {result.success}
                </Text>
              </View>
              <View style={[styles.resultBadge, { backgroundColor: theme.colors.warningLight }]}>
                <Text style={[styles.resultBadgeText, { color: theme.colors.warning }]}>
                  Incomplete: {result.incomplete}
                </Text>
              </View>
              <View style={[styles.resultBadge, { backgroundColor: theme.colors.dangerLight }]}>
                <Text style={[styles.resultBadgeText, { color: theme.colors.danger }]}>
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
  container: { flex: 1, backgroundColor: theme.colors.surfaceMuted },
  header: {
    backgroundColor: theme.colors.primary,
    padding: 24,
    paddingBottom: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  backBtn: { padding: 4 },
  headerTitle: { color: theme.colors.surface, fontSize: 18, fontWeight: '700' },

  section: { padding: 16 },

  infoCard: {
    flexDirection: 'row',
    gap: 10,
    backgroundColor: theme.colors.primarySofter,
    borderRadius: 12,
    padding: 14,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: theme.colors.headerSub,
  },
  infoText: { flex: 1, fontSize: 12, color: theme.colors.primaryDark, lineHeight: 18 },

  uploadBtn: {
    backgroundColor: theme.colors.primary,
    borderRadius: 12,
    paddingVertical: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  uploadBtnText: { fontSize: 16, fontWeight: '600', color: theme.colors.surface },

  resultCard: {
    backgroundColor: theme.colors.surface,
    borderRadius: 14,
    padding: 16,
    marginTop: 20,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  resultTitle: { fontSize: 15, fontWeight: '600', color: theme.colors.text, marginBottom: 12 },
  resultRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  resultBadge: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8 },
  resultBadgeText: { fontSize: 12, fontWeight: '600' },
});

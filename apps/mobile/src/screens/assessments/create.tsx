import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
} from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { router } from 'expo-router';
import apiClient, { unwrap } from '../../lib/api-client';

interface FormData {
  nama: string;
  keterangan: string;
  bobot: string;
}

const INITIAL_FORM: FormData = {
  nama: '',
  keterangan: '',
  bobot: '100',
};

export default function CreateAssessmentScreen() {
  const [form, setForm] = useState<FormData>(INITIAL_FORM);
  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const updateField = (field: keyof FormData, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors((prev) => {
        const copy = { ...prev };
        delete copy[field];
        return copy;
      });
    }
  };

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};
    if (!form.nama.trim()) newErrors.nama = 'Nama aspek wajib diisi';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validate()) return;

    setSubmitting(true);
    try {
      await apiClient.post('/assessments/aspects', {
        nama: form.nama,
        keterangan: form.keterangan || undefined,
        bobot: Number(form.bobot) || 100,
      });
      Alert.alert('Berhasil', 'Aspek penilaian berhasil dibuat', [
        { text: 'OK', onPress: () => router.back() },
      ]);
    } catch (err: unknown) {
      Alert.alert('Gagal', (err as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Gagal membuat aspek');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Buat Aspek Penilaian</Text>
      </View>

      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>
            <Ionicons name="clipboard" size={16} color="#2563eb" /> Aspek Penilaian
          </Text>

          <Text style={styles.label}>Nama Aspek *</Text>
          <TextInput
            style={[styles.input, errors.nama && styles.inputError]}
            value={form.nama}
            onChangeText={(v) => updateField('nama', v)}
            placeholder="Contoh: Teknik Dasar"
            placeholderTextColor="#9ca3af"
          />
          {errors.nama && <Text style={styles.errorText}>{errors.nama}</Text>}

          <Text style={styles.label}>Keterangan</Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            value={form.keterangan}
            onChangeText={(v) => updateField('keterangan', v)}
            placeholder="Deskripsi aspek"
            placeholderTextColor="#9ca3af"
            multiline
            numberOfLines={3}
          />

          <Text style={styles.label}>Bobot (%)</Text>
          <TextInput
            style={styles.input}
            value={form.bobot}
            onChangeText={(v) => updateField('bobot', v.replace(/[^0-9]/g, ''))}
            placeholder="100"
            placeholderTextColor="#9ca3af"
            keyboardType="numeric"
          />
        </View>

        <TouchableOpacity
          style={[styles.submitBtn, submitting && styles.submitBtnDisabled]}
          onPress={handleSubmit}
          disabled={submitting}
          activeOpacity={0.8}
        >
          {submitting ? (
            <ActivityIndicator color="#fff" size="small" />
          ) : (
            <>
              <Ionicons name="save" size={18} color="#fff" />
              <Text style={styles.submitText}>Buat Aspek</Text>
            </>
          )}
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f3f4f6' },
  header: {
    backgroundColor: '#2563eb',
    flexDirection: 'row',
    alignItems: 'center',
    padding: 24,
    paddingTop: 60,
    paddingBottom: 16,
    gap: 12,
  },
  backBtn: { padding: 4 },
  headerTitle: { color: '#fff', fontSize: 18, fontWeight: '700', flex: 1 },
  scroll: { flex: 1 },
  scrollContent: { padding: 16, paddingBottom: 40 },
  section: {
    backgroundColor: '#fff',
    borderRadius: 14,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  sectionTitle: { fontSize: 15, fontWeight: '600', color: '#111827', marginBottom: 16 },
  label: { fontSize: 13, fontWeight: '500', color: '#374151', marginBottom: 6, marginTop: 12 },
  input: {
    backgroundColor: '#f9fafb',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 14,
    color: '#111827',
  },
  inputError: { borderColor: '#ef4444', backgroundColor: '#fef2f2' },
  textArea: { minHeight: 80, textAlignVertical: 'top' },
  errorText: { fontSize: 12, color: '#ef4444', marginTop: 4 },
  submitBtn: {
    backgroundColor: '#2563eb',
    borderRadius: 12,
    paddingVertical: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 8,
  },
  submitBtnDisabled: { opacity: 0.6 },
  submitText: { fontSize: 15, fontWeight: '600', color: '#fff' },
});
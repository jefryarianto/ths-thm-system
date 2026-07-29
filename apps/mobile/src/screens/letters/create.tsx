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
  nomorSurat: string;
  perihal: string;
  tujuan: string;
  tanggalSurat: string;
  lampiran: string;
  isiSurat: string;
}

const INITIAL_FORM: FormData = {
  nomorSurat: '',
  perihal: '',
  tujuan: '',
  tanggalSurat: '',
  lampiran: '',
  isiSurat: '',
};

export default function CreateLetterScreen() {
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
    if (!form.perihal.trim()) newErrors.perihal = 'Perihal surat wajib diisi';
    if (!form.tujuan.trim()) newErrors.tujuan = 'Tujuan surat wajib diisi';
    if (!form.isiSurat.trim()) newErrors.isiSurat = 'Isi surat wajib diisi';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validate()) return;

    setSubmitting(true);
    try {
      const payload = {
        nomorSurat: form.nomorSurat || undefined,
        perihal: form.perihal,
        tujuan: form.tujuan,
        tanggalSurat: form.tanggalSurat || undefined,
        lampiran: form.lampiran || undefined,
        isiSurat: form.isiSurat,
      };
      await apiClient.post('/letters/outgoing', payload);
      Alert.alert('Berhasil', 'Surat keluar berhasil dibuat', [
        { text: 'OK', onPress: () => router.back() },
      ]);
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ||
        'Gagal membuat surat. Silakan coba lagi.';
      Alert.alert('Gagal', msg);
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
        <Text style={styles.headerTitle}>Buat Surat Keluar</Text>
      </View>

      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
        {/* Informasi Surat */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>
            <Ionicons name="document-text" size={16} color="#2563eb" /> Informasi Surat
          </Text>

          <Text style={styles.label}>Nomor Surat</Text>
          <TextInput
            style={styles.input}
            value={form.nomorSurat}
            onChangeText={(v) => updateField('nomorSurat', v)}
            placeholder="Otomatis jika dikosongkan"
            placeholderTextColor="#9ca3af"
          />

          <Text style={styles.label}>Perihal *</Text>
          <TextInput
            style={[styles.input, errors.perihal && styles.inputError]}
            value={form.perihal}
            onChangeText={(v) => updateField('perihal', v)}
            placeholder="Perihal surat"
            placeholderTextColor="#9ca3af"
          />
          {errors.perihal && <Text style={styles.errorText}>{errors.perihal}</Text>}

          <Text style={styles.label}>Tujuan *</Text>
          <TextInput
            style={[styles.input, errors.tujuan && styles.inputError]}
            value={form.tujuan}
            onChangeText={(v) => updateField('tujuan', v)}
            placeholder="Kepada siapa surat ditujukan"
            placeholderTextColor="#9ca3af"
          />
          {errors.tujuan && <Text style={styles.errorText}>{errors.tujuan}</Text>}

          <Text style={styles.label}>Tanggal Surat</Text>
          <TextInput
            style={styles.input}
            value={form.tanggalSurat}
            onChangeText={(v) => updateField('tanggalSurat', v)}
            placeholder="YYYY-MM-DD (hari ini jika dikosongkan)"
            placeholderTextColor="#9ca3af"
          />

          <Text style={styles.label}>Lampiran</Text>
          <TextInput
            style={styles.input}
            value={form.lampiran}
            onChangeText={(v) => updateField('lampiran', v)}
            placeholder="Contoh: 3 lembar"
            placeholderTextColor="#9ca3af"
          />
        </View>

        {/* Isi Surat */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>
            <Ionicons name="text" size={16} color="#2563eb" /> Isi Surat
          </Text>

          <Text style={styles.label}>Isi Surat *</Text>
          <TextInput
            style={[styles.input, styles.textArea, errors.isiSurat && styles.inputError]}
            value={form.isiSurat}
            onChangeText={(v) => updateField('isiSurat', v)}
            placeholder="Tulis isi surat di sini..."
            placeholderTextColor="#9ca3af"
            multiline
            numberOfLines={8}
            textAlignVertical="top"
          />
          {errors.isiSurat && <Text style={styles.errorText}>{errors.isiSurat}</Text>}
        </View>

        {/* Submit */}
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
              <Ionicons name="send" size={18} color="#fff" />
              <Text style={styles.submitText}>Buat Surat</Text>
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
  textArea: { minHeight: 160, textAlignVertical: 'top' },
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
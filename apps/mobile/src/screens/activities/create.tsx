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
  tipe: string;
  tanggalMulai: string;
  tanggalSelesai: string;
  lokasi: string;
  deskripsi: string;
  qrCode: string;
}

const INITIAL_FORM: FormData = {
  nama: '',
  tipe: 'kegiatan',
  tanggalMulai: '',
  tanggalSelesai: '',
  lokasi: '',
  deskripsi: '',
  qrCode: '',
};

const TIPE_OPTIONS = [
  { value: 'kegiatan', label: 'Kegiatan' },
  { value: 'latihan', label: 'Latihan' },
  { value: 'ujian', label: 'Ujian' },
  { value: 'lainnya', label: 'Lainnya' },
];

export default function CreateActivityScreen() {
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
    if (!form.nama.trim()) newErrors.nama = 'Nama kegiatan wajib diisi';
    if (!form.tanggalMulai.trim()) newErrors.tanggalMulai = 'Tanggal mulai wajib diisi';
    if (!form.tanggalSelesai.trim()) newErrors.tanggalSelesai = 'Tanggal selesai wajib diisi';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validate()) return;

    setSubmitting(true);
    try {
      const payload = {
        nama: form.nama,
        tipe: form.tipe,
        tanggalMulai: form.tanggalMulai,
        tanggalSelesai: form.tanggalSelesai,
        lokasi: form.lokasi || undefined,
        deskripsi: form.deskripsi || undefined,
        qrCode: form.qrCode || undefined,
      };
      await apiClient.post('/activities', payload);
      Alert.alert('Berhasil', 'Kegiatan baru berhasil dibuat', [
        { text: 'OK', onPress: () => router.back() },
      ]);
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ||
        'Gagal membuat kegiatan. Silakan coba lagi.';
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
        <Text style={styles.headerTitle}>Buat Kegiatan Baru</Text>
      </View>

      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
        {/* Informasi Kegiatan */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>
            <Ionicons name="calendar" size={16} color="#2563eb" /> Informasi Kegiatan
          </Text>

          <Text style={styles.label}>Nama Kegiatan *</Text>
          <TextInput
            style={[styles.input, errors.nama && styles.inputError]}
            value={form.nama}
            onChangeText={(v) => updateField('nama', v)}
            placeholder="Nama kegiatan"
            placeholderTextColor="#9ca3af"
          />
          {errors.nama && <Text style={styles.errorText}>{errors.nama}</Text>}

          <Text style={styles.label}>Tipe Kegiatan</Text>
          <View style={styles.optionRow}>
            {TIPE_OPTIONS.map((opt) => (
              <TouchableOpacity
                key={opt.value}
                style={[styles.optionChip, form.tipe === opt.value && styles.optionChipActive]}
                onPress={() => updateField('tipe', opt.value)}
              >
                <Text style={[styles.optionText, form.tipe === opt.value && styles.optionTextActive]}>
                  {opt.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <Text style={styles.label}>Tanggal Mulai *</Text>
          <TextInput
            style={[styles.input, errors.tanggalMulai && styles.inputError]}
            value={form.tanggalMulai}
            onChangeText={(v) => updateField('tanggalMulai', v)}
            placeholder="YYYY-MM-DD"
            placeholderTextColor="#9ca3af"
          />
          {errors.tanggalMulai && <Text style={styles.errorText}>{errors.tanggalMulai}</Text>}

          <Text style={styles.label}>Tanggal Selesai *</Text>
          <TextInput
            style={[styles.input, errors.tanggalSelesai && styles.inputError]}
            value={form.tanggalSelesai}
            onChangeText={(v) => updateField('tanggalSelesai', v)}
            placeholder="YYYY-MM-DD"
            placeholderTextColor="#9ca3af"
          />
          {errors.tanggalSelesai && <Text style={styles.errorText}>{errors.tanggalSelesai}</Text>}

          <Text style={styles.label}>Lokasi</Text>
          <TextInput
            style={styles.input}
            value={form.lokasi}
            onChangeText={(v) => updateField('lokasi', v)}
            placeholder="Tempat pelaksanaan"
            placeholderTextColor="#9ca3af"
          />

          <Text style={styles.label}>Deskripsi</Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            value={form.deskripsi}
            onChangeText={(v) => updateField('deskripsi', v)}
            placeholder="Deskripsi kegiatan"
            placeholderTextColor="#9ca3af"
            multiline
            numberOfLines={3}
          />
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
              <Ionicons name="save" size={18} color="#fff" />
              <Text style={styles.submitText}>Buat Kegiatan</Text>
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
  optionRow: { flexDirection: 'row', gap: 8, flexWrap: 'wrap', marginTop: 4 },
  optionChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 10,
    backgroundColor: '#f3f4f6',
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  optionChipActive: { backgroundColor: '#eff6ff', borderColor: '#2563eb' },
  optionText: { fontSize: 13, color: '#6b7280', fontWeight: '500' },
  optionTextActive: { color: '#2563eb', fontWeight: '600' },
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
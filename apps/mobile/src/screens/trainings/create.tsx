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
  hariTanggal: string;
  lokasi: string;
  jenisMateri: string;
  materi: string;
  durasi: string;
  pelatihId: string;
  rantingId: string;
}

const INITIAL_FORM: FormData = {
  hariTanggal: '',
  lokasi: '',
  jenisMateri: 'teknik_dasar',
  materi: '',
  durasi: '90',
  pelatihId: '',
  rantingId: '',
};

const MATERI_OPTIONS = [
  { value: 'teknik_dasar', label: 'Teknik Dasar' },
  { value: 'kata', label: 'Kata' },
  { value: 'kumite', label: 'Kumite' },
  { value: 'fisik', label: 'Fisik' },
  { value: 'teori', label: 'Teori' },
];

export default function CreateTrainingScreen() {
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
    if (!form.hariTanggal.trim()) newErrors.hariTanggal = 'Tanggal latihan wajib diisi';
    if (!form.lokasi.trim()) newErrors.lokasi = 'Lokasi latihan wajib diisi';
    if (!form.materi.trim()) newErrors.materi = 'Materi latihan wajib diisi';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validate()) return;

    setSubmitting(true);
    try {
      const payload = {
        hariTanggal: form.hariTanggal,
        lokasi: form.lokasi,
        jenisMateri: form.jenisMateri,
        materi: form.materi,
        durasi: form.durasi ? Number(form.durasi) : undefined,
        pelatihId: form.pelatihId || undefined,
        rantingId: form.rantingId || undefined,
      };
      await apiClient.post('/trainings', payload);
      Alert.alert('Berhasil', 'Latihan baru berhasil dibuat', [
        { text: 'OK', onPress: () => router.back() },
      ]);
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ||
        'Gagal membuat latihan. Silakan coba lagi.';
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
        <Text style={styles.headerTitle}>Buat Latihan Baru</Text>
      </View>

      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
        {/* Informasi Latihan */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>
            <Ionicons name="fitness" size={16} color="#2563eb" /> Informasi Latihan
          </Text>

          <Text style={styles.label}>Tanggal & Waktu *</Text>
          <TextInput
            style={[styles.input, errors.hariTanggal && styles.inputError]}
            value={form.hariTanggal}
            onChangeText={(v) => updateField('hariTanggal', v)}
            placeholder="YYYY-MM-DD HH:mm (contoh: 2026-07-30 19:00)"
            placeholderTextColor="#9ca3af"
          />
          {errors.hariTanggal && <Text style={styles.errorText}>{errors.hariTanggal}</Text>}

          <Text style={styles.label}>Lokasi *</Text>
          <TextInput
            style={[styles.input, errors.lokasi && styles.inputError]}
            value={form.lokasi}
            onChangeText={(v) => updateField('lokasi', v)}
            placeholder="Tempat latihan"
            placeholderTextColor="#9ca3af"
          />
          {errors.lokasi && <Text style={styles.errorText}>{errors.lokasi}</Text>}

          <Text style={styles.label}>Jenis Materi</Text>
          <View style={styles.optionRow}>
            {MATERI_OPTIONS.map((opt) => (
              <TouchableOpacity
                key={opt.value}
                style={[styles.optionChip, form.jenisMateri === opt.value && styles.optionChipActive]}
                onPress={() => updateField('jenisMateri', opt.value)}
              >
                <Text style={[styles.optionText, form.jenisMateri === opt.value && styles.optionTextActive]}>
                  {opt.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <Text style={styles.label}>Materi *</Text>
          <TextInput
            style={[styles.input, styles.textArea, errors.materi && styles.inputError]}
            value={form.materi}
            onChangeText={(v) => updateField('materi', v)}
            placeholder="Deskripsi materi latihan"
            placeholderTextColor="#9ca3af"
            multiline
            numberOfLines={3}
          />
          {errors.materi && <Text style={styles.errorText}>{errors.materi}</Text>}

          <Text style={styles.label}>Durasi (menit)</Text>
          <TextInput
            style={styles.input}
            value={form.durasi}
            onChangeText={(v) => updateField('durasi', v.replace(/[^0-9]/g, ''))}
            placeholder="90"
            placeholderTextColor="#9ca3af"
            keyboardType="numeric"
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
              <Text style={styles.submitText}>Buat Latihan</Text>
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
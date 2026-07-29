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
  namaLengkap: string;
  tempatLahir: string;
  tanggalLahir: string;
  jenisKelamin: string;
  alamat: string;
  noHp: string;
  email: string;
  tingkat: string;
  rantingId: string;
}

const INITIAL_FORM: FormData = {
  namaLengkap: '',
  tempatLahir: '',
  tanggalLahir: '',
  jenisKelamin: 'L',
  alamat: '',
  noHp: '',
  email: '',
  tingkat: 'dasar',
  rantingId: '',
};

const TINGKAT_OPTIONS = [
  { value: 'dasar', label: 'Dasar' },
  { value: 'menengah', label: 'Menengah' },
  { value: 'lanjut', label: 'Lanjut' },
  { value: 'instruktur', label: 'Instruktur' },
];

const GENDER_OPTIONS = [
  { value: 'L', label: 'Laki-laki' },
  { value: 'P', label: 'Perempuan' },
];

export default function CreateMemberScreen() {
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
    if (!form.namaLengkap.trim()) newErrors.namaLengkap = 'Nama lengkap wajib diisi';
    if (!form.tempatLahir.trim()) newErrors.tempatLahir = 'Tempat lahir wajib diisi';
    if (!form.tanggalLahir.trim()) newErrors.tanggalLahir = 'Tanggal lahir wajib diisi';
    if (!form.noHp.trim()) newErrors.noHp = 'No. HP wajib diisi';
    if (form.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) {
      newErrors.email = 'Format email tidak valid';
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validate()) return;

    setSubmitting(true);
    try {
      const payload = {
        ...form,
        tanggalLahir: form.tanggalLahir || undefined,
        email: form.email || undefined,
        rantingId: form.rantingId || undefined,
      };
      const res = await apiClient.post('/members', payload);
      const result = unwrap(res);
      Alert.alert('Berhasil', 'Anggota baru berhasil didaftarkan', [
        { text: 'OK', onPress: () => router.back() },
      ]);
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ||
        'Gagal mendaftarkan anggota. Silakan coba lagi.';
      Alert.alert('Gagal', msg);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Daftarkan Anggota Baru</Text>
      </View>

      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
        {/* Data Pribadi */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>
            <Ionicons name="person" size={16} color="#2563eb" /> Data Pribadi
          </Text>

          <Text style={styles.label}>Nama Lengkap *</Text>
          <TextInput
            style={[styles.input, errors.namaLengkap && styles.inputError]}
            value={form.namaLengkap}
            onChangeText={(v) => updateField('namaLengkap', v)}
            placeholder="Nama lengkap"
            placeholderTextColor="#9ca3af"
          />
          {errors.namaLengkap && <Text style={styles.errorText}>{errors.namaLengkap}</Text>}

          <Text style={styles.label}>Tempat Lahir *</Text>
          <TextInput
            style={[styles.input, errors.tempatLahir && styles.inputError]}
            value={form.tempatLahir}
            onChangeText={(v) => updateField('tempatLahir', v)}
            placeholder="Kota kelahiran"
            placeholderTextColor="#9ca3af"
          />
          {errors.tempatLahir && <Text style={styles.errorText}>{errors.tempatLahir}</Text>}

          <Text style={styles.label}>Tanggal Lahir *</Text>
          <TextInput
            style={[styles.input, errors.tanggalLahir && styles.inputError]}
            value={form.tanggalLahir}
            onChangeText={(v) => updateField('tanggalLahir', v)}
            placeholder="YYYY-MM-DD"
            placeholderTextColor="#9ca3af"
          />
          {errors.tanggalLahir && <Text style={styles.errorText}>{errors.tanggalLahir}</Text>}

          <Text style={styles.label}>Jenis Kelamin</Text>
          <View style={styles.optionRow}>
            {GENDER_OPTIONS.map((opt) => (
              <TouchableOpacity
                key={opt.value}
                style={[styles.optionChip, form.jenisKelamin === opt.value && styles.optionChipActive]}
                onPress={() => updateField('jenisKelamin', opt.value)}
              >
                <Text style={[styles.optionText, form.jenisKelamin === opt.value && styles.optionTextActive]}>
                  {opt.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Kontak */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>
            <Ionicons name="chatbubbles" size={16} color="#2563eb" /> Kontak
          </Text>

          <Text style={styles.label}>No. HP *</Text>
          <TextInput
            style={[styles.input, errors.noHp && styles.inputError]}
            value={form.noHp}
            onChangeText={(v) => updateField('noHp', v)}
            placeholder="08xxxxxxxxxx"
            placeholderTextColor="#9ca3af"
            keyboardType="phone-pad"
          />
          {errors.noHp && <Text style={styles.errorText}>{errors.noHp}</Text>}

          <Text style={styles.label}>Email</Text>
          <TextInput
            style={[styles.input, errors.email && styles.inputError]}
            value={form.email}
            onChangeText={(v) => updateField('email', v)}
            placeholder="email@example.com"
            placeholderTextColor="#9ca3af"
            keyboardType="email-address"
            autoCapitalize="none"
          />
          {errors.email && <Text style={styles.errorText}>{errors.email}</Text>}

          <Text style={styles.label}>Alamat</Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            value={form.alamat}
            onChangeText={(v) => updateField('alamat', v)}
            placeholder="Alamat lengkap"
            placeholderTextColor="#9ca3af"
            multiline
            numberOfLines={3}
          />
        </View>

        {/* Keanggotaan */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>
            <Ionicons name="shield-checkmark" size={16} color="#2563eb" /> Keanggotaan
          </Text>

          <Text style={styles.label}>Tingkat</Text>
          <View style={styles.optionRow}>
            {TINGKAT_OPTIONS.map((opt) => (
              <TouchableOpacity
                key={opt.value}
                style={[styles.optionChip, form.tingkat === opt.value && styles.optionChipActive]}
                onPress={() => updateField('tingkat', opt.value)}
              >
                <Text style={[styles.optionText, form.tingkat === opt.value && styles.optionTextActive]}>
                  {opt.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
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
              <Ionicons name="person-add" size={18} color="#fff" />
              <Text style={styles.submitText}>Daftarkan Anggota</Text>
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
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  Platform,
} from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { router } from 'expo-router';
import apiClient, { unwrap } from '../../lib/api-client';

interface FormData {
  anggotaId: string;
  jumlah: string;
  periode: string;
  metodePembayaran: string;
  keterangan: string;
}

const INITIAL_FORM: FormData = {
  anggotaId: '',
  jumlah: '',
  periode: '',
  metodePembayaran: 'tunai',
  keterangan: '',
};

const METODE_OPTIONS = [
  { value: 'tunai', label: 'Tunai' },
  { value: 'transfer', label: 'Transfer' },
  { value: 'qris', label: 'QRIS' },
];

interface AnggotaOption {
  id: string;
  namaLengkap: string;
  noAnggota: string;
}

export default function CreatePaymentScreen() {
  const [form, setForm] = useState<FormData>(INITIAL_FORM);
  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [anggotaOptions, setAnggotaOptions] = useState<AnggotaOption[]>([]);
  const [anggotaSearch, setAnggotaSearch] = useState('');
  const [showAnggotaDropdown, setShowAnggotaDropdown] = useState(false);
  const [selectedAnggota, setSelectedAnggota] = useState<AnggotaOption | null>(null);
  const [searchingAnggota, setSearchingAnggota] = useState(false);

  useEffect(() => {
    if (anggotaSearch.length < 2) {
      setAnggotaOptions([]);
      return;
    }
    setSearchingAnggota(true);
    const timer = setTimeout(async () => {
      try {
        const res = await apiClient.get('/members', { params: { search: anggotaSearch, limit: 10 } });
        const data = unwrap(res) as AnggotaOption[] | undefined;
        setAnggotaOptions(data || []);
        setShowAnggotaDropdown(true);
      } catch {
        // ignore
      } finally {
        setSearchingAnggota(false);
      }
    }, 400);
    return () => clearTimeout(timer);
  }, [anggotaSearch]);

  const selectAnggota = (a: AnggotaOption) => {
    setSelectedAnggota(a);
    setForm((prev) => ({ ...prev, anggotaId: a.id }));
    setAnggotaSearch(a.namaLengkap);
    setShowAnggotaDropdown(false);
    setAnggotaOptions([]);
  };

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
    if (!form.anggotaId) newErrors.anggotaId = 'Pilih anggota terlebih dahulu';
    if (!form.jumlah.trim()) newErrors.jumlah = 'Jumlah pembayaran wajib diisi';
    else if (isNaN(Number(form.jumlah)) || Number(form.jumlah) <= 0) {
      newErrors.jumlah = 'Jumlah harus angka positif';
    }
    if (!form.periode.trim()) newErrors.periode = 'Periode wajib diisi (contoh: 2026-07)';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validate()) return;

    setSubmitting(true);
    try {
      const payload = {
        anggotaId: form.anggotaId,
        jumlah: Number(form.jumlah),
        periode: form.periode,
        metodePembayaran: form.metodePembayaran,
        keterangan: form.keterangan || undefined,
      };
      await apiClient.post('/payments', payload);
      Alert.alert('Berhasil', 'Pembayaran berhasil dicatat', [
        { text: 'OK', onPress: () => router.back() },
      ]);
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ||
        'Gagal mencatat pembayaran. Silakan coba lagi.';
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
        <Text style={styles.headerTitle}>Input Pembayaran Iuran</Text>
      </View>

      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
        {/* Pilih Anggota */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>
            <Ionicons name="person" size={16} color="#2563eb" /> Pilih Anggota
          </Text>

          <Text style={styles.label}>Cari Anggota *</Text>
          <TextInput
            style={[styles.input, errors.anggotaId && styles.inputError]}
            value={anggotaSearch}
            onChangeText={(v) => {
              setAnggotaSearch(v);
              setSelectedAnggota(null);
              setForm((prev) => ({ ...prev, anggotaId: '' }));
            }}
            placeholder="Ketik nama anggota (min 2 karakter)"
            placeholderTextColor="#9ca3af"
          />
          {searchingAnggota && <ActivityIndicator size="small" color="#2563eb" style={{ marginTop: 4 }} />}
          {errors.anggotaId && <Text style={styles.errorText}>{errors.anggotaId}</Text>}

          {showAnggotaDropdown && anggotaOptions.length > 0 && (
            <View style={styles.dropdown}>
              {anggotaOptions.map((a) => (
                <TouchableOpacity
                  key={a.id}
                  style={styles.dropdownItem}
                  onPress={() => selectAnggota(a)}
                >
                  <Text style={styles.dropdownName}>{a.namaLengkap}</Text>
                  <Text style={styles.dropdownMeta}>{a.noAnggota}</Text>
                </TouchableOpacity>
              ))}
            </View>
          )}

          {selectedAnggota && (
            <View style={styles.selectedCard}>
              <Ionicons name="checkmark-circle" size={18} color="#16a34a" />
              <View style={{ flex: 1 }}>
                <Text style={styles.selectedName}>{selectedAnggota.namaLengkap}</Text>
                <Text style={styles.selectedMeta}>{selectedAnggota.noAnggota}</Text>
              </View>
            </View>
          )}
        </View>

        {/* Detail Pembayaran */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>
            <Ionicons name="cash" size={16} color="#2563eb" /> Detail Pembayaran
          </Text>

          <Text style={styles.label}>Jumlah (Rp) *</Text>
          <TextInput
            style={[styles.input, errors.jumlah && styles.inputError]}
            value={form.jumlah}
            onChangeText={(v) => updateField('jumlah', v.replace(/[^0-9]/g, ''))}
            placeholder="Contoh: 50000"
            placeholderTextColor="#9ca3af"
            keyboardType="numeric"
          />
          {errors.jumlah && <Text style={styles.errorText}>{errors.jumlah}</Text>}

          <Text style={styles.label}>Periode *</Text>
          <TextInput
            style={[styles.input, errors.periode && styles.inputError]}
            value={form.periode}
            onChangeText={(v) => updateField('periode', v)}
            placeholder="YYYY-MM (contoh: 2026-07)"
            placeholderTextColor="#9ca3af"
          />
          {errors.periode && <Text style={styles.errorText}>{errors.periode}</Text>}

          <Text style={styles.label}>Metode Pembayaran</Text>
          <View style={styles.optionRow}>
            {METODE_OPTIONS.map((opt) => (
              <TouchableOpacity
                key={opt.value}
                style={[styles.optionChip, form.metodePembayaran === opt.value && styles.optionChipActive]}
                onPress={() => updateField('metodePembayaran', opt.value)}
              >
                <Text style={[styles.optionText, form.metodePembayaran === opt.value && styles.optionTextActive]}>
                  {opt.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <Text style={styles.label}>Keterangan</Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            value={form.keterangan}
            onChangeText={(v) => updateField('keterangan', v)}
            placeholder="Catatan tambahan (opsional)"
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
              <Text style={styles.submitText}>Catat Pembayaran</Text>
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
    zIndex: 1,
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
  dropdown: {
    backgroundColor: '#fff',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    marginTop: 4,
    maxHeight: 200,
    overflow: 'hidden',
  },
  dropdownItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  dropdownName: { fontSize: 14, color: '#111827', fontWeight: '500' },
  dropdownMeta: { fontSize: 12, color: '#9ca3af' },
  selectedCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: '#ecfdf5',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#bbf7d0',
    padding: 12,
    marginTop: 8,
  },
  selectedName: { fontSize: 14, fontWeight: '600', color: '#111827' },
  selectedMeta: { fontSize: 12, color: '#6b7280', marginTop: 2 },
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
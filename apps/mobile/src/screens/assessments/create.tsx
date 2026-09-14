import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import apiClient from '../../lib/api-client';
import { LoadingSpinner } from '../../components/ui/shared';
import { theme } from '../../theme';

interface ItemRow {
  key: string;
  kodeItem: string;
  namaItem: string;
  skorMaksimal: string;
  bobot: string;
}

let uid = 0;
const newRow = (): ItemRow => ({
  key: `row-${Date.now()}-${++uid}`,
  kodeItem: '',
  namaItem: '',
  skorMaksimal: '',
  bobot: '',
});

export default function CreateAspectScreen() {
  const [kodeAspek, setKodeAspek] = useState('');
  const [namaAspek, setNamaAspek] = useState('');
  const [deskripsi, setDeskripsi] = useState('');
  const [bobot, setBobot] = useState('');
  const [items, setItems] = useState<ItemRow[]>([newRow()]);

  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const updateItem = (key: string, field: keyof ItemRow, value: string) => {
    setItems((prev) => prev.map((r) => (r.key === key ? { ...r, [field]: value } : r)));
    if (errors[key]) setErrors((e) => ({ ...e, [key]: '' }));
  };

  const removeItem = (key: string) => {
    setItems((prev) => (prev.length > 1 ? prev.filter((r) => r.key !== key) : prev));
  };

  const validate = (): boolean => {
    const errs: Record<string, string> = {};
    if (!kodeAspek.trim()) errs.kodeAspek = 'Kode aspek wajib diisi';
    if (!namaAspek.trim()) errs.namaAspek = 'Nama aspek wajib diisi';
    if (!bobot.trim() || Number.isNaN(Number(bobot)) || Number(bobot) < 0)
      errs.bobot = 'Bobot harus angka >= 0';
    if (deskripsi.length > 300) errs.deskripsi = 'Deskripsi maksimal 300 karakter';
    items.forEach((r, i) => {
      const k = r.key;
      if (!r.kodeItem.trim()) errs[k] = `Baris ${i + 1}: kode item wajib`;
      else if (!r.namaItem.trim()) errs[k] = `Baris ${i + 1}: nama item wajib`;
      else if (r.skorMaksimal.trim() && (Number.isNaN(Number(r.skorMaksimal)) || Number(r.skorMaksimal) <= 0))
        errs[k] = `Baris ${i + 1}: skor maksimal harus angka > 0`;
      else if (r.bobot.trim() && (Number.isNaN(Number(r.bobot)) || Number(r.bobot) < 0))
        errs[k] = `Baris ${i + 1}: bobot harus angka >= 0`;
    });
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async () => {
    if (!validate()) return;
    setSaving(true);
    try {
      const aspectRes = await apiClient.post('/assessments/aspects', {
        kodeAspek: kodeAspek.trim(),
        namaAspek: namaAspek.trim(),
        bobot: Number(bobot),
        ...(deskripsi.trim() ? { deskripsi: deskripsi.trim() } : {}),
      });
      const aspectId = aspectRes.data?.data?.id;
      if (!aspectId) throw new Error('Gagal membuat aspek');

      for (let i = 0; i < items.length; i++) {
        const r = items[i];
        if (!r.namaItem.trim()) continue;
        await apiClient.post('/assessments/items', {
          aspekId: aspectId,
          kodeItem: r.kodeItem.trim(),
          namaItem: r.namaItem.trim(),
          ...(r.skorMaksimal.trim() ? { skorMaksimal: Number(r.skorMaksimal) } : {}),
          ...(r.bobot.trim() ? { bobot: Number(r.bobot) } : {}),
          urutan: i + 1,
        });
      }

      setSaving(false);
      Alert.alert('Aspek Dibuat', 'Kriteria aspek dan item penilaian berhasil disimpan.', [
        { text: 'OK', onPress: () => router.replace(`/assessments/${aspectId}` as any) },
      ]);
    } catch (error: any) {
      setSaving(false);
      const msg = error?.response?.data?.message || 'Gagal menyimpan aspek. Silakan coba lagi.';
      Alert.alert('Error', msg);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <Text style={styles.backText}>← Kembali</Text>
        </TouchableOpacity>

        <View style={styles.header}>
          <View style={[styles.headerIcon, { backgroundColor: theme.colors.primarySofter }]}>
            <Ionicons name="clipboard" size={26} color={theme.colors.primary} />
          </View>
          <Text style={styles.title}>Buat Kriteria Penilaian</Text>
          <Text style={styles.subtitle}>
            Tetapkan aspek penilaian dan item pengujian untuk kegiatan pendadaran.
          </Text>
        </View>

        <View style={styles.form}>
          <Text style={styles.sectionTitle}>Aspek Penilaian</Text>

          <Text style={styles.label}>Kode Aspek *</Text>
          <TextInput
            style={[styles.input, !!errors.kodeAspek && styles.inputError]}
            value={kodeAspek}
            onChangeText={(t) => {
              setKodeAspek(t);
              if (errors.kodeAspek) setErrors((e) => ({ ...e, kodeAspek: '' }));
            }}
            placeholder="cth: A01, B02, C03"
            placeholderTextColor={theme.colors.textMuted}
            autoCapitalize="characters"
            autoCorrect={false}
          />
          {errors.kodeAspek && <Text style={styles.errorText}>{errors.kodeAspek}</Text>}

          <Text style={styles.label}>Nama Aspek *</Text>
          <TextInput
            style={[styles.input, !!errors.namaAspek && styles.inputError]}
            value={namaAspek}
            onChangeText={(t) => {
              setNamaAspek(t);
              if (errors.namaAspek) setErrors((e) => ({ ...e, namaAspek: '' }));
            }}
            placeholder="cth: Teknik Dasar, Sikap, Pengetahuan"
            placeholderTextColor={theme.colors.textMuted}
          />
          {errors.namaAspek && <Text style={styles.errorText}>{errors.namaAspek}</Text>}

          <Text style={styles.label}>Deskripsi</Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            value={deskripsi}
            onChangeText={setDeskripsi}
            placeholder="Penjelasan singkat aspek ini (opsional)"
            placeholderTextColor={theme.colors.textMuted}
            multiline
          />
          {errors.deskripsi && <Text style={styles.errorText}>{errors.deskripsi}</Text>}

          <Text style={styles.label}>Bobot (%) *</Text>
          <TextInput
            style={[styles.input, !!errors.bobot && styles.inputError]}
            value={bobot}
            onChangeText={(t) => {
              setBobot(t.replace(/[^0-9.]/g, ''));
              if (errors.bobot) setErrors((e) => ({ ...e, bobot: '' }));
            }}
            placeholder="cth: 30"
            placeholderTextColor={theme.colors.textMuted}
            keyboardType="decimal-pad"
          />
          {errors.bobot && <Text style={styles.errorText}>{errors.bobot}</Text>}

          <View style={styles.sectionTitleRow}>
            <Text style={styles.sectionTitle}>Item Pengujian</Text>
            <TouchableOpacity
              style={styles.addItemBtn}
              onPress={() => setItems((prev) => [...prev, newRow()])}
              activeOpacity={0.7}
            >
              <Ionicons name="add" size={16} color={theme.colors.primary} />
              <Text style={styles.addItemText}>Item</Text>
            </TouchableOpacity>
          </View>

          {items.map((row, idx) => (
            <View key={row.key} style={styles.itemCard}>
              <View style={styles.itemHeader}>
                <Text style={styles.itemTitle}>Item #{idx + 1}</Text>
                {items.length > 1 && (
                  <TouchableOpacity onPress={() => removeItem(row.key)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                    <Ionicons name="trash-outline" size={16} color={theme.colors.danger} />
                  </TouchableOpacity>
                )}
              </View>
              {errors[row.key] && <Text style={styles.errorText}>{errors[row.key]}</Text>}

              <View style={styles.row}>
                <View style={[styles.col, { flex: 0.6 }]}>
                  <Text style={styles.label}>Kode *</Text>
                  <TextInput
                    style={styles.input}
                    value={row.kodeItem}
                    onChangeText={(t) => updateItem(row.key, 'kodeItem', t)}
                    placeholder="I-1"
                    placeholderTextColor={theme.colors.textMuted}
                    autoCapitalize="characters"
                    autoCorrect={false}
                  />
                </View>
                <View style={styles.col}>
                  <Text style={styles.label}>Nama Item *</Text>
                  <TextInput
                    style={styles.input}
                    value={row.namaItem}
                    onChangeText={(t) => updateItem(row.key, 'namaItem', t)}
                    placeholder="cth: Kuda-kuda"
                    placeholderTextColor={theme.colors.textMuted}
                  />
                </View>
              </View>

              <View style={styles.row}>
                <View style={styles.col}>
                  <Text style={styles.label}>Skor Maksimal</Text>
                  <TextInput
                    style={styles.input}
                    value={row.skorMaksimal}
                    onChangeText={(t) => updateItem(row.key, 'skorMaksimal', t.replace(/[^0-9.]/g, ''))}
                    placeholder="cth: 100"
                    placeholderTextColor={theme.colors.textMuted}
                    keyboardType="decimal-pad"
                  />
                </View>
                <View style={styles.col}>
                  <Text style={styles.label}>Bobot</Text>
                  <TextInput
                    style={styles.input}
                    value={row.bobot}
                    onChangeText={(t) => updateItem(row.key, 'bobot', t.replace(/[^0-9.]/g, ''))}
                    placeholder="cth: 1"
                    placeholderTextColor={theme.colors.textMuted}
                    keyboardType="decimal-pad"
                  />
                </View>
              </View>
            </View>
          ))}

          <TouchableOpacity
            style={[styles.button, saving && styles.buttonDisabled]}
            onPress={handleSubmit}
            disabled={saving}
          >
            {saving ? (
              <LoadingSpinner color={theme.colors.surface} />
            ) : (
              <>
                <Ionicons name="checkmark-circle" size={18} color={theme.colors.surface} />
                <Text style={styles.buttonText}>Simpan Kriteria</Text>
              </>
            )}
          </TouchableOpacity>

          <Text style={styles.hintText}>
            Item penilaian juga dapat ditambahkan/diedit nanti dari halaman detail aspek.
          </Text>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.surfaceMuted },
  scrollContent: { padding: 24, paddingBottom: 48 },
  backBtn: { marginBottom: 12 },
  backText: { fontSize: 14, color: theme.colors.primary, fontWeight: '500' },
  header: { alignItems: 'center', marginBottom: 16 },
  headerIcon: {
    width: 52,
    height: 52,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  title: { fontSize: 22, fontWeight: 'bold', color: theme.colors.primaryDark, textAlign: 'center' },
  subtitle: {
    fontSize: 14,
    color: theme.colors.textSecondary,
    marginTop: 6,
    textAlign: 'center',
    lineHeight: 20,
  },
  form: {
    backgroundColor: theme.colors.surface,
    borderRadius: 14,
    padding: 20,
    shadowColor: theme.colors.dark,
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 2,
  },
  sectionTitle: { fontSize: 15, fontWeight: '700', color: theme.colors.text, marginBottom: 12 },
  sectionTitleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 20,
    marginBottom: 12,
  },
  addItemBtn: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  addItemText: { fontSize: 13, fontWeight: '600', color: theme.colors.primary },
  row: { flexDirection: 'row', gap: 12 },
  col: { flex: 1 },
  label: { fontSize: 13, fontWeight: '600', color: theme.colors.textSecondary, marginBottom: 6, marginTop: 10 },
  input: {
    borderWidth: 1,
    borderColor: theme.colors.borderStrong,
    borderRadius: 8,
    padding: 12,
    fontSize: 15,
    backgroundColor: theme.colors.surfaceMuted,
    color: theme.colors.text,
    marginBottom: 2,
  },
  inputError: { borderColor: theme.colors.danger },
  textArea: { minHeight: 72, textAlignVertical: 'top' },
  errorText: { fontSize: 12, color: theme.colors.danger, marginTop: 4 },
  itemCard: {
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: 10,
    padding: 14,
    marginBottom: 10,
    backgroundColor: theme.colors.surfaceMuted,
  },
  itemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  itemTitle: { fontSize: 13, fontWeight: '700', color: theme.colors.text },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: theme.colors.primary,
    borderRadius: 10,
    padding: 15,
    marginTop: 20,
  },
  buttonDisabled: { opacity: 0.6 },
  buttonText: { color: theme.colors.surface, fontSize: 16, fontWeight: '700' },
  hintText: {
    fontSize: 12,
    color: theme.colors.textMuted,
    textAlign: 'center',
    marginTop: 12,
  },
});
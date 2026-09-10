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
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import DateTimePicker, { DateTimePickerEvent } from '@react-native-community/datetimepicker';
import { router } from 'expo-router';
import apiClient from '../../lib/api-client';
import { OrgCascader } from '../../components/ui/org-cascader';
import { theme } from '../../theme';

interface BuktiItem {
  tipe: 'sertifikat' | 'kartu_anggota';
  url: string;
}

const formatLocalDate = (d: Date) => {
  const dd = String(d.getDate()).padStart(2, '0');
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  return `${d.getFullYear()}-${mm}-${dd}`;
};

const formatDisplay = (iso?: string) => {
  if (!iso) return '';
  const d = new Date(iso);
  return d.toLocaleDateString('id-ID', { day: '2-digit', month: 'long', year: 'numeric' });
};

export default function ClaimScreen() {
  const [namaLengkap, setNamaLengkap] = useState('');
  const [jenisKelamin, setJenisKelamin] = useState<'L' | 'P'>('L');
  const [tempatLahir, setTempatLahir] = useState('');
  const [tanggalLahir, setTanggalLahir] = useState('');
  const [alamat, setAlamat] = useState('');
  const [noHp, setNoHp] = useState('');
  const [email, setEmail] = useState('');
  const [catatan, setCatatan] = useState('');

  const [rantingId, setRantingId] = useState('');
  const [showDatePicker, setShowDatePicker] = useState(false);

  const [buktiDokumen, setBuktiDokumen] = useState<BuktiItem[]>([]);
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const addBukti = (tipe: 'sertifikat' | 'kartu_anggota') => {
    setBuktiDokumen((prev) => [...prev, { tipe, url: '' }]);
  };
  const updateBukti = (index: number, url: string) => {
    setBuktiDokumen((prev) => prev.map((b, i) => (i === index ? { ...b, url } : b)));
  };
  const removeBukti = (index: number) => {
    setBuktiDokumen((prev) => prev.filter((_, i) => i !== index));
  };

  const validate = (): boolean => {
    const errs: Record<string, string> = {};
    if (!namaLengkap.trim()) errs.namaLengkap = 'Nama lengkap wajib diisi';
    if (!rantingId) errs.ranting = 'Pilih ranting asal terlebih dahulu';
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) errs.email = 'Format email tidak valid';
    if (noHp && !/^(\+?62|0)\d{8,13}$/.test(noHp.replace(/[\s-]/g, '')))
      errs.noHp = 'Format No. HP tidak valid (mulai 0 atau +62, 9-14 digit)';
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async () => {
    if (!validate()) return;
    setSaving(true);
    try {
      const payload: Record<string, unknown> = {
        tipe: 'keanggotaan',
        namaLengkap: namaLengkap.trim(),
        jenisKelamin,
        rantingId,
      };
      if (tempatLahir.trim()) payload.tempatLahir = tempatLahir.trim();
      if (tanggalLahir) payload.tanggalLahir = tanggalLahir;
      if (alamat.trim()) payload.alamat = alamat.trim();
      if (noHp.trim()) payload.noHp = noHp.trim();
      if (email.trim()) payload.email = email.trim();
      if (catatan.trim()) payload.catatan = catatan.trim();
      const bukti = buktiDokumen.filter((b) => b.url.trim());
      if (bukti.length > 0) payload.buktiDokumen = bukti;

      await apiClient.post('/claims', payload);
      setSaving(false);
      Alert.alert(
        'Klaim Keanggotaan Terkirim',
        'Pengajuan klaim Anda telah diterima. Admin akan memproses dan menghubungi Anda melalui email.',
        [{ text: 'OK', onPress: () => router.replace('/login' as any) }],
      );
    } catch (error: any) {
      setSaving(false);
      const msg = error?.response?.data?.message || 'Gagal mengajukan klaim. Silakan coba lagi.';
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
          <Text style={styles.backText}>← Kembali ke Login</Text>
        </TouchableOpacity>

        <View style={styles.header}>
          <View style={[styles.headerIcon, { backgroundColor: theme.colors.primaryLight }]}>
            <Ionicons name="id-card-outline" size={26} color={theme.colors.primaryDark} />
          </View>
          <Text style={styles.title}>Klaim Keanggotaan</Text>
          <Text style={styles.subtitle}>
            Sudah menjadi anggota THS-THM tapi belum terdaftar di sistem? Ajukan klaim di sini.
          </Text>
        </View>

        <View style={styles.infoBanner}>
          <Ionicons name="information-circle-outline" size={18} color={theme.colors.info} />
          <Text style={styles.infoText}>
            Jika memungkinkan, lampirkan bukti keanggotaan (sertifikat pendadaran dan/atau kartu
            anggota) untuk mempercepat proses verifikasi.
          </Text>
        </View>

        <View style={styles.form}>
          <Text style={styles.sectionTitle}>Data Diri</Text>

          <View style={styles.row}>
            <View style={styles.col}>
              <Text style={styles.label}>Nama Lengkap *</Text>
              <TextInput
                style={[styles.input, !!errors.namaLengkap && styles.inputError]}
                value={namaLengkap}
                onChangeText={(t) => {
                  setNamaLengkap(t);
                  if (errors.namaLengkap) setErrors((e) => ({ ...e, namaLengkap: '' }));
                }}
                placeholder="Nama lengkap"
                placeholderTextColor={theme.colors.textMuted}
              />
              {errors.namaLengkap && <Text style={styles.errorText}>{errors.namaLengkap}</Text>}
            </View>
            <View style={styles.col}>
              <Text style={styles.label}>Jenis Kelamin *</Text>
              <View style={styles.segment}>
                {(['L', 'P'] as const).map((jk) => (
                  <TouchableOpacity
                    key={jk}
                    style={[styles.segmentItem, jenisKelamin === jk && styles.segmentActive]}
                    onPress={() => setJenisKelamin(jk)}
                  >
                    <Text style={[styles.segmentText, jenisKelamin === jk && styles.segmentTextActive]}>
                      {jk === 'L' ? 'Laki-laki' : 'Perempuan'}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          </View>

          <View style={styles.row}>
            <View style={styles.col}>
              <Text style={styles.label}>Tempat Lahir</Text>
              <TextInput
                style={styles.input}
                value={tempatLahir}
                onChangeText={setTempatLahir}
                placeholder="Kota kelahiran"
                placeholderTextColor={theme.colors.textMuted}
              />
            </View>
            <View style={styles.col}>
              <Text style={styles.label}>Tanggal Lahir</Text>
              <TouchableOpacity
                style={styles.input}
                onPress={() => setShowDatePicker(true)}
                activeOpacity={0.7}
              >
                <Text style={tanggalLahir ? styles.inputText : styles.inputPlaceholder}>
                  {tanggalLahir ? formatDisplay(tanggalLahir) : 'Pilih tanggal'}
                </Text>
                <Ionicons name="calendar-outline" size={18} color={theme.colors.textMuted} />
              </TouchableOpacity>
              {showDatePicker && (
                <DateTimePicker
                  value={tanggalLahir ? new Date(tanggalLahir) : new Date(1995, 0, 1)}
                  mode="date"
                  maximumDate={new Date()}
                  display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                  onChange={(event: DateTimePickerEvent, date?: Date) => {
                    if (Platform.OS === 'android') setShowDatePicker(false);
                    if (event.type === 'set' && date) setTanggalLahir(formatLocalDate(date));
                  }}
                />
              )}
              {Platform.OS === 'ios' && showDatePicker && (
                <TouchableOpacity style={styles.dateDoneBtn} onPress={() => setShowDatePicker(false)}>
                  <Text style={styles.dateDoneText}>Selesai</Text>
                </TouchableOpacity>
              )}
            </View>
          </View>

          <Text style={styles.label}>Alamat</Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            value={alamat}
            onChangeText={setAlamat}
            placeholder="Alamat lengkap"
            placeholderTextColor={theme.colors.textMuted}
            multiline
          />

          <View style={styles.row}>
            <View style={styles.col}>
              <Text style={styles.label}>No. HP</Text>
              <TextInput
                style={[styles.input, !!errors.noHp && styles.inputError]}
                value={noHp}
                onChangeText={(t) => {
                  setNoHp(t);
                  if (errors.noHp) setErrors((e) => ({ ...e, noHp: '' }));
                }}
                placeholder="08123456789"
                placeholderTextColor={theme.colors.textMuted}
                keyboardType="phone-pad"
              />
              {errors.noHp && <Text style={styles.errorText}>{errors.noHp}</Text>}
            </View>
            <View style={styles.col}>
              <Text style={styles.label}>Email</Text>
              <TextInput
                style={[styles.input, !!errors.email && styles.inputError]}
                value={email}
                onChangeText={(t) => {
                  setEmail(t);
                  if (errors.email) setErrors((e) => ({ ...e, email: '' }));
                }}
                placeholder="email@example.com"
                placeholderTextColor={theme.colors.textMuted}
                keyboardType="email-address"
                autoCapitalize="none"
              />
              {errors.email && <Text style={styles.errorText}>{errors.email}</Text>}
            </View>
          </View>

          <Text style={[styles.sectionTitle, styles.sectionGap]}>Ranting Asal *</Text>
          <OrgCascader
            rantingId={rantingId}
            onChange={(id) => {
              setRantingId(id);
              if (errors.ranting) setErrors((e) => ({ ...e, ranting: '' }));
            }}
            error={!!errors.ranting}
          />
          {errors.ranting && <Text style={styles.errorText}>{errors.ranting}</Text>}

          <Text style={[styles.sectionTitle, styles.sectionGap]}>Bukti Keanggotaan</Text>
          <View style={styles.buktiRow}>
            <TouchableOpacity style={styles.buktiBtn} onPress={() => addBukti('sertifikat')}>
              <Ionicons name="add-circle-outline" size={16} color={theme.colors.primaryDark} />
              <Text style={styles.buktiBtnText}>+ Sertifikat</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.buktiBtn} onPress={() => addBukti('kartu_anggota')}>
              <Ionicons name="add-circle-outline" size={16} color={theme.colors.primaryDark} />
              <Text style={styles.buktiBtnText}>+ Kartu Anggota</Text>
            </TouchableOpacity>
          </View>
          {buktiDokumen.length > 0 &&
            buktiDokumen.map((b, i) => (
              <View key={i} style={styles.buktiItem}>
                <Text style={styles.buktiLabel}>
                  {b.tipe === 'sertifikat' ? 'Sertifikat Pendadaran' : 'Kartu Anggota'}
                </Text>
                <View style={styles.buktiInputRow}>
                  <TextInput
                    style={[styles.input, styles.buktiInput]}
                    value={b.url}
                    onChangeText={(t) => updateBukti(i, t)}
                    placeholder="URL tautan dokumen (opsional)"
                    placeholderTextColor={theme.colors.textMuted}
                    autoCapitalize="none"
                  />
                  <TouchableOpacity onPress={() => removeBukti(i)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                    <Ionicons name="close-circle" size={20} color={theme.colors.danger} />
                  </TouchableOpacity>
                </View>
              </View>
            ))}

          <Text style={[styles.label, styles.sectionGap]}>Catatan</Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            value={catatan}
            onChangeText={setCatatan}
            placeholder="Catatan tambahan (opsional)"
            placeholderTextColor={theme.colors.textMuted}
            multiline
          />

          <TouchableOpacity
            style={[styles.button, saving && styles.buttonDisabled]}
            onPress={handleSubmit}
            disabled={saving}
          >
            {saving ? (
              <ActivityIndicator color={theme.colors.surface} />
            ) : (
              <>
                <Ionicons name="send" size={18} color={theme.colors.surface} />
                <Text style={styles.buttonText}>Ajukan Klaim</Text>
              </>
            )}
          </TouchableOpacity>
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
  title: { fontSize: 24, fontWeight: 'bold', color: theme.colors.primaryDark },
  subtitle: {
    fontSize: 14,
    color: theme.colors.textSecondary,
    marginTop: 6,
    textAlign: 'center',
    lineHeight: 20,
  },
  infoBanner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    backgroundColor: theme.colors.infoLight,
    borderRadius: 10,
    padding: 12,
    marginBottom: 16,
  },
  infoText: { flex: 1, fontSize: 13, color: theme.colors.info, lineHeight: 18 },
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
  sectionGap: { marginTop: 20 },
  row: { flexDirection: 'row', gap: 12, marginBottom: 4 },
  col: { flex: 1 },
  label: { fontSize: 13, fontWeight: '600', color: theme.colors.textSecondary, marginBottom: 6, marginTop: 10 },
  input: {
    flexDirection: 'row',
    alignItems: 'center',
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
  inputText: { flex: 1, fontSize: 15, color: theme.colors.text },
  inputPlaceholder: { flex: 1, fontSize: 15, color: theme.colors.textMuted },
  textArea: { minHeight: 72, textAlignVertical: 'top' },
  errorText: { fontSize: 12, color: theme.colors.danger, marginTop: 4 },
  segment: { flexDirection: 'row', borderRadius: 8, overflow: 'hidden', borderWidth: 1, borderColor: theme.colors.borderStrong },
  segmentItem: { flex: 1, paddingVertical: 12, alignItems: 'center', backgroundColor: theme.colors.surfaceMuted },
  segmentActive: { backgroundColor: theme.colors.primary },
  segmentText: { fontSize: 13, fontWeight: '600', color: theme.colors.textSecondary },
  segmentTextActive: { color: theme.colors.surface },
  dateDoneBtn: { alignItems: 'center', padding: 12 },
  dateDoneText: { fontSize: 14, color: theme.colors.primary, fontWeight: '600' },
  buktiRow: { flexDirection: 'row', gap: 10, marginBottom: 8 },
  buktiBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: theme.colors.borderStrong,
  },
  buktiBtnText: { fontSize: 13, fontWeight: '600', color: theme.colors.primaryDark },
  buktiItem: { marginBottom: 10 },
  buktiLabel: { fontSize: 12, fontWeight: '600', color: theme.colors.textSecondary, marginBottom: 4 },
  buktiInputRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  buktiInput: { flex: 1 },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: theme.colors.primary,
    borderRadius: 10,
    padding: 15,
    marginTop: 24,
  },
  buttonDisabled: { opacity: 0.6 },
  buttonText: { color: theme.colors.surface, fontSize: 16, fontWeight: '700' },
});
import React, { useState, useCallback, useEffect } from 'react';
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
  FlatList,
  Modal,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import DateTimePicker, { DateTimePickerEvent } from '@react-native-community/datetimepicker';
import { router } from 'expo-router';
import apiClient from '../../lib/api-client';
import { LoadingSpinner } from '../../components/ui/shared';
import { theme } from '../../theme';

interface AdminKegiatanOption {
  anggotaId: string;
  namaLengkap: string;
  nomorAnggota?: string | null;
  email?: string | null;
  noHp?: string | null;
  rantingId?: string | null;
  ranting?: string | null;
  userId?: string | null;
  accountRole?: string | null;
}

const formatLocalDate = (d: Date) => {
  const dd = String(d.getDate()).padStart(2, '0');
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  return `${d.getFullYear()}-${mm}-${dd}`;
};

const formatDisplay = (iso?: string) => {
  if (!iso) return '';
  const d = new Date(iso);
  return d.toLocaleDateString('id-ID', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' });
};

export default function CreateGraduationScreen() {
  const [nama, setNama] = useState('');
  const [lokasi, setLokasi] = useState('');
  const [tanggalMulai, setTanggalMulai] = useState('');
  const [tanggalSelesai, setTanggalSelesai] = useState('');
  const [showMulaiPicker, setShowMulaiPicker] = useState(false);
  const [showSelesaiPicker, setShowSelesaiPicker] = useState(false);

  // Admin kegiatan picker
  const [options, setOptions] = useState<AdminKegiatanOption[]>([]);
  const [optionsLoading, setOptionsLoading] = useState(false);
  const [showPicker, setShowPicker] = useState(false);
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<AdminKegiatanOption | null>(null);

  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const fetchOptions = useCallback(async () => {
    setOptionsLoading(true);
    try {
      const res = await apiClient.get('/graduations/admin-kegiatan-options', {
        params: { limit: 100 },
      });
      setOptions((res.data?.data as AdminKegiatanOption[]) || []);
    } catch {
      /* ignore */
    }
    setOptionsLoading(false);
  }, []);

  useEffect(() => {
    fetchOptions();
  }, [fetchOptions]);

  const filteredOptions = options.filter((o) => {
    const q = search.trim().toLowerCase();
    if (!q) return true;
    return (
      o.namaLengkap?.toLowerCase().includes(q) ||
      o.nomorAnggota?.toLowerCase().includes(q) ||
      o.ranting?.toLowerCase().includes(q)
    );
  });

  const validate = (): boolean => {
    const errs: Record<string, string> = {};
    if (!nama.trim()) errs.nama = 'Nama kegiatan wajib diisi';
    if (!tanggalMulai) errs.tanggalMulai = 'Tanggal mulai wajib diisi';
    if (!selected) errs.adminKegiatan = 'Pilih admin kegiatan terlebih dahulu';
    if (tanggalSelesai && tanggalMulai && new Date(tanggalSelesai) < new Date(tanggalMulai))
      errs.tanggalSelesai = 'Tanggal selesai tidak boleh sebelum tanggal mulai';
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async () => {
    if (!validate()) return;
    setSaving(true);
    try {
      const payload: Record<string, unknown> = {
        nama: nama.trim(),
        tanggalMulai,
        adminKegiatanId: selected?.anggotaId,
      };
      if (lokasi.trim()) payload.lokasi = lokasi.trim();
      if (tanggalSelesai) payload.tanggalSelesai = tanggalSelesai;

      await apiClient.post('/graduations', payload);
      setSaving(false);
      Alert.alert('Pendadaran Dibuat', 'Pendadaran berhasil dibuat.', [
        { text: 'OK', onPress: () => router.back() },
      ]);
    } catch (error: any) {
      setSaving(false);
      const msg = error?.response?.data?.message || 'Gagal membuat pendadaran. Silakan coba lagi.';
      Alert.alert('Error', msg);
    }
  };

  const selectOption = (opt: AdminKegiatanOption) => {
    setSelected(opt);
    setShowPicker(false);
    setSearch('');
    if (errors.adminKegiatan) setErrors((e) => ({ ...e, adminKegiatan: '' }));
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
            <Ionicons name="school" size={26} color={theme.colors.primary} />
          </View>
          <Text style={styles.title}>Buat Pendadaran</Text>
          <Text style={styles.subtitle}>
            Buat kegiatan pendadaran baru dan tunjuk admin kegiatan dari anggota aktif di distrik Anda.
          </Text>
        </View>

        <View style={styles.infoBanner}>
          <Ionicons name="information-circle-outline" size={18} color={theme.colors.info} />
          <Text style={styles.infoText}>
            Undangan H-7, penilaian penguji, dan hasil akhir akan dikelola lewat kegiatan ini.
          </Text>
        </View>

        <View style={styles.form}>
          <Text style={styles.sectionTitle}>Informasi Kegiatan</Text>

          <Text style={styles.label}>Nama Pendadaran *</Text>
          <TextInput
            style={[styles.input, !!errors.nama && styles.inputError]}
            value={nama}
            onChangeText={(t) => {
              setNama(t);
              if (errors.nama) setErrors((e) => ({ ...e, nama: '' }));
            }}
            placeholder="cth: Pendadaran Distrik DKI 2026"
            placeholderTextColor={theme.colors.textMuted}
          />
          {errors.nama && <Text style={styles.errorText}>{errors.nama}</Text>}

          <Text style={styles.label}>Lokasi</Text>
          <TextInput
            style={styles.input}
            value={lokasi}
            onChangeText={setLokasi}
            placeholder="Nama tempat / aula"
            placeholderTextColor={theme.colors.textMuted}
          />

          <View style={styles.row}>
            <View style={styles.col}>
              <Text style={styles.label}>Tanggal Mulai *</Text>
              <TouchableOpacity
                style={[styles.input, !!errors.tanggalMulai && styles.inputError]}
                onPress={() => setShowMulaiPicker(true)}
                activeOpacity={0.7}
              >
                <Text style={tanggalMulai ? styles.inputText : styles.inputPlaceholder}>
                  {tanggalMulai ? formatDisplay(tanggalMulai) : 'Pilih tanggal'}
                </Text>
                <Ionicons name="calendar-outline" size={18} color={theme.colors.textMuted} />
              </TouchableOpacity>
              {errors.tanggalMulai && <Text style={styles.errorText}>{errors.tanggalMulai}</Text>}
              {showMulaiPicker && (
                <DateTimePicker
                  value={tanggalMulai ? new Date(tanggalMulai) : new Date()}
                  mode="date"
                  minimumDate={new Date()}
                  display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                  onChange={(event: DateTimePickerEvent, date?: Date) => {
                    if (Platform.OS === 'android') setShowMulaiPicker(false);
                    if (event.type === 'set' && date) setTanggalMulai(formatLocalDate(date));
                  }}
                />
              )}
              {Platform.OS === 'ios' && showMulaiPicker && (
                <TouchableOpacity style={styles.dateDoneBtn} onPress={() => setShowMulaiPicker(false)}>
                  <Text style={styles.dateDoneText}>Selesai</Text>
                </TouchableOpacity>
              )}
            </View>

            <View style={styles.col}>
              <Text style={styles.label}>Tanggal Selesai</Text>
              <TouchableOpacity
                style={[styles.input, !!errors.tanggalSelesai && styles.inputError]}
                onPress={() => setShowSelesaiPicker(true)}
                activeOpacity={0.7}
              >
                <Text style={tanggalSelesai ? styles.inputText : styles.inputPlaceholder}>
                  {tanggalSelesai ? formatDisplay(tanggalSelesai) : 'Opsional'}
                </Text>
                <Ionicons name="calendar-outline" size={18} color={theme.colors.textMuted} />
              </TouchableOpacity>
              {errors.tanggalSelesai && <Text style={styles.errorText}>{errors.tanggalSelesai}</Text>}
              {showSelesaiPicker && (
                <DateTimePicker
                  value={tanggalSelesai ? new Date(tanggalSelesai) : new Date()}
                  mode="date"
                  minimumDate={tanggalMulai ? new Date(tanggalMulai) : new Date()}
                  display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                  onChange={(event: DateTimePickerEvent, date?: Date) => {
                    if (Platform.OS === 'android') setShowSelesaiPicker(false);
                    if (event.type === 'set' && date && (!tanggalMulai || new Date(date) >= new Date(tanggalMulai)))
                      setTanggalSelesai(formatLocalDate(date));
                  }}
                />
              )}
              {Platform.OS === 'ios' && showSelesaiPicker && (
                <TouchableOpacity style={styles.dateDoneBtn} onPress={() => setShowSelesaiPicker(false)}>
                  <Text style={styles.dateDoneText}>Selesai</Text>
                </TouchableOpacity>
              )}
            </View>
          </View>

          <Text style={[styles.sectionTitle, styles.sectionGap]}>Penunjukan Admin Kegiatan *</Text>

          <TouchableOpacity
            style={[styles.input, !!errors.adminKegiatan && styles.inputError]}
            onPress={() => setShowPicker(true)}
            activeOpacity={0.7}
          >
            {selected ? (
              <View style={styles.selectedWrap}>
                <Text style={styles.inputText}>{selected.namaLengkap}</Text>
                <Text style={styles.selectedMeta}>
                  {[selected.nomorAnggota, selected.ranting].filter(Boolean).join(' · ')}
                </Text>
              </View>
            ) : (
              <Text style={styles.inputPlaceholder}>Pilih admin kegiatan dari anggota distrik...</Text>
            )}
            <Ionicons name="chevron-down" size={18} color={theme.colors.textMuted} />
          </TouchableOpacity>
          {errors.adminKegiatan && <Text style={styles.errorText}>{errors.adminKegiatan}</Text>}

          <TouchableOpacity
            style={[styles.button, saving && styles.buttonDisabled]}
            onPress={handleSubmit}
            disabled={saving}
          >
            {saving ? (
              <LoadingSpinner color={theme.colors.surface} />
            ) : (
              <>
                <Ionicons name="add-circle" size={18} color={theme.colors.surface} />
                <Text style={styles.buttonText}>Buat Pendadaran</Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* Picker Admin Kegiatan */}
      <Modal visible={showPicker} animationType="slide" transparent onRequestClose={() => setShowPicker(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalSheet}>
            <View style={styles.modalHeader}>
              <View>
                <Text style={styles.modalTitle}>Pilih Admin Kegiatan</Text>
                <Text style={styles.modalSub}>Anggota aktif dalam distrik Anda</Text>
              </View>
              <TouchableOpacity onPress={() => setShowPicker(false)} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                <Ionicons name="close" size={22} color={theme.colors.textSecondary} />
              </TouchableOpacity>
            </View>

            <TextInput
              style={styles.searchInput}
              value={search}
              onChangeText={setSearch}
              placeholder="Cari nama / nomor anggota / ranting..."
              placeholderTextColor={theme.colors.textMuted}
              autoCorrect={false}
            />

            {optionsLoading ? (
              <View style={styles.modalEmpty}>
                <LoadingSpinner color={theme.colors.primary} />
              </View>
            ) : (
              <FlatList
                data={filteredOptions}
                keyExtractor={(item) => item.anggotaId}
                contentContainerStyle={styles.optionList}
                keyboardShouldPersistTaps="handled"
                ListEmptyComponent={
                  <View style={styles.modalEmpty}>
                    <Ionicons name="people-outline" size={40} color={theme.colors.borderStrong} />
                    <Text style={styles.modalEmptyText}>
                      {search.trim() ? 'Tidak ada anggota yang cocok' : 'Belum ada anggota aktif di distrik'}
                    </Text>
                  </View>
                }
                renderItem={({ item }) => {
                  const isSel = selected?.anggotaId === item.anggotaId;
                  return (
                    <TouchableOpacity
                      style={[styles.optionRow, isSel && styles.optionRowActive]}
                      onPress={() => selectOption(item)}
                      activeOpacity={0.7}
                    >
                      <View style={[styles.avatar, isSel && styles.avatarActive]}>
                        <Text style={[styles.avatarText, isSel && styles.avatarTextActive]}>
                          {item.namaLengkap?.charAt(0)?.toUpperCase() || '?'}
                        </Text>
                      </View>
                      <View style={styles.optionBody}>
                        <Text style={styles.optionName}>{item.namaLengkap}</Text>
                        <Text style={styles.optionMeta}>
                          {[item.nomorAnggota, item.ranting].filter(Boolean).join(' · ') || 'Tanpa nomor/ranting'}
                        </Text>
                      </View>
                      {isSel && <Ionicons name="checkmark-circle" size={20} color={theme.colors.primary} />}
                    </TouchableOpacity>
                  );
                }}
              />
            )}

            {options.length > 0 && !optionsLoading && (
              <Text style={styles.modalFooter}>{options.length} anggota tersedia</Text>
            )}
          </View>
        </View>
      </Modal>
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
  row: { flexDirection: 'row', gap: 12 },
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
  errorText: { fontSize: 12, color: theme.colors.danger, marginTop: 4 },
  selectedWrap: { flex: 1 },
  selectedMeta: { fontSize: 12, color: theme.colors.textMuted, marginTop: 2 },
  dateDoneBtn: { alignItems: 'center', padding: 12 },
  dateDoneText: { fontSize: 14, color: theme.colors.primary, fontWeight: '600' },
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
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'flex-end',
  },
  modalSheet: {
    backgroundColor: theme.colors.surface,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingTop: 20,
    paddingHorizontal: 16,
    paddingBottom: 28,
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  modalTitle: { fontSize: 17, fontWeight: '700', color: theme.colors.text },
  modalSub: { fontSize: 12, color: theme.colors.textSecondary, marginTop: 2 },
  searchInput: {
    borderWidth: 1,
    borderColor: theme.colors.borderStrong,
    borderRadius: 8,
    padding: 12,
    fontSize: 14,
    backgroundColor: theme.colors.surfaceMuted,
    color: theme.colors.text,
    marginBottom: 8,
  },
  optionList: { paddingBottom: 8 },
  optionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 12,
    borderRadius: 10,
    marginBottom: 4,
  },
  optionRowActive: { backgroundColor: theme.colors.primarySofter },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.surfaceMuted,
  },
  avatarActive: { backgroundColor: theme.colors.primary },
  avatarText: { fontSize: 16, fontWeight: '700', color: theme.colors.textSecondary },
  avatarTextActive: { color: theme.colors.surface },
  optionBody: { flex: 1 },
  optionName: { fontSize: 15, fontWeight: '600', color: theme.colors.text },
  optionMeta: { fontSize: 12, color: theme.colors.textMuted, marginTop: 2 },
  modalEmpty: { alignItems: 'center', paddingTop: 40, gap: 10 },
  modalEmptyText: { fontSize: 13, color: theme.colors.textMuted, textAlign: 'center' },
  modalFooter: {
    fontSize: 12,
    color: theme.colors.textMuted,
    textAlign: 'center',
    marginTop: 8,
  },
});
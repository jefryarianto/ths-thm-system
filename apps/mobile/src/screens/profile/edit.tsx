import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Image,
} from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { router } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import apiClient, { unwrap } from '../../lib/api-client';
import { LoadingView } from '../../components/ui/shared';
import { useAuthStore } from '../../store/auth-store';

export default function EditProfileScreen() {
  const user = useAuthStore((s) => s.user);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    namaLengkap: '',
    email: '',
    noHp: '',
    alamat: '',
    tempatLahir: '',
    tanggalLahir: '',
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [photoUri, setPhotoUri] = useState<string | null>(null);

  // Ubah password
  const [pw, setPw] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' });
  const [pwSaving, setPwSaving] = useState(false);
  const [pwMsg, setPwMsg] = useState<{ ok: boolean; text: string } | null>(null);

  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    try {
      const res = await apiClient.get('/auth/me');
      const p = unwrap<{
        namaLengkap: string;
        email?: string;
        noHp?: string;
        alamat?: string;
        tempatLahir?: string;
        tanggalLahir?: string;
      }>(res);
      setForm({
        namaLengkap: p.namaLengkap || '',
        email: p.email || '',
        noHp: p.noHp || '',
        alamat: p.alamat || '',
        tempatLahir: p.tempatLahir || '',
        tanggalLahir: p.tanggalLahir ? p.tanggalLahir.slice(0, 10) : '',
      });
    } catch {
      Alert.alert('Error', 'Gagal memuat profil');
    }
    setLoading(false);
  };

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};
    if (!form.namaLengkap.trim()) newErrors.namaLengkap = 'Nama lengkap harus diisi';
    if (form.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) {
      newErrors.email = 'Format email tidak valid';
    }
    if (form.noHp && !/^[0-9+\-\s()]{8,15}$/.test(form.noHp)) {
      newErrors.noHp = 'Format nomor HP tidak valid';
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSave = async () => {
    if (!validate()) return;
    setSaving(true);
    try {
      const payload: Record<string, string> = {};
      if (form.namaLengkap !== user?.namaLengkap) payload.namaLengkap = form.namaLengkap;
      if (form.noHp) payload.noHp = form.noHp;
      if (form.alamat) payload.alamat = form.alamat;
      if (form.tempatLahir) payload.tempatLahir = form.tempatLahir;
      if (form.tanggalLahir) payload.tanggalLahir = form.tanggalLahir;

      await apiClient.patch('/auth/me', payload);
      Alert.alert('Berhasil', 'Profil berhasil diperbarui');
      router.back();
    } catch (err: any) {
      Alert.alert('Gagal', err?.response?.data?.message || 'Terjadi kesalahan');
    }
    setSaving(false);
  };

  const handleChangePassword = async () => {
    setPwMsg(null);
    if (pw.newPassword.length < 6) {
      setPwMsg({ ok: false, text: 'Password baru minimal 6 karakter' });
      return;
    }
    if (pw.newPassword !== pw.confirmPassword) {
      setPwMsg({ ok: false, text: 'Konfirmasi password tidak cocok' });
      return;
    }
    setPwSaving(true);
    try {
      await apiClient.patch('/auth/change-password', {
        currentPassword: pw.currentPassword,
        newPassword: pw.newPassword,
      });
      setPwMsg({ ok: true, text: 'Password berhasil diubah' });
      setPw({ currentPassword: '', newPassword: '', confirmPassword: '' });
    } catch (err: any) {
      setPwMsg({ ok: false, text: err?.response?.data?.message || 'Gagal mengubah password. Periksa password lama Anda.' });
    }
    setPwSaving(false);
  };

  const pickImage = async () => {
    try {
      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permission.granted) {
        Alert.alert('Izin Diperlukan', 'Aplikasi membutuhkan izin akses foto');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });

      if (result.canceled || !result.assets?.[0]) return;

      const asset = result.assets[0];
      setPhotoUri(asset.uri);

      const formData = new FormData();
      formData.append('photo', {
        uri: asset.uri,
        name: 'profile-photo.jpg',
        type: 'image/jpeg',
      } as any);

      await apiClient.post('/auth/me/photo', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
    } catch (err: any) {
      Alert.alert('Gagal Upload', err?.response?.data?.message || 'Terjadi kesalahan');
    }
  };

  const renderField = (
    label: string,
    key: string,
    options?: {
      placeholder?: string;
      multiline?: boolean;
      keyboardType?: 'default' | 'email-address' | 'phone-pad';
      editable?: boolean;
    },
  ) => (
    <View style={styles.fieldGroup}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <TextInput
        style={[
          styles.input,
          errors[key] ? styles.inputError : undefined,
          options?.multiline ? styles.inputMultiline : undefined,
          options?.editable === false ? styles.inputDisabled : undefined,
        ]}
        value={(form as any)[key]}
        onChangeText={(t) => {
          setForm((f) => ({ ...f, [key]: t }));
          if (errors[key]) setErrors((e) => ({ ...e, [key]: '' }));
        }}
        placeholder={options?.placeholder || `Masukkan ${label.toLowerCase()}`}
        placeholderTextColor="#9ca3af"
        multiline={options?.multiline}
        numberOfLines={options?.multiline ? 3 : 1}
        keyboardType={options?.keyboardType || 'default'}
        editable={options?.editable !== false}
      />
      {errors[key] && <Text style={styles.errorText}>{errors[key]}</Text>}
    </View>
  );

  if (loading) {
    return <LoadingView message="Memuat profil..." />;
  }

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <Ionicons name="arrow-back" size={22} color="#fff" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Edit Profil</Text>
        </View>

        <View style={styles.section}>
          {/* Photo */}
          <View style={styles.photoSection}>
            <TouchableOpacity onPress={pickImage} style={styles.photoContainer}>
              {photoUri ? (
                <Image source={{ uri: photoUri }} style={styles.photo} />
              ) : (
                <View style={styles.photoPlaceholder}>
                  <Ionicons name="camera" size={28} color="#2563eb" />
                </View>
              )}
              <View style={styles.photoBadge}>
                <Ionicons name="pencil" size={12} color="#fff" />
              </View>
            </TouchableOpacity>
            <Text style={styles.photoHint}>Ketuk untuk mengganti foto</Text>
          </View>

          {/* Form Fields */}
          {renderField('Nama Lengkap', 'namaLengkap', {
            placeholder: 'Nama lengkap Anda',
            editable: true,
          })}
          {renderField('Email', 'email', {
            placeholder: 'email@example.com',
            keyboardType: 'email-address',
            editable: false,
          })}
          {renderField('No. HP', 'noHp', {
            placeholder: '08xxxxxxxxxx',
            keyboardType: 'phone-pad',
          })}
          {renderField('Tempat Lahir', 'tempatLahir', {
            placeholder: 'Kota kelahiran',
          })}
          {renderField('Tanggal Lahir', 'tanggalLahir', {
            placeholder: 'YYYY-MM-DD',
          })}
          {renderField('Alamat', 'alamat', {
            placeholder: 'Alamat lengkap',
            multiline: true,
          })}

          {/* Action Buttons */}
          <View style={styles.buttonRow}>
            <TouchableOpacity style={styles.cancelBtn} onPress={() => router.back()}>
              <Text style={styles.cancelBtnText}>Batal</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.saveBtn, saving && styles.btnDisabled]}
              onPress={handleSave}
              disabled={saving}
            >
              {saving ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <>
                  <Ionicons name="checkmark" size={18} color="#fff" />
                  <Text style={styles.saveBtnText}>Simpan</Text>
                </>
              )}
            </TouchableOpacity>
          </View>

          {/* Info */}
          <View style={styles.infoBox}>
            <Ionicons name="information-circle" size={18} color="#3b82f6" />
            <Text style={styles.infoText}>
              Email hanya dapat dibaca. Hubungi admin untuk perubahan email.
            </Text>
          </View>
        </View>

        {/* Ubah Password */}
        <View style={styles.section}>
          <View style={styles.pwCard}>
            <View style={styles.pwHeader}>
              <Ionicons name="key" size={18} color="#2563eb" />
              <Text style={styles.pwTitle}>Ubah Password</Text>
            </View>
            <Text style={styles.pwHint}>Minimal 6 karakter. Gunakan password baru saat login berikutnya.</Text>

            {pwMsg && (
              <View style={[styles.pwMsg, { backgroundColor: pwMsg.ok ? '#ecfdf5' : '#fef2f2', borderColor: pwMsg.ok ? '#a7f3d0' : '#fecaca' }]}>
                <Text style={[styles.pwMsgText, { color: pwMsg.ok ? '#047857' : '#b91c1c' }]}>{pwMsg.text}</Text>
              </View>
            )}

            <Text style={styles.fieldLabel}>Password Lama</Text>
            <TextInput
              style={styles.input}
              secureTextEntry
              placeholder="Password saat ini"
              placeholderTextColor="#9ca3af"
              value={pw.currentPassword}
              onChangeText={(t) => setPw((p) => ({ ...p, currentPassword: t }))}
            />
            <Text style={styles.fieldLabel}>Password Baru</Text>
            <TextInput
              style={styles.input}
              secureTextEntry
              placeholder="Minimal 6 karakter"
              placeholderTextColor="#9ca3af"
              value={pw.newPassword}
              onChangeText={(t) => setPw((p) => ({ ...p, newPassword: t }))}
            />
            <Text style={styles.fieldLabel}>Konfirmasi Password Baru</Text>
            <TextInput
              style={styles.input}
              secureTextEntry
              placeholder="Ulangi password baru"
              placeholderTextColor="#9ca3af"
              value={pw.confirmPassword}
              onChangeText={(t) => setPw((p) => ({ ...p, confirmPassword: t }))}
            />
            <TouchableOpacity
              style={[styles.pwBtn, pwSaving && styles.btnDisabled]}
              onPress={handleChangePassword}
              disabled={pwSaving}
            >
              {pwSaving ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <>
                  <Ionicons name="key-outline" size={16} color="#fff" />
                  <Text style={styles.pwBtnText}>Ubah Password</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  container: { flex: 1, backgroundColor: '#f3f4f6' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#f3f4f6' },
  header: {
    backgroundColor: '#2563eb',
    padding: 24,
    paddingTop: 60,
    paddingBottom: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  backBtn: { padding: 4 },
  headerTitle: { color: '#fff', fontSize: 18, fontWeight: '700' },

  section: { padding: 16 },

  photoSection: { alignItems: 'center', marginBottom: 24 },
  photoContainer: { position: 'relative', marginBottom: 8 },
  photo: { width: 96, height: 96, borderRadius: 48, borderWidth: 3, borderColor: '#fff' },
  photoPlaceholder: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: '#dbeafe',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    borderColor: '#fff',
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  photoBadge: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#2563eb',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#fff',
  },
  photoHint: { fontSize: 12, color: '#9ca3af' },

  fieldGroup: { marginBottom: 16 },
  fieldLabel: { fontSize: 13, fontWeight: '600', color: '#374151', marginBottom: 6 },
  input: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 10,
    padding: 12,
    fontSize: 15,
    color: '#111827',
  },
  inputError: { borderColor: '#ef4444', borderWidth: 2 },
  inputMultiline: { minHeight: 72, textAlignVertical: 'top' },
  inputDisabled: { backgroundColor: '#f3f4f6', color: '#9ca3af' },
  errorText: { fontSize: 11, color: '#ef4444', marginTop: 4 },

  buttonRow: { flexDirection: 'row', gap: 12, marginTop: 8 },
  cancelBtn: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: 'center',
  },
  cancelBtnText: { fontSize: 15, fontWeight: '600', color: '#374151' },
  saveBtn: {
    flex: 1,
    backgroundColor: '#2563eb',
    borderRadius: 10,
    paddingVertical: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  saveBtnText: { fontSize: 15, fontWeight: '600', color: '#fff' },
  btnDisabled: { opacity: 0.5 },

  infoBox: {
    flexDirection: 'row',
    gap: 10,
    backgroundColor: '#eff6ff',
    borderRadius: 12,
    padding: 14,
    marginTop: 20,
    borderWidth: 1,
    borderColor: '#bfdbfe',
  },
  infoText: { flex: 1, fontSize: 12, color: '#1e40af', lineHeight: 18 },

  // ── Ubah Password ──
  pwCard: {
    backgroundColor: '#fff',
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  pwHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 },
  pwTitle: { fontSize: 16, fontWeight: '700', color: '#111827' },
  pwHint: { fontSize: 12, color: '#6b7280', marginBottom: 16, lineHeight: 18 },
  pwMsg: { borderWidth: 1, borderRadius: 10, padding: 10, marginBottom: 14 },
  pwMsgText: { fontSize: 12, fontWeight: '600' },
  pwBtn: {
    backgroundColor: '#2563eb',
    borderRadius: 10,
    paddingVertical: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginTop: 8,
  },
  pwBtnText: { fontSize: 15, fontWeight: '600', color: '#fff' },
});

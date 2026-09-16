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
import { SafeAreaView } from 'react-native-safe-area-context';
import Ionicons from '@expo/vector-icons/Ionicons';
import { router } from 'expo-router';
import apiClient, { unwrap } from '../../lib/api-client';
import { TINGKAT_OPTIONS } from '../../hooks/use-members';

interface Ranting {
  id: string;
  nama: string;
}

interface MemberDetail {
  id: string;
}

const TINGKAT_CREATE = TINGKAT_OPTIONS.filter((t) => t.value !== '');

export default function MemberCreateScreen() {
  const [namaLengkap, setNamaLengkap] = useState('');
  const [jenisKelamin, setJenisKelamin] = useState<'L' | 'P' | ''>('');
  const [tempatLahir, setTempatLahir] = useState('');
  const [tanggalLahir, setTanggalLahir] = useState('');
  const [alamat, setAlamat] = useState('');
  const [noHp, setNoHp] = useState('');
  const [email, setEmail] = useState('');
  const [tingkat, setTingkat] = useState('');
  const [ranting, setRanting] = useState<Ranting | null>(null);
  const [showRanting, setShowRanting] = useState(false);
  const [rantingList, setRantingList] = useState<Ranting[]>([]);
  const [rantingLoading, setRantingLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const openRantingPicker = async () => {
    setShowRanting(true);
    if (rantingList.length > 0) return;
    setRantingLoading(true);
    try {
      const res = await apiClient.get('/org-structure/ranting');
      const list = (unwrap<Ranting[]>(res) ?? []) as Ranting[];
      setRantingList(list.filter((r) => r && r.id && r.nama));
    } catch (err: any) {
      Alert.alert('Gagal', err?.response?.data?.message || 'Tidak dapat memuat daftar ranting');
      setShowRanting(false);
    }
    setRantingLoading(false);
  };

  const validate = (): boolean => {
    if (!namaLengkap.trim()) {
      Alert.alert('Validasi', 'Nama lengkap wajib diisi');
      return false;
    }
    if (!jenisKelamin) {
      Alert.alert('Validasi', 'Pilih jenis kelamin');
      return false;
    }
    if (email.trim() && !/^\S+@\S+\.\S+$/.test(email.trim())) {
      Alert.alert('Validasi', 'Format email tidak valid');
      return false;
    }
    return true;
  };

  const submit = async () => {
    if (!validate()) return;
    setSaving(true);
    try {
      const payload: Record<string, unknown> = {
        namaLengkap: namaLengkap.trim(),
        jenisKelamin,
      };
      if (tempatLahir.trim()) payload.tempatLahir = tempatLahir.trim();
      if (tanggalLahir.trim()) payload.tanggalLahir = tanggalLahir.trim();
      if (alamat.trim()) payload.alamat = alamat.trim();
      if (noHp.trim()) payload.noHp = noHp.trim();
      if (email.trim()) payload.email = email.trim();
      if (tingkat) payload.tingkat = tingkat;
      if (ranting) payload.rantingId = ranting.id;

      const res = await apiClient.post('/members', payload);
      const created = unwrap<MemberDetail>(res) as MemberDetail;
      Alert.alert('Berhasil', 'Anggota berhasil ditambahkan');
      router.replace(`/members/${created?.id ?? ''}`);
    } catch (err: any) {
      Alert.alert('Gagal', err?.response?.data?.message || 'Terjadi kesalahan');
    }
    setSaving(false);
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={22} color="#111827" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Tambah Anggota</Text>
      </View>

      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 40 }} keyboardShouldPersistTaps="handled">
        <Text style={styles.label}>Nama Lengkap *</Text>
        <TextInput
          style={styles.input}
          placeholder="cth: Budi Santoso"
          value={namaLengkap}
          onChangeText={setNamaLengkap}
        />

        <Text style={styles.label}>Jenis Kelamin *</Text>
        <View style={styles.chipRow}>
          <TouchableOpacity
            style={[styles.chip, jenisKelamin === 'L' && styles.chipActive]}
            onPress={() => setJenisKelamin('L')}
          >
            <Text style={[styles.chipText, jenisKelamin === 'L' && styles.chipTextActive]}>Laki-laki</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.chip, jenisKelamin === 'P' && styles.chipActive]}
            onPress={() => setJenisKelamin('P')}
          >
            <Text style={[styles.chipText, jenisKelamin === 'P' && styles.chipTextActive]}>Perempuan</Text>
          </TouchableOpacity>
        </View>

        <Text style={styles.label}>Tempat Lahir</Text>
        <TextInput style={styles.input} placeholder="cth: Semarang" value={tempatLahir} onChangeText={setTempatLahir} />

        <Text style={styles.label}>Tanggal Lahir</Text>
        <TextInput
          style={styles.input}
          placeholder="cth: 2000-05-17"
          value={tanggalLahir}
          onChangeText={setTanggalLahir}
          autoCapitalize="none"
          keyboardType="numbers-and-punctuation"
        />

        <Text style={styles.label}>No. HP</Text>
        <TextInput
          style={styles.input}
          placeholder="cth: 081234567890"
          value={noHp}
          onChangeText={(t) => setNoHp(t.replace(/[^0-9+]/g, ''))}
          keyboardType="phone-pad"
        />

        <Text style={styles.label}>Email</Text>
        <TextInput
          style={styles.input}
          placeholder="cth: budi@email.com"
          value={email}
          onChangeText={setEmail}
          autoCapitalize="none"
          keyboardType="email-address"
        />

        <Text style={styles.label}>Alamat</Text>
        <TextInput
          style={[styles.input, styles.textArea]}
          placeholder="Alamat lengkap"
          value={alamat}
          onChangeText={setAlamat}
          multiline
          numberOfLines={3}
        />

        <Text style={styles.label}>Tingkat</Text>
        <View style={styles.chipRow}>
          {TINGKAT_CREATE.map((t) => (
            <TouchableOpacity
              key={t.value}
              style={[styles.chip, tingkat === t.value && styles.chipActive]}
              onPress={() => setTingkat(t.value)}
            >
              <Text style={[styles.chipText, tingkat === t.value && styles.chipTextActive]}>{t.label}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <Text style={styles.label}>Ranting</Text>
        <TouchableOpacity style={styles.selectCard} activeOpacity={0.7} onPress={openRantingPicker}>
          {ranting ? (
            <>
              <Ionicons name="location" size={20} color="#2563eb" />
              <View style={{ flex: 1 }}>
                <Text style={styles.memberName}>{ranting.nama}</Text>
              </View>
              <Ionicons name="close-circle" size={20} color="#9ca3af" onPress={() => setRanting(null)} />
            </>
          ) : (
            <>
              <Ionicons name="location" size={20} color="#6b7280" />
              <Text style={styles.selectPlaceholder}>Pilih ranting (opsional)</Text>
            </>
          )}
        </TouchableOpacity>

        {showRanting && (
          <View style={styles.rantingList}>
            {rantingLoading ? (
              <ActivityIndicator color="#2563eb" style={{ padding: 16 }} />
            ) : (
              <ScrollView style={{ maxHeight: 200 }} nestedScrollEnabled>
                {rantingList.map((r) => (
                  <TouchableOpacity
                    key={r.id}
                    style={styles.rantingItem}
                    onPress={() => {
                      setRanting(r);
                      setShowRanting(false);
                    }}
                  >
                    <Text style={styles.rantingItemText}>{r.nama}</Text>
                  </TouchableOpacity>
                ))}
                {rantingList.length === 0 && (
                  <Text style={styles.emptyText}>Tidak ada ranting ditemukan</Text>
                )}
              </ScrollView>
            )}
          </View>
        )}

        <TouchableOpacity style={[styles.submitBtn, saving && styles.submitDisabled]} disabled={saving} onPress={submit}>
          {saving ? (
            <ActivityIndicator color="#fff" size="small" />
          ) : (
            <Text style={styles.submitText}>Simpan Anggota</Text>
          )}
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f9fafb',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#111827',
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 6,
    marginTop: 14,
  },
  input: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 15,
    color: '#111827',
  },
  textArea: {
    height: 80,
    textAlignVertical: 'top',
  },
  selectCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    gap: 10,
  },
  selectPlaceholder: {
    flex: 1,
    fontSize: 15,
    color: '#9ca3af',
  },
  memberName: {
    fontSize: 15,
    fontWeight: '600',
    color: '#111827',
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 16,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  chipActive: {
    backgroundColor: '#2563eb',
    borderColor: '#2563eb',
  },
  chipText: {
    fontSize: 12,
    color: '#374151',
  },
  chipTextActive: {
    color: '#fff',
    fontWeight: '600',
  },
  rantingList: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 10,
    marginTop: 8,
    overflow: 'hidden',
  },
  rantingItem: {
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  rantingItemText: {
    fontSize: 14,
    color: '#111827',
  },
  submitBtn: {
    backgroundColor: '#2563eb',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 24,
  },
  submitDisabled: {
    opacity: 0.6,
  },
  submitText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '700',
  },
  emptyText: {
    textAlign: 'center',
    color: '#9ca3af',
    padding: 16,
  },
});

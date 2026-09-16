import React, { useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  FlatList,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Ionicons from '@expo/vector-icons/Ionicons';
import { router } from 'expo-router';
import apiClient, { unwrap } from '../../lib/api-client';
import { useMembers } from '../../hooks/use-members';
import { LoadingView } from '../../components/ui/shared';

interface DuesDetail {
  id: string;
  periode: string;
  jumlah: number;
  status: string;
}

const STATUS_OPTIONS = [
  { value: 'belum_dibayar', label: 'Belum Dibayar' },
  { value: 'menunggu_verifikasi', label: 'Menunggu Verifikasi' },
  { value: 'lunas', label: 'Sudah Lunas' },
  { value: 'menunggak', label: 'Menunggak' },
];

const METODE_OPTIONS = [
  { value: 'manual', label: 'Manual (Cash)' },
  { value: 'transfer', label: 'Transfer Bank' },
  { value: 'online', label: 'Online' },
];

const PERIODE_SUGGESTIONS = [
  { value: '2026/09', label: 'Sep 2026' },
  { value: '2026/10', label: 'Okt 2026' },
  { value: '2026/11', label: 'Nov 2026' },
  { value: '2026/12', label: 'Des 2026' },
];

export default function DuesCreateScreen() {
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<{ id: string; namaLengkap: string } | null>(null);
  const [showPicker, setShowPicker] = useState(false);
  const [periode, setPeriode] = useState('');
  const [jumlah, setJumlah] = useState('');
  const [status, setStatus] = useState('belum_dibayar');
  const [metodeBayar, setMetodeBayar] = useState('transfer');
  const [saving, setSaving] = useState(false);

  const { data: members, loading: membersLoading } = useMembers(search, '', '');

  const filteredMembers = useMemo(() => (members ?? []).filter((m) => m.id !== selected?.id), [members, selected]);

  const filteredSuggestions = useMemo(() => {
    if (!periode.trim()) return PERIODE_SUGGESTIONS;
    return PERIODE_SUGGESTIONS.filter((p) => p.value.toLowerCase().includes(periode.trim().toLowerCase()));
  }, [periode]);

  const validate = (): boolean => {
    if (!selected) {
      Alert.alert('Validasi', 'Pilih anggota terlebih dahulu');
      return false;
    }
    if (!periode.trim()) {
      Alert.alert('Validasi', 'Periode wajib diisi (contoh: 2026/09)');
      return false;
    }
    const jumlahNum = Number(jumlah);
    if (!jumlah.trim() || Number.isNaN(jumlahNum) || jumlahNum <= 0) {
      Alert.alert('Validasi', 'Jumlah harus angka lebih besar dari 0');
      return false;
    }
    return true;
  };

  const submit = async () => {
    if (!validate()) return;
    setSaving(true);
    try {
      const payload: Record<string, unknown> = {
        anggotaId: selected!.id,
        periode: periode.trim(),
        jumlah: Number(jumlah),
        status,
        metodeBayar,
      };
      const res = await apiClient.post('/dues', payload);
      const created = unwrap<DuesDetail>(res) as DuesDetail;
      Alert.alert('Berhasil', `Iuran ${created?.periode ?? periode} berhasil dibuat`);
      router.replace(`/dues/${created?.id ?? ''}`);
    } catch (err: any) {
      Alert.alert('Gagal', err?.response?.data?.message || 'Terjadi kesalahan');
    }
    setSaving(false);
  };

  if (showPicker) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => setShowPicker(false)} style={styles.backBtn}>
            <Ionicons name="arrow-back" size={22} color="#111827" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Pilih Anggota</Text>
        </View>
        <View style={styles.searchWrap}>
          <TextInput
            style={styles.input}
            placeholder="Cari nama anggota..."
            value={search}
            onChangeText={setSearch}
          />
        </View>
        {membersLoading ? (
          <LoadingView message="Memuat anggota..." />
        ) : (
          <FlatList
            data={filteredMembers}
            keyExtractor={(item) => item.id}
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={{ padding: 16 }}
            ListEmptyComponent={<Text style={styles.emptyText}>Tidak ada anggota ditemukan</Text>}
            renderItem={({ item }) => (
              <TouchableOpacity
                style={styles.memberCard}
                activeOpacity={0.7}
                onPress={() => {
                  setSelected({ id: item.id, namaLengkap: item.namaLengkap });
                  setShowPicker(false);
                }}
              >
                <View style={styles.memberAvatar}>
                  <Text style={styles.memberAvatarText}>
                    {item.namaLengkap.charAt(0).toUpperCase()}
                  </Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.memberName}>{item.namaLengkap}</Text>
                  <Text style={styles.memberSub}>
                    {(item as { noAnggota?: string }).noAnggota || '-'} • {item.tingkat || '-'}
                  </Text>
                </View>
                <Ionicons name="chevron-forward" size={18} color="#9ca3af" />
              </TouchableOpacity>
            )}
          />
        )}
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={22} color="#111827" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Tambah Iuran</Text>
      </View>

      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 40 }} keyboardShouldPersistTaps="handled">
        {/* Anggota */}
        <Text style={styles.label}>Anggota *</Text>
        <TouchableOpacity style={styles.selectCard} activeOpacity={0.7} onPress={() => setShowPicker(true)}>
          {selected ? (
            <>
              <View style={styles.memberAvatar}>
                <Text style={styles.memberAvatarText}>{selected.namaLengkap.charAt(0).toUpperCase()}</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.memberName}>{selected.namaLengkap}</Text>
              </View>
              <Ionicons name="close-circle" size={20} color="#9ca3af" onPress={() => setSelected(null)} />
            </>
          ) : (
            <>
              <Ionicons name="person" size={20} color="#6b7280" />
              <Text style={styles.selectPlaceholder}>Pilih anggota</Text>
            </>
          )}
        </TouchableOpacity>

        {/* Periode */}
        <Text style={styles.label}>Periode *</Text>
        <TextInput
          style={styles.input}
          placeholder="cth: 2026/09"
          value={periode}
          onChangeText={setPeriode}
          autoCapitalize="none"
        />
        <View style={styles.chipRow}>
          {filteredSuggestions.map((p) => (
            <TouchableOpacity key={p.value} style={styles.chip} onPress={() => setPeriode(p.value)}>
              <Text style={styles.chipText}>{p.label}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Jumlah */}
        <Text style={styles.label}>Jumlah (Rp) *</Text>
        <TextInput
          style={styles.input}
          placeholder="cth: 50000"
          value={jumlah}
          onChangeText={(t) => setJumlah(t.replace(/[^0-9]/g, ''))}
          keyboardType="number-pad"
        />

        {/* Metode bayar */}
        <Text style={styles.label}>Metode Bayar</Text>
        <View style={styles.chipRow}>
          {METODE_OPTIONS.map((m) => (
            <TouchableOpacity
              key={m.value}
              style={[styles.chip, metodeBayar === m.value && styles.chipActive]}
              onPress={() => setMetodeBayar(m.value)}
            >
              <Text style={[styles.chipText, metodeBayar === m.value && styles.chipTextActive]}>{m.label}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Status */}
        <Text style={styles.label}>Status</Text>
        <View style={styles.chipRow}>
          {STATUS_OPTIONS.map((s) => (
            <TouchableOpacity
              key={s.value}
              style={[styles.chip, status === s.value && styles.chipActive]}
              onPress={() => setStatus(s.value)}
            >
              <Text style={[styles.chipText, status === s.value && styles.chipTextActive]}>{s.label}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <TouchableOpacity style={[styles.submitBtn, saving && styles.submitDisabled]} disabled={saving} onPress={submit}>
          {saving ? (
            <ActivityIndicator color="#fff" size="small" />
          ) : (
            <Text style={styles.submitText}>Simpan Iuran</Text>
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
  memberAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#eff6ff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  memberAvatarText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#2563eb',
  },
  memberName: {
    fontSize: 15,
    fontWeight: '600',
    color: '#111827',
  },
  memberSub: {
    fontSize: 12,
    color: '#6b7280',
    marginTop: 2,
  },
  memberCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#f3f4f6',
    gap: 10,
  },
  searchWrap: {
    padding: 16,
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 8,
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
    marginTop: 40,
  },
});

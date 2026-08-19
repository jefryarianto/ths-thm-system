import React, { useState, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  TextInput,
  Modal,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Ionicons from '@expo/vector-icons/Ionicons';
import apiClient from '../../lib/api-client';
import { LoadingView, SearchBar } from '../../components/ui/shared';
import { useRefresh } from '../../hooks/use-refresh';
import { BackButton } from '../../components/ui/shared';

interface Examiner {
  id: string;
  email: string;
  namaLengkap: string;
  isActive?: boolean;
  createdAt?: string;
}

export default function ExaminersScreen() {
  const [examiners, setExaminers] = useState<Examiner[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<'semua' | 'aktif' | 'nonaktif'>('semua');

  // Tambah penguji modal
  const [showAdd, setShowAdd] = useState(false);
  const [addForm, setAddForm] = useState({ namaLengkap: '', email: '' });
  const [saving, setSaving] = useState(false);
  const [toggling, setToggling] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await apiClient.get('/examiners', {
        params: { limit: 100, includeInactive: true, search: search || undefined },
      });
      setExaminers(res.data?.data || []);
    } catch { /* ignore */ }
    setLoading(false);
  }, [search]);

  const { refreshing, onRefresh } = useRefresh(fetchData);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const filtered = examiners.filter((e) => {
    if (filter === 'aktif' && e.isActive !== true) return false;
    if (filter === 'nonaktif' && e.isActive !== false) return false;
    return true;
  });

  const handleAdd = async () => {
    if (!addForm.namaLengkap.trim() || !addForm.email.trim()) {
      Alert.alert('Lengkapi data', 'Nama dan email wajib diisi');
      return;
    }
    setSaving(true);
    try {
      await apiClient.post('/examiners', {
        namaLengkap: addForm.namaLengkap.trim(),
        email: addForm.email.trim(),
      });
      setShowAdd(false);
      setAddForm({ namaLengkap: '', email: '' });
      fetchData();
    } catch (err: any) {
      Alert.alert('Gagal menambah', err?.response?.data?.message || 'Terjadi kesalahan');
    }
    setSaving(false);
  };

  const handleToggle = async (examiner: Examiner) => {
    const next = examiner.isActive !== false; // aktif → nonaktif, nonaktif → aktif
    setToggling(examiner.id);
    try {
      await apiClient.patch(`/examiners/${examiner.id}`, { isActive: !next });
      fetchData();
    } catch (err: any) {
      Alert.alert('Gagal mengubah status', err?.response?.data?.message || 'Terjadi kesalahan');
    }
    setToggling(null);
  };

  const insets = useSafeAreaInsets();

  if (loading) return <LoadingView message="Memuat data penguji..." />;

  return (
    <View style={styles.container}>
      <BackButton />
      <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
        <View style={{ flex: 1 }}>
          <Text style={styles.headerTitle}>Manajemen Penguji</Text>
          <Text style={styles.headerSub}>{filtered.length} penguji</Text>
        </View>
        <TouchableOpacity
          style={styles.addBtn}
          activeOpacity={0.7}
          onPress={() => setShowAdd(true)}
        >
          <Ionicons name="add" size={22} color="#fff" />
        </TouchableOpacity>
      </View>

      <SearchBar value={search} onChangeText={setSearch} placeholder="Cari penguji..." />

      <View style={styles.filterRow}>
        {(
          [
            { key: 'semua', label: 'Semua' },
            { key: 'aktif', label: 'Aktif' },
            { key: 'nonaktif', label: 'Nonaktif' },
          ] as const
        ).map((f) => (
          <TouchableOpacity
            key={f.key}
            style={[styles.filterChip, filter === f.key && styles.filterChipActive]}
            onPress={() => setFilter(f.key)}
          >
            <Text style={[styles.filterChipText, filter === f.key && styles.filterChipTextActive]}>
              {f.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <FlatList
        data={filtered}
        keyExtractor={(item) => item.id}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        contentContainerStyle={{ padding: 16, paddingTop: 8 }}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Ionicons name="school-outline" size={40} color="#cbd5e1" />
            <Text style={styles.emptyText}>Belum ada data penguji</Text>
          </View>
        }
        renderItem={({ item }) => {
          const aktif = item.isActive !== false;
          return (
            <View style={styles.card}>
              <View style={styles.avatar}>
                <Text style={styles.avatarText}>{item.namaLengkap.charAt(0)}</Text>
              </View>
              <View style={styles.cardInfo}>
                <Text style={styles.cardName} numberOfLines={1}>{item.namaLengkap}</Text>
                <Text style={styles.cardEmail} numberOfLines={1}>{item.email}</Text>
                <View style={[styles.statusBadge, { backgroundColor: aktif ? '#ecfdf5' : '#fef2f2' }]}>
                  <Text style={[styles.statusText, { color: aktif ? '#16a34a' : '#dc2626' }]}>
                    {aktif ? 'Aktif' : 'Nonaktif'}
                  </Text>
                </View>
              </View>
              <TouchableOpacity
                style={[styles.toggleBtn, { backgroundColor: aktif ? '#fee2e2' : '#dcfce7' }]}
                onPress={() => handleToggle(item)}
                disabled={toggling === item.id}
              >
                {toggling === item.id ? (
                  <ActivityIndicator size="small" color="#6b7280" />
                ) : (
                  <Ionicons
                    name={aktif ? 'toggle' : 'toggle-outline'}
                    size={26}
                    color={aktif ? '#dc2626' : '#16a34a'}
                  />
                )}
              </TouchableOpacity>
            </View>
          );
        }}
      />

      {/* Tambah Penguji Modal */}
      <Modal visible={showAdd} transparent animationType="slide" onRequestClose={() => setShowAdd(false)}>
        <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setShowAdd(false)}>
          <View style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Tambah Penguji</Text>
              <TouchableOpacity onPress={() => setShowAdd(false)}>
                <Ionicons name="close" size={24} color="#6b7280" />
              </TouchableOpacity>
            </View>
            <Text style={styles.modalHint}>
              Penguji baru akan mendapat role penguji & email undangan setel password.
            </Text>
            <TextInput
              style={styles.input}
              placeholder="Nama lengkap *"
              placeholderTextColor="#9ca3af"
              value={addForm.namaLengkap}
              onChangeText={(t) => setAddForm({ ...addForm, namaLengkap: t })}
            />
            <TextInput
              style={styles.input}
              placeholder="Email *"
              placeholderTextColor="#9ca3af"
              keyboardType="email-address"
              autoCapitalize="none"
              value={addForm.email}
              onChangeText={(t) => setAddForm({ ...addForm, email: t })}
            />
            <TouchableOpacity
              style={[styles.saveBtn, saving && { opacity: 0.6 }]}
              onPress={handleAdd}
              disabled={saving}
            >
              {saving ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.saveBtnText}>Simpan Penguji</Text>
              )}
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f3f4f6' },
  header: {
    backgroundColor: '#111827',
    padding: 24,
    paddingBottom: 20,
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerTitle: { color: '#fff', fontSize: 22, fontWeight: 'bold' },
  headerSub: { color: '#9ca3af', fontSize: 13, marginTop: 2 },
  addBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#2563eb',
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 12,
  },
  filterRow: { flexDirection: 'row', gap: 8, paddingHorizontal: 16, paddingBottom: 4 },
  filterChip: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  filterChipActive: { backgroundColor: '#2563eb', borderColor: '#2563eb' },
  filterChipText: { fontSize: 12, fontWeight: '500', color: '#374151' },
  filterChipTextActive: { color: '#fff' },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 14,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#f3f4f6',
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#eff6ff',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  avatarText: { fontSize: 16, fontWeight: '700', color: '#2563eb' },
  cardInfo: { flex: 1, marginRight: 8 },
  cardName: { fontSize: 14, fontWeight: '600', color: '#111827' },
  cardEmail: { fontSize: 12, color: '#6b7280', marginTop: 2 },
  statusBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
    marginTop: 6,
  },
  statusText: { fontSize: 11, fontWeight: '600' },
  toggleBtn: {
    width: 40,
    height: 40,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  empty: { alignItems: 'center', paddingVertical: 50 },
  emptyText: { fontSize: 13, color: '#9ca3af', marginTop: 12 },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'flex-end',
  },
  modalContainer: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    paddingBottom: 34,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  modalTitle: { fontSize: 16, fontWeight: '700', color: '#111827' },
  modalHint: { fontSize: 12, color: '#6b7280', marginBottom: 16 },
  input: {
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 14,
    color: '#111827',
    backgroundColor: '#f9fafb',
    marginBottom: 12,
  },
  saveBtn: {
    backgroundColor: '#2563eb',
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 4,
  },
  saveBtnText: { color: '#fff', fontSize: 15, fontWeight: '600' },
});

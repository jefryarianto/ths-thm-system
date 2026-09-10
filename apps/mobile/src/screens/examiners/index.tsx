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
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Ionicons from '@expo/vector-icons/Ionicons';
import apiClient from '../../lib/api-client';
import { LoadingSpinner, LoadingView, SearchBar } from '../../components/ui/shared';
import { useRefresh } from '../../hooks/use-refresh';
import { BackButton } from '../../components/ui/shared';
import { theme } from '../../theme';

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
          <Ionicons name="add" size={22} color={theme.colors.surface} />
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
            <Ionicons name="school-outline" size={40} color={theme.colors.border} />
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
                <View style={[styles.statusBadge, { backgroundColor: aktif ? theme.colors.successLight : theme.colors.dangerLight }]}>
                  <Text style={[styles.statusText, { color: aktif ? theme.colors.success : theme.colors.danger }]}>
                    {aktif ? 'Aktif' : 'Nonaktif'}
                  </Text>
                </View>
              </View>
              <TouchableOpacity
                style={[styles.toggleBtn, { backgroundColor: aktif ? theme.colors.dangerLight : theme.colors.successLight }]}
                onPress={() => handleToggle(item)}
                disabled={toggling === item.id}
              >
                {toggling === item.id ? (
                   <LoadingSpinner size="small" color={theme.colors.textSecondary} />
                ) : (
                  <Ionicons
                    name={aktif ? 'toggle' : 'toggle-outline'}
                    size={26}
                    color={aktif ? theme.colors.danger : theme.colors.success}
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
                <Ionicons name="close" size={24} color={theme.colors.textSecondary} />
              </TouchableOpacity>
            </View>
            <Text style={styles.modalHint}>
              Penguji baru akan mendapat role penguji & email undangan setel password.
            </Text>
            <TextInput
              style={styles.input}
              placeholder="Nama lengkap *"
              placeholderTextColor={theme.colors.textMuted}
              value={addForm.namaLengkap}
              onChangeText={(t) => setAddForm({ ...addForm, namaLengkap: t })}
            />
            <TextInput
              style={styles.input}
              placeholder="Email *"
              placeholderTextColor={theme.colors.textMuted}
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
                 <LoadingSpinner color={theme.colors.surface} />
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
  container: { flex: 1, backgroundColor: theme.colors.surfaceMuted },
  header: {
    backgroundColor: theme.colors.text,
    padding: 24,
    paddingBottom: 20,
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerTitle: { color: theme.colors.surface, fontSize: 22, fontWeight: 'bold' },
  headerSub: { color: theme.colors.textMuted, fontSize: 13, marginTop: 2 },
  addBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: theme.colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 12,
  },
  filterRow: { flexDirection: 'row', gap: 8, paddingHorizontal: 16, paddingBottom: 4 },
  filterChip: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  filterChipActive: { backgroundColor: theme.colors.primary, borderColor: theme.colors.primary },
  filterChipText: { fontSize: 12, fontWeight: '500', color: theme.colors.textSecondary },
  filterChipTextActive: { color: theme.colors.surface },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.surface,
    borderRadius: 12,
    padding: 14,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: theme.colors.surfaceMuted,
    shadowColor: theme.colors.dark,
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: theme.colors.primarySofter,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  avatarText: { fontSize: 16, fontWeight: '700', color: theme.colors.primary },
  cardInfo: { flex: 1, marginRight: 8 },
  cardName: { fontSize: 14, fontWeight: '600', color: theme.colors.text },
  cardEmail: { fontSize: 12, color: theme.colors.textSecondary, marginTop: 2 },
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
  emptyText: { fontSize: 13, color: theme.colors.textMuted, marginTop: 12 },
  modalOverlay: {
    flex: 1,
    backgroundColor: theme.colors.overlay,
    justifyContent: 'flex-end',
  },
  modalContainer: {
    backgroundColor: theme.colors.surface,
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
  modalTitle: { fontSize: 16, fontWeight: '700', color: theme.colors.text },
  modalHint: { fontSize: 12, color: theme.colors.textSecondary, marginBottom: 16 },
  input: {
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 14,
    color: theme.colors.text,
    backgroundColor: theme.colors.surfaceMuted,
    marginBottom: 12,
  },
  saveBtn: {
    backgroundColor: theme.colors.primary,
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 4,
  },
  saveBtnText: { color: theme.colors.surface, fontSize: 15, fontWeight: '600' },
});

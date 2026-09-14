import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  TextInput,
  Modal,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useLocalSearchParams } from 'expo-router';
import apiClient, { unwrap } from '../../lib/api-client';
import { LoadingView, StatusBadge, ScreenShell, TabBar } from '../../components/ui/shared';
import { useRole } from '../../hooks/use-role';
import { LoadingSpinner } from '../../components/ui/shared';
import { theme } from '../../theme';
import type { AssessmentsAspect, AssessmentsItem, AssessmentsScore } from '../../types';

const numberOr = (v: number | string | undefined, fallback = 0) =>
  v === undefined || v === null || v === '' ? fallback : Number(v);

export default function AssessmentDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { hasMinRole } = useRole();
  const canManage = hasMinRole('admin_kegiatan');

  const [aspect, setAspect] = useState<AssessmentsAspect | null>(null);
  const [items, setItems] = useState<AssessmentsItem[]>([]);
  const [scores, setScores] = useState<AssessmentsScore[]>([]);
  const [activeTab, setActiveTab] = useState<'items' | 'scores'>('items');
  const [loading, setLoading] = useState(true);

  // Aspect edit modal
  const [editOpen, setEditOpen] = useState(false);
  const [editName, setEditName] = useState('');
  const [editDesc, setEditDesc] = useState('');
  const [editBobot, setEditBobot] = useState('');
  const [editSaving, setEditSaving] = useState(false);

  // Item modal (add/edit)
  const [itemModalOpen, setItemModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<AssessmentsItem | null>(null);
  const [itemKode, setItemKode] = useState('');
  const [itemNama, setItemNama] = useState('');
  const [itemSkorMax, setItemSkorMax] = useState('');
  const [itemBobot, setItemBobot] = useState('');
  const [itemSaving, setItemSaving] = useState(false);

  const fetchAll = async () => {
    setLoading(true);
    try {
      const [aspectRes, itemsRes, scoresRes] = await Promise.all([
        apiClient.get(`/assessments/aspects/${id}`),
        apiClient.get('/assessments/items', { params: { aspekId: id, limit: 100 } }),
        apiClient.get('/assessments/scores', { params: { aspekId: id, limit: 100 } }),
      ]);
      setAspect(unwrap(aspectRes));
      setItems(unwrap(itemsRes) || []);
      setScores(unwrap(scoresRes) || []);
    } catch {
      /* ignore */
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchAll();
  }, [id]);

  if (loading) return <LoadingView message="Memuat detail aspek..." />;
  if (!aspect)
    return (
      <View style={styles.center}>
        <Text style={styles.errorText}>Aspek tidak ditemukan</Text>
      </View>
    );

  const openEdit = () => {
    setEditName(aspect.namaAspek || '');
    setEditDesc(aspect.deskripsi || '');
    setEditBobot(String(numberOr(aspect.bobot)));
    setEditOpen(true);
  };

  const saveAspect = async () => {
    if (!editName.trim()) {
      Alert.alert('Error', 'Nama aspek wajib diisi');
      return;
    }
    setEditSaving(true);
    try {
      await apiClient.patch(`/assessments/aspects/${id}`, {
        namaAspek: editName.trim(),
        ...(editDesc.trim() ? { deskripsi: editDesc.trim() } : {}),
        ...(editBobot.trim() && !Number.isNaN(Number(editBobot)) ? { bobot: Number(editBobot) } : {}),
      });
      setEditOpen(false);
      fetchAll();
    } catch (error: any) {
      Alert.alert('Error', error?.response?.data?.message || 'Gagal menyimpan aspek');
    }
    setEditSaving(false);
  };

  const deleteAspect = () => {
    Alert.alert('Hapus Aspek', 'Aspek akan dinonaktifkan bersama semua item-nya. Lanjutkan?', [
      { text: 'Batal', style: 'cancel' },
      {
        text: 'Hapus',
        style: 'destructive',
        onPress: async () => {
          try {
            await apiClient.delete(`/assessments/aspects/${id}`);
            Alert.alert('Berhasil', 'Aspek penilaian dihapus', [{ text: 'OK', onPress: () => {} }]);
          } catch (error: any) {
            Alert.alert('Error', error?.response?.data?.message || 'Gagal menghapus aspek');
          }
        },
      },
    ]);
  };

  const openAddItem = () => {
    setEditingItem(null);
    setItemKode('');
    setItemNama('');
    setItemSkorMax('');
    setItemBobot('');
    setItemModalOpen(true);
  };

  const openEditItem = (it: AssessmentsItem) => {
    setEditingItem(it);
    setItemKode(it.kodeItem || '');
    setItemNama(it.namaItem || '');
    setItemSkorMax(it.skorMaksimal ? String(numberOr(it.skorMaksimal)) : '');
    setItemBobot(it.bobot ? String(numberOr(it.bobot)) : '');
    setItemModalOpen(true);
  };

  const saveItem = async () => {
    if (!itemNama.trim()) {
      Alert.alert('Error', 'Nama item wajib diisi');
      return;
    }
    setItemSaving(true);
    try {
      if (editingItem) {
        await apiClient.patch(`/assessments/items/${editingItem.id}`, {
          namaItem: itemNama.trim(),
          ...(itemSkorMax.trim() && !Number.isNaN(Number(itemSkorMax))
            ? { skorMaksimal: Number(itemSkorMax) }
            : {}),
          ...(itemBobot.trim() && !Number.isNaN(Number(itemBobot)) ? { bobot: Number(itemBobot) } : {}),
        });
      } else {
        await apiClient.post('/assessments/items', {
          aspekId: id,
          kodeItem: itemKode.trim(),
          namaItem: itemNama.trim(),
          ...(itemSkorMax.trim() && !Number.isNaN(Number(itemSkorMax))
            ? { skorMaksimal: Number(itemSkorMax) }
            : {}),
          ...(itemBobot.trim() && !Number.isNaN(Number(itemBobot)) ? { bobot: Number(itemBobot) } : {}),
          urutan: items.length + 1,
        });
      }
      setItemModalOpen(false);
      fetchAll();
    } catch (error: any) {
      Alert.alert('Error', error?.response?.data?.message || 'Gagal menyimpan item');
    }
    setItemSaving(false);
  };

  const deleteItem = (it: AssessmentsItem) => {
    Alert.alert('Hapus Item', `Hapus item "${it.namaItem}"?`, [
      { text: 'Batal', style: 'cancel' },
      {
        text: 'Hapus',
        style: 'destructive',
        onPress: async () => {
          try {
            await apiClient.delete(`/assessments/items/${it.id}`);
            fetchAll();
          } catch (error: any) {
            Alert.alert('Error', error?.response?.data?.message || 'Gagal menghapus item');
          }
        },
      },
    ]);
  };

  const ss = aspect.isActive === false
    ? { label: 'Diarsipkan', color: theme.colors.warning, bg: theme.colors.warningLight }
    : { label: 'Aktif', color: theme.colors.success, bg: theme.colors.successLight };

  const tabs = [
    { key: 'items', label: `Item (${items.length})`, icon: 'list' as const },
    { key: 'scores', label: `Nilai (${scores.length})`, icon: 'school' as const },
  ];

  return (
    <ScreenShell title={aspect.namaAspek} variant="detail" badgeLabel={ss.label} badgeColor={ss.color} badgeBg={ss.bg}>
      <View style={styles.section}>
        <View style={styles.infoCard}>
          {aspect.kodeAspek ? (
            <View style={styles.infoRow}>
              <Ionicons name="pricetag" size={18} color={theme.colors.primary} />
              <View style={styles.infoContent}>
                <Text style={styles.infoLabel}>Kode Aspek</Text>
                <Text style={styles.infoValue}>{aspect.kodeAspek}</Text>
              </View>
            </View>
          ) : null}
          {aspect.deskripsi ? (
            <View style={styles.infoRow}>
              <Ionicons name="document-text" size={18} color={theme.colors.primary} />
              <View style={styles.infoContent}>
                <Text style={styles.infoLabel}>Deskripsi</Text>
                <Text style={styles.infoValue}>{aspect.deskripsi}</Text>
              </View>
            </View>
          ) : null}
          <View style={styles.infoRow}>
            <Ionicons name="scale" size={18} color={theme.colors.primary} />
            <View style={styles.infoContent}>
              <Text style={styles.infoLabel}>Bobot</Text>
              <Text style={styles.infoValue}>{numberOr(aspect.bobot)}%</Text>
            </View>
          </View>
          <View style={styles.infoRow}>
            <Ionicons name="list" size={18} color={theme.colors.primary} />
            <View style={styles.infoContent}>
              <Text style={styles.infoLabel}>Jumlah Item</Text>
              <Text style={styles.infoValue}>{items.length} item</Text>
            </View>
          </View>
        </View>

        {canManage && (
          <View style={styles.adminRow}>
            <TouchableOpacity style={styles.adminBtn} onPress={openEdit} activeOpacity={0.7}>
              <Ionicons name="create-outline" size={16} color={theme.colors.primary} />
              <Text style={styles.adminBtnText}>Edit Aspek</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.adminBtn} onPress={openAddItem} activeOpacity={0.7}>
              <Ionicons name="add-circle-outline" size={16} color={theme.colors.primary} />
              <Text style={styles.adminBtnText}>Tambah Item</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.adminBtnDanger} onPress={deleteAspect} activeOpacity={0.7}>
              <Ionicons name="trash-outline" size={16} color={theme.colors.danger} />
              <Text style={styles.adminBtnDangerText}>Hapus</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>

      <TabBar tabs={tabs} activeKey={activeTab} onChange={(key) => setActiveTab(key as typeof activeTab)} />

      {activeTab === 'items' && (
        <View style={styles.section}>
          {items.length > 0 ? (
            items.map((item) => (
              <View key={item.id} style={styles.itemCard}>
                <View style={styles.itemLeft}>
                  <View style={styles.itemIcon}>
                    <Ionicons name="create" size={16} color={theme.colors.primary} />
                  </View>
                  <View style={styles.itemInfo}>
                    <View style={styles.itemNameRow}>
                      <Text style={styles.itemKode}>{item.kodeItem}</Text>
                      {item.isActive === false && (
                        <Text style={styles.itemArchived}>Arsip</Text>
                      )}
                    </View>
                    <Text style={styles.itemName}>{item.namaItem}</Text>
                    <Text style={styles.itemType}>
                      Skor max: {numberOr(item.skorMaksimal) || '-'} · Bobot: {numberOr(item.bobot) || '-'}
                    </Text>
                  </View>
                  {canManage && (
                    <View style={styles.itemActions}>
                      <TouchableOpacity onPress={() => openEditItem(item)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                        <Ionicons name="create-outline" size={18} color={theme.colors.primary} />
                      </TouchableOpacity>
                      <TouchableOpacity onPress={() => deleteItem(item)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                        <Ionicons name="trash-outline" size={18} color={theme.colors.danger} />
                      </TouchableOpacity>
                    </View>
                  )}
                </View>
              </View>
            ))
          ) : (
            <Text style={styles.emptyText}>Belum ada item penilaian</Text>
          )}
        </View>
      )}

      {activeTab === 'scores' && (
        <View style={styles.section}>
          {scores.length > 0 ? (
            scores.map((score) => (
              <View key={score.id} style={styles.scoreCard}>
                <View style={styles.scoreLeft}>
                  <View style={styles.scoreAvatar}>
                    <Text style={styles.scoreAvatarText}>
                      {score.calonAnggota?.namaLengkap?.charAt(0) || '?'}
                    </Text>
                  </View>
                  <View style={styles.scoreInfo}>
                    <Text style={styles.scoreName}>
                      {score.calonAnggota?.namaLengkap || 'Unknown'}
                    </Text>
                    {score.itemPenilaian && (
                      <Text style={styles.scoreItem}>
                        {score.itemPenilaian.namaItem} ({score.itemPenilaian.kodeItem} · bobot:{' '}
                        {numberOr(score.itemPenilaian.bobot)})
                      </Text>
                    )}
                    {score.penguji?.namaLengkap && (
                      <Text style={styles.scoreNote}>Penguji: {score.penguji.namaLengkap}</Text>
                    )}
                    {score.tanggal ? (
                      <Text style={styles.scoreDate}>
                        {new Date(score.tanggal).toLocaleDateString('id-ID', { day: '2-digit', month: 'long', year: 'numeric' })}
                      </Text>
                    ) : null}
                  </View>
                </View>
                <View style={styles.scoreBadge}>
                  <Text style={styles.scoreBadgeText}>{score.nilai}</Text>
                </View>
              </View>
            ))
          ) : (
            <Text style={styles.emptyText}>Belum ada nilai</Text>
          )}
        </View>
      )}

      {/* Edit Aspect Modal */}
      <Modal visible={editOpen} animationType="fade" transparent onRequestClose={() => setEditOpen(false)}>
        <KeyboardAvoidingView style={styles.modalOverlay} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Edit Aspek</Text>
            <ScrollView keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
              <Text style={styles.label}>Nama Aspek *</Text>
              <TextInput style={styles.modalInput} value={editName} onChangeText={setEditName} placeholder="Nama aspek" placeholderTextColor={theme.colors.textMuted} />
              <Text style={styles.label}>Deskripsi</Text>
              <TextInput
                style={[styles.modalInput, styles.modalTextArea]}
                value={editDesc}
                onChangeText={setEditDesc}
                placeholder="Deskripsi (opsional)"
                placeholderTextColor={theme.colors.textMuted}
                multiline
              />
              <Text style={styles.label}>Bobot (%)</Text>
              <TextInput
                style={styles.modalInput}
                value={editBobot}
                onChangeText={(t) => setEditBobot(t.replace(/[^0-9.]/g, ''))}
                placeholder="cth: 30"
                placeholderTextColor={theme.colors.textMuted}
                keyboardType="decimal-pad"
              />
              <View style={styles.modalActions}>
                <TouchableOpacity style={[styles.modalBtn, styles.modalBtnGhost]} onPress={() => setEditOpen(false)} activeOpacity={0.7}>
                  <Text style={styles.modalBtnGhostText}>Batal</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.modalBtn, editSaving && { opacity: 0.6 }]} onPress={saveAspect} activeOpacity={0.7} disabled={editSaving}>
                  {editSaving ? <LoadingSpinner color={theme.colors.surface} /> : <Text style={styles.modalBtnText}>Simpan</Text>}
                </TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* Item Modal (add / edit) */}
      <Modal visible={itemModalOpen} animationType="fade" transparent onRequestClose={() => setItemModalOpen(false)}>
        <KeyboardAvoidingView style={styles.modalOverlay} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>{editingItem ? 'Edit Item' : 'Tambah Item'}</Text>
            <ScrollView keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
              <Text style={styles.label}>Kode Item</Text>
              <TextInput
                style={styles.modalInput}
                value={itemKode}
                onChangeText={setItemKode}
                placeholder="cth: I-1"
                placeholderTextColor={theme.colors.textMuted}
                autoCapitalize="characters"
                autoCorrect={false}
              />
              <Text style={styles.label}>Nama Item *</Text>
              <TextInput style={styles.modalInput} value={itemNama} onChangeText={setItemNama} placeholder="cth: Kuda-kuda" placeholderTextColor={theme.colors.textMuted} />
              <View style={styles.row}>
                <View style={[styles.col, { flex: 1 }]}>
                  <Text style={styles.label}>Skor Maksimal</Text>
                  <TextInput
                    style={styles.modalInput}
                    value={itemSkorMax}
                    onChangeText={(t) => setItemSkorMax(t.replace(/[^0-9.]/g, ''))}
                    placeholder="cth: 100"
                    placeholderTextColor={theme.colors.textMuted}
                    keyboardType="decimal-pad"
                  />
                </View>
                <View style={[styles.col, { flex: 1 }]}>
                  <Text style={styles.label}>Bobot</Text>
                  <TextInput
                    style={styles.modalInput}
                    value={itemBobot}
                    onChangeText={(t) => setItemBobot(t.replace(/[^0-9.]/g, ''))}
                    placeholder="cth: 1"
                    placeholderTextColor={theme.colors.textMuted}
                    keyboardType="decimal-pad"
                  />
                </View>
              </View>
              <View style={styles.modalActions}>
                <TouchableOpacity style={[styles.modalBtn, styles.modalBtnGhost]} onPress={() => setItemModalOpen(false)} activeOpacity={0.7}>
                  <Text style={styles.modalBtnGhostText}>Batal</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.modalBtn, itemSaving && { opacity: 0.6 }]} onPress={saveItem} activeOpacity={0.7} disabled={itemSaving}>
                  {itemSaving ? <LoadingSpinner color={theme.colors.surface} /> : <Text style={styles.modalBtnText}>Simpan</Text>}
                </TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </ScreenShell>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: theme.colors.background },
  errorText: { fontSize: 14, color: theme.colors.danger },

  section: { padding: 16 },

  infoCard: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.lg - 2,
    padding: 16,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.surfaceMuted,
  },
  infoContent: { flex: 1 },
  infoLabel: { fontSize: 11, color: theme.colors.textMuted, marginBottom: 2 },
  infoValue: { fontSize: 14, fontWeight: theme.typography.weight.medium, color: theme.colors.text },

  adminRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 12,
    flexWrap: 'wrap',
  },
  adminBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: theme.colors.primarySofter,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  adminBtnText: { fontSize: 13, fontWeight: '600', color: theme.colors.primary },
  adminBtnDanger: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: theme.colors.dangerLight,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  adminBtnDangerText: { fontSize: 13, fontWeight: '600', color: theme.colors.danger },

  itemCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.md,
    padding: 14,
    marginBottom: 6,
    borderWidth: 1,
    borderColor: theme.colors.surfaceMuted,
  },
  itemLeft: { flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1 },
  itemIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: theme.colors.primarySofter,
    alignItems: 'center',
    justifyContent: 'center',
  },
  itemInfo: { flex: 1 },
  itemNameRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  itemKode: { fontSize: 10, fontWeight: '700', color: theme.colors.primary, textTransform: 'uppercase' },
  itemArchived: { fontSize: 10, fontWeight: '600', color: theme.colors.warning },
  itemName: { fontSize: 14, fontWeight: theme.typography.weight.medium, color: theme.colors.text, marginTop: 1 },
  itemType: { fontSize: 11, color: theme.colors.textSecondary, marginTop: 2 },
  itemActions: { flexDirection: 'row', gap: 14 },

  scoreCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.md,
    padding: 14,
    marginBottom: 6,
    borderWidth: 1,
    borderColor: theme.colors.surfaceMuted,
  },
  scoreLeft: { flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1 },
  scoreAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: theme.colors.primarySofter,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scoreAvatarText: { fontSize: 14, fontWeight: theme.typography.weight.bold, color: theme.colors.primary },
  scoreInfo: { flex: 1 },
  scoreName: { fontSize: 14, fontWeight: theme.typography.weight.medium, color: theme.colors.text },
  scoreItem: { fontSize: 11, color: theme.colors.textSecondary, marginTop: 2 },
  scoreNote: { fontSize: 11, color: theme.colors.textMuted, marginTop: 2 },
  scoreDate: { fontSize: 10, color: theme.colors.textMuted, marginTop: 2 },
  scoreBadge: {
    backgroundColor: theme.colors.primarySofter,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 10,
  },
  scoreBadgeText: { fontSize: 16, fontWeight: theme.typography.weight.bold, color: theme.colors.primary },

  emptyText: { fontSize: 13, color: theme.colors.textMuted, textAlign: 'center', paddingVertical: 30 },

  row: { flexDirection: 'row', gap: 12 },
  col: { flex: 1 },

  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'center',
    padding: 24,
  },
  modalCard: {
    backgroundColor: theme.colors.surface,
    borderRadius: 16,
    padding: 20,
    maxHeight: '80%',
  },
  modalTitle: { fontSize: 17, fontWeight: '700', color: theme.colors.text, marginBottom: 6 },
  modalInput: {
    borderWidth: 1,
    borderColor: theme.colors.borderStrong,
    borderRadius: 8,
    padding: 12,
    fontSize: 15,
    backgroundColor: theme.colors.surfaceMuted,
    color: theme.colors.text,
    marginBottom: 2,
  },
  modalTextArea: { minHeight: 68, textAlignVertical: 'top' },
  label: { fontSize: 13, fontWeight: '600', color: theme.colors.textSecondary, marginBottom: 6, marginTop: 10 },
  modalActions: { flexDirection: 'row', justifyContent: 'flex-end', gap: 10, marginTop: 18 },
  modalBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.primary,
    borderRadius: 8,
    paddingHorizontal: 18,
    paddingVertical: 10,
    minWidth: 88,
  },
  modalBtnGhost: { backgroundColor: theme.colors.surfaceMuted },
  modalBtnText: { color: theme.colors.surface, fontSize: 14, fontWeight: '700' },
  modalBtnGhostText: { color: theme.colors.textSecondary, fontSize: 14, fontWeight: '600' },
});
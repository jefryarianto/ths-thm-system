import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Modal,
  TextInput,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import apiClient from '../../../src/lib/api-client';

interface Reward {
  id: string;
  name: string;
  description?: string;
  icon: string;
  pointCost: number;
  stock: number;
  isActive: boolean;
}

interface Redemption {
  id: string;
  rewardId: string;
  rewardName?: string;
  rewardIcon?: string;
  anggotaId: string;
  namaLengkap?: string;
  pointsSpent: number;
  status: string;
  notes?: string;
  createdAt: string;
}

const STATUS_COLORS: Record<string, string> = {
  pending: '#f59e0b',
  approved: '#3b82f6',
  rejected: '#ef4444',
  completed: '#22c55e',
};

const STATUS_LABELS: Record<string, string> = {
  pending: 'Pending',
  approved: 'Disetujui',
  rejected: 'Ditolak',
  completed: 'Selesai',
};

interface RewardFormData {
  name: string;
  description: string;
  icon: string;
  pointCost: string;
  stock: string;
}

export default function AdminRewardsScreen() {
  const [rewards, setRewards] = useState<Reward[]>([]);
  const [redemptions, setRedemptions] = useState<Redemption[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'rewards' | 'redemptions'>('rewards');

  // Reward form modal
  const [showForm, setShowForm] = useState(false);
  const [editingReward, setEditingReward] = useState<Reward | null>(null);
  const [formData, setFormData] = useState<RewardFormData>({
    name: '',
    description: '',
    icon: '🎁',
    pointCost: '',
    stock: '0',
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [rewardsRes, redemptionsRes] = await Promise.all([
        apiClient.get('/gamification/rewards'),
        apiClient.get('/gamification/redemptions'),
      ]);
      setRewards(rewardsRes.data.data || []);
      setRedemptions(redemptionsRes.data.data || []);
    } catch { /* ignore */ }
    setLoading(false);
  };

  const openCreateForm = () => {
    setEditingReward(null);
    setFormData({ name: '', description: '', icon: '🎁', pointCost: '', stock: '0' });
    setShowForm(true);
  };

  const openEditForm = (reward: Reward) => {
    setEditingReward(reward);
    setFormData({
      name: reward.name,
      description: reward.description || '',
      icon: reward.icon,
      pointCost: String(reward.pointCost),
      stock: String(reward.stock),
    });
    setShowForm(true);
  };

  const handleSave = async () => {
    if (!formData.name.trim()) {
      Alert.alert('Error', 'Nama reward harus diisi');
      return;
    }
    setSaving(true);
    try {
      if (editingReward) {
        await apiClient.patch(`/gamification/rewards/${editingReward.id}`, {
          name: formData.name,
          description: formData.description || undefined,
          icon: formData.icon || '🎁',
          pointCost: parseInt(formData.pointCost) || 0,
          stock: parseInt(formData.stock) || 0,
        });
      } else {
        await apiClient.post('/gamification/rewards', {
          name: formData.name,
          description: formData.description || undefined,
          icon: formData.icon || '🎁',
          pointCost: parseInt(formData.pointCost) || 0,
          stock: parseInt(formData.stock) || 0,
        });
      }
      setShowForm(false);
      fetchData();
    } catch (err: any) {
      Alert.alert('Error', err.response?.data?.message || 'Gagal menyimpan reward');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = (reward: Reward) => {
    Alert.alert(
      'Hapus Reward',
      `Yakin ingin menghapus "${reward.name}"?`,
      [
        { text: 'Batal', style: 'cancel' },
        {
          text: 'Hapus',
          style: 'destructive',
          onPress: async () => {
            try {
              await apiClient.delete(`/gamification/rewards/${reward.id}`);
              fetchData();
            } catch { Alert.alert('Error', 'Gagal menghapus reward'); }
          },
        },
      ],
    );
  };

  const handleRedemptionAction = async (id: string, status: string) => {
    try {
      await apiClient.patch(`/gamification/redemptions/${id}/status`, { status });
      fetchData();
    } catch { Alert.alert('Error', 'Gagal mengupdate status'); }
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#3b82f6" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Admin Reward</Text>
        <TouchableOpacity onPress={fetchData} style={styles.refreshButton}>
          <Ionicons name="refresh" size={22} color="#fff" />
        </TouchableOpacity>
      </View>

      {/* Tab Selector */}
      <View style={styles.tabRow}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'rewards' && styles.tabActive]}
          onPress={() => setActiveTab('rewards')}
        >
          <Text style={[styles.tabText, activeTab === 'rewards' && styles.tabTextActive]}>
            🎁 Reward ({rewards.length})
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'redemptions' && styles.tabActive]}
          onPress={() => setActiveTab('redemptions')}
        >
          <Text style={[styles.tabText, activeTab === 'redemptions' && styles.tabTextActive]}>
            📋 Redeem ({redemptions.length})
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.scrollView}>
        {activeTab === 'rewards' && (
          <View style={styles.section}>
            <TouchableOpacity style={styles.addButton} onPress={openCreateForm}>
              <Ionicons name="add-circle" size={20} color="#fff" />
              <Text style={styles.addButtonText}>Tambah Reward</Text>
            </TouchableOpacity>

            {rewards.map((reward) => (
              <View key={reward.id} style={[styles.card, !reward.isActive && styles.cardInactive]}>
                <Text style={styles.cardIcon}>{reward.icon}</Text>
                <View style={styles.cardInfo}>
                  <Text style={styles.cardName}>{reward.name}</Text>
                  {reward.description && (
                    <Text style={styles.cardDesc}>{reward.description}</Text>
                  )}
                  <View style={styles.cardMeta}>
                    <Text style={styles.cardPoints}>⚡ {reward.pointCost.toLocaleString('id-ID')}</Text>
                    <Text style={styles.cardStock}>Stok: {reward.stock}</Text>
                    {!reward.isActive && <Text style={styles.cardInactiveLabel}>Nonaktif</Text>}
                  </View>
                </View>
                <View style={styles.cardActions}>
                  <TouchableOpacity onPress={() => openEditForm(reward)} style={styles.actionBtn}>
                    <Ionicons name="create" size={18} color="#3b82f6" />
                  </TouchableOpacity>
                  <TouchableOpacity onPress={() => handleDelete(reward)} style={styles.actionBtn}>
                    <Ionicons name="trash" size={18} color="#ef4444" />
                  </TouchableOpacity>
                </View>
              </View>
            ))}
            {rewards.length === 0 && (
              <Text style={styles.emptyText}>Belum ada reward</Text>
            )}
          </View>
        )}

        {activeTab === 'redemptions' && (
          <View style={styles.section}>
            {redemptions.map((r) => (
              <View key={r.id} style={styles.redemptionCard}>
                <View style={styles.redemptionHeader}>
                  <Text style={styles.redemptionIcon}>{r.rewardIcon || '🎁'}</Text>
                  <View style={styles.redemptionInfo}>
                    <Text style={styles.redemptionName}>{r.rewardName || 'Reward'}</Text>
                    <Text style={styles.redemptionMember}>{r.namaLengkap || 'Member'}</Text>
                  </View>
                  <View style={[styles.statusBadge, { backgroundColor: STATUS_COLORS[r.status] || '#6b7280' }]}>
                    <Text style={styles.statusText}>{STATUS_LABELS[r.status] || r.status}</Text>
                  </View>
                </View>
                <Text style={styles.redemptionPoints}>⚡ {r.pointsSpent.toLocaleString('id-ID')} poin</Text>
                {r.status === 'pending' && (
                  <View style={styles.redemptionActions}>
                    <TouchableOpacity
                      style={[styles.approveBtn, styles.actionBtn2]}
                      onPress={() => handleRedemptionAction(r.id, 'approved')}
                    >
                      <Ionicons name="checkmark" size={16} color="#fff" />
                      <Text style={styles.actionBtnText}>Setujui</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.rejectBtn, styles.actionBtn2]}
                      onPress={() => handleRedemptionAction(r.id, 'rejected')}
                    >
                      <Ionicons name="close" size={16} color="#fff" />
                      <Text style={styles.actionBtnText}>Tolak</Text>
                    </TouchableOpacity>
                  </View>
                )}
                {r.status === 'approved' && (
                  <TouchableOpacity
                    style={[styles.completeBtn, styles.actionBtn2]}
                    onPress={() => handleRedemptionAction(r.id, 'completed')}
                  >
                    <Ionicons name="checkmark-done" size={16} color="#fff" />
                    <Text style={styles.actionBtnText}>Selesaikan</Text>
                  </TouchableOpacity>
                )}
              </View>
            ))}
            {redemptions.length === 0 && (
              <Text style={styles.emptyText}>Belum ada redemption</Text>
            )}
          </View>
        )}
        <View style={{ height: 40 }} />
      </ScrollView>

      {/* Reward Form Modal */}
      <Modal visible={showForm} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{editingReward ? 'Edit Reward' : 'Tambah Reward'}</Text>
              <TouchableOpacity onPress={() => setShowForm(false)}>
                <Ionicons name="close" size={24} color="#6b7280" />
              </TouchableOpacity>
            </View>
            <ScrollView>
              <Text style={styles.modalLabel}>Nama Reward</Text>
              <TextInput
                style={styles.modalInput}
                value={formData.name}
                onChangeText={(t) => setFormData({ ...formData, name: t })}
                placeholder="Nama reward"
                placeholderTextColor="#9ca3af"
              />
              <Text style={styles.modalLabel}>Deskripsi</Text>
              <TextInput
                style={[styles.modalInput, styles.modalTextArea]}
                value={formData.description}
                onChangeText={(t) => setFormData({ ...formData, description: t })}
                placeholder="Deskripsi reward"
                placeholderTextColor="#9ca3af"
                multiline
              />
              <Text style={styles.modalLabel}>Icon (emoji)</Text>
              <TextInput
                style={styles.modalInput}
                value={formData.icon}
                onChangeText={(t) => setFormData({ ...formData, icon: t })}
                placeholder="🎁"
                placeholderTextColor="#9ca3af"
              />
              <Text style={styles.modalLabel}>Biaya Poin</Text>
              <TextInput
                style={styles.modalInput}
                value={formData.pointCost}
                onChangeText={(t) => setFormData({ ...formData, pointCost: t })}
                placeholder="100"
                placeholderTextColor="#9ca3af"
                keyboardType="numeric"
              />
              <Text style={styles.modalLabel}>Stok</Text>
              <TextInput
                style={styles.modalInput}
                value={formData.stock}
                onChangeText={(t) => setFormData({ ...formData, stock: t })}
                placeholder="0"
                placeholderTextColor="#9ca3af"
                keyboardType="numeric"
              />
              <TouchableOpacity
                style={[styles.saveButton, saving && { opacity: 0.5 }]}
                onPress={handleSave}
                disabled={saving}
              >
                {saving ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Text style={styles.saveButtonText}>
                    {editingReward ? 'Simpan Perubahan' : 'Buat Reward'}
                  </Text>
                )}
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  scrollView: { flex: 1 },

  // Header
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: '#3b82f6', paddingTop: 50, paddingBottom: 16, paddingHorizontal: 16 },
  backButton: { padding: 4 },
  headerTitle: { fontSize: 18, fontWeight: '700', color: '#fff' },
  refreshButton: { padding: 4 },

  // Tabs
  tabRow: { flexDirection: 'row', backgroundColor: '#fff', padding: 4, marginHorizontal: 16, marginTop: 12, borderRadius: 10 },
  tab: { flex: 1, paddingVertical: 10, alignItems: 'center', borderRadius: 8 },
  tabActive: { backgroundColor: '#3b82f6' },
  tabText: { fontSize: 13, fontWeight: '600', color: '#6b7280' },
  tabTextActive: { color: '#fff' },

  // Sections
  section: { paddingHorizontal: 16, paddingTop: 12 },

  // Add Button
  addButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, backgroundColor: '#22c55e', paddingVertical: 12, borderRadius: 12, marginBottom: 12 },
  addButtonText: { color: '#fff', fontSize: 14, fontWeight: '600' },

  // Reward Card
  card: { flexDirection: 'row', backgroundColor: '#fff', borderRadius: 14, padding: 14, marginBottom: 8, borderWidth: 1, borderColor: '#e5e7eb', alignItems: 'center' },
  cardInactive: { opacity: 0.6 },
  cardIcon: { fontSize: 32, width: 44, textAlign: 'center' },
  cardInfo: { flex: 1, marginLeft: 8 },
  cardName: { fontSize: 14, fontWeight: '600', color: '#1f2937' },
  cardDesc: { fontSize: 12, color: '#6b7280', marginTop: 2 },
  cardMeta: { flexDirection: 'row', gap: 12, marginTop: 4 },
  cardPoints: { fontSize: 11, fontWeight: '700', color: '#92400e' },
  cardStock: { fontSize: 11, color: '#6b7280' },
  cardInactiveLabel: { fontSize: 11, color: '#ef4444', fontWeight: '600' },
  cardActions: { flexDirection: 'column', gap: 8 },
  actionBtn: { padding: 6 },

  // Redemption Card
  redemptionCard: { backgroundColor: '#fff', borderRadius: 14, padding: 14, marginBottom: 8, borderWidth: 1, borderColor: '#e5e7eb' },
  redemptionHeader: { flexDirection: 'row', alignItems: 'center' },
  redemptionIcon: { fontSize: 24, width: 36, textAlign: 'center' },
  redemptionInfo: { flex: 1, marginLeft: 8 },
  redemptionName: { fontSize: 14, fontWeight: '600', color: '#1f2937' },
  redemptionMember: { fontSize: 12, color: '#6b7280', marginTop: 2 },
  statusBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 10 },
  statusText: { fontSize: 11, color: '#fff', fontWeight: '600' },
  redemptionPoints: { fontSize: 13, fontWeight: '700', color: '#92400e', marginTop: 8 },
  redemptionActions: { flexDirection: 'row', gap: 8, marginTop: 10 },
  actionBtn2: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4, paddingVertical: 10, borderRadius: 10 },
  approveBtn: { backgroundColor: '#22c55e' },
  rejectBtn: { backgroundColor: '#ef4444' },
  completeBtn: { backgroundColor: '#3b82f6', marginTop: 8 },
  actionBtnText: { color: '#fff', fontSize: 13, fontWeight: '600' },

  // Modal
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: '#fff', borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, maxHeight: '90%' },
  modalHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 },
  modalTitle: { fontSize: 18, fontWeight: '700', color: '#1f2937' },
  modalLabel: { fontSize: 13, fontWeight: '600', color: '#374151', marginBottom: 6, marginTop: 12 },
  modalInput: { borderWidth: 1, borderColor: '#d1d5db', borderRadius: 10, padding: 12, fontSize: 15, color: '#1f2937', backgroundColor: '#f9fafb' },
  modalTextArea: { minHeight: 80, textAlignVertical: 'top' },
  saveButton: { backgroundColor: '#3b82f6', borderRadius: 12, paddingVertical: 14, alignItems: 'center', marginTop: 20 },
  saveButtonText: { color: '#fff', fontSize: 16, fontWeight: '600' },

  // Empty
  emptyText: { fontSize: 13, color: '#9ca3af', textAlign: 'center', paddingVertical: 20 },
});

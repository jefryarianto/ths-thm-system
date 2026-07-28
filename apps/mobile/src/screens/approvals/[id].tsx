import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  ActivityIndicator,
} from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { router, useLocalSearchParams } from 'expo-router';
import {
  useApprovalDetail,
  approveApproval,
  rejectApproval,
  REQUEST_TYPE_LABELS,
  STATUS_STYLES,
  ApprovalLevel,
  getReferenceRoute,
} from '../../hooks/use-approvals';
import { LoadingView, ErrorView } from '../../components/ui/shared';

export default function ApprovalDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { data: approval, loading, error, refetch } = useApprovalDetail(id);
  const [note, setNote] = useState('');
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const handleAction = async (action: 'approve' | 'reject') => {
    if (!approval) return;
    const label = action === 'approve' ? 'Setujui' : 'Tolak';
    Alert.alert(
      `${label} Pengajuan`,
      action === 'approve'
        ? 'Apakah Anda yakin ingin menyetujui pengajuan ini?'
        : 'Apakah Anda yakin ingin menolak pengajuan ini?',
      [
        { text: 'Batal', style: 'cancel' },
        {
          text: label,
          style: action === 'reject' ? 'destructive' : 'default',
          onPress: async () => {
            setActionLoading(action);
            try {
              if (action === 'approve') {
                await approveApproval(approval.id, note);
              } else {
                await rejectApproval(approval.id, note);
              }
              setNote('');
              refetch();
            } catch {
              Alert.alert('Gagal', `Gagal ${action === 'approve' ? 'menyetujui' : 'menolak'} pengajuan`);
            }
            setActionLoading(null);
          },
        },
      ],
    );
  };

  if (loading) return <LoadingView message="Memuat detail..." />;
  if (error || !approval) {
    return (
      <ErrorView
        message={error || 'Pengajuan tidak ditemukan'}
        onRetry={() => { router.back(); }}
      />
    );
  }

  const st = STATUS_STYLES[approval.status] || { label: approval.status, color: '#6b7280', bg: '#f3f4f6' };
  const isPending = approval.status === 'pending';

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerRow}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <Ionicons name="arrow-back" size={22} color="#fff" />
          </TouchableOpacity>
          <View style={styles.headerTitleArea}>
            <Text style={styles.headerTitle}>Detail Persetujuan</Text>
          </View>
          <TouchableOpacity onPress={refetch} style={styles.refreshBtn}>
            <Ionicons name="refresh" size={20} color="#bfdbfe" />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView style={styles.scroll} contentContainerStyle={{ padding: 16, paddingBottom: 40 }}>
        {/* Status Header */}
        <View style={[styles.statusHeader, { borderLeftColor: st.color, borderLeftWidth: 4 }]}>
          <View style={styles.statusRow}>
            <View style={[styles.statusIconBox, { backgroundColor: st.bg }]}>
              <Ionicons
                name={approval.status === 'approved' ? 'checkmark-circle' : approval.status === 'rejected' ? 'close-circle' : 'time'}
                size={24}
                color={st.color}
              />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.statusTitle}>
                {REQUEST_TYPE_LABELS[approval.requestType] || approval.requestType}
              </Text>
              <View style={[styles.badge, { backgroundColor: st.bg }]}>
                <Text style={[styles.badgeText, { color: st.color }]}>{st.label}</Text>
              </View>
            </View>
          </View>
          <Text style={styles.idText}>ID: {approval.id}</Text>
          <Text style={styles.metaInfo}>
            Diajukan: {new Date(approval.createdAt).toLocaleDateString('id-ID', {
              day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit'
            })}
          </Text>
          {approval.completedAt && (
            <Text style={styles.metaInfo}>
              Selesai: {new Date(approval.completedAt).toLocaleDateString('id-ID', {
                day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit'
              })}
            </Text>
          )}
        </View>

        {/* Action Section */}
        {isPending && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>
              <Ionicons name="shield-checkmark" size={16} color="#2563eb" /> Tindakan
            </Text>
            <TextInput
              style={styles.noteInput}
              placeholder="Tambahkan catatan (opsional)..."
              placeholderTextColor="#9ca3af"
              value={note}
              onChangeText={setNote}
              multiline
              numberOfLines={3}
            />
            <View style={styles.actionRow}>
              <TouchableOpacity
                style={[styles.actionBtn, styles.approveBtn]}
                disabled={actionLoading !== null}
                onPress={() => handleAction('approve')}
              >
                {actionLoading === 'approve' ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <>
                    <Ionicons name="checkmark-circle" size={18} color="#fff" />
                    <Text style={styles.actionBtnText}>Setujui</Text>
                  </>
                )}
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.actionBtn, styles.rejectBtn]}
                disabled={actionLoading !== null}
                onPress={() => handleAction('reject')}
              >
                {actionLoading === 'reject' ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <>
                    <Ionicons name="close-circle" size={18} color="#fff" />
                    <Text style={styles.actionBtnText}>Tolak</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* Info Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>
            <Ionicons name="document-text" size={16} color="#2563eb" /> Informasi Pengajuan
          </Text>
          <View style={styles.infoCard}>
            <InfoRow icon="document" label="Tipe" value={REQUEST_TYPE_LABELS[approval.requestType] || approval.requestType} />
            <InfoRow icon="finger-print" label="Item ID" value={approval.itemId} />
            <InfoRow icon="person" label="Diajukan Oleh" value={approval.submittedBy || '-'} />
            
            {/* Reference Detail Button */}
            {(() => {
              const refRoute = getReferenceRoute(approval);
              if (!refRoute) return null;
              return (
                <TouchableOpacity
                  style={styles.referenceBtn}
                  activeOpacity={0.7}
                  onPress={() => router.push(refRoute as any)}
                >
                  <Ionicons name={refRoute.icon as any} size={18} color="#2563eb" />
                  <Text style={styles.referenceBtnText}>{refRoute.label}</Text>
                  <Ionicons name="chevron-forward" size={18} color="#93c5fd" />
                </TouchableOpacity>
              );
            })()}
          </View>
        </View>

        {/* Levels Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>
            <Ionicons name="layers" size={16} color="#2563eb" /> Level Persetujuan
          </Text>
          {approval.levels.length > 0 ? (
            <View style={styles.levelsTimeline}>
              {approval.levels.map((level, idx) => (
                <LevelCard key={level.id} level={level} index={idx} isLast={idx === approval.levels.length - 1} />
              ))}
            </View>
          ) : (
            <View style={styles.emptyLevels}>
              <Ionicons name="alert-circle" size={28} color="#d1d5db" />
              <Text style={styles.emptyLevelsText}>Tidak ada level persetujuan</Text>
            </View>
          )}
        </View>
      </ScrollView>
    </View>
  );
}

function InfoRow({ icon, label, value }: { icon: string; label: string; value: string }) {
  return (
    <View style={styles.infoRow}>
      <Ionicons name={icon as any} size={15} color="#9ca3af" />
      <View style={{ flex: 1 }}>
        <Text style={styles.infoLabel}>{label}</Text>
        <Text style={styles.infoValue}>{value}</Text>
      </View>
    </View>
  );
}

function LevelCard({ level, index, isLast }: { level: ApprovalLevel; index: number; isLast: boolean }) {
  const ls = STATUS_STYLES[level.status] || { label: level.status, color: '#6b7280', bg: '#f3f4f6' };

  return (
    <View style={styles.levelRow}>
      {/* Timeline connector */}
      <View style={styles.timelineCol}>
        <View style={[styles.timelineDot, { backgroundColor: ls.bg, borderColor: ls.color }]}>
          <Text style={[styles.timelineDotText, { color: ls.color }]}>
            {level.status === 'approved' ? '✓' : level.status === 'rejected' ? '✗' : `${index + 1}`}
          </Text>
        </View>
        {!isLast && <View style={styles.timelineLine} />}
      </View>

      {/* Content */}
      <View style={[styles.levelContent, { borderLeftColor: ls.color, borderLeftWidth: 3 }]}>
        <View style={styles.levelHeader}>
          <Text style={styles.levelName}>{level.approvalLevel.name}</Text>
          <View style={[styles.levelBadge, { backgroundColor: ls.bg }]}>
            <Text style={[styles.levelBadgeText, { color: ls.color }]}>{ls.label}</Text>
          </View>
        </View>
        <Text style={styles.levelRole}>Role: {level.approvalLevel.roleName}</Text>
        {level.decidedAt && (
          <Text style={styles.levelDate}>
            {new Date(level.decidedAt).toLocaleDateString('id-ID', {
              day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit'
            })}
          </Text>
        )}
        {level.note && (
          <Text style={styles.levelNote}>Catatan: {level.note}</Text>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f3f4f6' },
  header: { backgroundColor: '#2563eb', paddingTop: 54, paddingBottom: 14, paddingHorizontal: 16 },
  headerRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  backBtn: { padding: 4 },
  headerTitleArea: { flex: 1 },
  headerTitle: { color: '#fff', fontSize: 18, fontWeight: '700' },
  refreshBtn: { padding: 4 },
  scroll: { flex: 1 },
  statusHeader: {
    backgroundColor: '#fff',
    borderRadius: 14,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOpacity: 0.03,
    shadowRadius: 4,
    elevation: 1,
  },
  statusRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  statusIconBox: {
    width: 48,
    height: 48,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statusTitle: { fontSize: 17, fontWeight: '700', color: '#111827' },
  badge: { alignSelf: 'flex-start', paddingHorizontal: 10, paddingVertical: 3, borderRadius: 8, marginTop: 4 },
  badgeText: { fontSize: 11, fontWeight: '600' },
  idText: { fontSize: 11, color: '#9ca3af', fontFamily: 'monospace', marginTop: 10 },
  metaInfo: { fontSize: 12, color: '#6b7280', marginTop: 4 },
  section: {
    backgroundColor: '#fff',
    borderRadius: 14,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOpacity: 0.03,
    shadowRadius: 4,
    elevation: 1,
  },
  sectionTitle: { fontSize: 15, fontWeight: '600', color: '#111827', marginBottom: 12 },
  noteInput: {
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 10,
    padding: 10,
    fontSize: 13,
    color: '#111827',
    backgroundColor: '#f9fafb',
    textAlignVertical: 'top',
    minHeight: 60,
  },
  actionRow: { flexDirection: 'row', gap: 10, marginTop: 12 },
  actionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 12,
    borderRadius: 10,
  },
  approveBtn: { backgroundColor: '#16a34a' },
  rejectBtn: { backgroundColor: '#dc2626' },
  actionBtnText: { color: '#fff', fontSize: 14, fontWeight: '600' },
  infoCard: { gap: 8 },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 10,
    paddingHorizontal: 12,
    backgroundColor: '#f9fafb',
    borderRadius: 10,
  },
  infoLabel: { fontSize: 11, color: '#9ca3af', textTransform: 'uppercase' },
  infoValue: { fontSize: 14, color: '#111827', fontWeight: '500' },
  levelsTimeline: { gap: 0 },
  levelRow: { flexDirection: 'row', gap: 0, minHeight: 80 },
  timelineCol: { width: 32, alignItems: 'center' },
  timelineDot: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1,
  },
  timelineDotText: { fontSize: 11, fontWeight: '700' },
  timelineLine: {
    width: 2,
    flex: 1,
    backgroundColor: '#e5e7eb',
    marginTop: -2,
    marginBottom: -2,
  },
  levelContent: {
    flex: 1,
    backgroundColor: '#f9fafb',
    borderRadius: 10,
    padding: 12,
    marginLeft: 10,
    marginBottom: 8,
  },
  levelHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  levelName: { fontSize: 14, fontWeight: '600', color: '#111827' },
  levelBadge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6 },
  levelBadgeText: { fontSize: 10, fontWeight: '600' },
  levelRole: { fontSize: 12, color: '#6b7280' },
  levelDate: { fontSize: 11, color: '#9ca3af', marginTop: 2 },
  levelNote: { fontSize: 11, color: '#6b7280', fontStyle: 'italic', marginTop: 4 },
  emptyLevels: { alignItems: 'center', paddingVertical: 24 },
  emptyLevelsText: { fontSize: 13, color: '#9ca3af', marginTop: 8 },
});

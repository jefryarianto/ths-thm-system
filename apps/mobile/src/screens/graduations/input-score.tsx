import React, { useState, useCallback, useMemo, useEffect } from 'react';
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
import { useLocalSearchParams, router } from 'expo-router';
import {
  useAssessmentItems,
  useGraduationParticipants,
  submitScores,
  getUjianPraktekId,
  ScoringAspect,
  ScoringParticipant,
  ScoreEntry,
  ScoreResult,
} from '../../hooks/use-scoring';
import { LoadingView, ErrorView, SearchBar } from '../../components/ui/shared';

type FormState = 'loading_ujian' | 'select_participant' | 'input_scores' | 'submitting' | 'confirm';

interface ParticipantScore {
  participant: ScoringParticipant;
  scores: Record<string, number>; // itemId -> nilai
  notes: Record<string, string>;  // itemId -> catatan
}

export default function InputScoreScreen() {
  const { id: graduationId } = useLocalSearchParams<{ id: string }>();

  // Local state
  const [formState, setFormState] = useState<FormState>('loading_ujian');
  const [ujianPraktekId, setUjianPraktekId] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [selectedParticipant, setSelectedParticipant] = useState<ScoringParticipant | null>(null);
  const [currentScores, setCurrentScores] = useState<Record<string, number>>({});
  const [currentNotes, setCurrentNotes] = useState<Record<string, string>>({});
  const [submittedResult, setSubmittedResult] = useState<ScoreResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  // API hooks
  const { data: aspects, loading: loadingAspects, error: aspectsError, refetch: refetchAspects } = useAssessmentItems();
  const { data: participants, loading: loadingParticipants, error: participantsError, refetch: refetchParticipants } = useGraduationParticipants(graduationId);

  // Resolve ujian-praktek ID on mount
  useEffect(() => {
    (async () => {
      const uid = await getUjianPraktekId(graduationId);
      if (uid) {
        setUjianPraktekId(uid);
        setFormState('select_participant');
      } else {
        setError('Belum ada ujian praktek untuk pendadaran ini. Hubungi admin.');
        setFormState('select_participant');
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [graduationId]);

  // Flatten all items from all aspects
  const allItems = useMemo(() => {
    if (!aspects) return [];
    return aspects.flatMap((a) => a.items);
  }, [aspects]);

  // Compute total score
  const totalScore = useMemo(() => {
    let sum = 0;
    let max = 0;
    for (const item of allItems) {
      const val = currentScores[item.id];
      if (val !== undefined && !isNaN(val)) {
        sum += val;
      }
      max += item.skorMaks || 100;
    }
    return { sum, max, pct: max > 0 ? Math.round((sum / max) * 100) : 0 };
  }, [allItems, currentScores]);

  // Filtered participants
  const filteredParticipants = useMemo(() => {
    if (!participants) return [];
    const q = search.trim().toLowerCase();
    if (!q) return participants;
    return participants.filter(
      (p) =>
        p.anggota?.namaLengkap?.toLowerCase().includes(q) ||
        p.anggota?.nomorAnggota?.toLowerCase().includes(q),
    );
  }, [participants, search]);

  // Select participant
  const handleSelectParticipant = useCallback((p: ScoringParticipant) => {
    setSelectedParticipant(p);
    setCurrentScores({});
    setCurrentNotes({});
    setFormState('input_scores');
  }, []);

  // Back to participant list
  const handleBackToList = useCallback(() => {
    setSelectedParticipant(null);
    setCurrentScores({});
    setCurrentNotes({});
    setSubmittedResult(null);
    setError(null);
    setFormState('select_participant');
  }, []);

  // Update score for an item
  const handleScoreChange = useCallback((itemId: string, value: string) => {
    const num = parseInt(value, 10);
    if (value === '') {
      setCurrentScores((prev) => {
        const next = { ...prev };
        delete next[itemId];
        return next;
      });
    } else if (!isNaN(num) && num >= 0) {
      setCurrentScores((prev) => ({ ...prev, [itemId]: num }));
    }
  }, []);

  // Update note for an item
  const handleNoteChange = useCallback((itemId: string, value: string) => {
    setCurrentNotes((prev) => ({ ...prev, [itemId]: value }));
  }, []);

  // Submit scores
  const handleSubmit = useCallback(async () => {
    if (!selectedParticipant || !ujianPraktekId || allItems.length === 0) return;

    // Validate: all items must have a score
    const missingItems = allItems.filter((item) => currentScores[item.id] === undefined);
    if (missingItems.length > 0) {
      Alert.alert(
        'Nilai Belum Lengkap',
        `Harap isi semua item penilaian. ${missingItems.length} item masih kosong.`,
      );
      return;
    }

    setFormState('submitting');

    try {
      const scores: ScoreEntry[] = allItems.map((item) => ({
        itemPenilaianId: item.id,
        calonAnggotaId: selectedParticipant.anggotaId,
        nilai: currentScores[item.id],
        catatan: currentNotes[item.id] || undefined,
      }));

      const result = await submitScores(graduationId, ujianPraktekId, scores);
      setSubmittedResult(result);
      setFormState('confirm');
    } catch {
      setFormState('input_scores');
      Alert.alert('Gagal', 'Gagal menyimpan nilai. Silakan coba lagi.');
    }
  }, [selectedParticipant, ujianPraktekId, allItems, currentScores, currentNotes, graduationId]);

  // ─── Render: Loading Ujian Init ───
  if (formState === 'loading_ujian') {
    return <LoadingView message="Memuat data ujian praktek..." />;
  }

  // ─── Render: Confirm (success) ───
  if (formState === 'confirm' && submittedResult) {
    const pct = submittedResult.maxScore > 0
      ? Math.round((submittedResult.totalScore / submittedResult.maxScore) * 100)
      : 0;

    const scoredCount = Object.keys(currentScores).length;
    const totalCount = allItems.length;

    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <Ionicons name="arrow-back" size={22} color="#fff" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Nilai Tersimpan</Text>
        </View>

        <ScrollView contentContainerStyle={styles.confirmContainer}>
          <View style={styles.confirmIcon}>
            <Ionicons name="checkmark-circle" size={64} color="#16a34a" />
          </View>
          <Text style={styles.confirmTitle}>Nilai berhasil disimpan!</Text>

          <View style={styles.confirmCard}>
            <View style={styles.confirmRow}>
              <Text style={styles.confirmLabel}>Peserta</Text>
              <Text style={styles.confirmValue}>{selectedParticipant?.anggota?.namaLengkap}</Text>
            </View>
            <View style={styles.confirmRow}>
              <Text style={styles.confirmLabel}>Total Nilai</Text>
              <Text style={styles.confirmScore}>{submittedResult.totalScore} / {submittedResult.maxScore}</Text>
            </View>
            <View style={styles.confirmRow}>
              <Text style={styles.confirmLabel}>Persentase</Text>
              <Text style={[styles.confirmPct, { color: pct >= 70 ? '#16a34a' : '#dc2626' }]}>{pct}%</Text>
            </View>
            <View style={styles.confirmRow}>
              <Text style={styles.confirmLabel}>Item Dinilai</Text>
              <Text style={styles.confirmValue}>{scoredCount} / {totalCount}</Text>
            </View>
          </View>

          <View style={styles.confirmActions}>
            <TouchableOpacity style={styles.confirmBtnPrimary} onPress={handleBackToList}>
              <Ionicons name="people" size={18} color="#fff" />
              <Text style={styles.confirmBtnText}>Nilai Peserta Lain</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.confirmBtnSecondary} onPress={() => router.back()}>
              <Ionicons name="arrow-back" size={18} color="#2563eb" />
              <Text style={styles.confirmBtnSecondaryText}>Kembali ke Detail</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </View>
    );
  }

  // ─── Loading states ───
  if (loadingAspects || loadingParticipants) {
    return <LoadingView message="Memuat data penilaian..." />;
  }

  if (aspectsError || participantsError) {
    return (
      <ErrorView
        message={aspectsError || participantsError || 'Gagal memuat data'}
        onRetry={() => { refetchAspects(); refetchParticipants(); }}
      />
    );
  }

  // ─── Render: Select Participant ───
  if (formState === 'select_participant') {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <Ionicons name="arrow-back" size={22} color="#fff" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Pilih Peserta</Text>
        </View>

        <SearchBar value={search} onChangeText={setSearch} placeholder="Cari peserta..." />

        <ScrollView contentContainerStyle={{ padding: 16 }}>
          {error ? (
            <View style={styles.errorBanner}>
              <Ionicons name="alert-circle" size={16} color="#dc2626" />
              <Text style={styles.errorBannerText}>{error}</Text>
            </View>
          ) : filteredParticipants.length === 0 ? (
            <View style={styles.emptyBox}>
              <Ionicons name="people" size={48} color="#d1d5db" />
              <Text style={styles.emptyText}>
                {search ? 'Tidak ada peserta yang cocok' : 'Belum ada peserta terdaftar'}
              </Text>
            </View>
          ) : (
            filteredParticipants.map((p) => (
              <TouchableOpacity
                key={p.id}
                style={styles.participantRow}
                activeOpacity={0.7}
                onPress={() => handleSelectParticipant(p)}
              >
                <View style={styles.partAvatar}>
                  <Text style={styles.partAvatarText}>
                    {p.anggota?.namaLengkap?.charAt(0) || '?'}
                  </Text>
                </View>
                <View style={styles.partInfo}>
                  <Text style={styles.partName}>{p.anggota?.namaLengkap || 'Unknown'}</Text>
                  {p.anggota?.nomorAnggota && (
                    <Text style={styles.partNo}>{p.anggota.nomorAnggota}</Text>
                  )}
                </View>
                <Ionicons name="chevron-forward" size={20} color="#9ca3af" />
              </TouchableOpacity>
            ))
          )}
        </ScrollView>
      </View>
    );
  }

  // ─── Render: Input Scores ───
  if (formState === 'input_scores' || formState === 'submitting') {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={handleBackToList} style={styles.backBtn}>
            <Ionicons name="arrow-back" size={22} color="#fff" />
          </TouchableOpacity>
          <View style={{ flex: 1 }}>
            <Text style={styles.headerTitle} numberOfLines={1}>
              {selectedParticipant?.anggota?.namaLengkap || 'Input Nilai'}
            </Text>
            {selectedParticipant?.anggota?.nomorAnggota && (
              <Text style={styles.headerSub}>{selectedParticipant.anggota.nomorAnggota}</Text>
            )}
          </View>
        </View>

        <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 100 }}>
          {/* Progress Summary */}
          <View style={styles.progressCard}>
            <View style={styles.progressRow}>
              <Text style={styles.progressLabel}>Total Skor</Text>
              <Text style={styles.progressScore}>
                {totalScore.sum} / {totalScore.max}
              </Text>
            </View>
            <View style={styles.progressBarBg}>
              <View
                style={[
                  styles.progressBarFill,
                  { width: `${totalScore.pct}%`, backgroundColor: totalScore.pct >= 70 ? '#16a34a' : totalScore.pct >= 40 ? '#eab308' : '#dc2626' },
                ]}
              />
            </View>
            <Text style={styles.progressPct}>{totalScore.pct}%</Text>
          </View>

          {/* Aspects & Items */}
          {!aspects || aspects.length === 0 ? (
            <View style={styles.emptyBox}>
              <Ionicons name="alert-circle" size={48} color="#d1d5db" />
              <Text style={styles.emptyText}>Belum ada aspek penilaian. Hubungi admin.</Text>
            </View>
          ) : (
            aspects.map((aspect, ai) => (
              <View key={aspect.id} style={styles.aspectCard}>
                <View style={styles.aspectHeader}>
                  <View style={styles.aspectIcon}>
                    <Text style={styles.aspectIconText}>{ai + 1}</Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.aspectName}>{aspect.nama}</Text>
                    {aspect.deskripsi && (
                      <Text style={styles.aspectDesc}>{aspect.deskripsi}</Text>
                    )}
                  </View>
                  <Text style={styles.aspectCount}>{aspect.items.length} item</Text>
                </View>

                {aspect.items.length === 0 ? (
                  <Text style={styles.noItemsText}>Belum ada item untuk aspek ini</Text>
                ) : (
                  aspect.items.map((item) => {
                    const scoreVal = currentScores[item.id];
                    const isFilled = scoreVal !== undefined;
                    const skorMaks = item.skorMaks || 100;

                    return (
                      <View key={item.id} style={styles.itemCard}>
                        <View style={styles.itemHeader}>
                          <Text style={styles.itemName}>{item.nama}</Text>
                          <Text style={styles.itemMaks}>0–{skorMaks}</Text>
                        </View>

                        <View style={styles.scoreInputRow}>
                          <TouchableOpacity
                            style={styles.scoreBtn}
                            onPress={() => {
                              const current = scoreVal || 0;
                              if (current > 0) handleScoreChange(item.id, String(Math.max(0, current - 5)));
                            }}
                          >
                            <Ionicons name="remove" size={18} color="#6b7280" />
                          </TouchableOpacity>

                          <TextInput
                            style={[styles.scoreInput, isFilled && styles.scoreInputFilled]}
                            keyboardType="number-pad"
                            value={scoreVal !== undefined ? String(scoreVal) : ''}
                            placeholder="Nilai"
                            placeholderTextColor="#d1d5db"
                            onChangeText={(v) => handleScoreChange(item.id, v)}
                            editable={formState !== 'submitting'}
                          />

                          <TouchableOpacity
                            style={styles.scoreBtn}
                            onPress={() => {
                              const current = scoreVal || 0;
                              if (current < skorMaks) handleScoreChange(item.id, String(Math.min(skorMaks, current + 5)));
                            }}
                          >
                            <Ionicons name="add" size={18} color="#6b7280" />
                          </TouchableOpacity>
                        </View>

                        <TextInput
                          style={styles.noteInput}
                          placeholder="Catatan (opsional)..."
                          placeholderTextColor="#d1d5db"
                          value={currentNotes[item.id] || ''}
                          onChangeText={(v) => handleNoteChange(item.id, v)}
                          editable={formState !== 'submitting'}
                        />
                      </View>
                    );
                  })
                )}
              </View>
            ))
          )}
        </ScrollView>

        {/* Fixed Submit Button */}
        <View style={styles.submitBar}>
          <View style={styles.submitInfo}>
            <Text style={styles.submitInfoLabel}>Total</Text>
            <Text style={styles.submitInfoScore}>{totalScore.sum} / {totalScore.max}</Text>
          </View>
          <TouchableOpacity
            style={[
              styles.submitBtn,
              (formState === 'submitting' || allItems.length === 0) && styles.submitBtnDisabled,
            ]}
            disabled={formState === 'submitting' || allItems.length === 0}
            onPress={handleSubmit}
          >
            {formState === 'submitting' ? (
              <ActivityIndicator color="#fff" size="small" />
            ) : (
              <>
                <Ionicons name="save" size={18} color="#fff" />
                <Text style={styles.submitBtnText}>Simpan Nilai</Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return null;
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f3f4f6' },
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
  headerTitle: { color: '#fff', fontSize: 18, fontWeight: '700', flex: 1 },
  headerSub: { color: '#bfdbfe', fontSize: 12, marginTop: 2 },

  // Error
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#fef2f2',
    borderRadius: 10,
    padding: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#fecaca',
  },
  errorBannerText: { color: '#dc2626', fontSize: 13, flex: 1 },

  // Participant List
  participantRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 14,
    marginBottom: 6,
    borderWidth: 1,
    borderColor: '#f3f4f6',
    shadowColor: '#000',
    shadowOpacity: 0.03,
    shadowRadius: 4,
    elevation: 1,
  },
  partAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#eff6ff',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  partAvatarText: { fontSize: 16, fontWeight: '700', color: '#2563eb' },
  partInfo: { flex: 1 },
  partName: { fontSize: 15, fontWeight: '600', color: '#111827' },
  partNo: { fontSize: 12, color: '#6b7280', marginTop: 2 },

  // Progress
  progressCard: {
    backgroundColor: '#fff',
    borderRadius: 14,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    shadowColor: '#000',
    shadowOpacity: 0.03,
    shadowRadius: 4,
    elevation: 1,
  },
  progressRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  progressLabel: { fontSize: 13, color: '#6b7280', fontWeight: '500' },
  progressScore: { fontSize: 18, fontWeight: '700', color: '#111827' },
  progressBarBg: {
    height: 8,
    backgroundColor: '#e5e7eb',
    borderRadius: 4,
    overflow: 'hidden',
    marginBottom: 4,
  },
  progressBarFill: { height: '100%', borderRadius: 4 },
  progressPct: { fontSize: 12, color: '#6b7280', textAlign: 'right' },

  // Aspect
  aspectCard: {
    backgroundColor: '#fff',
    borderRadius: 14,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    shadowColor: '#000',
    shadowOpacity: 0.03,
    shadowRadius: 4,
    elevation: 1,
  },
  aspectHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 12,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  aspectIcon: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#2563eb',
    alignItems: 'center',
    justifyContent: 'center',
  },
  aspectIconText: { color: '#fff', fontSize: 13, fontWeight: '700' },
  aspectName: { fontSize: 15, fontWeight: '600', color: '#111827' },
  aspectDesc: { fontSize: 11, color: '#6b7280', marginTop: 2 },
  aspectCount: { fontSize: 11, color: '#9ca3af' },

  // Item
  itemCard: {
    backgroundColor: '#f9fafb',
    borderRadius: 10,
    padding: 12,
    marginBottom: 8,
  },
  itemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  itemName: { fontSize: 13, fontWeight: '500', color: '#374151', flex: 1 },
  itemMaks: { fontSize: 11, color: '#9ca3af', fontWeight: '500', marginLeft: 8 },
  scoreInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 6,
  },
  scoreBtn: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: '#e5e7eb',
    alignItems: 'center',
    justifyContent: 'center',
  },
  scoreInput: {
    flex: 1,
    height: 40,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#d1d5db',
    backgroundColor: '#fff',
    textAlign: 'center',
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
  },
  scoreInputFilled: {
    borderColor: '#2563eb',
    backgroundColor: '#eff6ff',
  },
  noteInput: {
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 8,
    padding: 8,
    fontSize: 12,
    color: '#6b7280',
    backgroundColor: '#fff',
  },
  noItemsText: { fontSize: 12, color: '#9ca3af', fontStyle: 'italic', textAlign: 'center', paddingVertical: 8 },

  // Submit Bar
  submitBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: '#fff',
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
  },
  submitInfo: { alignItems: 'flex-end' },
  submitInfoLabel: { fontSize: 11, color: '#9ca3af' },
  submitInfoScore: { fontSize: 16, fontWeight: '700', color: '#111827' },
  submitBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#2563eb',
    paddingVertical: 14,
    borderRadius: 12,
  },
  submitBtnDisabled: { backgroundColor: '#93c5fd' },
  submitBtnText: { color: '#fff', fontSize: 15, fontWeight: '700' },

  // Confirm
  confirmContainer: { alignItems: 'center', padding: 24 },
  confirmIcon: { marginTop: 30, marginBottom: 12 },
  confirmTitle: { fontSize: 20, fontWeight: '700', color: '#16a34a', marginBottom: 24 },
  confirmCard: {
    width: '100%',
    backgroundColor: '#fff',
    borderRadius: 14,
    padding: 16,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  confirmRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  confirmLabel: { fontSize: 13, color: '#6b7280' },
  confirmValue: { fontSize: 13, fontWeight: '600', color: '#111827' },
  confirmScore: { fontSize: 16, fontWeight: '700', color: '#111827' },
  confirmPct: { fontSize: 16, fontWeight: '700' },
  confirmActions: { width: '100%', gap: 10 },
  confirmBtnPrimary: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#2563eb',
    paddingVertical: 14,
    borderRadius: 12,
  },
  confirmBtnText: { color: '#fff', fontSize: 15, fontWeight: '700' },
  confirmBtnSecondary: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#eff6ff',
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#bfdbfe',
  },
  confirmBtnSecondaryText: { color: '#2563eb', fontSize: 15, fontWeight: '600' },

  // Empty
  emptyBox: { alignItems: 'center', paddingTop: 60 },
  emptyText: { fontSize: 14, color: '#9ca3af', marginTop: 12, textAlign: 'center' },
});

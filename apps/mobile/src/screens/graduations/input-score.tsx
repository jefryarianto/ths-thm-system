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
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useLocalSearchParams, router } from 'expo-router';
import {
  useAssessmentItems,
  useGraduationParticipants,
  submitScores,
  getUjianPraktekId,
  fetchSesiList,
  startSesi,
  extendSesi,
  finishSesi,
  ScoringAspect,
  ScoringParticipant,
  ScoreEntry,
  ScoreResult,
  SesiUjian,
} from '../../hooks/use-scoring';
import { LoadingView, ErrorView, SearchBar } from '../../components/ui/shared';
import { theme } from '../../theme';

type FormState = 'loading_ujian' | 'select_participant' | 'input_scores' | 'submitting' | 'confirm';

interface ParticipantScore {
  participant: ScoringParticipant;
  scores: Record<string, number>; // itemId -> nilai
  notes: Record<string, string>;  // itemId -> catatan
}

export default function InputScoreScreen() {
  const insets = useSafeAreaInsets();
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
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const { data: aspects, loading: loadingAspects, error: aspectsError, refetch: refetchAspects } = useAssessmentItems(graduationId as string);
  const { data: participants, loading: loadingParticipants, error: participantsError, refetch: refetchParticipants } = useGraduationParticipants(graduationId);

  // ─── Sesi ujian (timer server-side; waktu hanya pedoman) ───
  const [sesi, setSesi] = useState<SesiUjian | null>(null);
  const [sesiBusy, setSesiBusy] = useState(false);
  const [nowMs, setNowMs] = useState(Date.now());

  useEffect(() => {
    const t = setInterval(() => setNowMs(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);

  const loadSesiForParticipant = useCallback(
    async (participantId: string) => {
      if (!ujianPraktekId) {
        setSesi(null);
        return;
      }
      const list = await fetchSesiList(graduationId, ujianPraktekId);
      setSesi(list.find((s) => s.calonAnggotaId === participantId) ?? null);
    },
    [graduationId, ujianPraktekId],
  );

  const handleStartSesi = useCallback(async () => {
    if (!selectedParticipant || !ujianPraktekId) return;
    setSesiBusy(true);
    try {
      const s = await startSesi(graduationId, ujianPraktekId, selectedParticipant.id);
      setSesi(s);
    } catch (err) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      Alert.alert('Gagal', msg || 'Gagal memulai sesi ujian.');
    } finally {
      setSesiBusy(false);
    }
  }, [graduationId, ujianPraktekId, selectedParticipant]);

  const handleExtendSesi = useCallback(async () => {
    if (!selectedParticipant || !ujianPraktekId || !sesi) return;
    Alert.alert('Tambah Waktu', 'Tambahkan +10 menit untuk peserta ini? (hanya sekali)', [
      { text: 'Batal', style: 'cancel' },
      {
        text: 'Ya, +10 Menit',
        onPress: async () => {
          setSesiBusy(true);
          try {
            const s = await extendSesi(graduationId, ujianPraktekId, selectedParticipant.id);
            setSesi(s);
          } catch (err) {
            const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
            Alert.alert('Gagal', msg || 'Gagal menambah waktu.');
          } finally {
            setSesiBusy(false);
          }
        },
      },
    ]);
  }, [graduationId, ujianPraktekId, selectedParticipant, sesi]);

  const handleFinishSesi = useCallback(async () => {
    if (!selectedParticipant || !ujianPraktekId || !sesi) return;
    Alert.alert('Akhiri Sesi', 'Akhiri sesi ujian untuk peserta ini?', [
      { text: 'Batal', style: 'cancel' },
      {
        text: 'Akhiri',
        style: 'destructive',
        onPress: async () => {
          setSesiBusy(true);
          try {
            const s = await finishSesi(graduationId, ujianPraktekId, selectedParticipant.id);
            setSesi(s);
          } catch (err) {
            const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
            Alert.alert('Gagal', msg || 'Gagal mengakhiri sesi.');
          } finally {
            setSesiBusy(false);
          }
        },
      },
    ]);
  }, [graduationId, ujianPraktekId, selectedParticipant, sesi]);

  // Sisa waktu dihitung lokal dari batasAt server (tick tiap detik)
  const sisaDetik = useMemo(() => {
    if (!sesi?.batasAt || sesi.status === 'selesai') return null;
    return Math.floor((new Date(sesi.batasAt).getTime() - nowMs) / 1000);
  }, [sesi, nowMs]);

  const waktuHabis = sisaDetik !== null && sisaDetik <= 0;

  const timerLabel = useMemo(() => {
    if (!sesi || sesi.status === 'belum_mulai') return null;
    if (sesi.status === 'selesai') return 'Sesi Selesai';
    if (sisaDetik === null) return null;
    if (sisaDetik <= 0) return 'Waktu Habis';
    const m = Math.floor(sisaDetik / 60);
    const s = sisaDetik % 60;
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  }, [sesi, sisaDetik]);

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
    return participants.filter((p) => p.namaLengkap?.toLowerCase().includes(q));
  }, [participants, search]);

  // Select participant
  const handleSelectParticipant = useCallback((p: ScoringParticipant) => {
    setSelectedParticipant(p);
    setCurrentScores({});
    setCurrentNotes({});
    setSesi(null);
    setFormState('input_scores');
    void loadSesiForParticipant(p.id);
  }, [loadSesiForParticipant]);

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
        calonAnggotaId: selectedParticipant.id,
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
        <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <Ionicons name="arrow-back" size={22} color={theme.colors.surface} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Nilai Tersimpan</Text>
        </View>

        <ScrollView contentContainerStyle={styles.confirmContainer}>
          <View style={styles.confirmIcon}>
            <Ionicons name="checkmark-circle" size={64} color={theme.colors.success} />
          </View>
          <Text style={styles.confirmTitle}>Nilai berhasil disimpan!</Text>

          <View style={styles.confirmCard}>
            <View style={styles.confirmRow}>
              <Text style={styles.confirmLabel}>Peserta</Text>
              <Text style={styles.confirmValue}>{selectedParticipant?.namaLengkap}</Text>
            </View>
            <View style={styles.confirmRow}>
              <Text style={styles.confirmLabel}>Total Nilai</Text>
              <Text style={styles.confirmScore}>{submittedResult.totalScore} / {submittedResult.maxScore}</Text>
            </View>
            <View style={styles.confirmRow}>
              <Text style={styles.confirmLabel}>Persentase</Text>
              <Text style={[styles.confirmPct, { color: pct >= 70 ? theme.colors.success : theme.colors.danger }]}>{pct}%</Text>
            </View>
            <View style={styles.confirmRow}>
              <Text style={styles.confirmLabel}>Item Dinilai</Text>
              <Text style={styles.confirmValue}>{scoredCount} / {totalCount}</Text>
            </View>
          </View>

          <View style={styles.confirmActions}>
            <TouchableOpacity style={styles.confirmBtnPrimary} onPress={handleBackToList}>
              <Ionicons name="people" size={18} color={theme.colors.surface} />
              <Text style={styles.confirmBtnText}>Nilai Peserta Lain</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.confirmBtnSecondary} onPress={() => router.back()}>
              <Ionicons name="arrow-back" size={18} color={theme.colors.primary} />
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
        <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <Ionicons name="arrow-back" size={22} color={theme.colors.surface} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Pilih Peserta</Text>
        </View>

        <SearchBar value={search} onChangeText={setSearch} placeholder="Cari peserta..." />

        <ScrollView contentContainerStyle={{ padding: 16 }}>
          {error ? (
            <View style={styles.errorBanner}>
              <Ionicons name="alert-circle" size={16} color={theme.colors.danger} />
              <Text style={styles.errorBannerText}>{error}</Text>
            </View>
          ) : filteredParticipants.length === 0 ? (
            <View style={styles.emptyBox}>
              <Ionicons name="people" size={48} color={theme.colors.borderStrong} />
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
                  <Text style={styles.partAvatarText}>{p.namaLengkap?.charAt(0) || '?'}</Text>
                </View>
                <View style={styles.partInfo}>
                  <Text style={styles.partName}>{p.namaLengkap || 'Unknown'}</Text>
                  {p.ranting?.nama && <Text style={styles.partNo}>{p.ranting.nama}</Text>}
                </View>
                <Ionicons name="chevron-forward" size={20} color={theme.colors.textMuted} />
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
        <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
          <TouchableOpacity onPress={handleBackToList} style={styles.backBtn}>
            <Ionicons name="arrow-back" size={22} color={theme.colors.surface} />
          </TouchableOpacity>
          <View style={{ flex: 1 }}>
            <Text style={styles.headerTitle} numberOfLines={1}>
              {selectedParticipant?.namaLengkap || 'Input Nilai'}
            </Text>
            {selectedParticipant?.ranting?.nama && (
              <Text style={styles.headerSub}>{selectedParticipant.ranting.nama}</Text>
            )}
          </View>
        </View>

        <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 100 }}>
          {/* Timer Sesi Ujian — waktu hanya pedoman */}
          <View style={styles.timerCard}>
            {sesi && sesi.status !== 'belum_mulai' ? (
              <>
                <View style={{ flex: 1 }}>
                  <Text style={styles.timerLabel}>Sisa Waktu Ujian</Text>
                  <Text style={[styles.timerValue, waktuHabis && styles.timerHabis]}>
                    {timerLabel}
                  </Text>
                  {waktuHabis && (
                    <Text style={styles.timerNote}>
                      Waktu hanya pedoman — nilai tetap bisa diinput.
                    </Text>
                  )}
                </View>
                {sesi.status !== 'selesai' && (
                  <View style={{ gap: 8 }}>
                    <TouchableOpacity
                      style={[styles.timerBtn, sesi.tambahanMenit >= 10 && styles.timerBtnDisabled]}
                      disabled={sesiBusy || sesi.tambahanMenit >= 10}
                      onPress={handleExtendSesi}
                    >
                      <Ionicons name="add-circle-outline" size={15} color={theme.colors.surface} />
                      <Text style={styles.timerBtnText}>+10 Mnt</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.timerBtnFinish} disabled={sesiBusy} onPress={handleFinishSesi}>
                      <Text style={styles.timerBtnFinishText}>Akhiri</Text>
                    </TouchableOpacity>
                  </View>
                )}
              </>
            ) : (
              <>
                <View style={{ flex: 1 }}>
                  <Text style={styles.timerLabel}>Sesi Ujian</Text>
                  <Text style={styles.timerNote}>
                    Durasi 30 menit per peserta (waktu hanya pedoman).
                  </Text>
                </View>
                <TouchableOpacity style={styles.timerBtn} disabled={sesiBusy} onPress={handleStartSesi}>
                  <Ionicons name="play" size={15} color={theme.colors.surface} />
                  <Text style={styles.timerBtnText}>Mulai</Text>
                </TouchableOpacity>
              </>
            )}
          </View>

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
                  { width: `${totalScore.pct}%`, backgroundColor: totalScore.pct >= 70 ? theme.colors.success : totalScore.pct >= 40 ? theme.colors.warning : theme.colors.danger },
                ]}
              />
            </View>
            <Text style={styles.progressPct}>{totalScore.pct}%</Text>
          </View>

          {/* Aspects & Items */}
          {!aspects || aspects.length === 0 ? (
            <View style={styles.emptyBox}>
              <Ionicons name="alert-circle" size={48} color={theme.colors.borderStrong} />
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
                            <Ionicons name="remove" size={18} color={theme.colors.textSecondary} />
                          </TouchableOpacity>

                          <TextInput
                            style={[styles.scoreInput, isFilled && styles.scoreInputFilled]}
                            keyboardType="number-pad"
                            value={scoreVal !== undefined ? String(scoreVal) : ''}
                            placeholder="Nilai"
                            placeholderTextColor={theme.colors.borderStrong}
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
                            <Ionicons name="add" size={18} color={theme.colors.textSecondary} />
                          </TouchableOpacity>
                        </View>

                        <TextInput
                          style={styles.noteInput}
                          placeholder="Catatan (opsional)..."
                          placeholderTextColor={theme.colors.borderStrong}
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
              <ActivityIndicator color={theme.colors.surface} size="small" />
            ) : (
              <>
                <Ionicons name="save" size={18} color={theme.colors.surface} />
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
  container: { flex: 1, backgroundColor: theme.colors.surfaceMuted },
  header: {
    backgroundColor: theme.colors.primary,
    padding: 24,
    paddingBottom: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  backBtn: { padding: 4 },
  headerTitle: { color: theme.colors.surface, fontSize: 18, fontWeight: '700', flex: 1 },
  headerSub: { color: theme.colors.headerSub, fontSize: 12, marginTop: 2 },

  // Error
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: theme.colors.dangerLight,
    borderRadius: 10,
    padding: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: theme.colors.dangerLight,
  },
  errorBannerText: { color: theme.colors.danger, fontSize: 13, flex: 1 },

  // Participant List
  participantRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.surface,
    borderRadius: 12,
    padding: 14,
    marginBottom: 6,
    borderWidth: 1,
    borderColor: theme.colors.surfaceMuted,
    shadowColor: theme.colors.dark,
    shadowOpacity: 0.03,
    shadowRadius: 4,
    elevation: 1,
  },
  partAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: theme.colors.primarySofter,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  partAvatarText: { fontSize: 16, fontWeight: '700', color: theme.colors.primary },
  partInfo: { flex: 1 },
  partName: { fontSize: 15, fontWeight: '600', color: theme.colors.text },
  partNo: { fontSize: 12, color: theme.colors.textSecondary, marginTop: 2 },

  // Progress
  progressCard: {
    backgroundColor: theme.colors.surface,
    borderRadius: 14,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: theme.colors.border,
    shadowColor: theme.colors.dark,
    shadowOpacity: 0.03,
    shadowRadius: 4,
    elevation: 1,
  },
  progressRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  progressLabel: { fontSize: 13, color: theme.colors.textSecondary, fontWeight: '500' },
  progressScore: { fontSize: 18, fontWeight: '700', color: theme.colors.text },
  progressBarBg: {
    height: 8,
    backgroundColor: theme.colors.border,
    borderRadius: 4,
    overflow: 'hidden',
    marginBottom: 4,
  },
  progressBarFill: { height: '100%', borderRadius: 4 },
  progressPct: { fontSize: 12, color: theme.colors.textSecondary, textAlign: 'right' },

  // Aspect
  aspectCard: {
    backgroundColor: theme.colors.surface,
    borderRadius: 14,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: theme.colors.border,
    shadowColor: theme.colors.dark,
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
    borderBottomColor: theme.colors.surfaceMuted,
  },
  aspectIcon: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: theme.colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  aspectIconText: { color: theme.colors.surface, fontSize: 13, fontWeight: '700' },
  aspectName: { fontSize: 15, fontWeight: '600', color: theme.colors.text },
  aspectDesc: { fontSize: 11, color: theme.colors.textSecondary, marginTop: 2 },
  aspectCount: { fontSize: 11, color: theme.colors.textMuted },

  // Item
  itemCard: {
    backgroundColor: theme.colors.surfaceMuted,
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
  itemName: { fontSize: 13, fontWeight: '500', color: theme.colors.textSecondary, flex: 1 },
  itemMaks: { fontSize: 11, color: theme.colors.textMuted, fontWeight: '500', marginLeft: 8 },
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
    backgroundColor: theme.colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scoreInput: {
    flex: 1,
    height: 40,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: theme.colors.borderStrong,
    backgroundColor: theme.colors.surface,
    textAlign: 'center',
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.text,
  },
  scoreInputFilled: {
    borderColor: theme.colors.primary,
    backgroundColor: theme.colors.primarySofter,
  },
  noteInput: {
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: 8,
    padding: 8,
    fontSize: 12,
    color: theme.colors.textSecondary,
    backgroundColor: theme.colors.surface,
  },
  noItemsText: { fontSize: 12, color: theme.colors.textMuted, fontStyle: 'italic', textAlign: 'center', paddingVertical: 8 },

  // Timer Sesi Ujian
  timerCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.surface,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: theme.colors.border,
    padding: 14,
    marginBottom: 12,
    gap: 10,
  },
  timerLabel: { fontSize: 12, color: theme.colors.textSecondary, fontWeight: '600' },
  timerValue: { fontSize: 28, fontWeight: '800', color: theme.colors.text, fontVariant: ['tabular-nums'] },
  timerHabis: { color: theme.colors.danger, fontSize: 20 },
  timerNote: { fontSize: 11, color: theme.colors.textMuted, fontStyle: 'italic', marginTop: 2 },
  timerBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    backgroundColor: theme.colors.primary,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
  },
  timerBtnDisabled: { backgroundColor: theme.colors.primaryLight },
  timerBtnText: { color: theme.colors.surface, fontSize: 12, fontWeight: '700' },
  timerBtnFinish: {
    alignItems: 'center',
    backgroundColor: theme.colors.dangerLight,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
  },
  timerBtnFinishText: { color: theme.colors.danger, fontSize: 12, fontWeight: '700' },

  // Submit Bar
  submitBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: theme.colors.surface,
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
    shadowColor: theme.colors.dark,
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
  },
  submitInfo: { alignItems: 'flex-end' },
  submitInfoLabel: { fontSize: 11, color: theme.colors.textMuted },
  submitInfoScore: { fontSize: 16, fontWeight: '700', color: theme.colors.text },
  submitBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: theme.colors.primary,
    paddingVertical: 14,
    borderRadius: 12,
  },
  submitBtnDisabled: { backgroundColor: theme.colors.primaryLight },
  submitBtnText: { color: theme.colors.surface, fontSize: 15, fontWeight: '700' },

  // Confirm
  confirmContainer: { alignItems: 'center', padding: 24 },
  confirmIcon: { marginTop: 30, marginBottom: 12 },
  confirmTitle: { fontSize: 20, fontWeight: '700', color: theme.colors.success, marginBottom: 24 },
  confirmCard: {
    width: '100%',
    backgroundColor: theme.colors.surface,
    borderRadius: 14,
    padding: 16,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  confirmRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.surfaceMuted,
  },
  confirmLabel: { fontSize: 13, color: theme.colors.textSecondary },
  confirmValue: { fontSize: 13, fontWeight: '600', color: theme.colors.text },
  confirmScore: { fontSize: 16, fontWeight: '700', color: theme.colors.text },
  confirmPct: { fontSize: 16, fontWeight: '700' },
  confirmActions: { width: '100%', gap: 10 },
  confirmBtnPrimary: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: theme.colors.primary,
    paddingVertical: 14,
    borderRadius: 12,
  },
  confirmBtnText: { color: theme.colors.surface, fontSize: 15, fontWeight: '700' },
  confirmBtnSecondary: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: theme.colors.primarySofter,
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: theme.colors.headerSub,
  },
  confirmBtnSecondaryText: { color: theme.colors.primary, fontSize: 15, fontWeight: '600' },

  // Empty
  emptyBox: { alignItems: 'center', paddingTop: 60 },
  emptyText: { fontSize: 14, color: theme.colors.textMuted, marginTop: 12, textAlign: 'center' },
});

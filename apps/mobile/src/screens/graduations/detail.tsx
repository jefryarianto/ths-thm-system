import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert, TextInput } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useLocalSearchParams, router } from 'expo-router';
import QRCode from 'react-native-qrcode-svg';
import apiClient, { unwrap } from '../../lib/api-client';
import { LoadingView, ScreenShell, TabBar } from '../../components/ui/shared';
import { useRole } from '../../hooks/use-role';
import type { Graduation, GraduationParticipant, GraduationEvaluation, GraduationResult } from '../../types';
import { theme } from '../../theme';

const STATUS_STYLES: Record<string, { label: string; color: string; bg: string }> = {
  draft: { label: 'Draft', color: theme.colors.textSecondary, bg: theme.colors.surfaceMuted },
  published: { label: 'Berlangsung', color: theme.colors.success, bg: theme.colors.successLight },
  closed: { label: 'Selesai', color: theme.colors.primary, bg: theme.colors.primarySofter },
  cancelled: { label: 'Dibatalkan', color: theme.colors.danger, bg: theme.colors.dangerLight },
};

export default function GraduationDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { isAdmin, isPenguji, role } = useRole();
  const [graduation, setGraduation] = useState<Graduation | null>(null);
  const [participants, setParticipants] = useState<GraduationParticipant[]>([]);
  const [evaluations, setEvaluations] = useState<GraduationEvaluation[]>([]);
  const [activeTab, setActiveTab] = useState<'info' | 'participants' | 'ujian' | 'evaluations' | 'penguji' | 'validasi'>('info');
  const [loading, setLoading] = useState(true);
  const [results, setResults] = useState<GraduationResult[]>([]);
  const [validating, setValidating] = useState(false);
  const [genDocsLoading, setGenDocsLoading] = useState(false);
  const [genDocsResult, setGenDocsResult] = useState<{ generated: number; total: number; errors: string[] } | null>(null);
  // Ujian Praktek state
  const [ujianList, setUjianList] = useState<any[]>([]);
  const [ujianLoading, setUjianLoading] = useState(false);
  // Penguji state
  const [examiners, setExaminers] = useState<any[]>([]);
  const [examinersLoading, setExaminersLoading] = useState(false);
  const [showCreateUjian, setShowCreateUjian] = useState(false);
  const [createUjianForm, setCreateUjianForm] = useState({ nama: '', deskripsi: '', durasiMenit: '' });
  const [expandedUjian, setExpandedUjian] = useState<string | null>(null);
  const [availableItems, setAvailableItems] = useState<any[]>([]);
  const [availableExaminers, setAvailableExaminers] = useState<any[]>([]);
  // Score progress state
  const [scoreProgress, setScoreProgress] = useState<any>(null);

  useEffect(() => {
    (async () => {
      try {
        const [gradRes, partRes, evalRes, hasilRes] = await Promise.all([
          apiClient.get(`/graduations/${id}`),
          apiClient.get(`/graduations/${id}/participants`),
          apiClient.get(`/graduations/${id}/evaluations`),
          apiClient.get(`/graduations/${id}/results`),
        ]);
        setGraduation(unwrap(gradRes));
        setParticipants(unwrap(partRes) || []);
        const evalData = unwrap(evalRes) as { scores?: GraduationEvaluation[] } | undefined;
        setEvaluations(evalData?.scores || []);
        setResults(unwrap(hasilRes) || []);
      } catch {
        /* ignore */
      }
      setLoading(false);
    })();
  }, [id]);


  // Fetch ujian list when tab is ujian
  useEffect(() => {
    if (activeTab !== 'ujian' || !id) return;
    (async () => {
      setUjianLoading(true);
      try {
        const res = await apiClient.get(`/graduations/${id}/ujian-praktek`);
        setUjianList(res.data?.data || []);
      } catch { /* ignore */ }
      setUjianLoading(false);
    })();
    fetchScoreProgress();
  }, [activeTab, id]);

  // Fetch examiners when tab is penguji
  useEffect(() => {
    if (activeTab !== 'penguji' || !id) return;
    (async () => {
      setExaminersLoading(true);
      try {
        const res = await apiClient.get(`/graduations/${id}/examiners`);
        setExaminers(res.data?.data || []);
      } catch { /* ignore */ }
      setExaminersLoading(false);
    })();
  }, [activeTab, id]);

  if (loading) return <LoadingView message="Memuat detail pendadaran..." />;
  if (!graduation)
    return (
      <View style={styles.center}>
        <Text style={styles.errorText}>Pendadaran tidak ditemukan</Text>
      </View>
    );

  const ss = STATUS_STYLES[graduation.status] || {
    label: graduation.status,
    color: theme.colors.textSecondary,
    bg: theme.colors.surfaceMuted,
  };

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr);
    const days = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
    const months = [
      'Jan',
      'Feb',
      'Mar',
      'Apr',
      'Mei',
      'Jun',
      'Jul',
      'Agu',
      'Sep',
      'Okt',
      'Nov',
      'Des',
    ];
    return `${days[d.getDay()]}, ${d.getDate()} ${months[d.getMonth()]} ${d.getFullYear()}`;
  };

  const canValidate = role === 'superadmin' || role === 'admin_distrik';
  const pendingValidasi = results.filter((r) => r.statusValidasi === 'pending').length;
  const isDistrikLevel = role === 'superadmin' || role === 'admin_distrik';
  const isKegiatanLevel = role === 'admin_kegiatan' || isDistrikLevel;
  const pendingExaminers = examiners.filter((e: any) => e.status === 'pending').length;
  const tabs = [
    { key: 'info', label: 'Info', icon: 'information-circle' as const },
    { key: 'participants', label: `Peserta (${participants.length})`, icon: 'people' as const },
    ...(isKegiatanLevel
      ? [{ key: 'ujian', label: `Ujian (${ujianList.length})`, icon: 'clipboard' as const }]
      : []),
    { key: 'evaluations', label: `Nilai (${evaluations.length})`, icon: 'school' as const },
    ...(isDistrikLevel
      ? [{ key: 'penguji', label: `Penguji (${pendingExaminers})`, icon: 'shield-checkmark' as const }]
      : []),
    ...(canValidate
      ? [{ key: 'validasi', label: `Validasi (${pendingValidasi})`, icon: 'checkmark-circle' as const }]
      : []),
  ];

  const validateResult = (candidateId: string, approved: boolean, nama: string) => {
    Alert.alert(
      approved ? 'Setujui Hasil' : 'Tolak Hasil',
      approved
        ? `Setujui hasil ${nama}? Anggota & sertifikat akan dibuat otomatis.`
        : `Tolak hasil ${nama}? Anggota tidak akan dibuat.`,
      [
        { text: 'Batal', style: 'cancel' },
        {
          text: approved ? 'Setujui' : 'Tolak',
          style: approved ? 'default' : 'destructive',
          onPress: async () => {
            setValidating(true);
            try {
              await apiClient.post(`/graduations/${id}/validate-result`, { candidateId, approved });
              const hasilRes = await apiClient.get(`/graduations/${id}/results`);
              setResults(unwrap(hasilRes) || []);
            } catch {
              /* ignore */
            }
            setValidating(false);
          },
        },
      ],
    );
  };

  const generateDocs = async () => {
    setGenDocsLoading(true);
    setGenDocsResult(null);
    try {
      const res = await apiClient.post(`/graduations/${id}/generate-docs`, {});
      setGenDocsResult(res.data?.data ?? { generated: 0, total: 0, errors: [] });
      const hasilRes = await apiClient.get(`/graduations/${id}/results`);
      setResults(unwrap(hasilRes) || []);
    } catch {
      /* ignore */
    }
    setGenDocsLoading(false);
  };

  const handleReviewExaminer = async (penugasanId: string, approved: boolean) => {
    Alert.alert(
      approved ? 'Setujui Penguji' : 'Tolak Penguji',
      approved ? 'Setujui pengajuan penguji ini?' : 'Tolak pengajuan penguji ini?',
      [
        { text: 'Batal', style: 'cancel' },
        {
          text: approved ? 'Setujui' : 'Tolak',
          style: approved ? 'default' : 'destructive',
          onPress: async () => {
            try {
              await apiClient.post(`/graduations/${id}/examiners/${penugasanId}/review`, { approved });
              const res = await apiClient.get(`/graduations/${id}/examiners`);
              setExaminers(res.data?.data || []);
            } catch { /* ignore */ }
          },
        },
      ],
    );
  };

  // ─── Ujian CRUD ─────────────────────────────────────
  const fetchScoreProgress = async () => {
    try {
      const res = await apiClient.get(`/graduations/${id}/score-progress`);
      setScoreProgress(res.data?.data || null);
    } catch { /* ignore */ }
  };

  const fetchUjianList = async () => {
    setUjianLoading(true);
    try {
      const res = await apiClient.get(`/graduations/${id}/ujian-praktek`);
      setUjianList(res.data?.data || []);
    } catch { /* ignore */ }
    setUjianLoading(false);
  };

  const fetchAvailableItems = async () => {
    try {
      const res = await apiClient.get(`/graduations/${id}/ujian-praktek/available-items`);
      setAvailableItems(res.data?.data || []);
    } catch { /* ignore */ }
  };

  const fetchAvailableExaminers = async () => {
    try {
      const res = await apiClient.get(`/graduations/${id}/ujian-praktek/available-examiners`);
      setAvailableExaminers(res.data?.data?.allPenguji || []);
    } catch { /* ignore */ }
  };

  const handleCreateUjian = async () => {
    if (!createUjianForm.nama.trim()) {
      Alert.alert('Error', 'Nama ujian harus diisi');
      return;
    }
    try {
      await apiClient.post(`/graduations/${id}/ujian-praktek`, {
        nama: createUjianForm.nama,
        deskripsi: createUjianForm.deskripsi || undefined,
        durasiMenit: createUjianForm.durasiMenit ? Number(createUjianForm.durasiMenit) : undefined,
      });
      setCreateUjianForm({ nama: '', deskripsi: '', durasiMenit: '' });
      setShowCreateUjian(false);
      fetchUjianList();
    } catch {
      Alert.alert('Error', 'Gagal membuat ujian');
    }
  };

  const handleDeleteUjian = (ujianId: string, nama: string) => {
    Alert.alert('Hapus Ujian', `Hapus ujian "${nama}"?`, [
      { text: 'Batal', style: 'cancel' },
      {
        text: 'Hapus',
        style: 'destructive',
        onPress: async () => {
          try {
            await apiClient.delete(`/graduations/${id}/ujian-praktek/${ujianId}`);
            fetchUjianList();
          } catch { /* ignore */ }
        },
      },
    ]);
  };

  const handleAssignItem = async (ujianId: string, itemPenilaianId: string) => {
    try {
      await apiClient.post(`/graduations/${id}/ujian-praktek/${ujianId}/items`, { itemPenilaianId });
      fetchUjianList();
    } catch { /* ignore */ }
  };

  const handleRemoveItem = async (ujianId: string, itemPenilaianId: string) => {
    try {
      await apiClient.delete(`/graduations/${id}/ujian-praktek/${ujianId}/items/${itemPenilaianId}`);
      fetchUjianList();
    } catch { /* ignore */ }
  };

  const handleAssignExaminer = async (ujianId: string, pengujiUserId: string) => {
    try {
      await apiClient.post(`/graduations/${id}/ujian-praktek/${ujianId}/examiners`, { pengujiUserId });
      fetchUjianList();
    } catch { /* ignore */ }
  };

  const handleRemoveExaminer = async (ujianId: string, pengujiUserId: string) => {
    try {
      await apiClient.delete(`/graduations/${id}/ujian-praktek/${ujianId}/examiners`, { data: { pengujiUserId } });
      fetchUjianList();
    } catch { /* ignore */ }
  };

  return (
    <ScreenShell title={graduation.nama} variant="detail" badgeLabel={ss.label} badgeColor={ss.color} badgeBg={ss.bg}>

      <TabBar tabs={tabs} activeKey={activeTab} onChange={(key) => setActiveTab(key as typeof activeTab)} />

      {activeTab === 'info' && (
        <View style={styles.section}>
          <View style={styles.infoCard}>
            <View style={styles.infoRow}>
              <Ionicons name="calendar" size={18} color={theme.colors.primary} />
              <View style={styles.infoContent}>
                <Text style={styles.infoLabel}>Tanggal Mulai</Text>
                <Text style={styles.infoValue}>{formatDate(graduation.tanggalMulai)}</Text>
              </View>
            </View>
            {graduation.tanggalSelesai && (
              <View style={styles.infoRow}>
                <Ionicons name="time" size={18} color={theme.colors.primary} />
                <View style={styles.infoContent}>
                  <Text style={styles.infoLabel}>Tanggal Selesai</Text>
                  <Text style={styles.infoValue}>{formatDate(graduation.tanggalSelesai)}</Text>
                </View>
              </View>
            )}
            {graduation.lokasi && (
              <View style={styles.infoRow}>
                <Ionicons name="location" size={18} color={theme.colors.primary} />
                <View style={styles.infoContent}>
                  <Text style={styles.infoLabel}>Lokasi</Text>
                  <Text style={styles.infoValue}>{graduation.lokasi}</Text>
                </View>
              </View>
            )}
            {graduation.penguji && (
              <View style={styles.infoRow}>
                <Ionicons name="person" size={18} color={theme.colors.primary} />
                <View style={styles.infoContent}>
                  <Text style={styles.infoLabel}>Penguji</Text>
                  <Text style={styles.infoValue}>{graduation.penguji.namaLengkap}</Text>
                </View>
              </View>
            )}
            <View style={styles.infoRow}>
              <Ionicons name="flag" size={18} color={theme.colors.primary} />
              <View style={styles.infoContent}>
                <Text style={styles.infoLabel}>Status</Text>
                <View style={[styles.statusBadge, { backgroundColor: ss.bg }]}>
                  <Text style={[styles.statusText, { color: ss.color }]}>{ss.label}</Text>
                </View>
              </View>
            </View>
          </View>

          {/* QR Absensi Pendadaran */}
          {graduation.status === 'published' && (
            <View style={styles.qrCard}>
              <View style={styles.qrHeader}>
                <Ionicons name="qr-code" size={18} color={theme.colors.success} />
                <Text style={styles.qrTitle}>QR Absensi Pendadaran</Text>
              </View>
              <Text style={styles.qrHint}>
                Scan QR ini untuk mencatat kehadiran (anggota yang diundang / daftar hadir)
              </Text>
              <View style={styles.qrContainer}>
                <QRCode
                  value={JSON.stringify({ id: graduation.id, type: 'graduation' })}
                  size={160}
                />
              </View>
            </View>
          )}
        </View>
      )}

      {activeTab === 'participants' && (
        <View style={styles.section}>
          {participants.length > 0 ? (
            participants.map((p) => (
              <View key={p.id} style={styles.partCard}>
                <View style={styles.partLeft}>
                  <View style={styles.partAvatar}>
                    <Text style={styles.partAvatarText}>{p.namaLengkap?.charAt(0) || '?'}</Text>
                  </View>
                  <View>
                    <Text style={styles.partName}>{p.namaLengkap || 'Unknown'}</Text>
                    {p.ranting?.nama && <Text style={styles.partNo}>{p.ranting.nama}</Text>}
                  </View>
                </View>
                <View
                  style={[
                    styles.partStatus,
                    {
                      backgroundColor:
                        p.status === 'lulus'
                          ? theme.colors.successLight
                          : p.status === 'gagal'
                            ? theme.colors.dangerLight
                            : theme.colors.primarySofter,
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.partStatusText,
                      {
                        color:
                          p.status === 'lulus'
                            ? theme.colors.success
                            : p.status === 'gagal'
                              ? theme.colors.danger
                              : theme.colors.primary,
                      },
                    ]}
                  >
                    {p.status === 'lulus' ? 'Lulus' : p.status === 'gagal' ? 'Gagal' : 'Peserta'}
                  </Text>
                </View>
              </View>
            ))
          ) : (
            <Text style={styles.emptyText}>Belum ada peserta</Text>
          )}
        </View>
      )}

      {activeTab === 'evaluations' && (
        <View style={styles.section}>
          {/* Input Nilai Button — visible for penguji, admin, and admin_kegiatan */}
          {(isPenguji || isAdmin || role === 'admin_kegiatan') && (
            <TouchableOpacity
              style={styles.inputNilaiBtn}
              activeOpacity={0.7}
              onPress={() => router.push(`/graduations/input-score?id=${graduation.id}` as any)}
            >
              <Ionicons name="create" size={20} color={theme.colors.surface} />
              <View style={{ flex: 1 }}>
                <Text style={styles.inputNilaiTitle}>Input Nilai</Text>
                <Text style={styles.inputNilaiSub}>Pilih peserta dan isi nilai ujian praktek</Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color={theme.colors.primaryLight} />
            </TouchableOpacity>
          )}

          {evaluations.length > 0 ? (
            evaluations.map((ev) => (
              <View key={ev.id} style={styles.evalCard}>
                <View style={styles.evalLeft}>
                  <View style={styles.evalAvatar}>
                    <Text style={styles.evalAvatarText}>
                      {ev.calonAnggota?.namaLengkap?.charAt(0) || '?'}
                    </Text>
                  </View>
                  <View style={styles.evalInfo}>
                    <Text style={styles.evalName}>{ev.calonAnggota?.namaLengkap || 'Unknown'}</Text>
                    {ev.itemPenilaian && (
                      <Text style={styles.evalAspek}>
                        {ev.itemPenilaian.aspek?.namaAspek || ev.itemPenilaian.namaItem}
                      </Text>
                    )}
                    {ev.komentar && (
                      <Text style={styles.evalNote} numberOfLines={2}>
                        {ev.komentar}
                      </Text>
                    )}
                  </View>
                </View>
                <View style={styles.evalScore}>
                  <Text style={styles.evalScoreText}>{Number(ev.skor)}</Text>
                </View>
              </View>
            ))
          ) : (
            <Text style={styles.emptyText}>Belum ada nilai</Text>
          )}
        </View>
      )}

      {activeTab === 'ujian' && isKegiatanLevel && (
        <View style={styles.section}>
          {/* Score Progress Indicator */}
          {scoreProgress && (
            <View style={styles.progressCard}>
              <View style={styles.progressHeader}>
                <Ionicons name="analytics" size={18} color={theme.colors.primary} />
                <Text style={styles.progressTitle}>Progress Pengisian Nilai</Text>
                <Text style={styles.progressCount}>
                  {scoreProgress.totalEntered}/{scoreProgress.totalExpectedScores}
                </Text>
              </View>
              {/* Progress bar */}
              <View style={styles.progressBarBg}>
                <View
                  style={[
                    styles.progressBarFill,
                    {
                      width: `${Math.min(scoreProgress.percentage, 100)}%`,
                      backgroundColor: scoreProgress.percentage === 100 ? theme.colors.success : scoreProgress.percentage >= 50 ? theme.colors.primary : theme.colors.warning,
                    },
                  ]}
                />
              </View>
              <View style={styles.progressFooter}>
                <Text style={styles.progressFooterText}>
                  {scoreProgress.totalParticipants} peserta × {scoreProgress.totalItems} item
                </Text>
                <Text style={styles.progressPercent}>{scoreProgress.percentage}%</Text>
              </View>
              {/* Per-penguji breakdown */}
              {scoreProgress.perPenguji && scoreProgress.perPenguji.length > 0 && (
                <View style={styles.pengujiBreakdown}>
                  <Text style={styles.pengujiBreakdownTitle}>Per Penguji:</Text>
                  {scoreProgress.perPenguji.map((p: any) => (
                    <View key={p.id} style={styles.pengujiRow}>
                      <Text style={styles.pengujiName} numberOfLines={1}>{p.nama}</Text>
                      <View style={styles.progressBarBgSmall}>
                        <View
                          style={[
                            styles.progressBarFillSmall,
                            {
                              width: `${Math.min(p.percentage, 100)}%`,
                              backgroundColor: p.percentage === 100 ? theme.colors.success : p.percentage >= 50 ? theme.colors.primary : theme.colors.warning,
                            },
                          ]}
                        />
                      </View>
                      <Text style={styles.pengujiPercent}>{p.percentage}%</Text>
                    </View>
                  ))}
                </View>
              )}
            </View>
          )}

          {/* Create Ujian Button */}
          <TouchableOpacity
            style={styles.createBtn}
            activeOpacity={0.7}
            onPress={() => {
              setShowCreateUjian(!showCreateUjian);
              if (!showCreateUjian) {
                fetchAvailableItems();
                fetchAvailableExaminers();
              }
            }}
          >
            <Ionicons name={showCreateUjian ? 'close' : 'add-circle'} size={20} color={theme.colors.surface} />
            <Text style={styles.createBtnText}>{showCreateUjian ? 'Batal' : 'Buat Ujian Baru'}</Text>
          </TouchableOpacity>

          {/* Create Ujian Form */}
          {showCreateUjian && (
            <View style={styles.createForm}>
              <Text style={styles.formLabel}>Nama Ujian *</Text>
              <TextInput
                style={styles.formInput}
                placeholder="Contoh: Ujian Praktek Pendadaran"
                value={createUjianForm.nama}
                onChangeText={(t) => setCreateUjianForm({ ...createUjianForm, nama: t })}
              />
              <Text style={styles.formLabel}>Deskripsi</Text>
              <TextInput
                style={styles.formInput}
                placeholder="Deskripsi singkat (opsional)"
                value={createUjianForm.deskripsi}
                onChangeText={(t) => setCreateUjianForm({ ...createUjianForm, deskripsi: t })}
              />
              <Text style={styles.formLabel}>Durasi (menit)</Text>
              <TextInput
                style={styles.formInput}
                placeholder="Contoh: 60"
                keyboardType="numeric"
                value={createUjianForm.durasiMenit}
                onChangeText={(t) => setCreateUjianForm({ ...createUjianForm, durasiMenit: t })}
              />
              <TouchableOpacity style={styles.submitBtn} onPress={handleCreateUjian}>
                <Text style={styles.submitBtnText}>Simpan Ujian</Text>
              </TouchableOpacity>
            </View>
          )}

          {/* Ujian List */}
          {ujianLoading ? (
            <LoadingView message="Memuat ujian..." />
          ) : ujianList.length > 0 ? (
            ujianList.map((ujian: any) => {
              const isExpanded = expandedUjian === ujian.id;
              const assignedItemIds = new Set((ujian.items || []).map((i: any) => i.itemPenilaian?.id));
              const assignedExaminerIds = new Set((ujian.penilais || []).map((p: any) => p.pengujiUser?.id));
              return (
                <View key={ujian.id} style={styles.ujianCard}>
                  <TouchableOpacity
                    style={styles.ujianHeader}
                    onPress={() => setExpandedUjian(isExpanded ? null : ujian.id)}
                  >
                    <Ionicons name="document-text" size={18} color={theme.colors.primary} />
                    <View style={{ flex: 1 }}>
                      <Text style={styles.ujianName}>{ujian.nama}</Text>
                      <Text style={styles.ujianMeta}>
                        {ujian.items?.length || 0} item | {ujian.penilais?.length || 0} penilai
                        {ujian.durasiMenit ? ` | ${ujian.durasiMenit} menit` : ''}
                      </Text>
                    </View>
                    <Ionicons name={isExpanded ? 'chevron-up' : 'chevron-down'} size={18} color={theme.colors.textMuted} />
                  </TouchableOpacity>

                  {isExpanded && (
                    <View style={styles.ujianExpanded}>
                      {/* Items section */}
                      <View style={styles.ujianSection}>
                        <Text style={styles.ujianSectionTitle}>Item Penilaian</Text>
                        {ujian.items && ujian.items.length > 0 ? (
                          ujian.items.map((item: any) => (
                            <View key={item.id} style={styles.ujianItemRow}>
                              <View style={{ flex: 1 }}>
                                <Text style={styles.ujianItemName}>{item.itemPenilaian?.namaItem || '-'}</Text>
                                <Text style={styles.ujianItemAspek}>{item.itemPenilaian?.aspek?.namaAspek || ''} | Max {Number(item.itemPenilaian?.skorMaksimal || 0)}</Text>
                              </View>
                              <TouchableOpacity onPress={() => handleRemoveItem(ujian.id, item.itemPenilaian?.id)}>
                                <Ionicons name="close-circle" size={18} color={theme.colors.danger} />
                              </TouchableOpacity>
                            </View>
                          ))
                        ) : (
                          <Text style={styles.emptyTextSmall}>Belum ada item</Text>
                        )}
                        {/* Add Item */}
                        {availableItems.filter((ai: any) => !assignedItemIds.has(ai.id)).length > 0 && (
                          <View style={styles.addSection}>
                            <Text style={styles.addSectionLabel}>Tambah Item:</Text>
                            {availableItems.filter((ai: any) => !assignedItemIds.has(ai.id)).map((item: any) => (
                              <TouchableOpacity
                                key={item.id}
                                style={styles.addItemBtn}
                                onPress={() => handleAssignItem(ujian.id, item.id)}
                              >
                                <Ionicons name="add-circle" size={16} color={theme.colors.primary} />
                                <Text style={styles.addItemText}>{item.namaItem} ({item.aspek?.namaAspek || ''})</Text>
                              </TouchableOpacity>
                            ))}
                          </View>
                        )}
                      </View>

                      {/* Penilai section */}
                      <View style={styles.ujianSection}>
                        <Text style={styles.ujianSectionTitle}>Penilai</Text>
                        {ujian.penilais && ujian.penilais.length > 0 ? (
                          ujian.penilais.map((p: any) => (
                            <View key={p.id} style={styles.ujianItemRow}>
                              <View style={{ flex: 1 }}>
                                <Text style={styles.ujianItemName}>{p.pengujiUser?.namaLengkap || '-'}</Text>
                                <Text style={styles.ujianItemAspek}>{p.pengujiUser?.email || ''}</Text>
                              </View>
                              <TouchableOpacity onPress={() => handleRemoveExaminer(ujian.id, p.pengujiUser?.id)}>
                                <Ionicons name="close-circle" size={18} color={theme.colors.danger} />
                              </TouchableOpacity>
                            </View>
                          ))
                        ) : (
                          <Text style={styles.emptyTextSmall}>Belum ada penilai</Text>
                        )}
                        {/* Add Examiner */}
                        {availableExaminers.filter((ae: any) => !assignedExaminerIds.has(ae.id)).length > 0 && (
                          <View style={styles.addSection}>
                            <Text style={styles.addSectionLabel}>Tambah Penilai:</Text>
                            {availableExaminers.filter((ae: any) => !assignedExaminerIds.has(ae.id)).map((ex: any) => (
                              <TouchableOpacity
                                key={ex.id}
                                style={styles.addItemBtn}
                                onPress={() => handleAssignExaminer(ujian.id, ex.id)}
                              >
                                <Ionicons name="add-circle" size={16} color={theme.colors.primary} />
                                <Text style={styles.addItemText}>{ex.namaLengkap} ({ex.email || ''})</Text>
                              </TouchableOpacity>
                            ))}
                          </View>
                        )}
                      </View>

                      {/* Delete button */}
                      <TouchableOpacity
                        style={styles.deleteUjianBtn}
                        onPress={() => handleDeleteUjian(ujian.id, ujian.nama)}
                      >
                        <Ionicons name="trash" size={16} color={theme.colors.danger} />
                        <Text style={styles.deleteUjianText}>Hapus Ujian</Text>
                      </TouchableOpacity>
                    </View>
                  )}
                </View>
              );
            })
          ) : (
            <Text style={styles.emptyText}>Belum ada ujian praktek</Text>
          )}
        </View>
      )}

      {activeTab === 'penguji' && isDistrikLevel && (
        <View style={styles.section}>
          {examinersLoading ? (
            <LoadingView message="Memuat penguji..." />
          ) : examiners.length > 0 ? (
            examiners.map((ex: any) => (
              <View key={ex.id} style={styles.examinerCard}>
                <View style={styles.examinerLeft}>
                  <View style={styles.examinerAvatar}>
                    <Text style={styles.examinerAvatarText}>{ex.pengujiUser?.namaLengkap?.charAt(0) || '?'}</Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.examinerName}>{ex.pengujiUser?.namaLengkap || 'Unknown'}</Text>
                    <Text style={styles.examinerMeta}>{ex.pengujiUser?.email || ''}</Text>
                    {ex.catatan && <Text style={styles.examinerNote}>{ex.catatan}</Text>}
                  </View>
                </View>
                <View style={[
                  styles.examinerStatusBadge,
                  { backgroundColor: ex.status === 'approved' ? theme.colors.successLight : ex.status === 'rejected' ? theme.colors.dangerLight : theme.colors.warningLight }
                ]}>
                  <Text style={[
                    styles.examinerStatusText,
                    { color: ex.status === 'approved' ? theme.colors.success : ex.status === 'rejected' ? theme.colors.danger : theme.colors.warning }
                  ]}>
                    {ex.status === 'approved' ? 'Disetujui' : ex.status === 'rejected' ? 'Ditolak' : 'Menunggu'}
                  </Text>
                </View>
                {ex.status === 'pending' && isDistrikLevel && (
                  <View style={styles.examinerActions}>
                    <TouchableOpacity
                      style={[styles.examinerActionBtn, styles.approveBtn]}
                      onPress={() => handleReviewExaminer(ex.id, true)}
                    >
                      <Text style={styles.approveText}>Setujui</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.examinerActionBtn, styles.rejectBtn]}
                      onPress={() => handleReviewExaminer(ex.id, false)}
                    >
                      <Text style={styles.rejectText}>Tolak</Text>
                    </TouchableOpacity>
                  </View>
                )}
              </View>
            ))
          ) : (
            <Text style={styles.emptyText}>Belum ada pengajuan penguji</Text>
          )}
        </View>
      )}

      {activeTab === 'validasi' && canValidate && (
        <View style={styles.section}>
          <TouchableOpacity
            style={styles.genDocsBtn}
            activeOpacity={0.7}
            onPress={generateDocs}
            disabled={genDocsLoading}
          >
            <Ionicons name="document-text" size={18} color={theme.colors.surface} />
            <View style={{ flex: 1 }}>
              <Text style={styles.genDocsTitle}>
                {genDocsLoading ? 'Mengenerate...' : 'Generate Sertifikat'}
              </Text>
              <Text style={styles.genDocsSub}>
                Buat sertifikat untuk semua hasil lulus + disetujui
              </Text>
            </View>
          </TouchableOpacity>

          {genDocsResult && (
            <View style={styles.genDocsResult}>
              <Text style={styles.genDocsResultText}>
                {genDocsResult.generated} dari {genDocsResult.total} sertifikat berhasil dibuat
              </Text>
              {genDocsResult.errors.length > 0 && (
                <Text style={styles.genDocsResultError}>
                  {genDocsResult.errors.length} error:{' '}
                  {genDocsResult.errors.slice(0, 2).join('; ')}
                </Text>
              )}
            </View>
          )}

          {results.length > 0 ? (
            results.map((r) => (
              <View key={r.id} style={styles.resultCard}>
                <View style={styles.resultLeft}>
                  <Text style={styles.resultName}>
                    {r.calonAnggota?.namaLengkap || 'Unknown'}
                  </Text>
                  <Text style={styles.resultMeta}>
                    {r.calonAnggota?.ranting?.nama || '-'} · Skor {Number(r.totalSkor)} · Rank{' '}
                    {r.ranking ?? '-'}
                  </Text>
                  <View style={styles.resultBadges}>
                    <Text
                      style={[
                        styles.resultBadge,
                        r.statusKelulusan === 'lulus' ? styles.badgeLulus : styles.badgeGagal,
                      ]}
                    >
                      {r.statusKelulusan === 'lulus' ? 'Lulus' : 'Gagal'}
                    </Text>
                    <Text
                      style={[
                        styles.resultBadge,
                        r.statusValidasi === 'approved'
                          ? styles.badgeApproved
                          : r.statusValidasi === 'rejected'
                            ? styles.badgeRejected
                            : styles.badgePending,
                      ]}
                    >
                      {r.statusValidasi === 'approved'
                        ? 'Disetujui'
                        : r.statusValidasi === 'rejected'
                          ? 'Ditolak'
                          : 'Menunggu'}
                    </Text>
                  </View>
                </View>
                {r.statusValidasi === 'pending' && (
                  <View style={styles.resultActions}>
                    <TouchableOpacity
                      style={[styles.actionBtn, styles.approveBtn]}
                      disabled={validating}
                      onPress={() =>
                        validateResult(r.calonAnggotaId, true, r.calonAnggota?.namaLengkap || '')
                      }
                    >
                      <Text style={styles.approveText}>Setujui</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.actionBtn, styles.rejectBtn]}
                      disabled={validating}
                      onPress={() =>
                        validateResult(r.calonAnggotaId, false, r.calonAnggota?.namaLengkap || '')
                      }
                    >
                      <Text style={styles.rejectText}>Tolak</Text>
                    </TouchableOpacity>
                  </View>
                )}
              </View>
            ))
          ) : (
            <Text style={styles.emptyText}>Belum ada hasil pendadaran</Text>
          )}
        </View>
      )}

    </ScreenShell>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: theme.colors.surfaceMuted },
  errorText: { fontSize: 14, color: theme.colors.danger },

  // Tabs removed — using shared TabBar component

  section: { padding: 16 },

  infoCard: {
    backgroundColor: theme.colors.surface,
    borderRadius: 14,
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
  infoValue: { fontSize: 14, fontWeight: '500', color: theme.colors.text },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 8,
    alignSelf: 'flex-start',
  },
  statusText: { fontSize: 11, fontWeight: '600' },

  // QR Absensi
  qrCard: {
    backgroundColor: theme.colors.surface,
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: theme.colors.border,
    alignItems: 'center',
    marginTop: 16,
  },
  qrHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, alignSelf: 'flex-start', marginBottom: 6 },
  qrTitle: { fontSize: 15, fontWeight: '600', color: theme.colors.text },
  qrHint: { fontSize: 12, color: theme.colors.textSecondary, textAlign: 'center', marginBottom: 16 },
  qrContainer: {
    padding: 12,
    backgroundColor: theme.colors.surfaceMuted,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },

  partCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: theme.colors.surface,
    borderRadius: 12,
    padding: 14,
    marginBottom: 6,
    borderWidth: 1,
    borderColor: theme.colors.surfaceMuted,
  },
  partLeft: { flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1 },
  partAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: theme.colors.primarySofter,
    alignItems: 'center',
    justifyContent: 'center',
  },
  partAvatarText: { fontSize: 14, fontWeight: '700', color: theme.colors.primary },
  partName: { fontSize: 14, fontWeight: '500', color: theme.colors.text },
  partNo: { fontSize: 11, color: theme.colors.textSecondary, marginTop: 2 },
  partStatus: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  partStatusText: { fontSize: 11, fontWeight: '600' },

  evalCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: theme.colors.surface,
    borderRadius: 12,
    padding: 14,
    marginBottom: 6,
    borderWidth: 1,
    borderColor: theme.colors.surfaceMuted,
  },
  evalLeft: { flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1 },
  evalAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: theme.colors.primarySofter,
    alignItems: 'center',
    justifyContent: 'center',
  },
  evalAvatarText: { fontSize: 14, fontWeight: '700', color: theme.colors.primary },
  evalInfo: { flex: 1 },
  evalName: { fontSize: 14, fontWeight: '500', color: theme.colors.text },
  evalAspek: { fontSize: 11, color: theme.colors.textSecondary, marginTop: 2 },
  evalNote: { fontSize: 11, color: theme.colors.textMuted, marginTop: 2 },
  evalScore: {
    backgroundColor: theme.colors.primarySofter,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 10,
  },
  evalScoreText: { fontSize: 16, fontWeight: '700', color: theme.colors.primary },

  emptyText: { fontSize: 13, color: theme.colors.textMuted, textAlign: 'center', paddingVertical: 30 },

  // Ujian CRUD
  createBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.primary,
    borderRadius: 12,
    padding: 14,
    marginBottom: 12,
    gap: 8,
    shadowColor: theme.colors.primary,
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 4,
  },
  createBtnText: { color: theme.colors.surface, fontSize: 14, fontWeight: '700' },
  createForm: {
    backgroundColor: theme.colors.surface,
    borderRadius: 14,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  formLabel: { fontSize: 12, fontWeight: '600', color: theme.colors.textSecondary, marginBottom: 4, marginTop: 8 },
  formInput: {
    backgroundColor: theme.colors.surfaceMuted,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: theme.colors.border,
    padding: 12,
    fontSize: 14,
    color: theme.colors.text,
  },
  submitBtn: {
    backgroundColor: theme.colors.success,
    borderRadius: 10,
    padding: 12,
    alignItems: 'center',
    marginTop: 12,
  },
  submitBtnText: { color: theme.colors.surface, fontSize: 14, fontWeight: '600' },
  ujianExpanded: { paddingTop: 12, borderTopWidth: 1, borderTopColor: theme.colors.surfaceMuted },
  ujianSection: { marginTop: 12 },
  ujianSectionTitle: { fontSize: 13, fontWeight: '600', color: theme.colors.textSecondary, marginBottom: 8 },
  ujianItemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 8,
    paddingHorizontal: 10,
    backgroundColor: theme.colors.surfaceMuted,
    borderRadius: 8,
    marginBottom: 4,
  },
  emptyTextSmall: { fontSize: 12, color: theme.colors.textMuted, textAlign: 'center', paddingVertical: 12 },
  // Score Progress
  progressCard: {
    backgroundColor: theme.colors.surface,
    borderRadius: 14,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  progressHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 10 },
  progressTitle: { flex: 1, fontSize: 14, fontWeight: '600', color: theme.colors.text },
  progressCount: { fontSize: 12, fontWeight: '600', color: theme.colors.textSecondary },
  progressBarBg: { height: 8, backgroundColor: theme.colors.surfaceMuted, borderRadius: 4, marginBottom: 6 },
  progressBarFill: { height: 8, borderRadius: 4 },
  progressFooter: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  progressFooterText: { fontSize: 11, color: theme.colors.textMuted },
  progressPercent: { fontSize: 12, fontWeight: '700', color: theme.colors.textSecondary },
  pengujiBreakdown: { marginTop: 8, paddingTop: 8, borderTopWidth: 1, borderTopColor: theme.colors.surfaceMuted },
  pengujiBreakdownTitle: { fontSize: 12, fontWeight: '600', color: theme.colors.textSecondary, marginBottom: 6 },
  pengujiRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 6 },
  pengujiName: { width: 80, fontSize: 11, color: theme.colors.textSecondary },
  progressBarBgSmall: { flex: 1, height: 4, backgroundColor: theme.colors.surfaceMuted, borderRadius: 2 },
  progressBarFillSmall: { height: 4, borderRadius: 2 },
  pengujiPercent: { width: 35, fontSize: 10, color: theme.colors.textSecondary, textAlign: 'right' },
  addSection: { marginTop: 10, paddingTop: 10, borderTopWidth: 1, borderTopColor: theme.colors.surfaceMuted },
  addSectionLabel: { fontSize: 12, fontWeight: '600', color: theme.colors.textSecondary, marginBottom: 6 },
  addItemBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 8,
    paddingHorizontal: 10,
    backgroundColor: theme.colors.primarySofter,
    borderRadius: 8,
    marginBottom: 4,
  },
  addItemText: { fontSize: 12, color: theme.colors.primary, fontWeight: '500' },
  deleteUjianBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 10,
    paddingHorizontal: 14,
    backgroundColor: theme.colors.dangerLight,
    borderRadius: 10,
    marginTop: 12,
    borderWidth: 1,
    borderColor: theme.colors.dangerLight,
  },
  deleteUjianText: { fontSize: 12, fontWeight: '600', color: theme.colors.danger },
  // Ujian Praktek
  ujianCard: {
    backgroundColor: theme.colors.surface,
    borderRadius: 14,
    padding: 14,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  ujianHeader: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  ujianName: { fontSize: 14, fontWeight: '600', color: theme.colors.text },
  ujianMeta: { fontSize: 11, color: theme.colors.textSecondary, marginTop: 2 },
  ujianItems: { marginTop: 10, paddingTop: 10, borderTopWidth: 1, borderTopColor: theme.colors.surfaceMuted },
  ujianItem: { paddingVertical: 6 },
  ujianItemName: { fontSize: 13, fontWeight: '500', color: theme.colors.textSecondary },
  ujianItemAspek: { fontSize: 11, color: theme.colors.textMuted, marginTop: 1 },

  // Penguji
  examinerCard: {
    backgroundColor: theme.colors.surface,
    borderRadius: 14,
    padding: 14,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: theme.colors.border,
    gap: 10,
  },
  examinerLeft: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  examinerAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: theme.colors.primarySofter,
    alignItems: 'center',
    justifyContent: 'center',
  },
  examinerAvatarText: { fontSize: 16, fontWeight: '700', color: theme.colors.primary },
  examinerName: { fontSize: 14, fontWeight: '600', color: theme.colors.text },
  examinerMeta: { fontSize: 11, color: theme.colors.textSecondary, marginTop: 2 },
  examinerNote: { fontSize: 11, color: theme.colors.textMuted, marginTop: 4, fontStyle: 'italic' },
  examinerStatusBadge: { alignSelf: 'flex-start', paddingHorizontal: 10, paddingVertical: 3, borderRadius: 8 },
  examinerStatusText: { fontSize: 11, fontWeight: '600' },
  examinerActions: { flexDirection: 'row', gap: 8 },
  examinerActionBtn: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 8 },


  // Input Nilai Button
  inputNilaiBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.primary,
    borderRadius: 14,
    padding: 16,
    marginBottom: 16,
    gap: 12,
    shadowColor: theme.colors.primary,
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 4,
  },
  inputNilaiTitle: { color: theme.colors.surface, fontSize: 15, fontWeight: '700' },
  inputNilaiSub: { color: theme.colors.headerSub, fontSize: 12, marginTop: 2 },

  // Validasi Hasil
  genDocsBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.success,
    borderRadius: 14,
    padding: 16,
    marginBottom: 16,
    gap: 12,
    shadowColor: theme.colors.success,
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 4,
  },
  genDocsTitle: { color: theme.colors.surface, fontSize: 15, fontWeight: '700' },
  genDocsSub: { color: theme.colors.successLight, fontSize: 12, marginTop: 2 },
  genDocsResult: {
    backgroundColor: theme.colors.successLight,
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: theme.colors.successLight,
  },
  genDocsResultText: { fontSize: 13, fontWeight: '600', color: theme.colors.success },
  genDocsResultError: { fontSize: 11, color: theme.colors.danger, marginTop: 4 },
  resultCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: theme.colors.surface,
    borderRadius: 12,
    padding: 14,
    marginBottom: 6,
    borderWidth: 1,
    borderColor: theme.colors.surfaceMuted,
    gap: 8,
  },
  resultLeft: { flex: 1, minWidth: 0 },
  resultName: { fontSize: 14, fontWeight: '500', color: theme.colors.text },
  resultMeta: { fontSize: 11, color: theme.colors.textSecondary, marginTop: 2 },
  resultBadges: { flexDirection: 'row', gap: 6, marginTop: 6 },
  resultBadge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6, fontSize: 10, fontWeight: '600' },
  badgeLulus: { backgroundColor: theme.colors.successLight, color: theme.colors.success },
  badgeGagal: { backgroundColor: theme.colors.dangerLight, color: theme.colors.danger },
  badgeApproved: { backgroundColor: theme.colors.successLight, color: theme.colors.success },
  badgeRejected: { backgroundColor: theme.colors.dangerLight, color: theme.colors.danger },
  badgePending: { backgroundColor: theme.colors.warningLight, color: theme.colors.warning },
  resultActions: { flexDirection: 'row', gap: 6, flexShrink: 0 },
  actionBtn: { paddingHorizontal: 12, paddingVertical: 7, borderRadius: 8 },
  approveBtn: { backgroundColor: theme.colors.success },
  rejectBtn: { backgroundColor: theme.colors.surface, borderWidth: 1, borderColor: theme.colors.dangerLight },
  approveText: { fontSize: 12, fontWeight: '600', color: theme.colors.surface },
  rejectText: { fontSize: 12, fontWeight: '600', color: theme.colors.danger },
});

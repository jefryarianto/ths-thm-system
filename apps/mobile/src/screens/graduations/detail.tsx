import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert, TextInput } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useLocalSearchParams, router } from 'expo-router';
import QRCode from 'react-native-qrcode-svg';
import apiClient, { unwrap } from '../../lib/api-client';
import { LoadingView, ScreenShell, TabBar } from '../../components/ui/shared';
import { useRole } from '../../hooks/use-role';
import type { Graduation, GraduationParticipant, GraduationEvaluation, GraduationResult } from '../../types';

const STATUS_STYLES: Record<string, { label: string; color: string; bg: string }> = {
  draft: { label: 'Draft', color: '#6b7280', bg: '#f3f4f6' },
  published: { label: 'Berlangsung', color: '#16a34a', bg: '#ecfdf5' },
  closed: { label: 'Selesai', color: '#2563eb', bg: '#eff6ff' },
  cancelled: { label: 'Dibatalkan', color: '#dc2626', bg: '#fef2f2' },
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
    color: '#6b7280',
    bg: '#f3f4f6',
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
              <Ionicons name="calendar" size={18} color="#2563eb" />
              <View style={styles.infoContent}>
                <Text style={styles.infoLabel}>Tanggal Mulai</Text>
                <Text style={styles.infoValue}>{formatDate(graduation.tanggalMulai)}</Text>
              </View>
            </View>
            {graduation.tanggalSelesai && (
              <View style={styles.infoRow}>
                <Ionicons name="time" size={18} color="#2563eb" />
                <View style={styles.infoContent}>
                  <Text style={styles.infoLabel}>Tanggal Selesai</Text>
                  <Text style={styles.infoValue}>{formatDate(graduation.tanggalSelesai)}</Text>
                </View>
              </View>
            )}
            {graduation.lokasi && (
              <View style={styles.infoRow}>
                <Ionicons name="location" size={18} color="#2563eb" />
                <View style={styles.infoContent}>
                  <Text style={styles.infoLabel}>Lokasi</Text>
                  <Text style={styles.infoValue}>{graduation.lokasi}</Text>
                </View>
              </View>
            )}
            {graduation.penguji && (
              <View style={styles.infoRow}>
                <Ionicons name="person" size={18} color="#2563eb" />
                <View style={styles.infoContent}>
                  <Text style={styles.infoLabel}>Penguji</Text>
                  <Text style={styles.infoValue}>{graduation.penguji.namaLengkap}</Text>
                </View>
              </View>
            )}
            <View style={styles.infoRow}>
              <Ionicons name="flag" size={18} color="#2563eb" />
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
                <Ionicons name="qr-code" size={18} color="#059669" />
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
                          ? '#ecfdf5'
                          : p.status === 'gagal'
                            ? '#fef2f2'
                            : '#eff6ff',
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.partStatusText,
                      {
                        color:
                          p.status === 'lulus'
                            ? '#16a34a'
                            : p.status === 'gagal'
                              ? '#dc2626'
                              : '#2563eb',
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
              <Ionicons name="create" size={20} color="#fff" />
              <View style={{ flex: 1 }}>
                <Text style={styles.inputNilaiTitle}>Input Nilai</Text>
                <Text style={styles.inputNilaiSub}>Pilih peserta dan isi nilai ujian praktek</Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color="#93c5fd" />
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
            <Ionicons name={showCreateUjian ? 'close' : 'add-circle'} size={20} color="#fff" />
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
                    <Ionicons name="document-text" size={18} color="#2563eb" />
                    <View style={{ flex: 1 }}>
                      <Text style={styles.ujianName}>{ujian.nama}</Text>
                      <Text style={styles.ujianMeta}>
                        {ujian.items?.length || 0} item | {ujian.penilais?.length || 0} penilai
                        {ujian.durasiMenit ? ` | ${ujian.durasiMenit} menit` : ''}
                      </Text>
                    </View>
                    <Ionicons name={isExpanded ? 'chevron-up' : 'chevron-down'} size={18} color="#9ca3af" />
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
                                <Ionicons name="close-circle" size={18} color="#dc2626" />
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
                                <Ionicons name="add-circle" size={16} color="#2563eb" />
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
                                <Ionicons name="close-circle" size={18} color="#dc2626" />
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
                                <Ionicons name="add-circle" size={16} color="#2563eb" />
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
                        <Ionicons name="trash" size={16} color="#dc2626" />
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
                  { backgroundColor: ex.status === 'approved' ? '#ecfdf5' : ex.status === 'rejected' ? '#fef2f2' : '#fffbeb' }
                ]}>
                  <Text style={[
                    styles.examinerStatusText,
                    { color: ex.status === 'approved' ? '#16a34a' : ex.status === 'rejected' ? '#dc2626' : '#d97706' }
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
            <Ionicons name="document-text" size={18} color="#fff" />
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
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#f3f4f6' },
  errorText: { fontSize: 14, color: '#ef4444' },

  // Tabs removed — using shared TabBar component

  section: { padding: 16 },

  infoCard: {
    backgroundColor: '#fff',
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  infoContent: { flex: 1 },
  infoLabel: { fontSize: 11, color: '#9ca3af', marginBottom: 2 },
  infoValue: { fontSize: 14, fontWeight: '500', color: '#111827' },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 8,
    alignSelf: 'flex-start',
  },
  statusText: { fontSize: 11, fontWeight: '600' },

  // QR Absensi
  qrCard: {
    backgroundColor: '#fff',
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    alignItems: 'center',
    marginTop: 16,
  },
  qrHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, alignSelf: 'flex-start', marginBottom: 6 },
  qrTitle: { fontSize: 15, fontWeight: '600', color: '#111827' },
  qrHint: { fontSize: 12, color: '#6b7280', textAlign: 'center', marginBottom: 16 },
  qrContainer: {
    padding: 12,
    backgroundColor: '#f9fafb',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },

  partCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 14,
    marginBottom: 6,
    borderWidth: 1,
    borderColor: '#f3f4f6',
  },
  partLeft: { flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1 },
  partAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#eff6ff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  partAvatarText: { fontSize: 14, fontWeight: '700', color: '#2563eb' },
  partName: { fontSize: 14, fontWeight: '500', color: '#111827' },
  partNo: { fontSize: 11, color: '#6b7280', marginTop: 2 },
  partStatus: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  partStatusText: { fontSize: 11, fontWeight: '600' },

  evalCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 14,
    marginBottom: 6,
    borderWidth: 1,
    borderColor: '#f3f4f6',
  },
  evalLeft: { flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1 },
  evalAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#eff6ff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  evalAvatarText: { fontSize: 14, fontWeight: '700', color: '#2563eb' },
  evalInfo: { flex: 1 },
  evalName: { fontSize: 14, fontWeight: '500', color: '#111827' },
  evalAspek: { fontSize: 11, color: '#6b7280', marginTop: 2 },
  evalNote: { fontSize: 11, color: '#9ca3af', marginTop: 2 },
  evalScore: {
    backgroundColor: '#eff6ff',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 10,
  },
  evalScoreText: { fontSize: 16, fontWeight: '700', color: '#2563eb' },

  emptyText: { fontSize: 13, color: '#9ca3af', textAlign: 'center', paddingVertical: 30 },

  // Ujian CRUD
  createBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#2563eb',
    borderRadius: 12,
    padding: 14,
    marginBottom: 12,
    gap: 8,
    shadowColor: '#2563eb',
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 4,
  },
  createBtnText: { color: '#fff', fontSize: 14, fontWeight: '700' },
  createForm: {
    backgroundColor: '#fff',
    borderRadius: 14,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  formLabel: { fontSize: 12, fontWeight: '600', color: '#374151', marginBottom: 4, marginTop: 8 },
  formInput: {
    backgroundColor: '#f9fafb',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    padding: 12,
    fontSize: 14,
    color: '#111827',
  },
  submitBtn: {
    backgroundColor: '#059669',
    borderRadius: 10,
    padding: 12,
    alignItems: 'center',
    marginTop: 12,
  },
  submitBtnText: { color: '#fff', fontSize: 14, fontWeight: '600' },
  ujianExpanded: { paddingTop: 12, borderTopWidth: 1, borderTopColor: '#f3f4f6' },
  ujianSection: { marginTop: 12 },
  ujianSectionTitle: { fontSize: 13, fontWeight: '600', color: '#374151', marginBottom: 8 },
  ujianItemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 8,
    paddingHorizontal: 10,
    backgroundColor: '#f9fafb',
    borderRadius: 8,
    marginBottom: 4,
  },
  emptyTextSmall: { fontSize: 12, color: '#9ca3af', textAlign: 'center', paddingVertical: 12 },
  addSection: { marginTop: 10, paddingTop: 10, borderTopWidth: 1, borderTopColor: '#f3f4f6' },
  addSectionLabel: { fontSize: 12, fontWeight: '600', color: '#374151', marginBottom: 6 },
  addItemBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 8,
    paddingHorizontal: 10,
    backgroundColor: '#eff6ff',
    borderRadius: 8,
    marginBottom: 4,
  },
  addItemText: { fontSize: 12, color: '#2563eb', fontWeight: '500' },
  deleteUjianBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 10,
    paddingHorizontal: 14,
    backgroundColor: '#fef2f2',
    borderRadius: 10,
    marginTop: 12,
    borderWidth: 1,
    borderColor: '#fecaca',
  },
  deleteUjianText: { fontSize: 12, fontWeight: '600', color: '#dc2626' },
  // Ujian Praktek
  ujianCard: {
    backgroundColor: '#fff',
    borderRadius: 14,
    padding: 14,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  ujianHeader: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  ujianName: { fontSize: 14, fontWeight: '600', color: '#111827' },
  ujianMeta: { fontSize: 11, color: '#6b7280', marginTop: 2 },
  ujianItems: { marginTop: 10, paddingTop: 10, borderTopWidth: 1, borderTopColor: '#f3f4f6' },
  ujianItem: { paddingVertical: 6 },
  ujianItemName: { fontSize: 13, fontWeight: '500', color: '#374151' },
  ujianItemAspek: { fontSize: 11, color: '#9ca3af', marginTop: 1 },

  // Penguji
  examinerCard: {
    backgroundColor: '#fff',
    borderRadius: 14,
    padding: 14,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    gap: 10,
  },
  examinerLeft: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  examinerAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#eff6ff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  examinerAvatarText: { fontSize: 16, fontWeight: '700', color: '#2563eb' },
  examinerName: { fontSize: 14, fontWeight: '600', color: '#111827' },
  examinerMeta: { fontSize: 11, color: '#6b7280', marginTop: 2 },
  examinerNote: { fontSize: 11, color: '#9ca3af', marginTop: 4, fontStyle: 'italic' },
  examinerStatusBadge: { alignSelf: 'flex-start', paddingHorizontal: 10, paddingVertical: 3, borderRadius: 8 },
  examinerStatusText: { fontSize: 11, fontWeight: '600' },
  examinerActions: { flexDirection: 'row', gap: 8 },
  examinerActionBtn: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 8 },


  // Input Nilai Button
  inputNilaiBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#2563eb',
    borderRadius: 14,
    padding: 16,
    marginBottom: 16,
    gap: 12,
    shadowColor: '#2563eb',
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 4,
  },
  inputNilaiTitle: { color: '#fff', fontSize: 15, fontWeight: '700' },
  inputNilaiSub: { color: '#bfdbfe', fontSize: 12, marginTop: 2 },

  // Validasi Hasil
  genDocsBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#059669',
    borderRadius: 14,
    padding: 16,
    marginBottom: 16,
    gap: 12,
    shadowColor: '#059669',
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 4,
  },
  genDocsTitle: { color: '#fff', fontSize: 15, fontWeight: '700' },
  genDocsSub: { color: '#a7f3d0', fontSize: 12, marginTop: 2 },
  genDocsResult: {
    backgroundColor: '#ecfdf5',
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#a7f3d0',
  },
  genDocsResultText: { fontSize: 13, fontWeight: '600', color: '#047857' },
  genDocsResultError: { fontSize: 11, color: '#dc2626', marginTop: 4 },
  resultCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 14,
    marginBottom: 6,
    borderWidth: 1,
    borderColor: '#f3f4f6',
    gap: 8,
  },
  resultLeft: { flex: 1, minWidth: 0 },
  resultName: { fontSize: 14, fontWeight: '500', color: '#111827' },
  resultMeta: { fontSize: 11, color: '#6b7280', marginTop: 2 },
  resultBadges: { flexDirection: 'row', gap: 6, marginTop: 6 },
  resultBadge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6, fontSize: 10, fontWeight: '600' },
  badgeLulus: { backgroundColor: '#ecfdf5', color: '#16a34a' },
  badgeGagal: { backgroundColor: '#fef2f2', color: '#dc2626' },
  badgeApproved: { backgroundColor: '#ecfdf5', color: '#16a34a' },
  badgeRejected: { backgroundColor: '#fef2f2', color: '#dc2626' },
  badgePending: { backgroundColor: '#fffbeb', color: '#d97706' },
  resultActions: { flexDirection: 'row', gap: 6, flexShrink: 0 },
  actionBtn: { paddingHorizontal: 12, paddingVertical: 7, borderRadius: 8 },
  approveBtn: { backgroundColor: '#059669' },
  rejectBtn: { backgroundColor: '#fff', borderWidth: 1, borderColor: '#fca5a5' },
  approveText: { fontSize: 12, fontWeight: '600', color: '#fff' },
  rejectText: { fontSize: 12, fontWeight: '600', color: '#dc2626' },
});

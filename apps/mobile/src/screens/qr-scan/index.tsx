import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  ScrollView,
  Modal,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Ionicons from '@expo/vector-icons/Ionicons';
import { CameraView, useCameraPermissions } from 'expo-camera';
import apiClient from '../../lib/api-client';

interface KegiatanItem {
  id: string;
  nama: string;
  lokasi?: string;
  tanggalMulai: string;
  type: 'activity' | 'training' | 'graduation';
}

interface ScanHistoryItem {
  id: string;
  timestamp: string;
  type: 'document_verify' | 'check_in' | 'check_out' | 'member_lookup';
  result: string;
  detail?: string;
}

export default function QRScanScreen() {
  const [scanMode, setScanMode] = useState<'verify' | 'checkin' | 'lookup'>('verify');
  const [scanning, setScanning] = useState(false);
  const [scanResult, setScanResult] = useState<any>(null);
  const [history, setHistory] = useState<ScanHistoryItem[]>([]);
  const [kegiatanList, setKegiatanList] = useState<KegiatanItem[]>([]);
  const [selectedKegiatanId, setSelectedKegiatanId] = useState<string | null>(null);
  const [loadingKegiatan, setLoadingKegiatan] = useState(true);
  const [showKegiatanPicker, setShowKegiatanPicker] = useState(false);

  // Camera state
  const [permission, requestPermission] = useCameraPermissions();
  const [cameraActive, setCameraActive] = useState(false);
  const [scannedLocked, setScannedLocked] = useState(false);

  // Refs for stable callbacks (avoid stale closures)
  const scanModeRef = useRef(scanMode);
  const selectedKegiatanIdRef = useRef(selectedKegiatanId);
  const kegiatanListRef = useRef(kegiatanList);
  const historyRef = useRef(history);

  useEffect(() => { scanModeRef.current = scanMode; }, [scanMode]);
  useEffect(() => { selectedKegiatanIdRef.current = selectedKegiatanId; }, [selectedKegiatanId]);
  useEffect(() => { kegiatanListRef.current = kegiatanList; }, [kegiatanList]);
  useEffect(() => { historyRef.current = history; }, [history]);

  useEffect(() => {
    loadHistory();
    fetchActiveKegiatan();
  }, []);

  // ─── Load scan history from AsyncStorage ───
  const loadHistory = async () => {
    try {
      const stored = await AsyncStorage.getItem('scanHistory');
      if (stored) setHistory(JSON.parse(stored));
    } catch { /* ignore */ }
  };

  const saveHistory = async (item: ScanHistoryItem) => {
    try {
      const updated = [item, ...historyRef.current].slice(0, 50);
      await AsyncStorage.setItem('scanHistory', JSON.stringify(updated));
      setHistory(updated);
    } catch { /* ignore */ }
  };

  const clearHistory = async () => {
    try { await AsyncStorage.removeItem('scanHistory'); } catch { /* ignore */ }
    setHistory([]);
  };

  // ─── Fetch active activities, trainings and pendadaran ───
  const fetchActiveKegiatan = async () => {
    setLoadingKegiatan(true);
    try {
      const [actRes, trainRes, gradRes] = await Promise.all([
        apiClient.get('/activities', { params: { status: 'published', limit: 20 } }),
        apiClient.get('/trainings', { params: { limit: 20 } }),
        apiClient.get('/graduations', { params: { status: 'published', limit: 20 } }),
      ]);

      const activities: KegiatanItem[] = (actRes.data?.data || []).map((a: any) => ({
        id: a.id,
        nama: `📅 ${a.nama || 'Kegiatan'}`,
        lokasi: a.lokasi,
        tanggalMulai: a.tanggalMulai,
        type: 'activity' as const,
      }));

      const trainings: KegiatanItem[] = (trainRes.data?.data || []).map((t: any) => ({
        id: t.id,
        nama: `🥋 ${t.jenisMateri || t.nama || 'Latihan'}`,
        lokasi: t.lokasi,
        tanggalMulai: t.hariTanggal || t.tanggalMulai,
        type: 'training' as const,
      }));

      const graduations: KegiatanItem[] = (gradRes.data?.data || []).map((g: any) => ({
        id: g.id,
        nama: `🎓 ${g.nama || 'Pendadaran'}`,
        lokasi: g.lokasi,
        tanggalMulai: g.tanggalMulai,
        type: 'graduation' as const,
      }));

      const merged = [...activities, ...trainings, ...graduations];
      setKegiatanList(merged);

      // Auto-select first if only one
      if (merged.length > 0 && !selectedKegiatanId) {
        setSelectedKegiatanId(merged[0].id);
      } else if (merged.length === 0) {
        setSelectedKegiatanId(null);
      } else if (selectedKegiatanId && !merged.find(k => k.id === selectedKegiatanId)) {
        setSelectedKegiatanId(merged[0].id);
      }
    } catch { /* ignore */ }
    setLoadingKegiatan(false);
  };

  // ─── Get selected kegiatan object ───
  const selectedKegiatan = kegiatanList.find(k => k.id === selectedKegiatanId) || null;

  // ─── Switch mode and refetch if checkin ───
  const handleModeSwitch = (mode: 'verify' | 'checkin' | 'lookup') => {
    setScanMode(mode);
    setScanResult(null);
    setCameraActive(false);
    setScannedLocked(false);
    if (mode === 'checkin') fetchActiveKegiatan();
  };

  // ─── Process scanned QR data ───
  const processScannedData = useCallback(
    async (data: string) => {
      if (scannedLocked) return;
      setScannedLocked(true);
      setScanning(true);
      setScanResult(null);

      try {
        const mode = scanModeRef.current;
        if (mode === 'verify') {
          await handleDocumentVerify(data);
        } else if (mode === 'checkin') {
          await handleCheckIn(data);
        } else {
          await handleMemberLookup(data);
        }
      } catch (err: any) {
        const msg = err?.response?.data?.message || 'Gagal memproses scan';
        setScanResult({ success: false, message: msg });
      }
      setScanning(false);
      setTimeout(() => setScannedLocked(false), 3000);
    },
    [scannedLocked],
  );

  const onBarcodeScanned = useCallback(
    (event: { type: string; data: string }) => { processScannedData(event.data); },
    [processScannedData],
  );

  // ─── Document Verification ───
  const handleDocumentVerify = async (qrData: string) => {
    const { data } = await apiClient.get('/documents/verify/token');
    const doc = data.data;
    const result = {
      success: !!doc,
      type: 'document_verify' as const,
      message: doc ? 'Dokumen Valid ✓' : 'Dokumen Tidak Valid',
      detail: doc
        ? `No: ${doc.nomorDokumen || '-'}\nAnggota: ${doc.namaAnggota || '-'}\nQR: ${qrData.slice(0, 20)}...`
        : `QR: ${qrData.slice(0, 20)}...`,
    };
    setScanResult(result);
    saveHistory({
      id: Date.now().toString(),
      timestamp: new Date().toISOString(),
      type: 'document_verify',
      result: result.message,
      detail: result.detail,
    });
  };

  // ─── Check-in to selected kegiatan ───
  const handleCheckIn = async (qrData: string) => {
    const kegiatanId = selectedKegiatanIdRef.current;
    const kegiatan = kegiatanListRef.current.find(k => k.id === kegiatanId);

    if (!kegiatan) {
      setScanResult({ success: false, message: 'Pilih kegiatan terlebih dahulu' });
      return;
    }

    // Determine correct endpoint based on type
    let endpoint: string;
    let payload: Record<string, unknown>;
    if (kegiatan.type === 'training') {
      endpoint = `/trainings/${kegiatan.id}/attendances`;
      payload = { status: 'hadir', catatan: `Check-in via QR: ${qrData.slice(0, 30)}` };
    } else if (kegiatan.type === 'graduation') {
      // Pendadaran: QR absensi self check-in (undangan → hadir)
      endpoint = `/graduations/${kegiatan.id}/checkin`;
      payload = {};
    } else {
      endpoint = `/activities/${kegiatan.id}/presence`;
      payload = { status: 'hadir', catatan: `Check-in via QR: ${qrData.slice(0, 30)}` };
    }

    const { data } = await apiClient.post(endpoint, payload);

    const success = data.success === true;
    const result = {
      success,
      type: 'check_in' as const,
      message: success ? 'Check-in Berhasil ✓' : data.message || 'Check-in Gagal',
      detail: `${kegiatan.nama}\nLokasi: ${kegiatan.lokasi || '-'}\nWaktu: ${new Date(kegiatan.tanggalMulai).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })}`,
    };
    setScanResult(result);
    saveHistory({
      id: Date.now().toString(),
      timestamp: new Date().toISOString(),
      type: 'check_in',
      result: result.message,
      detail: result.detail,
    });
  };

  // ─── Member Profile Lookup ───
  const handleMemberLookup = async (qrData: string) => {
    const { data } = await apiClient.get('/members', { params: { search: qrData, limit: 1 } });
    const member = data.data?.[0];
    if (member) {
      const result = {
        success: true,
        type: 'member_lookup' as const,
        message: 'Anggota Ditemukan',
        detail: `Nama: ${member.namaLengkap || member.nama}\nNo: ${member.nomorAnggota || '-'}\nStatus: ${member.statusKeanggotaan || '-'}\nQR: ${qrData.slice(0, 20)}...`,
      };
      setScanResult(result);
      saveHistory({
        id: Date.now().toString(),
        timestamp: new Date().toISOString(),
        type: 'member_lookup',
        result: result.message,
        detail: result.detail,
      });
    } else {
      setScanResult({ success: false, message: 'Anggota tidak ditemukan' });
    }
  };

  const modeConfig = {
    verify: { icon: 'document-text' as const, label: 'Verifikasi Dokumen', color: '#2563eb' },
    checkin: { icon: 'location' as const, label: 'Check-in Kegiatan', color: '#16a34a' },
    lookup: { icon: 'person' as const, label: 'Cari Anggota', color: '#9333ea' },
  };

  const currentMode = modeConfig[scanMode];

  // ─── Kegiatan Picker Modal ───
  const renderKegiatanPicker = () => (
    <Modal visible={showKegiatanPicker} transparent animationType="slide">
      <TouchableOpacity
        style={styles.modalOverlay}
        activeOpacity={1}
        onPress={() => setShowKegiatanPicker(false)}
      >
        <View style={styles.pickerContainer}>
          <View style={styles.pickerHeader}>
            <Text style={styles.pickerTitle}>Pilih Kegiatan</Text>
            <TouchableOpacity onPress={() => setShowKegiatanPicker(false)}>
              <Ionicons name="close" size={24} color="#6b7280" />
            </TouchableOpacity>
          </View>
          {kegiatanList.length === 0 ? (
            <Text style={styles.emptyPickerText}>Tidak ada kegiatan aktif</Text>
          ) : (
            <ScrollView style={styles.pickerList}>
              {kegiatanList.map((k) => {
                const isSelected = k.id === selectedKegiatanId;
                return (
                  <TouchableOpacity
                    key={`${k.type}-${k.id}`}
                    style={[styles.pickerItem, isSelected && styles.pickerItemSelected]}
                    onPress={() => {
                      setSelectedKegiatanId(k.id);
                      setShowKegiatanPicker(false);
                    }}
                  >
                    <View style={styles.pickerItemLeft}>
                      <Text style={styles.pickerItemName} numberOfLines={1}>{k.nama}</Text>
                      {k.lokasi && (
                        <View style={styles.pickerItemMeta}>
                          <Ionicons name="location" size={11} color="#9ca3af" />
                          <Text style={styles.pickerItemMetaText} numberOfLines={1}>{k.lokasi}</Text>
                        </View>
                      )}
                    </View>
                    {isSelected && <Ionicons name="checkmark-circle" size={20} color="#16a34a" />}
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          )}
        </View>
      </TouchableOpacity>
    </Modal>
  );

  // ─── Permission handling ───
  if (!permission) {
    return (
      <View style={styles.container}>
        <View style={styles.header}><Text style={styles.headerTitle}>QR Scanner</Text></View>
        <View style={styles.scannerArea}><ActivityIndicator size="large" color="#2563eb" /></View>
      </View>
    );
  }

  if (!permission.granted) {
    return (
      <View style={styles.container}>
        <View style={styles.header}><Text style={styles.headerTitle}>QR Scanner</Text></View>
        <View style={styles.scannerArea}>
          <Ionicons name="camera-outline" size={64} color="#6b7280" />
          <Text style={styles.scannerHint}>Izin kamera diperlukan untuk scan QR code</Text>
          <TouchableOpacity style={styles.scanButton} onPress={requestPermission}>
            <Text style={styles.scanButtonText}>Berikan Izin Kamera</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>QR Scanner</Text>
      </View>

      {/* Mode Selector */}
      <View style={styles.modeSelector}>
        {(Object.keys(modeConfig) as Array<keyof typeof modeConfig>).map((mode) => (
          <TouchableOpacity
            key={mode}
            style={[styles.modeTab, scanMode === mode && { backgroundColor: modeConfig[mode].color }]}
            onPress={() => handleModeSwitch(mode)}
          >
            <Ionicons name={modeConfig[mode].icon} size={16} color={scanMode === mode ? '#fff' : '#6b7280'} />
            <Text style={[styles.modeTabText, scanMode === mode && { color: '#fff' }]}>
              {modeConfig[mode].label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Camera Area */}
      {cameraActive ? (
        <View style={styles.cameraContainer}>
          <CameraView
            style={styles.camera}
            facing="back"
            barcodeScannerSettings={{ barcodeTypes: ['qr'] }}
            onBarcodeScanned={scannedLocked ? undefined : onBarcodeScanned}
          />
          <View style={styles.scanOverlay}>
            <View style={styles.viewfinderFrame}>
              <View style={[styles.cornerTL, { borderColor: currentMode.color }]} />
              <View style={[styles.cornerTR, { borderColor: currentMode.color }]} />
              <View style={[styles.cornerBL, { borderColor: currentMode.color }]} />
              <View style={[styles.cornerBR, { borderColor: currentMode.color }]} />
            </View>
            <Text style={styles.scanOverlayText}>Arahkan QR code ke dalam frame</Text>
          </View>
          <TouchableOpacity style={styles.stopCameraButton} onPress={() => setCameraActive(false)}>
            <Ionicons name="close-circle" size={28} color="#fff" />
            <Text style={styles.stopCameraText}>Tutup Kamera</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <View style={styles.scannerArea}>
          <Text style={styles.scannerHint}>
            {scanMode === 'verify' && 'Tekan tombol untuk membuka kamera dan scan QR dokumen'}
            {scanMode === 'checkin' && 'Pilih kegiatan, lalu tekan tombol untuk scan QR check-in'}
            {scanMode === 'lookup' && 'Tekan tombol untuk membuka kamera dan cari anggota'}
          </Text>

          {/* Kegiatan Selector (Check-in mode only) */}
          {scanMode === 'checkin' && (
            <TouchableOpacity
              style={styles.kegiatanSelector}
              onPress={() => setShowKegiatanPicker(true)}
            >
              <View style={styles.kegiatanSelectorLeft}>
                <Ionicons name="calendar" size={18} color="#16a34a" />
                {selectedKegiatan ? (
                  <View style={styles.kegiatanSelectorInfo}>
                    <Text style={styles.kegiatanSelectorName} numberOfLines={1}>
                      {selectedKegiatan.nama}
                    </Text>
                    {selectedKegiatan.lokasi && (
                      <Text style={styles.kegiatanSelectorMeta} numberOfLines={1}>
                        {selectedKegiatan.lokasi}
                      </Text>
                    )}
                  </View>
                ) : (
                  <Text style={styles.kegiatanSelectorPlaceholder}>
                    {loadingKegiatan ? 'Memuat...' : 'Pilih kegiatan...'}
                  </Text>
                )}
              </View>
              <Ionicons name="chevron-down" size={18} color="#9ca3af" />
            </TouchableOpacity>
          )}

          <View style={[styles.viewfinder, { borderColor: currentMode.color }]}>
            <Ionicons name={currentMode.icon} size={64} color={currentMode.color} />
          </View>

          <TouchableOpacity
            style={[
              styles.scanButton,
              { backgroundColor: currentMode.color },
              scanMode === 'checkin' && !selectedKegiatan && { opacity: 0.5 },
            ]}
            onPress={() => {
              if (scanMode === 'checkin' && !selectedKegiatan) {
                setShowKegiatanPicker(true);
                return;
              }
              setCameraActive(true);
            }}
            disabled={scanning}
          >
            {scanning ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.scanButtonText}>{currentMode.label}</Text>
            )}
          </TouchableOpacity>
        </View>
      )}

      {/* Scan Result */}
      {scanResult && (
        <View style={[styles.resultCard, { borderLeftColor: scanResult.success ? '#16a34a' : '#dc2626' }]}>
          <View style={styles.resultHeader}>
            <Ionicons name={scanResult.success ? 'checkmark-circle' : 'close-circle'} size={24} color={scanResult.success ? '#16a34a' : '#dc2626'} />
            <Text style={[styles.resultTitle, { color: scanResult.success ? '#16a34a' : '#dc2626' }]}>
              {scanResult.message}
            </Text>
          </View>
          {scanResult.detail && <Text style={styles.resultDetail}>{scanResult.detail}</Text>}
        </View>
      )}

      {/* Active Kegiatan Info */}
      {scanMode === 'checkin' && !cameraActive && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>
            Kegiatan Aktif ({kegiatanList.length})
          </Text>
          {loadingKegiatan ? (
            <ActivityIndicator style={{ padding: 20 }} />
          ) : kegiatanList.length > 0 ? (
            <View style={styles.kegiatanScrollContainer}>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.kegiatanScroll} nestedScrollEnabled>
                {kegiatanList.map((k) => (
                  <TouchableOpacity
                    key={`${k.type}-${k.id}`}
                    style={[
                      styles.kegiatanChip,
                      k.id === selectedKegiatanId && styles.kegiatanChipActive,
                    ]}
                    onPress={() => setSelectedKegiatanId(k.id)}
                  >
                    <Text
                      style={[
                        styles.kegiatanChipText,
                        k.id === selectedKegiatanId && styles.kegiatanChipTextActive,
                      ]}
                      numberOfLines={1}
                    >
                      {k.nama}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          ) : (
            <Text style={styles.emptyText}>Tidak ada kegiatan aktif</Text>
          )}
        </View>
      )}

      {/* Scan History */}
      {!cameraActive && (
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Riwayat Scan</Text>
            {history.length > 0 && (
              <TouchableOpacity onPress={clearHistory}>
                <Text style={styles.clearText}>Hapus</Text>
              </TouchableOpacity>
            )}
          </View>
          {history.length === 0 ? (
            <Text style={styles.emptyText}>Belum ada riwayat scan</Text>
          ) : (
            history.map((item) => (
              <View key={item.id} style={styles.historyItem}>
                <View style={styles.historyIcon}>
                  <Ionicons
                    name={item.type === 'document_verify' ? 'document-text' : item.type === 'check_in' ? 'location' : 'person'}
                    size={16}
                    color="#6b7280"
                  />
                </View>
                <View style={styles.historyContent}>
                  <Text style={styles.historyResult}>{item.result}</Text>
                  {item.detail && <Text style={styles.historyDetail} numberOfLines={1}>{item.detail}</Text>}
                  <Text style={styles.historyTime}>
                    {new Date(item.timestamp).toLocaleString('id-ID', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                  </Text>
                </View>
              </View>
            ))
          )}
        </View>
      )}

      {renderKegiatanPicker()}
      <View style={{ height: 40 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f3f4f6' },
  header: { backgroundColor: '#111827', padding: 24, paddingTop: 60, paddingBottom: 20 },
  headerTitle: { color: '#fff', fontSize: 22, fontWeight: 'bold' },
  modeSelector: { flexDirection: 'row', padding: 12, gap: 8 },
  modeTab: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
    paddingVertical: 10, borderRadius: 10, backgroundColor: '#fff',
    shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 4, elevation: 1,
  },
  modeTabText: { fontSize: 11, fontWeight: '600', color: '#6b7280' },
  scannerArea: { alignItems: 'center', padding: 20 },
  scannerHint: { color: '#6b7280', fontSize: 13, marginBottom: 20, textAlign: 'center' },
  viewfinder: {
    width: 200, height: 200, borderWidth: 3, borderRadius: 20,
    justifyContent: 'center', alignItems: 'center', marginBottom: 20,
    backgroundColor: '#fff',
    shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 10, elevation: 3,
  },
  scanButton: {
    paddingHorizontal: 32, paddingVertical: 14, borderRadius: 12,
    shadowColor: '#000', shadowOpacity: 0.15, shadowRadius: 6, elevation: 3,
  },
  scanButtonText: { color: '#fff', fontSize: 16, fontWeight: '600' },

  // Kegiatan Selector
  kegiatanSelector: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: '#fff', borderRadius: 12, padding: 14, marginBottom: 16,
    borderWidth: 1, borderColor: '#e5e7eb', width: '100%',
    shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 6, elevation: 2,
  },
  kegiatanSelectorLeft: { flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1 },
  kegiatanSelectorInfo: { flex: 1 },
  kegiatanSelectorName: { fontSize: 14, fontWeight: '600', color: '#111827' },
  kegiatanSelectorMeta: { fontSize: 11, color: '#6b7280', marginTop: 2 },
  kegiatanSelectorPlaceholder: { fontSize: 14, color: '#9ca3af' },

  // Kegiatan Chips (horizontal scroll)
  kegiatanScrollContainer: { marginBottom: 12 },
  kegiatanScroll: {},
  kegiatanChip: {
    paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20,
    backgroundColor: '#fff', marginRight: 8, borderWidth: 1, borderColor: '#e5e7eb',
  },
  kegiatanChipActive: { backgroundColor: '#16a34a', borderColor: '#16a34a' },
  kegiatanChipText: { fontSize: 12, fontWeight: '500', color: '#374151' },
  kegiatanChipTextActive: { color: '#fff' },

  // Picker Modal
  modalOverlay: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'flex-end',
  },
  pickerContainer: {
    backgroundColor: '#fff', borderTopLeftRadius: 20, borderTopRightRadius: 20,
    maxHeight: '60%', paddingBottom: 30,
    shadowColor: '#000', shadowOpacity: 0.15, shadowRadius: 12, elevation: 8,
  },
  pickerHeader: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    padding: 16, borderBottomWidth: 1, borderBottomColor: '#e5e7eb',
  },
  pickerTitle: { fontSize: 16, fontWeight: '700', color: '#111827' },
  pickerList: { padding: 8 },
  pickerItem: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    padding: 14, borderRadius: 12, marginBottom: 4,
  },
  pickerItemSelected: { backgroundColor: '#ecfdf5' },
  pickerItemLeft: { flex: 1, marginRight: 8 },
  pickerItemName: { fontSize: 14, fontWeight: '600', color: '#111827' },
  pickerItemMeta: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 4 },
  pickerItemMetaText: { fontSize: 12, color: '#9ca3af' },
  emptyPickerText: { textAlign: 'center', color: '#9ca3af', padding: 30, fontSize: 14 },

  // Camera styles
  cameraContainer: { width: '100%', height: 350, position: 'relative', marginBottom: 16 },
  camera: { width: '100%', height: '100%' },
  scanOverlay: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, justifyContent: 'center', alignItems: 'center' },
  viewfinderFrame: { width: 250, height: 250, position: 'relative' },
  cornerTL: { position: 'absolute', top: 0, left: 0, width: 30, height: 30, borderTopWidth: 3, borderLeftWidth: 3, borderRadius: 4 },
  cornerTR: { position: 'absolute', top: 0, right: 0, width: 30, height: 30, borderTopWidth: 3, borderRightWidth: 3, borderRadius: 4 },
  cornerBL: { position: 'absolute', bottom: 0, left: 0, width: 30, height: 30, borderBottomWidth: 3, borderLeftWidth: 3, borderRadius: 4 },
  cornerBR: { position: 'absolute', bottom: 0, right: 0, width: 30, height: 30, borderBottomWidth: 3, borderRightWidth: 3, borderRadius: 4 },
  scanOverlayText: { color: '#fff', fontSize: 13, marginTop: 16, textShadowColor: '#000', textShadowRadius: 4 },
  stopCameraButton: {
    position: 'absolute', bottom: 16, alignSelf: 'center', flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: 'rgba(0,0,0,0.6)', paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20,
  },
  stopCameraText: { color: '#fff', fontSize: 13, fontWeight: '600' },

  // Result styles
  resultCard: {
    backgroundColor: '#fff', borderRadius: 12, padding: 16, marginHorizontal: 16, marginBottom: 16,
    borderLeftWidth: 4, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 6, elevation: 2,
  },
  resultHeader: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  resultTitle: { fontSize: 16, fontWeight: '700' },
  resultDetail: { fontSize: 13, color: '#6b7280', marginTop: 8, lineHeight: 20 },

  // Info styles
  section: { padding: 16, paddingBottom: 0 },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  sectionTitle: { fontSize: 14, fontWeight: '600', color: '#111827' },
  clearText: { fontSize: 12, color: '#dc2626', fontWeight: '500' },
  emptyText: { fontSize: 13, color: '#9ca3af', textAlign: 'center', padding: 20 },

  // History styles
  historyItem: {
    flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: '#fff', borderRadius: 10,
    padding: 12, marginBottom: 8, shadowColor: '#000', shadowOpacity: 0.03, shadowRadius: 4, elevation: 1,
  },
  historyIcon: { width: 32, height: 32, borderRadius: 16, backgroundColor: '#f3f4f6', justifyContent: 'center', alignItems: 'center' },
  historyContent: { flex: 1 },
  historyResult: { fontSize: 13, fontWeight: '600', color: '#111827' },
  historyDetail: { fontSize: 11, color: '#9ca3af', marginTop: 2 },
  historyTime: { fontSize: 11, color: '#d1d5db', marginTop: 4 },
});

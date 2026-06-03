import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ActivityIndicator,
  ScrollView,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import { CameraView, useCameraPermissions } from 'expo-camera';
import apiClient from '../../lib/api-client';

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
  const [activeKegiatan, setActiveKegiatan] = useState<any>(null);
  const [loadingKegiatan, setLoadingKegiatan] = useState(true);

  // Camera state
  const [permission, requestPermission] = useCameraPermissions();
  const [cameraActive, setCameraActive] = useState(false);
  const [scannedLocked, setScannedLocked] = useState(false);

  // Refs for stable callbacks (avoid stale closures)
  const scanModeRef = useRef(scanMode);
  const activeKegiatanRef = useRef(activeKegiatan);
  const historyRef = useRef(history);
  useEffect(() => { scanModeRef.current = scanMode; }, [scanMode]);
  useEffect(() => { activeKegiatanRef.current = activeKegiatan; }, [activeKegiatan]);
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
    try {
      await AsyncStorage.removeItem('scanHistory');
    } catch { /* ignore */ }
    setHistory([]);
  };

  // ─── Fetch active kegiatan for check-in ───
  const fetchActiveKegiatan = async () => {
    setLoadingKegiatan(true);
    try {
      const { data } = await apiClient.get('/activities', { params: { status: 'berlangsung', limit: 5 } });
      setActiveKegiatan(data.data?.[0] || null);
    } catch { /* ignore */ }
    setLoadingKegiatan(false);
  };

  // ─── Switch mode and refetch kegiatan if checkin ───
  const handleModeSwitch = (mode: 'verify' | 'checkin' | 'lookup') => {
    setScanMode(mode);
    setScanResult(null);
    setCameraActive(false);
    setScannedLocked(false);
    if (mode === 'checkin') fetchActiveKegiatan();
  };

  // ─── Process scanned QR data (stable via refs) ───
  const processScannedData = useCallback(async (data: string) => {
    if (scannedLocked) return; // Prevent rapid-fire scans
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

    // Reset lock after 3 seconds to allow re-scan
    setTimeout(() => setScannedLocked(false), 3000);
  }, [scannedLocked]);

  // ─── Handle barcode scanned by CameraView (stable) ───
  const onBarcodeScanned = useCallback((event: { type: string; data: string }) => {
    processScannedData(event.data);
  }, [processScannedData]);
  // Note: processScannedData is stable (only depends on scannedLocked via ref pattern)

  // ─── Document Verification ───
  const handleDocumentVerify = async (qrData: string) => {
    // QR data expected: document verification token
    const { data } = await apiClient.get('/documents/verify/token');
    const doc = data.data;
    const result = {
      success: !!doc,
      type: 'document_verify' as const,
      message: doc ? 'Dokumen Valid ✓' : 'Dokumen Tidak Valid',
      detail: doc ? `No: ${doc.nomorDokumen || '-'}\nAnggota: ${doc.namaAnggota || '-'}\nQR: ${qrData.slice(0, 20)}...` : `QR: ${qrData.slice(0, 20)}...`,
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

  // ─── Check-in to kegiatan ───
  const handleCheckIn = async (qrData: string) => {
    const kegiatan = activeKegiatanRef.current;
    if (!kegiatan) {
      setScanResult({ success: false, message: 'Tidak ada kegiatan aktif saat ini' });
      return;
    }
    const { data } = await apiClient.post(`/trainings/${kegiatan.id}/attendances`, {
      status: 'hadir',
      catatan: `Check-in via QR: ${qrData.slice(0, 30)}`,
    });
    const success = data.success === true;
    const result = {
      success,
      type: 'check_in' as const,
      message: success ? 'Check-in Berhasil ✓' : (data.message || 'Check-in Gagal'),
      detail: `Kegiatan: ${kegiatan.nama}\nLokasi: ${kegiatan.lokasi || '-'}\nQR: ${qrData.slice(0, 20)}...`,
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
    // QR data expected: member ID or nomorAnggota
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
            <Ionicons
              name={modeConfig[mode].icon}
              size={16}
              color={scanMode === mode ? '#fff' : '#6b7280'}
            />
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
          {/* Scan overlay */}
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
            {scanMode === 'checkin' && 'Tekan tombol untuk membuka kamera dan check-in'}
            {scanMode === 'lookup' && 'Tekan tombol untuk membuka kamera dan cari anggota'}
          </Text>

          <View style={[styles.viewfinder, { borderColor: currentMode.color }]}>
            <Ionicons name={currentMode.icon} size={64} color={currentMode.color} />
            {scanMode === 'checkin' && activeKegiatan && (
              <View style={styles.kegiatanBadge}>
                <Text style={styles.kegiatanBadgeText}>{activeKegiatan.nama}</Text>
              </View>
            )}
          </View>

          <TouchableOpacity
            style={[styles.scanButton, { backgroundColor: currentMode.color }]}
            onPress={() => setCameraActive(true)}
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
            <Ionicons
              name={scanResult.success ? 'checkmark-circle' : 'close-circle'}
              size={24}
              color={scanResult.success ? '#16a34a' : '#dc2626'}
            />
            <Text style={[styles.resultTitle, { color: scanResult.success ? '#16a34a' : '#dc2626' }]}>
              {scanResult.message}
            </Text>
          </View>
          {scanResult.detail && (
            <Text style={styles.resultDetail}>{scanResult.detail}</Text>
          )}
        </View>
      )}

      {/* Active Kegiatan Info */}
      {scanMode === 'checkin' && !cameraActive && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Kegiatan Aktif</Text>
          {loadingKegiatan ? (
            <ActivityIndicator style={{ padding: 20 }} />
          ) : activeKegiatan ? (
            <View style={styles.infoCard}>
              <Text style={styles.infoCardTitle}>{activeKegiatan.nama}</Text>
              <View style={styles.infoRow}>
                <Ionicons name="location" size={14} color="#6b7280" />
                <Text style={styles.infoText}>{activeKegiatan.lokasi || 'Online'}</Text>
              </View>
              <View style={styles.infoRow}>
                <Ionicons name="time" size={14} color="#6b7280" />
                <Text style={styles.infoText}>
                  {new Date(activeKegiatan.tanggalMulai).toLocaleDateString('id-ID', {
                    day: 'numeric', month: 'long', year: 'numeric',
                  })}
                </Text>
              </View>
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
                    name={
                      item.type === 'document_verify' ? 'document-text' :
                      item.type === 'check_in' ? 'location' : 'person'
                    }
                    size={16}
                    color="#6b7280"
                  />
                </View>
                <View style={styles.historyContent}>
                  <Text style={styles.historyResult}>{item.result}</Text>
                  {item.detail && <Text style={styles.historyDetail} numberOfLines={1}>{item.detail}</Text>}
                  <Text style={styles.historyTime}>
                    {new Date(item.timestamp).toLocaleString('id-ID', {
                      day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit',
                    })}
                  </Text>
                </View>
              </View>
            ))
          )}
        </View>
      )}

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
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 6, paddingVertical: 10, borderRadius: 10, backgroundColor: '#fff',
    shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 4, elevation: 1,
  },
  modeTabText: { fontSize: 11, fontWeight: '600', color: '#6b7280' },
  scannerArea: { alignItems: 'center', padding: 20 },
  scannerHint: { color: '#6b7280', fontSize: 13, marginBottom: 20, textAlign: 'center' },
  viewfinder: {
    width: 200, height: 200, borderWidth: 3, borderRadius: 20,
    justifyContent: 'center', alignItems: 'center', marginBottom: 20,
    backgroundColor: '#fff', shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 10, elevation: 3,
  },
  kegiatanBadge: {
    position: 'absolute', bottom: -8, backgroundColor: '#16a34a',
    paddingHorizontal: 12, paddingVertical: 4, borderRadius: 12,
  },
  kegiatanBadgeText: { color: '#fff', fontSize: 10, fontWeight: '600' },
  scanButton: {
    paddingHorizontal: 32, paddingVertical: 14, borderRadius: 12,
    shadowColor: '#000', shadowOpacity: 0.15, shadowRadius: 6, elevation: 3,
  },
  scanButtonText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  // Camera styles
  cameraContainer: { width: '100%', height: 350, position: 'relative', marginBottom: 16 },
  camera: { width: '100%', height: '100%' },
  scanOverlay: {
    position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
    justifyContent: 'center', alignItems: 'center',
  },
  viewfinderFrame: { width: 250, height: 250, position: 'relative' },
  cornerTL: { position: 'absolute', top: 0, left: 0, width: 30, height: 30, borderTopWidth: 3, borderLeftWidth: 3, borderRadius: 4 },
  cornerTR: { position: 'absolute', top: 0, right: 0, width: 30, height: 30, borderTopWidth: 3, borderRightWidth: 3, borderRadius: 4 },
  cornerBL: { position: 'absolute', bottom: 0, left: 0, width: 30, height: 30, borderBottomWidth: 3, borderLeftWidth: 3, borderRadius: 4 },
  cornerBR: { position: 'absolute', bottom: 0, right: 0, width: 30, height: 30, borderBottomWidth: 3, borderRightWidth: 3, borderRadius: 4 },
  scanOverlayText: { color: '#fff', fontSize: 13, marginTop: 16, textShadowColor: '#000', textShadowRadius: 4 },
  stopCameraButton: {
    position: 'absolute', bottom: 16, alignSelf: 'center',
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: 'rgba(0,0,0,0.6)', paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20,
  },
  stopCameraText: { color: '#fff', fontSize: 13, fontWeight: '600' },
  // Result styles
  resultCard: {
    backgroundColor: '#fff', borderRadius: 12, padding: 16, marginHorizontal: 16,
    marginBottom: 16, borderLeftWidth: 4,
    shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 6, elevation: 2,
  },
  resultHeader: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  resultTitle: { fontSize: 16, fontWeight: '700' },
  resultDetail: { fontSize: 13, color: '#6b7280', marginTop: 8, lineHeight: 20 },
  // Info styles
  section: { padding: 16, paddingBottom: 0 },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  sectionTitle: { fontSize: 14, fontWeight: '600', color: '#111827' },
  clearText: { fontSize: 12, color: '#dc2626', fontWeight: '500' },
  infoCard: {
    backgroundColor: '#fff', borderRadius: 12, padding: 16,
    shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 6, elevation: 2,
  },
  infoCardTitle: { fontSize: 16, fontWeight: '600', color: '#111827', marginBottom: 8 },
  infoRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 4 },
  infoText: { fontSize: 13, color: '#6b7280' },
  emptyText: { fontSize: 13, color: '#9ca3af', textAlign: 'center', padding: 20 },
  // History styles
  historyItem: {
    flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: '#fff',
    borderRadius: 10, padding: 12, marginBottom: 8,
    shadowColor: '#000', shadowOpacity: 0.03, shadowRadius: 4, elevation: 1,
  },
  historyIcon: { width: 32, height: 32, borderRadius: 16, backgroundColor: '#f3f4f6', justifyContent: 'center', alignItems: 'center' },
  historyContent: { flex: 1 },
  historyResult: { fontSize: 13, fontWeight: '600', color: '#111827' },
  historyDetail: { fontSize: 11, color: '#9ca3af', marginTop: 2 },
  historyTime: { fontSize: 11, color: '#d1d5db', marginTop: 4 },
});

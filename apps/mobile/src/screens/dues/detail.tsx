import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  TextInput,
  ActivityIndicator,
  Image,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useLocalSearchParams, router } from 'expo-router';
import apiClient, { unwrap } from '../../lib/api-client';
import { LoadingView, StatusBadge } from '../../components/ui/shared';

const STATUS_STYLES: Record<string, { label: string; color: string; bg: string }> = {
  lunas: { label: 'Lunas', color: '#16a34a', bg: '#ecfdf5' },
  menunggak: { label: 'Menunggak', color: '#dc2626', bg: '#fef2f2' },
  belum_dibayar: { label: 'Belum Dibayar', color: '#6b7280', bg: '#f3f4f6' },
  menunggu_verifikasi: { label: 'Menunggu', color: '#ca8a04', bg: '#fef3c7' },
};

interface BankInfo {
  bankName: string;
  accountNumber: string;
  accountName: string;
  qrisImageUrl: string | null;
}

interface DuesDetail {
  id: string;
  periode: string;
  jumlah: number;
  status: string;
  tanggalBayar?: string;
  tanggalJatuhTempo?: string;
}

export default function DuesDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [dues, setDues] = useState<DuesDetail | null>(null);
  const [bankInfo, setBankInfo] = useState<BankInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [showPayForm, setShowPayForm] = useState(false);
  const [catatan, setCatatan] = useState('');
  const [proofFile, setProofFile] = useState<{ uri: string; name: string; type: string } | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const fetchData = async () => {
    try {
      const [duesRes, bankRes] = await Promise.all([
        apiClient.get(`/dues/${id}`),
        apiClient.get('/payments/bank-info'),
      ]);
      setDues(unwrap(duesRes));
      setBankInfo(unwrap(bankRes) as BankInfo);
    } catch {
      /* ignore */
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchData();
  }, [id]);

  const pickProof = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert('Izin dibutuhkan', 'Akses galeri diperlukan untuk memilih bukti pembayaran');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.8,
      selectionLimit: 1,
    });
    if (!result.canceled && result.assets[0]) {
      const asset = result.assets[0];
      setProofFile({
        uri: asset.uri,
        name: asset.uri.split('/').pop() || 'proof.jpg',
        type: asset.mimeType || 'image/jpeg',
      });
    }
  };

  const handleSubmitProof = async () => {
    setSubmitting(true);
    try {
      if (proofFile) {
        const form = new FormData();
        form.append('bukti', {
          uri: proofFile.uri,
          name: proofFile.name,
          type: proofFile.type,
        } as any);
        if (catatan.trim()) {
          form.append('catatan', catatan.trim());
        }
        await apiClient.post(`/payments/${id}/upload-proof`, form, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });
      } else if (catatan.trim()) {
        await apiClient.post(`/payments/${id}/upload-proof`, { catatan: catatan.trim() });
      } else {
        Alert.alert('Error', 'Sertakan catatan atau bukti foto');
        setSubmitting(false);
        return;
      }
      Alert.alert('Berhasil', 'Bukti pembayaran berhasil dikirim. Menunggu verifikasi admin.');
      setShowPayForm(false);
      setCatatan('');
      setProofFile(null);
      setLoading(true);
      await fetchData();
    } catch (err: any) {
      Alert.alert('Gagal', err?.response?.data?.message || 'Terjadi kesalahan');
    }
    setSubmitting(false);
  };

  if (loading) return <LoadingView message="Memuat detail iuran..." />;
  if (!dues)
    return (
      <View style={styles.center}>
        <Text style={styles.errorText}>Iuran tidak ditemukan</Text>
      </View>
    );

  const ss = STATUS_STYLES[dues.status] || {
    label: dues.status,
    color: '#6b7280',
    bg: '#f3f4f6',
  };

  const canPay = dues.status !== 'lunas' && dues.status !== 'menunggu_verifikasi';

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={22} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Detail Iuran</Text>
      </View>

      <View style={styles.section}>
        <View style={styles.infoCard}>
          <View style={styles.infoRow}>
            <Ionicons name="calendar" size={18} color="#2563eb" />
            <View style={styles.infoContent}>
              <Text style={styles.infoLabel}>Periode</Text>
              <Text style={styles.infoValue}>{dues.periode}</Text>
            </View>
          </View>
          <View style={styles.infoRow}>
            <Ionicons name="cash" size={18} color="#2563eb" />
            <View style={styles.infoContent}>
              <Text style={styles.infoLabel}>Jumlah</Text>
              <Text style={styles.infoValue}>Rp {Number(dues.jumlah).toLocaleString('id-ID')}</Text>
            </View>
          </View>
          {dues.tanggalJatuhTempo && (
            <View style={styles.infoRow}>
              <Ionicons name="alarm" size={18} color="#2563eb" />
              <View style={styles.infoContent}>
                <Text style={styles.infoLabel}>Jatuh Tempo</Text>
                <Text style={styles.infoValue}>
                  {new Date(dues.tanggalJatuhTempo).toLocaleDateString('id-ID')}
                </Text>
              </View>
            </View>
          )}
          {dues.tanggalBayar && (
            <View style={styles.infoRow}>
              <Ionicons name="checkmark-circle" size={18} color="#2563eb" />
              <View style={styles.infoContent}>
                <Text style={styles.infoLabel}>Tanggal Bayar</Text>
                <Text style={styles.infoValue}>
                  {new Date(dues.tanggalBayar).toLocaleDateString('id-ID')}
                </Text>
              </View>
            </View>
          )}
          <View style={styles.infoRow}>
            <Ionicons name="flag" size={18} color="#2563eb" />
            <View style={styles.infoContent}>
              <Text style={styles.infoLabel}>Status</Text>
              <StatusBadge label={ss.label} color={ss.color} bg={ss.bg} />
            </View>
          </View>
        </View>
      </View>

      {canPay && bankInfo && !showPayForm && (
        <View style={styles.section}>
          <View style={styles.bankCard}>
            <Text style={styles.bankTitle}>Pembayaran via Transfer</Text>

            {bankInfo.qrisImageUrl && (
              <View style={styles.qrisContainer}>
                <Image
                  source={{ uri: bankInfo.qrisImageUrl }}
                  style={styles.qrisImage}
                  resizeMode="contain"
                />
                <Text style={styles.qrisLabel}>Scan QRIS</Text>
              </View>
            )}

            <View style={styles.bankRow}>
              <Ionicons name="business" size={16} color="#6b7280" />
              <Text style={styles.bankLabel}>Bank</Text>
              <Text style={styles.bankValue}>{bankInfo.bankName}</Text>
            </View>
            <View style={styles.bankRow}>
              <Ionicons name="card" size={16} color="#6b7280" />
              <Text style={styles.bankLabel}>No. Rekening</Text>
              <Text style={styles.bankAccNumber}>{bankInfo.accountNumber}</Text>
            </View>
            <View style={styles.bankRow}>
              <Ionicons name="person" size={16} color="#6b7280" />
              <Text style={styles.bankLabel}>Atas Nama</Text>
              <Text style={styles.bankValue}>{bankInfo.accountName}</Text>
            </View>

            <TouchableOpacity style={styles.payBtn} onPress={() => setShowPayForm(true)}>
              <Ionicons name="cloud-upload" size={18} color="#fff" />
              <Text style={styles.payBtnText}>Upload Bukti Bayar</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {showPayForm && (
        <View style={styles.section}>
          <View style={styles.payForm}>
            <Text style={styles.payFormTitle}>Konfirmasi Pembayaran</Text>
            <Text style={styles.payFormHint}>
              Lampirkan bukti transfer (foto/screenshot) dan isi catatan untuk verifikasi admin
            </Text>

            <TouchableOpacity style={styles.uploadBtn} onPress={pickProof}>
              <Ionicons name="cloud-upload-outline" size={18} color="#2563eb" />
              <Text style={styles.uploadBtnText}>
                {proofFile ? 'Ganti Bukti Foto' : 'Pilih Bukti Foto'}
              </Text>
            </TouchableOpacity>

            {proofFile && (
              <Image source={{ uri: proofFile.uri }} style={styles.previewImage} resizeMode="contain" />
            )}

            <TextInput
              style={styles.payInput}
              placeholder="Contoh: Transfer dari BCA a.n. Budi, 17 Juni 2026"
              placeholderTextColor="#9ca3af"
              value={catatan}
              onChangeText={setCatatan}
              multiline
              numberOfLines={3}
            />
            <View style={styles.payFormActions}>
              <TouchableOpacity
                style={styles.cancelSmallBtn}
                onPress={() => {
                  setShowPayForm(false);
                  setCatatan('');
                  setProofFile(null);
                }}
              >
                <Text style={styles.cancelSmallBtnText}>Batal</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.submitPayBtn, submitting && styles.btnDisabled]}
                onPress={handleSubmitProof}
                disabled={submitting}
              >
                {submitting ? (
                  <ActivityIndicator color="#fff" size="small" />
                ) : (
                  <Text style={styles.submitPayBtnText}>Kirim</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      )}

      {dues.status === 'menunggu_verifikasi' && (
        <View style={styles.section}>
          <View style={styles.verifyingCard}>
            <Ionicons name="hourglass" size={24} color="#ca8a04" />
            <Text style={styles.verifyingText}>
              Pembayaran sedang diverifikasi oleh admin. Mohon tunggu.
            </Text>
          </View>
        </View>
      )}

      <View style={{ height: 40 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f3f4f6' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#f3f4f6' },
  errorText: { fontSize: 14, color: '#ef4444' },
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
  headerTitle: { color: '#fff', fontSize: 18, fontWeight: '700' },

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

  bankCard: {
    backgroundColor: '#fff',
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  bankTitle: { fontSize: 16, fontWeight: '700', color: '#111827', marginBottom: 16 },
  qrisContainer: {
    alignItems: 'center',
    marginBottom: 16,
    padding: 12,
    backgroundColor: '#f9fafb',
    borderRadius: 12,
  },
  qrisImage: { width: 180, height: 180 },
  qrisLabel: { fontSize: 12, color: '#6b7280', marginTop: 8 },
  bankRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  bankLabel: { fontSize: 13, color: '#6b7280', width: 100 },
  bankValue: { fontSize: 14, fontWeight: '600', color: '#111827', flex: 1 },
  bankAccNumber: { fontSize: 16, fontWeight: '700', color: '#2563eb', flex: 1, letterSpacing: 1 },

  payBtn: {
    backgroundColor: '#2563eb',
    borderRadius: 12,
    paddingVertical: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 16,
  },
  payBtnText: { fontSize: 15, fontWeight: '600', color: '#fff' },

  payForm: {
    backgroundColor: '#fff',
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  payFormTitle: { fontSize: 15, fontWeight: '600', color: '#111827', marginBottom: 4 },
  payFormHint: { fontSize: 12, color: '#6b7280', marginBottom: 12, lineHeight: 18 },
  uploadBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#d1d5db',
    backgroundColor: '#f9fafb',
    marginBottom: 12,
  },
  uploadBtnText: { fontSize: 13, fontWeight: '600', color: '#2563eb' },
  previewImage: { width: '100%', height: 180, borderRadius: 10, marginBottom: 12 },
  payInput: {
    backgroundColor: '#f9fafb',
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 10,
    padding: 12,
    fontSize: 14,
    color: '#111827',
    minHeight: 72,
    textAlignVertical: 'top',
    marginBottom: 12,
  },
  payFormActions: { flexDirection: 'row', gap: 10, justifyContent: 'flex-end' },
  cancelSmallBtn: {
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 8,
    paddingVertical: 10,
    paddingHorizontal: 20,
  },
  cancelSmallBtnText: { fontSize: 14, fontWeight: '600', color: '#374151' },
  submitPayBtn: {
    backgroundColor: '#2563eb',
    borderRadius: 8,
    paddingVertical: 10,
    paddingHorizontal: 24,
  },
  submitPayBtnText: { fontSize: 14, fontWeight: '600', color: '#fff' },
  btnDisabled: { opacity: 0.5 },

  verifyingCard: {
    backgroundColor: '#fef3c7',
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderWidth: 1,
    borderColor: '#fde68a',
  },
  verifyingText: { fontSize: 13, color: '#92400e', flex: 1, lineHeight: 18 },
});

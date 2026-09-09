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
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as ImagePicker from 'expo-image-picker';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useLocalSearchParams, router } from 'expo-router';
import apiClient, { unwrap, toAbsoluteUrl } from '../../lib/api-client';
import { formatDate, formatPeriode, formatRupiah } from '../../lib/format';
import { LoadingView, StatusBadge } from '../../components/ui/shared';
import { theme } from '../../theme';

const STATUS_STYLES: Record<string, { label: string; color: string; bg: string }> = {
  lunas: { label: 'Lunas', color: theme.colors.success, bg: theme.colors.successLight },
  menunggak: { label: 'Menunggak', color: theme.colors.danger, bg: theme.colors.dangerLight },
  belum_dibayar: { label: 'Belum Dibayar', color: theme.colors.textSecondary, bg: theme.colors.surfaceMuted },
  menunggu_verifikasi: { label: 'Menunggu', color: theme.colors.warning, bg: theme.colors.warningLight },
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
      // unwrap(bankRes) adalah ARRAY rekening aktif — ambil yang pertama (satu-satunya yg aktif)
      const bankList = unwrap<BankInfo[] | null>(bankRes) || [];
      setBankInfo(Array.isArray(bankList) && bankList.length > 0 ? bankList[0] : null);
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

  const insets = useSafeAreaInsets();

  if (loading) return <LoadingView message="Memuat detail iuran..." />;
  if (!dues)
    return (
      <View style={styles.center}>
        <Text style={styles.errorText}>Iuran tidak ditemukan</Text>
      </View>
    );

  const ss = STATUS_STYLES[dues.status] || {
    label: dues.status,
    color: theme.colors.textSecondary,
    bg: theme.colors.surfaceMuted,
  };

  const canPay = dues.status !== 'lunas' && dues.status !== 'menunggu_verifikasi';

  return (
    <ScrollView style={styles.container}>
      <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={22} color={theme.colors.textOnPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Detail Iuran</Text>
      </View>

      <View style={styles.section}>
        <View style={styles.infoCard}>
          <View style={styles.infoRow}>
            <Ionicons name="calendar" size={18} color={theme.colors.primary} />
            <View style={styles.infoContent}>
              <Text style={styles.infoLabel}>Periode</Text>
              <Text style={styles.infoValue}>{formatPeriode(dues.periode)}</Text>
            </View>
          </View>
          <View style={styles.infoRow}>
            <Ionicons name="cash" size={18} color={theme.colors.primary} />
            <View style={styles.infoContent}>
              <Text style={styles.infoLabel}>Jumlah</Text>
              <Text style={styles.infoValue}>{formatRupiah(dues.jumlah)}</Text>
            </View>
          </View>
          {dues.tanggalJatuhTempo && (
            <View style={styles.infoRow}>
              <Ionicons name="alarm" size={18} color={theme.colors.primary} />
              <View style={styles.infoContent}>
                <Text style={styles.infoLabel}>Jatuh Tempo</Text>
                <Text style={styles.infoValue}>
                  {formatDate(dues.tanggalJatuhTempo)}
                </Text>
              </View>
            </View>
          )}
          {dues.tanggalBayar && (
            <View style={styles.infoRow}>
              <Ionicons name="checkmark-circle" size={18} color={theme.colors.primary} />
              <View style={styles.infoContent}>
                <Text style={styles.infoLabel}>Tanggal Bayar</Text>
                <Text style={styles.infoValue}>
                  {formatDate(dues.tanggalBayar)}
                </Text>
              </View>
            </View>
          )}
          <View style={styles.infoRow}>
            <Ionicons name="flag" size={18} color={theme.colors.primary} />
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

            {toAbsoluteUrl(bankInfo.qrisImageUrl) && (
              <View style={styles.qrisContainer}>
                <Image
                  source={{ uri: toAbsoluteUrl(bankInfo.qrisImageUrl) as string }}
                  style={styles.qrisImage}
                  resizeMode="contain"
                />
                <Text style={styles.qrisLabel}>Scan QRIS</Text>
              </View>
            )}

            <View style={styles.bankRow}>
              <Ionicons name="business" size={16} color={theme.colors.textSecondary} />
              <Text style={styles.bankLabel}>Bank</Text>
              <Text style={styles.bankValue}>{bankInfo.bankName}</Text>
            </View>
            <View style={styles.bankRow}>
              <Ionicons name="card" size={16} color={theme.colors.textSecondary} />
              <Text style={styles.bankLabel}>No. Rekening</Text>
              <Text style={styles.bankAccNumber}>{bankInfo.accountNumber}</Text>
            </View>
            <View style={styles.bankRow}>
              <Ionicons name="person" size={16} color={theme.colors.textSecondary} />
              <Text style={styles.bankLabel}>Atas Nama</Text>
              <Text style={styles.bankValue}>{bankInfo.accountName}</Text>
            </View>

            <TouchableOpacity style={styles.payBtn} onPress={() => setShowPayForm(true)}>
              <Ionicons name="cloud-upload" size={18} color={theme.colors.textOnPrimary} />
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
              <Ionicons name="cloud-upload-outline" size={18} color={theme.colors.primary} />
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
              placeholderTextColor={theme.colors.textMuted}
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
                  <ActivityIndicator color={theme.colors.textOnPrimary} size="small" />
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
            <Ionicons name="hourglass" size={24} color={theme.colors.warning} />
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
  container: { flex: 1, backgroundColor: theme.colors.background },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: theme.colors.background },
  errorText: { fontSize: 14, color: theme.colors.danger },
  header: {
    backgroundColor: theme.colors.header,
    padding: 24,
    paddingBottom: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  backBtn: { padding: 4 },
  headerTitle: { color: theme.colors.textOnPrimary, fontSize: 18, fontWeight: theme.typography.weight.bold },

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

  bankCard: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.lg - 2,
    padding: 16,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  bankTitle: { fontSize: 16, fontWeight: theme.typography.weight.bold, color: theme.colors.text, marginBottom: 16 },
  qrisContainer: {
    alignItems: 'center',
    marginBottom: 16,
    padding: 12,
    backgroundColor: theme.colors.background,
    borderRadius: theme.radius.md,
  },
  qrisImage: { width: 180, height: 180 },
  qrisLabel: { fontSize: 12, color: theme.colors.textSecondary, marginTop: 8 },
  bankRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.surfaceMuted,
  },
  bankLabel: { fontSize: 13, color: theme.colors.textSecondary, width: 100 },
  bankValue: { fontSize: 14, fontWeight: theme.typography.weight.semibold, color: theme.colors.text, flex: 1 },
  bankAccNumber: { fontSize: 16, fontWeight: theme.typography.weight.bold, color: theme.colors.primary, flex: 1, letterSpacing: 1 },

  payBtn: {
    backgroundColor: theme.colors.primary,
    borderRadius: theme.radius.md,
    paddingVertical: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 16,
  },
  payBtnText: { fontSize: 15, fontWeight: theme.typography.weight.semibold, color: theme.colors.textOnPrimary },

  payForm: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.lg - 2,
    padding: 16,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  payFormTitle: { fontSize: 15, fontWeight: theme.typography.weight.semibold, color: theme.colors.text, marginBottom: 4 },
  payFormHint: { fontSize: 12, color: theme.colors.textSecondary, marginBottom: 12, lineHeight: 18 },
  uploadBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: theme.colors.borderStrong,
    backgroundColor: theme.colors.background,
    marginBottom: 12,
  },
  uploadBtnText: { fontSize: 13, fontWeight: theme.typography.weight.semibold, color: theme.colors.primary },
  previewImage: { width: '100%', height: 180, borderRadius: 10, marginBottom: 12 },
  payInput: {
    backgroundColor: theme.colors.background,
    borderWidth: 1,
    borderColor: theme.colors.borderStrong,
    borderRadius: 10,
    padding: 12,
    fontSize: 14,
    color: theme.colors.text,
    minHeight: 72,
    textAlignVertical: 'top',
    marginBottom: 12,
  },
  payFormActions: { flexDirection: 'row', gap: 10, justifyContent: 'flex-end' },
  cancelSmallBtn: {
    borderWidth: 1,
    borderColor: theme.colors.borderStrong,
    borderRadius: 8,
    paddingVertical: 10,
    paddingHorizontal: 20,
  },
  cancelSmallBtnText: { fontSize: 14, fontWeight: theme.typography.weight.semibold, color: theme.colors.textSecondary },
  submitPayBtn: {
    backgroundColor: theme.colors.primary,
    borderRadius: 8,
    paddingVertical: 10,
    paddingHorizontal: 24,
  },
  submitPayBtnText: { fontSize: 14, fontWeight: theme.typography.weight.semibold, color: theme.colors.textOnPrimary },
  btnDisabled: { opacity: 0.5 },

  verifyingCard: {
    backgroundColor: theme.colors.warningLight,
    borderRadius: theme.radius.md,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderWidth: 1,
    borderColor: theme.colors.warningLight,
  },
  verifyingText: { fontSize: 13, color: theme.colors.warning, flex: 1, lineHeight: 18 },
});

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
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, router } from 'expo-router';
import apiClient, { unwrap } from '../../lib/api-client';
import { LoadingView, StatusBadge } from '../../components/ui/shared';
import type { Dues, DuesPayment } from '../../types';

const STATUS_STYLES: Record<string, { label: string; color: string; bg: string }> = {
  lunas: { label: 'Lunas', color: '#16a34a', bg: '#ecfdf5' },
  menunggak: { label: 'Menunggak', color: '#dc2626', bg: '#fef2f2' },
  belum_dibayar: { label: 'Belum Dibayar', color: '#6b7280', bg: '#f3f4f6' },
  menunggu_verifikasi: { label: 'Menunggu', color: '#ca8a04', bg: '#fef3c7' },
};

export default function DuesDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [dues, setDues] = useState<Dues | null>(null);
  const [payments, setPayments] = useState<DuesPayment[]>([]);
  const [loading, setLoading] = useState(true);
  const [showPayForm, setShowPayForm] = useState(false);
  const [catatan, setCatatan] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const fetchData = async () => {
    try {
      const [duesRes, payRes] = await Promise.all([
        apiClient.get(`/dues/${id}`),
        apiClient.get(`/dues/${id}/payments`),
      ]);
      setDues(unwrap(duesRes));
      setPayments(unwrap(payRes) || []);
    } catch {
      /* ignore */
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchData();
  }, [id]);

  const handlePay = async () => {
    if (!catatan.trim()) {
      Alert.alert('Error', 'Catatan pembayaran harus diisi');
      return;
    }
    setSubmitting(true);
    try {
      await apiClient.post(`/dues/${id}/payments`, { catatan: catatan.trim() });
      Alert.alert('Berhasil', 'Konfirmasi pembayaran berhasil dikirim');
      setShowPayForm(false);
      setCatatan('');
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

      {dues.status !== 'lunas' && !showPayForm && (
        <View style={styles.section}>
          <TouchableOpacity style={styles.payBtn} onPress={() => setShowPayForm(true)}>
            <Ionicons name="card" size={18} color="#fff" />
            <Text style={styles.payBtnText}>Konfirmasi Pembayaran</Text>
          </TouchableOpacity>
        </View>
      )}

      {showPayForm && (
        <View style={styles.section}>
          <View style={styles.payForm}>
            <Text style={styles.payFormTitle}>Konfirmasi Pembayaran Manual</Text>
            <Text style={styles.payFormHint}>
              Masukkan catatan pembayaran (misal: nomor referensi transfer, bank tujuan, dll)
            </Text>
            <TextInput
              style={styles.payInput}
              placeholder="Catatan pembayaran..."
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
                }}
              >
                <Text style={styles.cancelSmallBtnText}>Batal</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.submitPayBtn, submitting && styles.btnDisabled]}
                onPress={handlePay}
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

      <View style={styles.section}>
        <Text style={styles.subTitle}>Riwayat Pembayaran ({payments.length})</Text>
        {payments.length > 0 ? (
          payments.map((p) => (
            <View key={p.id} style={styles.payCard}>
              <View style={styles.payCardLeft}>
                <Ionicons name="receipt" size={18} color="#2563eb" />
                <View style={styles.payCardInfo}>
                  <Text style={styles.payCardAmount}>
                    Rp {Number(p.jumlah).toLocaleString('id-ID')}
                  </Text>
                  <Text style={styles.payCardDate}>
                    {new Date(p.createdAt).toLocaleDateString('id-ID')}
                  </Text>
                  {p.catatan && (
                    <Text style={styles.payCardNote} numberOfLines={2}>
                      {p.catatan}
                    </Text>
                  )}
                </View>
              </View>
              <StatusBadge
                label={p.status === 'verified' ? 'Terverifikasi' : 'Menunggu'}
                color={p.status === 'verified' ? '#16a34a' : '#ca8a04'}
                bg={p.status === 'verified' ? '#ecfdf5' : '#fef3c7'}
              />
            </View>
          ))
        ) : (
          <Text style={styles.emptyText}>Belum ada riwayat pembayaran</Text>
        )}
      </View>

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

  payBtn: {
    backgroundColor: '#16a34a',
    borderRadius: 12,
    paddingVertical: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
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

  subTitle: { fontSize: 15, fontWeight: '600', color: '#1f2937', marginBottom: 12 },

  payCard: {
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
  payCardLeft: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, flex: 1 },
  payCardInfo: { flex: 1 },
  payCardAmount: { fontSize: 14, fontWeight: '600', color: '#111827' },
  payCardDate: { fontSize: 11, color: '#6b7280', marginTop: 2 },
  payCardNote: { fontSize: 11, color: '#9ca3af', marginTop: 2 },

  emptyText: { fontSize: 13, color: '#9ca3af', textAlign: 'center', paddingVertical: 30 },
});
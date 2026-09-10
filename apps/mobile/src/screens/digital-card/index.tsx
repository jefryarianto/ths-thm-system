import React, { useCallback, useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, RefreshControl, Alert, TouchableOpacity } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Ionicons from '@expo/vector-icons/Ionicons';
import apiClient, { unwrap } from '../../lib/api-client';
import { LoadingView, ErrorView } from '../../components/ui/shared';
import { useRefresh } from '../../hooks/use-refresh';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import * as MediaLibrary from 'expo-media-library';
import { theme } from '../../theme';
import { FlipCard, type MemberInfo, type CardData } from './card';

const API_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3001';

// ─── Screen ───

export default function DigitalCardScreen() {
  const [member, setMember] = useState<MemberInfo | null>(null);
  const [cardData, setCardData] = useState<CardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setError(null);
      // Profil anggota milik user yang login (self-scope)
      const me = unwrap<MemberInfo | null>(await apiClient.get('/members/me'));
      setMember(me);
      if (me?.id) {
        try {
          const res = await apiClient.get(`/members/${me.id}/digital-card`);
          const data = unwrap<{
            qrCode: string;
            levelVisual?: { stripCount: number; color: string; label?: string } | null;
            signatureImage?: string | null;
            stampImage?: string | null;
            template?: {
              id?: string | null;
              name?: string | null;
              label?: string | null;
              frontImage?: string | null;
              backImage?: string | null;
              overlayConfig?: Record<string, unknown>;
            } | null;
            card?: { signerName?: string; signerTitle?: string; signers?: { signerName?: string; signerTitle?: string }[] };
          }>(res);
          setCardData({
            qrCode: data.qrCode || null,
            signerName: data.card?.signerName || 'Koordinator Distrik',
            signerTitle: data.card?.signerTitle || 'THS-THM',
            signers: data.card?.signers || [],
            levelVisual: data.levelVisual || null,
            signatureImage: data.signatureImage || null,
            stampImage: data.stampImage || null,
            template: data.template || null,
          });
        } catch {
          // QR/signer gagal dimuat — kartu tetap tampil (fallback nama default)
          setCardData({ qrCode: null, signerName: 'Koordinator Distrik', signerTitle: 'THS-THM', signers: [], levelVisual: null });
        }
      } else {
        // User login tidak punya record anggota (email akun ≠ email anggota) → kartu tidak bisa diisi
        setCardData(null);
        setError(
          'Data anggota Anda tidak ditemukan di sistem. Kemungkinan email akun belum terhubung dengan data anggota — perbarui email anggota di web admin (Anggota → Edit → Email) atau hubungi pengurus.',
        );
      }
    } catch (err) {
      setMember(null);
      setCardData(null);
      const status = (err as { response?: { status?: number } })?.response?.status;
      if (status === 404) {
        // Akun login tidak terhubung ke record anggota mana pun
        setError(
          'Data anggota Anda tidak ditemukan di sistem. Pastikan email akun sudah terhubung dengan data anggota — perbarui email di web admin (Anggota → Edit → Email) atau hubungi pengurus.',
        );
      } else {
        setError('Gagal mengambil data kartu. Periksa koneksi internet Anda lalu coba lagi.');
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const { refreshing, onRefresh } = useRefresh(load);

  // ── Simpan kartu: PDF (share/save via intent) & PNG (langsung ke galeri) ──
  const [saving, setSaving] = useState<'pdf' | 'png' | null>(null);

  const memberId = member?.id;
  const savePdf = async () => {
    if (!memberId) return;
    setSaving('pdf');
    try {
      const token = await AsyncStorage.getItem('accessToken');
      const url = `${API_URL}/api/members/${memberId}/digital-card/pdf`;
      const dest = `${FileSystem.cacheDirectory}kartu-anggota-${memberId}.pdf`;
      await FileSystem.downloadAsync(url, dest, { headers: token ? { Authorization: `Bearer ${token}` } : {} });
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(dest, { mimeType: 'application/pdf', dialogTitle: 'Simpan Kartu Anggota' });
      } else {
        Alert.alert('Kartu tersimpan', `PDF tersimpan di: ${dest}`);
      }
    } catch {
      Alert.alert('Gagal', 'Gagal mengunduh PDF kartu. Periksa koneksi internet.');
    } finally {
      setSaving(null);
    }
  };

  const saveToGallery = async () => {
    if (!memberId) return;
    setSaving('png');
    try {
      const token = await AsyncStorage.getItem('accessToken');
      const url = `${API_URL}/api/members/${memberId}/digital-card/image`;
      // documentDirectory (bukan cache) agar file tidak terhapus saat sistem membersihkan cache
      const dest = `${FileSystem.documentDirectory}kartu-anggota-${memberId}.png`;
      await FileSystem.downloadAsync(url, dest, { headers: token ? { Authorization: `Bearer ${token}` } : {} });

      const perm = await MediaLibrary.requestPermissionsAsync();
      if (!perm.granted) {
        Alert.alert('Izin Diperlukan', 'Aktifkan izin akses media untuk menyimpan ke galeri.');
        return;
      }

      // Simpan ke MediaStore lalu pindahkan ke album "THS-THM" di folder Pictures/
      // (saveToLibraryAsync menaruh file di root DCIM yang tidak selalu muncul di galeri).
      const asset = await MediaLibrary.createAssetAsync(dest);
      try {
        const album = await MediaLibrary.getAlbumAsync('THS-THM');
        if (album) {
          await MediaLibrary.addAssetsToAlbumAsync(asset.id, album.id, false);
        } else {
          await MediaLibrary.createAlbumAsync('THS-THM', asset.id, false);
        }
      } catch {
        // Album opsional — file tetap tersimpan di MediaStore
      }
      Alert.alert('Tersimpan', 'Kartu PNG berhasil disimpan ke galeri (folder THS-THM).');
    } catch {
      Alert.alert('Gagal', 'Gagal menyimpan kartu ke galeri. Coba lagi.');
    } finally {
      setSaving(null);
    }
  };

  if (loading) return <LoadingView />;

  // Error saat data anggota gagal dimuat → tampilkan pesan jelas + tombol coba lagi
  // (daripada kartu kosong diam-diam yang tampak seperti "data belum sinkron").
  if (error && !member) {
    return <ErrorView message={error} onRetry={load} />;
  }

  const validUntil = new Date();
  validUntil.setFullYear(validUntil.getFullYear() + 5);
  const validUntilText = validUntil.toLocaleDateString('id-ID', { day: '2-digit', month: 'long', year: 'numeric' });

  const ttl = [member?.tempatLahir, member?.tanggalLahir ? new Date(member.tanggalLahir).toLocaleDateString('id-ID', { day: '2-digit', month: 'long', year: 'numeric' }) : null]
    .filter(Boolean)
    .join(', ') || '-';
  const dadar = [member?.tempatDadar, member?.tahunDadar].filter(Boolean).join(', ') || '-';

  const insets = useSafeAreaInsets();

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={[styles.containerContent, { paddingTop: insets.top + 16 }]}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
    >
      <Text style={styles.pageTitle}>Kartu Anggota Digital (KTA)</Text>

      <FlipCard member={member} cardData={cardData} ttl={ttl} dadar={dadar} validUntilText={validUntilText} />
      <Text style={styles.flipHint}>👆 Ketuk kartu untuk melihat sisi belakang (QR verifikasi)</Text>

      {/* Simpan / unduh kartu */}
      <View style={styles.saveRow}>
        <TouchableOpacity style={[styles.saveBtn, styles.saveBtnPdf]} onPress={savePdf} disabled={!!saving} activeOpacity={0.8}>
          <Ionicons name="download-outline" size={18} color={theme.colors.surface} />
          <Text style={styles.saveBtnText}>{saving === 'pdf' ? 'Menyimpan…' : 'Simpan PDF'}</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.saveBtn, styles.saveBtnPng]} onPress={saveToGallery} disabled={!!saving} activeOpacity={0.8}>
          <Ionicons name="image-outline" size={18} color={theme.colors.surface} />
          <Text style={styles.saveBtnText}>{saving === 'png' ? 'Menyimpan…' : 'Simpan ke Galeri'}</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.noteBox}>
        <Text style={styles.noteText}>
          Kartu digital ini menggunakan format CR80 landscape (856×540 px) dengan QR Code untuk verifikasi keaslian. Scan QR untuk memvalidasi data anggota.
        </Text>
      </View>
    </ScrollView>
  );
}

// ─── Styles ───

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.surfaceMuted },
  containerContent: { padding: 16, paddingBottom: 40, alignItems: 'center' },
  pageTitle: { fontSize: 20, fontWeight: '700', color: theme.colors.text, marginBottom: 4, alignSelf: 'flex-start' },
  sectionLabel: { fontSize: 13, fontWeight: '600', color: theme.colors.textSecondary, marginTop: 20, marginBottom: 10, alignSelf: 'flex-start' },
  flipHint: { fontSize: 12, color: theme.colors.textSecondary, marginTop: 10, alignSelf: 'flex-start' },

  // Tombol simpan kartu
  saveRow: { flexDirection: 'row', gap: 10, marginTop: 12, alignSelf: 'stretch' },
  saveBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 12, borderRadius: 10 },
  saveBtnPdf: { backgroundColor: theme.colors.primary },
  saveBtnPng: { backgroundColor: '#0f766e' },
  saveBtnText: { color: theme.colors.surface, fontSize: 14, fontWeight: '700' },

  noteBox: { marginTop: 24, backgroundColor: theme.colors.warningLight, borderRadius: 12, padding: 14, borderWidth: 1, borderColor: theme.colors.warningLight, width: '100%' },
  noteText: { fontSize: 13, lineHeight: 19, color: theme.colors.warning },
});
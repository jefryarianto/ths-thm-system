import React, { useCallback, useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, RefreshControl, Alert, TouchableOpacity, Animated, Linking } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Ionicons from '@expo/vector-icons/Ionicons';
import { Gesture, GestureDetector, GestureHandlerRootView } from 'react-native-gesture-handler';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import * as MediaLibrary from 'expo-media-library';
import { theme } from '../../theme';
import { FlipCard, type MemberInfo, type CardData } from './card';
import apiClient, { API_URL, unwrap } from '../../lib/api-client';
import { LoadingView, ErrorView } from '../../components/ui/shared';
import { useRefresh } from '../../hooks/use-refresh';

// ─── Pendukung simpan kartu ───

/**
 * Cek hasil unduhan: file harus tersimpan (>0 byte) DAN isinya benar-benar kartu
 * (bukan respons JSON/HTML error yang mencekik byte-size). Indikasi via "magic"
 * format: PDF diawali `%PDF`, PNG diawali signature `\x89PNG`.
 */
async function assertDownloadedFile(path: string, kind: 'pdf' | 'png'): Promise<void> {
  const info = await FileSystem.getInfoAsync(path);
  if (!info.exists) throw new Error('FILE_MISSING');
  if ('size' in info && typeof info.size === 'number' && info.size <= 0) throw new Error('EMPTY_FILE');
  // 4096 char base64 ≈ 3 KB pertama — cukup untuk memeriksa signature.
  let head = '';
  try {
    head = await FileSystem.readAsStringAsync(path, { encoding: FileSystem.EncodingType.Base64 });
  } catch {
    throw new Error('UNREADABLE');
  }
  const sig = head.slice(0, 32);
  if (kind === 'pdf' && !sig.startsWith('JVBERi0')) throw new Error('NOT_PDF');
  if (kind === 'png' && !sig.startsWith('iVBORw0KGgo')) throw new Error('NOT_PNG');
}

/** Unduh kartu dengan cek status HTTP. Galat server (4xx/5xx) dilempar sebagai
 *  `SERVER_ERROR:<status>` supaya pesan tidak keliru jadi "bukan PNG/PDF". */
async function downloadFile(url: string, dest: string, token: string | null): Promise<void> {
  const res = await FileSystem.downloadAsync(url, dest, { headers: token ? { Authorization: `Bearer ${token}` } : {} });
  if (res && typeof res.status === 'number' && res.status >= 400) {
    await FileSystem.deleteAsync(dest, { idempotent: true }).catch(() => {});
    throw new Error(`SERVER_ERROR:${res.status}`);
  }
}

/** Bungkus FlipCard dengan zoom (pinch 2 jari → 1–3,5×), pan (geser 2 jari),
 *  dan ketuk untuk membalik (tunggal) / double-tap untuk zoom. */
function ZoomableCard({
  member,
  cardData,
  ttl,
  dadar,
  validUntilText,
}: {
  member: MemberInfo | null;
  cardData: CardData | null;
  ttl: string;
  dadar: string;
  validUntilText: string;
}) {
  const scale = useRef(new Animated.Value(1)).current;
  const tx = useRef(new Animated.Value(0)).current;
  const ty = useRef(new Animated.Value(0)).current;
  const flipRef = useRef<(() => void) | null>(null);

  const savedScale = useRef(1);
  const pinchStart = useRef(1);
  const lastPinch = useRef(1);
  const savedTx = useRef(0);
  const savedTy = useRef(0);
  const curTx = useRef(0);
  const curTy = useRef(0);

  const MIN = 1;
  const MAX = 3.5;
  const clampS = (v: number) => Math.min(Math.max(v, MIN), MAX);
  const resetPan = () => {
    savedTx.current = 0; savedTy.current = 0; curTx.current = 0; curTy.current = 0;
    tx.setValue(0); ty.setValue(0);
  };

  const pinch = Gesture.Pinch()
    .onStart(() => { pinchStart.current = savedScale.current; })
    .onUpdate((e) => { lastPinch.current = e.scale; scale.setValue(clampS(pinchStart.current * e.scale)); })
    .onEnd(() => {
      const s = clampS(pinchStart.current * lastPinch.current);
      savedScale.current = s;
      scale.setValue(s);
      if (s <= MIN) resetPan();
    });

  const pan = Gesture.Pan()
    .averageTouches(true)
    .minPointers(2)
    .maxPointers(2)
    .onUpdate((e) => {
      // Pan hanya aktif saat kartu sudah di-zoom (>1×); di 1× abaikan geseran 2 jari
      if (savedScale.current <= MIN) return;
      const nx = savedTx.current + e.translationX;
      const ny = savedTy.current + e.translationY;
      curTx.current = nx; curTy.current = ny;
      tx.setValue(nx); ty.setValue(ny);
    })
    .onEnd(() => { savedTx.current = curTx.current; savedTy.current = curTy.current; });

  const doubleTap = Gesture.Tap()
    .numberOfTaps(2)
    .maxDelay(220)
    .onEnd(() => {
      if (savedScale.current > MIN) {
        savedScale.current = MIN;
        resetPan();
        Animated.timing(scale, { toValue: MIN, duration: 200, useNativeDriver: true }).start();
      } else {
        savedScale.current = 2.2;
        Animated.spring(scale, { toValue: 2.2, friction: 8, tension: 60, useNativeDriver: true }).start();
      }
    });

  const singleTap = Gesture.Tap()
    .maxDelay(220)
    .requireExternalGestureToFail(doubleTap)
    .onEnd(() => flipRef.current?.());

  const composed = Gesture.Simultaneous(pinch, pan, Gesture.Exclusive(doubleTap, singleTap));

  return (
    <GestureHandlerRootView style={styles.zoomRoot}>
      <GestureDetector gesture={composed}>
        <View style={styles.zoomStage}>
          <Animated.View style={{ transform: [{ translateX: tx }, { translateY: ty }, { scale }] }}>
            <FlipCard
              member={member}
              cardData={cardData}
              ttl={ttl}
              dadar={dadar}
              validUntilText={validUntilText}
              flipRef={flipRef}
            />
          </Animated.View>
        </View>
      </GestureDetector>
    </GestureHandlerRootView>
  );
}

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
    const dest = `${FileSystem.cacheDirectory}kartu-anggota-${memberId}.pdf`;
    try {
      const token = await AsyncStorage.getItem('accessToken');
      await downloadFile(`${API_URL}/api/members/${memberId}/digital-card/pdf`, dest, token);
      await assertDownloadedFile(dest, 'pdf');
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(dest, { mimeType: 'application/pdf', dialogTitle: 'Simpan Kartu Anggota' });
      } else {
        Alert.alert('Kartu tersimpan', `PDF tersimpan di: ${dest}`);
      }
    } catch (err) {
      await FileSystem.deleteAsync(dest, { idempotent: true }).catch(() => {});
      const msg = (err as Error)?.message || '';
      Alert.alert(
        'Gagal',
        msg.startsWith('SERVER_ERROR:')
          ? `Server mengembalikan galat (HTTP ${msg.split(':')[1]}). Coba lagi nanti.`
          : msg === 'EMPTY_FILE'
            ? 'Server mengirim kartu kosong (0 byte). Coba lagi nanti.'
            : msg === 'NOT_PDF'
              ? 'File yang diunduh bukan PDF (ada galat server). Coba lagi nanti.'
              : 'Gagal mengunduh PDF kartu. Periksa koneksi internet lalu coba lagi.',
      );
    } finally {
      setSaving(null);
    }
  };

  const saveToGallery = async () => {
    if (!memberId) return;
    setSaving('png');
    const dest = `${FileSystem.documentDirectory}kartu-anggota-${memberId}.png`;
    try {
      const token = await AsyncStorage.getItem('accessToken');
      await downloadFile(`${API_URL}/api/members/${memberId}/digital-card/image`, dest, token);
      await assertDownloadedFile(dest, 'png');

      const perm = await MediaLibrary.requestPermissionsAsync();
      if (!perm.granted) {
        if ('canAskAgain' in perm && perm.canAskAgain === false) {
          await FileSystem.deleteAsync(dest, { idempotent: true }).catch(() => {});
          Alert.alert(
            'Izin Pemutusan',
            'Akses media tidak dapat diminta lagi. Buka pengaturan aplikasi lalu aktifkan izin Penyimpanan, kemudian coba lagi.',
            [
              { text: 'Buka Pengaturan', onPress: () => Linking.openSettings() },
              { text: 'Nanti', style: 'cancel' },
            ],
          );
        } else {
          await FileSystem.deleteAsync(dest, { idempotent: true }).catch(() => {});
          Alert.alert('Izin Diperlukan', 'Aktifkan izin akses media untuk menyimpan ke galeri.');
        }
        return;
      }

      // MediaStore + album "THS-THM" di folder Pictures/. Bila jalur ini gagal
      // (sering terjadi di emulator seperti LDPlayer), pakai fallback langsung
      // ke galeri sistem — dijamin muncul walau tanpa album kustom.
      let savedViaAlbum = true;
      try {
        const asset = await MediaLibrary.createAssetAsync(dest);
        const album = await MediaLibrary.getAlbumAsync('THS-THM');
        if (album) {
          await MediaLibrary.addAssetsToAlbumAsync(asset.id, album.id, false);
        } else {
          await MediaLibrary.createAlbumAsync('THS-THM', asset.id, false);
        }
      } catch (e) {
        savedViaAlbum = false;
        console.warn('MediaStore/album gagal, pakai saveToLibraryAsync:', (e as Error)?.message);
        await MediaLibrary.saveToLibraryAsync(dest);
      }
      // Berhasil → hapus temp (kartu sudah di galeri sistem).
      await FileSystem.deleteAsync(dest, { idempotent: true }).catch(() => {});
      Alert.alert(
        'Tersimpan',
        savedViaAlbum ? 'Kartu PNG berhasil disimpan ke galeri (folder THS-THM).' : 'Kartu PNG berhasil disimpan ke galeri.',
      );
    } catch (err) {
      await FileSystem.deleteAsync(dest, { idempotent: true }).catch(() => {});
      const msg = (err as Error)?.message || '';
      const friendly =
        msg.startsWith('SERVER_ERROR:')
          ? `Server mengembalikan galat (HTTP ${msg.split(':')[1]}). Coba lagi nanti.`
          : msg === 'EMPTY_FILE'
            ? 'Server mengirim kartu kosong (0 byte). Coba lagi nanti.'
            : msg === 'NOT_PNG'
              ? 'File yang diunduh bukan PNG (ada galat server). Coba lagi nanti.'
              : msg === 'UNREADABLE' || msg === 'FILE_MISSING'
                ? 'File kartu tidak terbaca di perangkat. Coba lagi nanti.'
                : `Gagal menyimpan ke galeri (${msg || 'error tidak dikenal'}). Periksa izin Penyimpanan di Pengaturan, lalu coba lagi.`;
      Alert.alert('Gagal', friendly);
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

      <ZoomableCard member={member} cardData={cardData} ttl={ttl} dadar={dadar} validUntilText={validUntilText} />
      <Text style={styles.flipHint}>👆 Ketuk kartu untuk membalik • Cubit 2 jari untuk zoom</Text>

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

  // Zoom kartu — stage selebar layar agar transform pinch/pan bisa melampaui kartu
  zoomRoot: { flex: 1, width: '100%' },
  zoomStage: { alignItems: 'center' },
});
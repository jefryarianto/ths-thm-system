import React, { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Switch,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Ionicons from '@expo/vector-icons/Ionicons';
import Constants from 'expo-constants';
import * as Updates from 'expo-updates';
import { BackButton } from '../src/components/ui/shared';
import {
  getOtaAutoCheckEnabled,
  setOtaAutoCheckEnabled,
} from '../src/hooks/use-ota-update';

/** Format tanggal update dalam locale Indonesia. */
function formatDate(date?: Date): string {
  if (!date) return '-';
  try {
    return date.toLocaleString('id-ID', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return '-';
  }
}

export default function AboutScreen() {
  const insets = useSafeAreaInsets();

  // Info aplikasi (nilai statis untuk bundle yang sedang berjalan)
  const appVersion = Constants.expoConfig?.version ?? '-';
  const runtimeVersion = Updates.runtimeVersion ?? '-';
  const updateId = Updates.updateId ?? null;
  const channel = Updates.channel ?? '-';
  const createdAt = Updates.createdAt ?? null;
  const isEmbedded = Updates.isEmbeddedLaunch;
  const otaEnabled = Updates.isEnabled;

  // State machine pembaruan (shared dengan native expo-updates)
  const {
    isChecking,
    isUpdateAvailable,
    isDownloading,
    isUpdatePending,
    checkError,
    downloadError,
  } = Updates.useUpdates();

  // Setelan auto-check
  const [autoCheck, setAutoCheck] = useState<boolean | null>(null);

  // Status cek manual lokal (untuk pesan "sudah terbaru")
  const [checkedOnce, setCheckedOnce] = useState(false);

  useEffect(() => {
    getOtaAutoCheckEnabled().then(setAutoCheck);
  }, []);

  const handleToggleAutoCheck = useCallback(async (value: boolean) => {
    setAutoCheck(value);
    await setOtaAutoCheckEnabled(value);
  }, []);

  const handleCheckForUpdate = useCallback(async () => {
    if (!otaEnabled || isChecking || isDownloading) return;
    try {
      setCheckedOnce(false);
      await Updates.checkForUpdateAsync();
      setCheckedOnce(true);
    } catch {
      // error tampil via checkError dari useUpdates()
    }
  }, [otaEnabled, isChecking, isDownloading]);

  const handleDownloadUpdate = useCallback(async () => {
    if (!otaEnabled || isDownloading || isUpdatePending) return;
    try {
      await Updates.fetchUpdateAsync();
    } catch {
      // error tampil via downloadError dari useUpdates()
    }
  }, [otaEnabled, isDownloading, isUpdatePending]);

  const handleApplyUpdate = useCallback(async () => {
    if (!otaEnabled || !isUpdatePending) return;
    try {
      await Updates.reloadAsync();
    } catch {
      // biarkan pengguna coba lagi
    }
  }, [otaEnabled, isUpdatePending]);

  // Turunan status untuk UI
  const errorMessage =
    downloadError?.message ?? checkError?.message ?? null;
  const isUpToDate =
    checkedOnce && !isUpdateAvailable && !isUpdatePending && !errorMessage && !isChecking && !isDownloading;

  // Komponen baris info
  const InfoRow = ({ label, value }: { label: string; value: string }) => (
    <View style={styles.infoRow}>
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={styles.infoValue} numberOfLines={1} ellipsizeMode="middle">
        {value}
      </Text>
    </View>
  );

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ paddingBottom: 40 }}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + 16 }]}>
        <BackButton />
        <Text style={styles.headerTitle}>Tentang Aplikasi</Text>
      </View>

      {/* Identitas aplikasi */}
      <View style={styles.identity}>
        <View style={styles.logoCircle}>
          <Ionicons name="shield-checkmark" size={44} color="#2563eb" />
        </View>
        <Text style={styles.appName}>THS-THM</Text>
        <Text style={styles.appDesc}>
          Sistem Informasi Organisasi THS-THM{'\n'}untuk anggota dan penguji.
        </Text>
      </View>

      {/* Informasi aplikasi */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Informasi Aplikasi</Text>
        <View style={styles.card}>
          <InfoRow label="Versi Aplikasi" value={appVersion} />
          <View style={styles.divider} />
          <InfoRow label="Runtime Version" value={runtimeVersion} />
          <View style={styles.divider} />
          <InfoRow
            label="ID Pembaruan"
            value={updateId ? updateId.slice(0, 8).toUpperCase() : 'Bawaan (APK)'}
          />
          <View style={styles.divider} />
          <InfoRow label="Channel" value={channel} />
          <View style={styles.divider} />
          <InfoRow label="Sumber Bundle" value={isEmbedded ? 'Bawaan APK' : 'Pembaruan OTA'} />
          <View style={styles.divider} />
          <InfoRow label="Dibuat" value={formatDate(createdAt ?? undefined)} />
        </View>
      </View>

      {/* Pembaruan */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Pembaruan</Text>
        <View style={styles.card}>
          {/* Status */}
          <View style={styles.statusRow}>
            <Text style={styles.infoLabel}>Status</Text>
            {isChecking || isDownloading ? (
              <View style={styles.statusInline}>
                <ActivityIndicator size="small" color="#2563eb" />
                <Text style={[styles.statusChip, styles.statusInfo]}>
                  {isChecking ? 'Memeriksa…' : 'Mengunduh…'}
                </Text>
              </View>
            ) : (
              <Text
                style={[
                  styles.statusChip,
                  isUpdatePending
                    ? styles.statusSuccess
                    : isUpdateAvailable
                      ? styles.statusInfo
                      : errorMessage
                        ? styles.statusError
                        : styles.statusNeutral,
                ]}
              >
                {isUpdatePending
                  ? 'Siap Diterapkan'
                  : isUpdateAvailable
                    ? 'Pembaruan Tersedia'
                    : errorMessage
                      ? 'Gagal'
                      : isUpToDate
                        ? 'Terbaru'
                        : 'Belum Diperiksa'}
              </Text>
            )}
          </View>

          {/* Pesan error */}
          {errorMessage && (
            <Text style={styles.errorText} numberOfLines={3}>
              {errorMessage}
            </Text>
          )}

          {/* Catatan mode dev */}
          {!otaEnabled && (
            <Text style={styles.hintText}>
              Pembaruan OTA tidak tersedia di mode pengembangan (Expo Go / dev client).
            </Text>
          )}

          {/* Aksi utama sesuai status */}
          {otaEnabled && (
            <View style={styles.actionArea}>
              {isUpdatePending ? (
                <TouchableOpacity
                  style={[styles.button, styles.buttonPrimary]}
                  onPress={handleApplyUpdate}
                  activeOpacity={0.8}
                >
                  <Ionicons name="reload" size={16} color="#fff" style={{ marginRight: 6 }} />
                  <Text style={styles.buttonPrimaryText}>Muat Ulang &amp; Terapkan</Text>
                </TouchableOpacity>
              ) : isDownloading ? null : isUpdateAvailable ? (
                <TouchableOpacity
                  style={[styles.button, styles.buttonPrimary]}
                  onPress={handleDownloadUpdate}
                  activeOpacity={0.8}
                >
                  <Ionicons name="cloud-download" size={16} color="#fff" style={{ marginRight: 6 }} />
                  <Text style={styles.buttonPrimaryText}>Unduh Pembaruan</Text>
                </TouchableOpacity>
              ) : (
                <TouchableOpacity
                  style={[styles.button, styles.buttonSecondary]}
                  onPress={handleCheckForUpdate}
                  disabled={isChecking}
                  activeOpacity={0.8}
                >
                  <Ionicons name="search" size={16} color="#2563eb" style={{ marginRight: 6 }} />
                  <Text style={styles.buttonSecondaryText}>
                    {isChecking ? 'Memeriksa…' : 'Cek Pembaruan Sekarang'}
                  </Text>
                </TouchableOpacity>
              )}

              {isUpToDate && (
                <Text style={styles.hintText}>
                  Aplikasi sudah menggunakan versi terbaru.
                </Text>
              )}
              {errorMessage && (
                <TouchableOpacity onPress={handleCheckForUpdate} disabled={isChecking}>
                  <Text style={styles.retryText}>Coba Lagi</Text>
                </TouchableOpacity>
              )}
              {isUpdateAvailable && (
                <TouchableOpacity onPress={handleCheckForUpdate} disabled={isChecking}>
                  <Text style={styles.retryText}>Periksa Ulang</Text>
                </TouchableOpacity>
              )}
              <Text style={styles.hintText}>
                Jika tersedia pembaruan native (versi APK baru), pasang APK terbaru secara manual.
              </Text>
            </View>
          )}
        </View>
      </View>

      {/* Setelan pembaruan */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Setelan Pembaruan</Text>
        <View style={[styles.card, styles.settingRow]}>
          <View style={styles.settingContent}>
            <Text style={styles.settingLabel}>Periksa otomatis saat dibuka</Text>
            <Text style={styles.settingDesc}>
              {autoCheck
                ? 'Aplikasi memeriksa & menampilkan prompt pembaruan otomatis.'
                : 'Pembaruan hanya diperiksa manual dari layar ini.'}
            </Text>
          </View>
          <Switch
            value={autoCheck === null ? true : autoCheck}
            onValueChange={handleToggleAutoCheck}
            trackColor={{ false: '#d1d5db', true: '#2563eb' }}
            thumbColor="#fff"
            disabled={autoCheck === null}
          />
        </View>
      </View>

      {/* Footer */}
      <Text style={styles.footer}>© THS-THM — Pro Patria et Ecclesia</Text>
    </ScrollView>



);
}


const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f3f4f6' },
  header: {
    backgroundColor: '#2563eb',
    padding: 24,
    paddingBottom: 20,
  },
  headerTitle: { color: '#fff', fontSize: 22, fontWeight: 'bold', marginTop: 4 },
  identity: { alignItems: 'center', paddingVertical: 28, backgroundColor: '#fff' },
  logoCircle: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: '#eff6ff',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  appName: { fontSize: 22, fontWeight: '700', color: '#111827' },
  appDesc: { fontSize: 13, color: '#6b7280', textAlign: 'center', marginTop: 6, lineHeight: 19 },
  section: { padding: 16, paddingBottom: 0 },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#6b7280',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 8,
    marginLeft: 4,
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    paddingVertical: 4,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  infoLabel: { fontSize: 14, color: '#6b7280' },
  infoValue: { fontSize: 14, fontWeight: '600', color: '#111827', maxWidth: '60%', textAlign: 'right' },
  divider: { height: 1, backgroundColor: '#f3f4f6', marginHorizontal: 16 },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  statusInline: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  statusChip: { fontSize: 13, fontWeight: '700', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999, overflow: 'hidden' },
  statusNeutral: { color: '#6b7280', backgroundColor: '#f3f4f6' },
  statusInfo: { color: '#1d4ed8', backgroundColor: '#dbeafe' },
  statusSuccess: { color: '#166534', backgroundColor: '#dcfce7' },
  statusError: { color: '#991b1b', backgroundColor: '#fee2e2' },
  errorText: {
    fontSize: 12,
    color: '#b91c1c',
    paddingHorizontal: 16,
    paddingBottom: 8,
  },
  hintText: { fontSize: 12, color: '#9ca3af', textAlign: 'center', paddingHorizontal: 16 },
  actionArea: { padding: 16, paddingTop: 4, gap: 10, alignItems: 'center' },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 10,
    paddingVertical: 12,
    paddingHorizontal: 16,
    alignSelf: 'stretch',
  },
  buttonPrimary: { backgroundColor: '#2563eb' },
  buttonPrimaryText: { color: '#fff', fontSize: 15, fontWeight: '600' },
  buttonSecondary: { backgroundColor: '#eff6ff', borderWidth: 1, borderColor: '#bfdbfe' },
  buttonSecondaryText: { color: '#2563eb', fontSize: 15, fontWeight: '600' },
  retryText: { fontSize: 13, fontWeight: '600', color: '#2563eb' },
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  settingContent: { flex: 1, marginRight: 12 },
  settingLabel: { fontSize: 15, fontWeight: '600', color: '#111827' },
  settingDesc: { fontSize: 12, color: '#9ca3af', marginTop: 2, lineHeight: 17 },
  footer: {
    textAlign: 'center',
    fontSize: 12,
    color: '#9ca3af',
    marginTop: 24,
  },
});


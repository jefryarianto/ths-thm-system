import React, { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Switch,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Ionicons from '@expo/vector-icons/Ionicons';
import Constants from 'expo-constants';
import * as Updates from 'expo-updates';
import { BackButton, LoadingSpinner } from '../src/components/ui/shared';
import {
  getOtaAutoCheckEnabled,
  setOtaAutoCheckEnabled,
} from '../src/hooks/use-ota-update';
import { theme } from '../src/theme';

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
          <Ionicons name="shield-checkmark" size={44} color={theme.colors.primary} />
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
                <LoadingSpinner size="small" color={theme.colors.primary} />
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
                  <Ionicons name="reload" size={16} color={theme.colors.surface} style={{ marginRight: 6 }} />
                  <Text style={styles.buttonPrimaryText}>Muat Ulang &amp; Terapkan</Text>
                </TouchableOpacity>
              ) : isDownloading ? null : isUpdateAvailable ? (
                <TouchableOpacity
                  style={[styles.button, styles.buttonPrimary]}
                  onPress={handleDownloadUpdate}
                  activeOpacity={0.8}
                >
                  <Ionicons name="cloud-download" size={16} color={theme.colors.surface} style={{ marginRight: 6 }} />
                  <Text style={styles.buttonPrimaryText}>Unduh Pembaruan</Text>
                </TouchableOpacity>
              ) : (
                <TouchableOpacity
                  style={[styles.button, styles.buttonSecondary]}
                  onPress={handleCheckForUpdate}
                  disabled={isChecking}
                  activeOpacity={0.8}
                >
                  <Ionicons name="search" size={16} color={theme.colors.primary} style={{ marginRight: 6 }} />
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
            trackColor={{ false: theme.colors.borderStrong, true: theme.colors.primary }}
            thumbColor={theme.colors.surface}
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
  container: { flex: 1, backgroundColor: theme.colors.surfaceMuted },
  header: {
    backgroundColor: theme.colors.primary,
    padding: 24,
    paddingBottom: 28,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
  },
  headerTitle: { color: theme.colors.surface, fontSize: 22, fontWeight: 'bold', marginTop: 4 },
  identity: { alignItems: 'center', paddingVertical: 28, backgroundColor: theme.colors.surface, borderBottomWidth: 1, borderBottomColor: theme.colors.surfaceMuted },
  logoCircle: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: theme.colors.primarySofter,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
    borderWidth: 1,
    borderColor: theme.colors.primaryLight,
  },
  appName: { fontSize: 22, fontWeight: '700', color: theme.colors.text },
  appDesc: { fontSize: 13, color: theme.colors.textMuted, textAlign: 'center', marginTop: 6, lineHeight: 19 },
  section: { padding: 16, paddingBottom: 0 },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: theme.colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 8,
    marginLeft: 4,
  },
  card: {
    backgroundColor: theme.colors.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: theme.colors.surfaceMuted,
    paddingVertical: 4,
    shadowColor: theme.colors.text,
    shadowOpacity: 0.05,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 3 },
    elevation: 2,
    overflow: 'hidden',
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  infoLabel: { fontSize: 14, color: theme.colors.textMuted },
  infoValue: { fontSize: 14, fontWeight: '600', color: theme.colors.text, maxWidth: '60%', textAlign: 'right' },
  divider: { height: 1, backgroundColor: theme.colors.surfaceMuted, marginHorizontal: 16 },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  statusInline: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  statusChip: { fontSize: 13, fontWeight: '700', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999, overflow: 'hidden' },
  statusNeutral: { color: theme.colors.textSecondary, backgroundColor: theme.colors.surfaceMuted },
  statusInfo: { color: theme.colors.primaryDark, backgroundColor: theme.colors.primaryLight },
  statusSuccess: { color: theme.colors.success, backgroundColor: theme.colors.successLight },
  statusError: { color: theme.colors.danger, backgroundColor: theme.colors.dangerLight },
  errorText: {
    fontSize: 12,
    color: theme.colors.danger,
    paddingHorizontal: 16,
    paddingBottom: 8,
  },
  hintText: { fontSize: 12, color: theme.colors.textMuted, textAlign: 'center', paddingHorizontal: 16 },
  actionArea: { padding: 16, paddingTop: 4, gap: 10, alignItems: 'center' },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 12,
    paddingVertical: 13,
    paddingHorizontal: 16,
    alignSelf: 'stretch',
  },
  buttonPrimary: { backgroundColor: theme.colors.primary, shadowColor: theme.colors.primary, shadowOpacity: 0.25, shadowRadius: 8, shadowOffset: { width: 0, height: 4 }, elevation: 3 },
  buttonPrimaryText: { color: theme.colors.surface, fontSize: 15, fontWeight: '600' },
  buttonSecondary: { backgroundColor: theme.colors.primarySofter, borderWidth: 1, borderColor: theme.colors.headerSub },
  buttonSecondaryText: { color: theme.colors.primary, fontSize: 15, fontWeight: '600' },
  retryText: { fontSize: 13, fontWeight: '600', color: theme.colors.primary },
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  settingContent: { flex: 1, marginRight: 12 },
  settingLabel: { fontSize: 15, fontWeight: '600', color: theme.colors.text },
  settingDesc: { fontSize: 12, color: theme.colors.textMuted, marginTop: 2, lineHeight: 17 },
  footer: {
    textAlign: 'center',
    fontSize: 12,
    color: theme.colors.textMuted,
    marginTop: 24,
  },
});


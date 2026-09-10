import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  TouchableOpacity,
  Switch,
  Alert,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Ionicons from '@expo/vector-icons/Ionicons';
import { router } from 'expo-router';
import apiClient, { unwrap } from '../../lib/api-client';
import { LoadingView } from '../../components/ui/shared';
import {
  setNotificationDeviceSettings,
  getNotificationDeviceSettings,
} from '../../lib/fcm';
import { getNotificationSoundEnabled, setNotificationSoundEnabled } from '../../lib/notification-alert';
import { theme } from '../../theme';

interface NotificationType {
  key: string;
  label: string;
  description: string;
}

interface ChannelPrefs {
  push: boolean;
  inApp: boolean;
  email: boolean;
}

interface GlobalPrefs {
  push: boolean;
  inApp: boolean;
  email: boolean;
}

interface QuietHours {
  enabled: boolean;
  start: string;
  end: string;
  timezoneOffset: number;
}

const FALLBACK_TYPES: NotificationType[] = [
  { key: 'welcome', label: 'Selamat Datang', description: 'Notifikasi saat pertama kali mendaftar' },
  { key: 'data_incomplete', label: 'Data Tidak Lengkap', description: 'Pengingat untuk melengkapi data diri' },
  { key: 'reminder_latihan', label: 'Pengingat Latihan', description: 'Pengingat jadwal latihan rutin' },
  { key: 'reminder_pendadaran', label: 'Pengingat Pendadaran', description: 'Pengingat jadwal ujian pendadaran' },
  { key: 'reminder_iuran', label: 'Pengingat Iuran', description: 'Pengingat pembayaran iuran' },
  { key: 'status_klaim', label: 'Status Klaim', description: 'Update status pengajuan klaim dokumen' },
  { key: 'dokumen_ready', label: 'Dokumen Siap', description: 'Notifikasi dokumen telah selesai diproses' },
  { key: 'badge_earned', label: 'Badge Gamifikasi', description: 'Notifikasi saat mendapat badge baru' },
  { key: 'approval_request', label: 'Persetujuan', description: 'Notifikasi saat ada pengajuan baru yang perlu disetujui' },
  { key: 'forum_reply', label: 'Balasan Forum', description: 'Notifikasi saat ada balasan baru di thread forum' },
  { key: 'forum_solution', label: 'Solusi Forum', description: 'Notifikasi saat balasan ditandai sebagai solusi' },
  { key: 'umum', label: 'Umum', description: 'Notifikasi umum dan pengumuman' },
];

const DEFAULT_GLOBAL: GlobalPrefs = { push: true, inApp: true, email: true };
const DEFAULT_QUIET_HOURS: QuietHours = {
  enabled: false,
  start: '22:00',
  end: '06:00',
  timezoneOffset: 0,
};

const pad = (n: number) => n.toString().padStart(2, '0');

interface ChannelConfig {
  key: 'push' | 'inApp' | 'email';
  label: string;
  icon: string;
  color: string;
  track: string;
}

const CHANNELS: ChannelConfig[] = [
  { key: 'push', label: 'Push', icon: 'notifications', color: '#7c3aed', track: '#ddd6fe' },
  { key: 'inApp', label: 'In-App', icon: 'phone-portrait', color: '#2563eb', track: '#bfdbfe' },
  { key: 'email', label: 'Email', icon: 'mail', color: '#16a34a', track: '#86efac' },
];

export default function NotificationPreferencesScreen() {
  const [preferences, setPreferences] = useState<Record<string, ChannelPrefs>>({});
  const [types, setTypes] = useState<NotificationType[]>(FALLBACK_TYPES);
  const [global, setGlobal] = useState<GlobalPrefs>(DEFAULT_GLOBAL);
  const [quietHours, setQuietHours] = useState<QuietHours>(DEFAULT_QUIET_HOURS);
  const [device, setDevice] = useState({ sound: true, vibrate: true });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);
  const [soundEnabled, setSoundEnabled] = useState(true);

  useEffect(() => {
    getNotificationSoundEnabled().then(setSoundEnabled);
  }, []);

  const handleToggleSound = async () => {
    const newVal = !soundEnabled;
    setSoundEnabled(newVal);
    await setNotificationSoundEnabled(newVal);
  };

  useEffect(() => {
    (async () => {
      try {
        const res = await apiClient.get('/notifications/preferences');
        const data = unwrap<{
          prefs: Record<string, ChannelPrefs>;
          types: NotificationType[];
          global: GlobalPrefs;
          quietHours: QuietHours;
        }>(res);
        setPreferences(data.prefs || {});
        if (data.types?.length > 0) setTypes(data.types);
        setGlobal({ ...DEFAULT_GLOBAL, ...(data.global || {}) });
        setQuietHours({ ...DEFAULT_QUIET_HOURS, ...(data.quietHours || {}) });
      } catch {
        /* keep fallbacks */
      }
      try {
        setDevice(await getNotificationDeviceSettings());
      } catch {
        /* ignore */
      }
      setLoading(false);
    })();
  }, []);

  const saveState = async (state: {
    prefs: Record<string, ChannelPrefs>;
    global: GlobalPrefs;
    quietHours: QuietHours;
  }) => {
    try {
      await apiClient.patch('/notifications/preferences', {
        ...state.prefs,
        global: state.global,
        quietHours: {
          ...state.quietHours,
          timezoneOffset: new Date().getTimezoneOffset(),
        },
      });
      return true;
    } catch {
      return false;
    }
  };

  const toggleGlobal = async (channel: 'push' | 'inApp' | 'email', value: boolean) => {
    const snapshot = { preferences, global, quietHours };
    const newGlobal = { ...global, [channel]: value };
    setGlobal(newGlobal);
    setSaving(`global:${channel}`);
    const ok = await saveState({ prefs: preferences, global: newGlobal, quietHours });
    if (!ok) {
      setGlobal(snapshot.global);
      Alert.alert('Gagal', 'Gagal menyimpan pengaturan');
    }
    setSaving(null);
  };

  const updateQuietHours = async (patch: Partial<QuietHours>) => {
    const snapshot = { preferences, global, quietHours };
    const newQuietHours = { ...quietHours, ...patch };
    setQuietHours(newQuietHours);
    setSaving('quiet');
    const ok = await saveState({ prefs: preferences, global, quietHours: newQuietHours });
    if (!ok) {
      setQuietHours(snapshot.quietHours);
      Alert.alert('Gagal', 'Gagal menyimpan pengaturan');
    }
    setSaving(null);
  };

  const toggleDevice = async (field: 'sound' | 'vibrate', value: boolean) => {
    const next = { ...device, [field]: value };
    setDevice(next);
    try {
      await setNotificationDeviceSettings(next);
    } catch {
      Alert.alert('Gagal', 'Gagal menyimpan pengaturan perangkat');
    }
  };

  const insets = useSafeAreaInsets();

  if (loading) return <LoadingView message="Memuat pengaturan..." />;

  const countOn = (channel: 'push' | 'inApp' | 'email') =>
    types.filter((t) => {
      const p = preferences[t.key] || { push: true, inApp: true, email: true };
      return global[channel] && p[channel] !== false;
    }).length;

  return (
    <ScrollView style={styles.container}>
      <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={22} color={theme.colors.surface} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Pengaturan Notifikasi</Text>
      </View>

      <View style={styles.subHeader}>
        <Text style={styles.subHeaderItem}>
          {countOn('push')}/{types.length} Push
        </Text>
        <Text style={styles.subHeaderItem}>
          {countOn('inApp')}/{types.length} In-App
        </Text>
        <Text style={styles.subHeaderItem}>
          {countOn('email')}/{types.length} Email
        </Text>
      </View>

      {/* ── Master Switches ── */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Channel Utama</Text>
        <View style={styles.card}>
          {CHANNELS.map((ch) => (
            <View key={ch.key} style={styles.row}>
              <View style={[styles.rowIcon, { backgroundColor: `${ch.color}1a` }]}>
                <Ionicons name={ch.icon as any} size={18} color={ch.color} />
              </View>
              <View style={styles.rowContent}>
                <Text style={styles.rowLabel}>
                  {ch.key === 'push' ? 'Notifikasi Push' : ch.key === 'inApp' ? 'In-App' : 'Email'}
                </Text>
                <Text style={styles.rowDesc}>
                  {ch.key === 'push'
                    ? 'Kirim notifikasi ke perangkat via FCM'
                    : ch.key === 'inApp'
                      ? 'Tampilkan di daftar notifikasi aplikasi'
                      : 'Kirim salinan melalui email'}
                </Text>
              </View>
              <Switch
                value={global[ch.key]}
                onValueChange={(val) => toggleGlobal(ch.key, val)}
                trackColor={{ false: '#d1d5db', true: ch.track }}
                thumbColor={global[ch.key] ? ch.color : '#9ca3af'}
                disabled={saving === `global:${ch.key}`}
                accessibilityLabel={`Master ${ch.label}`}
              />
            </View>
          ))}
        </View>

        <Text style={styles.sectionTitle}>Perangkat</Text>
        <View style={styles.card}>
          <View style={styles.row}>
            <View style={[styles.rowIcon, { backgroundColor: '#fef3c7' }]}>
              <Ionicons name="volume-high" size={18} color="#d97706" />
            </View>
            <View style={styles.rowContent}>
              <Text style={styles.rowLabel}>Suara</Text>
              <Text style={styles.rowDesc}>Bunyi saat notifikasi push diterima</Text>
            </View>
            <Switch
              value={device.sound}
              onValueChange={(val) => toggleDevice('sound', val)}
              trackColor={{ false: '#d1d5db', true: '#fcd34d' }}
              thumbColor={device.sound ? '#d97706' : '#9ca3af'}
              accessibilityLabel="Suara notifikasi"
            />
          </View>
          <View style={styles.row}>
            <View style={[styles.rowIcon, { backgroundColor: '#e0e7ff' }]}>
              <Ionicons name="phone-portrait" size={18} color="#4f46e5" />
            </View>
            <View style={styles.rowContent}>
              <Text style={styles.rowLabel}>Getar</Text>
              <Text style={styles.rowDesc}>Bergetar saat notifikasi push diterima</Text>
            </View>
            <Switch
              value={device.vibrate}
              onValueChange={(val) => toggleDevice('vibrate', val)}
              trackColor={{ false: '#d1d5db', true: '#c7d2fe' }}
              thumbColor={device.vibrate ? '#4f46e5' : '#9ca3af'}
              accessibilityLabel="Getar notifikasi"
            />
          </View>
        </View>
      </View>

      {/* ── Quiet Hours ── */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Jangan Ganggu</Text>
        <View style={styles.card}>
          <View style={styles.row}>
            <View style={[styles.rowIcon, { backgroundColor: '#e0f2fe' }]}>
              <Ionicons name="moon" size={18} color="#0284c7" />
            </View>
            <View style={styles.rowContent}>
              <Text style={styles.rowLabel}>Mode Tenang</Text>
              <Text style={styles.rowDesc}>
                Sembunyikan notifikasi push pada rentang waktu tertentu
              </Text>
            </View>
            <Switch
              value={quietHours.enabled}
              onValueChange={(val) => updateQuietHours({ enabled: val })}
              trackColor={{ false: '#d1d5db', true: '#bae6fd' }}
              thumbColor={quietHours.enabled ? '#0284c7' : '#9ca3af'}
              disabled={saving === 'quiet'}
              accessibilityLabel="Mode Tenang"
            />
          </View>
          {quietHours.enabled && (
            <>
              <TimeStepper
                label="Mulai"
                value={quietHours.start}
                onChange={(v) => updateQuietHours({ start: v })}
                disabled={saving === 'quiet'}
              />
              <TimeStepper
                label="Selesai"
                value={quietHours.end}
                onChange={(v) => updateQuietHours({ end: v })}
                disabled={saving === 'quiet'}
              />
            </>
          )}
          {saving === 'quiet' && (
            <ActivityIndicator size="small" color="#0284c7" style={{ marginTop: 8 }} />
          )}
        </View>
      </View>

      <View style={styles.section}>
        {/* Sound Preference */}
        <Text style={styles.sectionTitle}>Suara Notifikasi</Text>
        <View style={styles.prefCard}>
          <View style={[styles.prefIcon, !soundEnabled && styles.prefIconDisabled]}>
            <Ionicons
              name={soundEnabled ? 'volume-high' : 'volume-mute'}
              size={22}
              color={soundEnabled ? theme.colors.warning : theme.colors.textMuted}
            />
          </View>
          <View style={styles.prefInfo}>
            <Text style={[styles.prefLabel, !soundEnabled && styles.prefLabelDisabled]}>
              Suara Peringatan
            </Text>
            <Text style={styles.prefDesc}>
              {soundEnabled ? 'Suara aktif saat peringatan sesi' : 'Hanya notifikasi visual'}
            </Text>
          </View>
          <Switch
            value={soundEnabled}
            onValueChange={handleToggleSound}
            trackColor={{ false: theme.colors.borderStrong, true: theme.colors.warning }}
            thumbColor={soundEnabled ? theme.colors.warning : theme.colors.textMuted}
            style={{ transform: [{ scaleX: 0.7 }, { scaleY: 0.7 }] }}
          />
        </View>

        <View style={styles.infoBox}>
          <Ionicons name="information-circle" size={18} color={theme.colors.primary} />
          <Text style={styles.infoText}>
            Channel utama berlaku untuk semua jenis notifikasi. Mode Tenang hanya menyembunyikan
            notifikasi push pada rentang waktu yang dipilih.
          </Text>
        </View>
      </View>

      <View style={{ height: 40 }} />
    </ScrollView>
  );
}

function TimeStepper({
  label,
  value,
  onChange,
  disabled,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  disabled?: boolean;
}) {
  const [h, m] = value.split(':').map(Number);
  const shift = (delta: number) => {
    const total = (h * 60 + m + delta + 1440) % 1440;
    onChange(`${pad(Math.floor(total / 60))}:${pad(total % 60)}`);
  };

  return (
    <View style={styles.timeRow}>
      <Text style={styles.timeLabel}>{label}</Text>
      <View style={styles.stepper}>
        <TouchableOpacity
          style={styles.stepperBtn}
          onPress={() => shift(-1)}
          disabled={disabled}
        >
          <Ionicons name="remove" size={16} color={disabled ? '#d1d5db' : '#0284c7'} />
        </TouchableOpacity>
        <Text style={styles.timeValue}>{value}</Text>
        <TouchableOpacity
          style={styles.stepperBtn}
          onPress={() => shift(1)}
          disabled={disabled}
        >
          <Ionicons name="add" size={16} color={disabled ? '#d1d5db' : '#0284c7'} />
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
container: { flex: 1, backgroundColor: theme.colors.surfaceMuted },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: theme.colors.surfaceMuted },
  header: {
    backgroundColor: theme.colors.primary,
    paddingHorizontal: 16,
    paddingBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  backBtn: { padding: 4 },
  headerTitle: { color: theme.colors.surface, fontSize: 18, fontWeight: '700', flex: 1 },

  subHeader: {
    flexDirection: 'row',
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: theme.colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.surfaceMuted,
  },
  subHeaderItem: { fontSize: 12, color: theme.colors.textSecondary, fontWeight: '500' },

section: { paddingHorizontal: 16, marginTop: 16 },
  sectionTitle: { fontSize: 16, fontWeight: '600', color: '#1f2937', marginBottom: 12 },

  card: {
    backgroundColor: '#fff',
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: '#f3f4f6',
    shadowColor: '#000',
    shadowOpacity: 0.02,
    shadowRadius: 4,
    elevation: 1,
    marginBottom: 8,
  },
  row: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10 },
  rowIcon: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  rowContent: { flex: 1 },
  rowLabel: { fontSize: 14, fontWeight: '600', color: '#111827' },
  rowDesc: { fontSize: 11, color: '#9ca3af', marginTop: 2 },

  timeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10,
    borderTopWidth: 1,
    borderTopColor: '#f3f4f6',
  },
  timeLabel: { fontSize: 13, fontWeight: '500', color: '#374151' },
  stepper: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  stepperBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#e0f2fe',
    alignItems: 'center',
    justifyContent: 'center',
  },
  timeValue: { fontSize: 15, fontWeight: '600', color: '#0284c7', fontVariant: ['tabular-nums'] },

  prefCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.surface,
    borderRadius: 14,
    padding: 14,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: theme.colors.surfaceMuted,
    shadowColor: theme.colors.dark,
    shadowOpacity: 0.02,
    shadowRadius: 4,
    elevation: 1,
  },
  prefIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: theme.colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  prefIconDisabled: { backgroundColor: theme.colors.surfaceMuted },
  prefInfo: { flex: 1 },
  prefLabel: { fontSize: 14, fontWeight: '600', color: theme.colors.text },
  prefLabelDisabled: { color: theme.colors.textMuted },
  prefDesc: { fontSize: 11, color: theme.colors.textMuted, marginTop: 2 },

  infoBox: {
    flexDirection: 'row',
    gap: 10,
    backgroundColor: theme.colors.primarySofter,
    borderRadius: 12,
    padding: 14,
    marginTop: 16,
    borderWidth: 1,
    borderColor: theme.colors.headerSub,
  },
infoText: { flex: 1, fontSize: 12, color: theme.colors.primaryDark, lineHeight: 18 },
});

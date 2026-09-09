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
import { getNotificationSoundEnabled, setNotificationSoundEnabled } from '../../lib/notification-alert';
import { theme } from '../../theme';

interface NotificationType {
  key: string;
  label: string;
  description: string;
}

interface ChannelPrefs {
  inApp: boolean;
  email: boolean;
}

const TYPE_ICONS: Record<string, string> = {
  welcome: 'hand-left',
  data_incomplete: 'alert-circle',
  reminder_latihan: 'fitness',
  reminder_pendadaran: 'school',
  reminder_iuran: 'cash',
  status_klaim: 'document-text',
  dokumen_ready: 'checkmark-done',
  badge_earned: 'medal',
  umum: 'megaphone',
};

export default function NotificationPreferencesScreen() {
  const [preferences, setPreferences] = useState<Record<string, ChannelPrefs>>({});
  const [types, setTypes] = useState<NotificationType[]>([]);
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
        setPreferences(unwrap(res) || {});
        setTypes(res.data.types || []);
      } catch {
        /* ignore */
      }
      setLoading(false);
    })();
  }, []);

  const toggleChannel = async (key: string, channel: 'inApp' | 'email', value: boolean) => {
    const newPrefs = {
      ...preferences,
      [key]: { ...(preferences[key] || { inApp: true, email: true }), [channel]: value },
    };
    setPreferences(newPrefs);
    setSaving(`${key}:${channel}`);

    try {
      await apiClient.patch('/notifications/preferences', newPrefs);
    } catch {
      // Revert on error
      const reverted = { ...preferences };
      setPreferences(reverted);
      Alert.alert('Gagal', 'Gagal menyimpan pengaturan');
    }
    setSaving(null);
  };

  const batchToggle = async (value: boolean) => {
    const updated = types.reduce(
      (acc, t) => ({
        ...acc,
        [t.key]: { inApp: value, email: value },
      }),
      {} as Record<string, ChannelPrefs>,
    );
    setPreferences(updated);
    setSaving('all');
    try {
      await apiClient.patch('/notifications/preferences', updated);
    } catch {
      Alert.alert('Gagal', 'Gagal menyimpan pengaturan');
    }
    setSaving(null);
  };

  const insets = useSafeAreaInsets();

  if (loading) return <LoadingView message="Memuat pengaturan..." />;

  const inAppCount = Object.values(preferences).filter((p) => p?.inApp !== false).length;
  const emailCount = Object.values(preferences).filter((p) => p?.email !== false).length;

  return (
    <ScrollView style={styles.container}>
      <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={22} color={theme.colors.surface} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Pengaturan Notifikasi</Text>
        <Text style={styles.headerSub}>
          {inAppCount}/{types.length} in-app, {emailCount}/{types.length} email
        </Text>
      </View>

      {/* Batch Actions */}
      <View style={styles.batchRow}>
        <TouchableOpacity
          style={styles.batchBtn}
          onPress={() => batchToggle(true)}
          disabled={saving === 'all'}
        >
          <Ionicons name="checkmark-circle" size={16} color={theme.colors.success} />
          <Text style={styles.batchBtnText}>Aktifkan Semua</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.batchBtn}
          onPress={() => batchToggle(false)}
          disabled={saving === 'all'}
        >
          <Ionicons name="close-circle" size={16} color={theme.colors.danger} />
          <Text style={styles.batchBtnText}>Nonaktifkan Semua</Text>
        </TouchableOpacity>
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

        <Text style={[styles.sectionTitle, { marginTop: 16 }]}>Channel Notifikasi</Text>
        {types.length > 0 ? (
          types.map((type) => {
            const iconName = TYPE_ICONS[type.key] || 'notifications';
            const p = preferences[type.key] || { inApp: true, email: true };
            const anyEnabled = p.inApp || p.email;
            return (
              <View key={type.key} style={styles.prefCard}>
                <View style={[styles.prefIcon, !anyEnabled && styles.prefIconDisabled]}>
                  <Ionicons
                    name={iconName as any}
                    size={22}
                    color={anyEnabled ? theme.colors.primary : theme.colors.textMuted}
                  />
                </View>
                <View style={styles.prefInfo}>
                  <Text style={[styles.prefLabel, !anyEnabled && styles.prefLabelDisabled]}>
                    {type.label}
                  </Text>
                  <Text style={styles.prefDesc}>{type.description}</Text>
                  {/* Channel toggles */}
                  <View style={styles.channelRow}>
                    <View style={styles.channelToggle}>
                      <Ionicons
                        name="phone-portrait"
                        size={14}
                        color={p.inApp ? theme.colors.primary : theme.colors.textMuted}
                      />
                      <Switch
                        value={p.inApp}
                        onValueChange={(val) => toggleChannel(type.key, 'inApp', val)}
                        trackColor={{ false: theme.colors.borderStrong, true: theme.colors.primaryLight }}
                        thumbColor={p.inApp ? theme.colors.primary : theme.colors.textMuted}
                        disabled={saving === `${type.key}:inApp`}
                        style={{ transform: [{ scaleX: 0.7 }, { scaleY: 0.7 }] }}
                      />
                    </View>
                    <View style={styles.channelToggle}>
                      <Ionicons name="mail" size={14} color={p.email ? theme.colors.success : theme.colors.textMuted} />
                      <Switch
                        value={p.email}
                        onValueChange={(val) => toggleChannel(type.key, 'email', val)}
                        trackColor={{ false: theme.colors.borderStrong, true: theme.colors.successLight }}
                        thumbColor={p.email ? theme.colors.success : theme.colors.textMuted}
                        disabled={saving === `${type.key}:email`}
                        style={{ transform: [{ scaleX: 0.7 }, { scaleY: 0.7 }] }}
                      />
                    </View>
                    {saving === `${type.key}:inApp` || saving === `${type.key}:email` ? (
                      <ActivityIndicator size="small" color={theme.colors.primary} />
                    ) : null}
                  </View>
                </View>
              </View>
            );
          })
        ) : (
          <Text style={styles.emptyText}>Tidak ada jenis notifikasi</Text>
        )}

        <View style={styles.infoBox}>
          <Ionicons name="information-circle" size={18} color={theme.colors.primary} />
          <Text style={styles.infoText}>
            Atur channel per jenis notifikasi. Nonaktifkan email untuk hanya menerima notifikasi
            in-app, atau nonaktifkan keduanya untuk berhenti menerima notifikasi jenis tersebut.
          </Text>
        </View>
      </View>

      <View style={{ height: 40 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.surfaceMuted },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: theme.colors.surfaceMuted },
  header: {
    backgroundColor: theme.colors.primary,
    padding: 24,
    paddingBottom: 20,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flexWrap: 'wrap',
  },
  backBtn: { padding: 4 },
  headerTitle: { color: theme.colors.surface, fontSize: 18, fontWeight: '700', flex: 1 },
  headerSub: { color: theme.colors.headerSub, fontSize: 13 },

  batchRow: { flexDirection: 'row', gap: 10, paddingHorizontal: 16, paddingVertical: 12 },
  batchBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 8,
    backgroundColor: theme.colors.surface,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  batchBtnText: { fontSize: 12, fontWeight: '500', color: theme.colors.textSecondary },

  section: { paddingHorizontal: 16 },
  sectionTitle: { fontSize: 16, fontWeight: '600', color: theme.colors.text, marginBottom: 12 },

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

  channelRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 8 },
  channelToggle: { flexDirection: 'row', alignItems: 'center', gap: 4 },

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

  emptyText: { fontSize: 13, color: theme.colors.textMuted, textAlign: 'center', paddingVertical: 30 },
});

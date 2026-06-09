import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, ActivityIndicator, TouchableOpacity, Switch, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import apiClient from '../../lib/api-client';

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

  useEffect(() => {
    (async () => {
      try {
        const res = await apiClient.get('/notifications/preferences');
        setPreferences(res.data.data || {});
        setTypes(res.data.types || []);
      } catch { /* ignore */ }
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
    const updated = types.reduce((acc, t) => ({
      ...acc,
      [t.key]: { inApp: value, email: value },
    }), {} as Record<string, ChannelPrefs>);
    setPreferences(updated);
    setSaving('all');
    try {
      await apiClient.patch('/notifications/preferences', updated);
    } catch {
      Alert.alert('Gagal', 'Gagal menyimpan pengaturan');
    }
    setSaving(null);
  };

  if (loading) return <View style={styles.center}><ActivityIndicator size="large" color="#2563eb" /></View>;

  const inAppCount = Object.values(preferences).filter((p) => p?.inApp !== false).length;
  const emailCount = Object.values(preferences).filter((p) => p?.email !== false).length;

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={22} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Pengaturan Notifikasi</Text>
        <Text style={styles.headerSub}>{inAppCount}/{types.length} in-app, {emailCount}/{types.length} email</Text>
      </View>

      {/* Batch Actions */}
      <View style={styles.batchRow}>
        <TouchableOpacity style={styles.batchBtn} onPress={() => batchToggle(true)} disabled={saving === 'all'}>
          <Ionicons name="checkmark-circle" size={16} color="#16a34a" />
          <Text style={styles.batchBtnText}>Aktifkan Semua</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.batchBtn} onPress={() => batchToggle(false)} disabled={saving === 'all'}>
          <Ionicons name="close-circle" size={16} color="#dc2626" />
          <Text style={styles.batchBtnText}>Nonaktifkan Semua</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Channel Notifikasi</Text>
        {types.length > 0 ? (
          types.map((type) => {
            const iconName = TYPE_ICONS[type.key] || 'notifications';
            const p = preferences[type.key] || { inApp: true, email: true };
            const anyEnabled = p.inApp || p.email;
            return (
              <View key={type.key} style={styles.prefCard}>
                <View style={[styles.prefIcon, !anyEnabled && styles.prefIconDisabled]}>
                  <Ionicons name={iconName as any} size={22} color={anyEnabled ? '#2563eb' : '#9ca3af'} />
                </View>
                <View style={styles.prefInfo}>
                  <Text style={[styles.prefLabel, !anyEnabled && styles.prefLabelDisabled]}>{type.label}</Text>
                  <Text style={styles.prefDesc}>{type.description}</Text>
                  {/* Channel toggles */}
                  <View style={styles.channelRow}>
                    <View style={styles.channelToggle}>
                      <Ionicons name="phone-portrait" size={14} color={p.inApp ? '#2563eb' : '#9ca3af'} />
                      <Switch
                        value={p.inApp}
                        onValueChange={(val) => toggleChannel(type.key, 'inApp', val)}
                        trackColor={{ false: '#d1d5db', true: '#93c5fd' }}
                        thumbColor={p.inApp ? '#2563eb' : '#9ca3af'}
                        disabled={saving === `${type.key}:inApp`}
                        style={{ transform: [{ scaleX: 0.7 }, { scaleY: 0.7 }] }}
                      />
                    </View>
                    <View style={styles.channelToggle}>
                      <Ionicons name="mail" size={14} color={p.email ? '#16a34a' : '#9ca3af'} />
                      <Switch
                        value={p.email}
                        onValueChange={(val) => toggleChannel(type.key, 'email', val)}
                        trackColor={{ false: '#d1d5db', true: '#86efac' }}
                        thumbColor={p.email ? '#16a34a' : '#9ca3af'}
                        disabled={saving === `${type.key}:email`}
                        style={{ transform: [{ scaleX: 0.7 }, { scaleY: 0.7 }] }}
                      />
                    </View>
                    {saving === `${type.key}:inApp` || saving === `${type.key}:email` ? (
                      <ActivityIndicator size="small" color="#2563eb" />
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
          <Ionicons name="information-circle" size={18} color="#3b82f6" />
          <Text style={styles.infoText}>
            Atur channel per jenis notifikasi. Nonaktifkan email untuk hanya menerima notifikasi in-app,
            atau nonaktifkan keduanya untuk berhenti menerima notifikasi jenis tersebut.
          </Text>
        </View>
      </View>

      <View style={{ height: 40 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f3f4f6' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#f3f4f6' },
  header: { backgroundColor: '#2563eb', padding: 24, paddingTop: 60, paddingBottom: 20, flexDirection: 'row', alignItems: 'center', gap: 12, flexWrap: 'wrap' },
  backBtn: { padding: 4 },
  headerTitle: { color: '#fff', fontSize: 18, fontWeight: '700', flex: 1 },
  headerSub: { color: '#bfdbfe', fontSize: 13 },

  batchRow: { flexDirection: 'row', gap: 10, paddingHorizontal: 16, paddingVertical: 12 },
  batchBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 14, paddingVertical: 8, backgroundColor: '#fff', borderRadius: 10, borderWidth: 1, borderColor: '#e5e7eb' },
  batchBtnText: { fontSize: 12, fontWeight: '500', color: '#374151' },

  section: { paddingHorizontal: 16 },
  sectionTitle: { fontSize: 16, fontWeight: '600', color: '#1f2937', marginBottom: 12 },

  prefCard: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff',
    borderRadius: 14, padding: 14, marginBottom: 8,
    borderWidth: 1, borderColor: '#f3f4f6',
    shadowColor: '#000', shadowOpacity: 0.02, shadowRadius: 4, elevation: 1,
  },
  prefIcon: { width: 36, height: 36, borderRadius: 18, backgroundColor: '#dbeafe', alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  prefIconDisabled: { backgroundColor: '#f3f4f6' },
  prefInfo: { flex: 1 },
  prefLabel: { fontSize: 14, fontWeight: '600', color: '#111827' },
  prefLabelDisabled: { color: '#9ca3af' },
  prefDesc: { fontSize: 11, color: '#9ca3af', marginTop: 2 },

  channelRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 8 },
  channelToggle: { flexDirection: 'row', alignItems: 'center', gap: 4 },

  infoBox: { flexDirection: 'row', gap: 10, backgroundColor: '#eff6ff', borderRadius: 12, padding: 14, marginTop: 16, borderWidth: 1, borderColor: '#bfdbfe' },
  infoText: { flex: 1, fontSize: 12, color: '#1e40af', lineHeight: 18 },

  emptyText: { fontSize: 13, color: '#9ca3af', textAlign: 'center', paddingVertical: 30 },
});

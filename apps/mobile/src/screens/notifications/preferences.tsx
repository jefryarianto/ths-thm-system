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
  const [preferences, setPreferences] = useState<Record<string, boolean>>({});
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

  const togglePreference = async (key: string, value: boolean) => {
    const newPrefs = { ...preferences, [key]: value };
    setPreferences(newPrefs);
    setSaving(key);

    try {
      await apiClient.patch('/notifications/preferences', newPrefs);
    } catch {
      // Revert on error
      setPreferences({ ...preferences });
      Alert.alert('Gagal', 'Gagal menyimpan pengaturan');
    }
    setSaving(null);
  };

  const enableAll = async () => {
    const allEnabled = types.reduce((acc, t) => ({ ...acc, [t.key]: true }), {} as Record<string, boolean>);
    setPreferences(allEnabled);
    setSaving('all');
    try {
      await apiClient.patch('/notifications/preferences', allEnabled);
    } catch {
      Alert.alert('Gagal', 'Gagal menyimpan pengaturan');
    }
    setSaving(null);
  };

  const disableAll = async () => {
    const allDisabled = types.reduce((acc, t) => ({ ...acc, [t.key]: false }), {} as Record<string, boolean>);
    setPreferences(allDisabled);
    setSaving('all');
    try {
      await apiClient.patch('/notifications/preferences', allDisabled);
    } catch {
      Alert.alert('Gagal', 'Gagal menyimpan pengaturan');
    }
    setSaving(null);
  };

  if (loading) return <View style={styles.center}><ActivityIndicator size="large" color="#2563eb" /></View>;

  const enabledCount = Object.values(preferences).filter(Boolean).length;

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={22} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Pengaturan Notifikasi</Text>
        <Text style={styles.headerSub}>{enabledCount}/{types.length} aktif</Text>
      </View>

      {/* Batch Actions */}
      <View style={styles.batchRow}>
        <TouchableOpacity style={styles.batchBtn} onPress={enableAll} disabled={saving === 'all'}>
          <Ionicons name="checkmark-circle" size={16} color="#16a34a" />
          <Text style={styles.batchBtnText}>Aktifkan Semua</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.batchBtn} onPress={disableAll} disabled={saving === 'all'}>
          <Ionicons name="close-circle" size={16} color="#dc2626" />
          <Text style={styles.batchBtnText}>Nonaktifkan Semua</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Jenis Notifikasi</Text>
        {types.length > 0 ? (
          types.map((type) => {
            const iconName = TYPE_ICONS[type.key] || 'notifications';
            const isEnabled = preferences[type.key] !== false;
            return (
              <View key={type.key} style={styles.prefCard}>
                <View style={styles.prefIcon}>
                  <Ionicons name={iconName as any} size={22} color={isEnabled ? '#2563eb' : '#9ca3af'} />
                </View>
                <View style={styles.prefInfo}>
                  <Text style={[styles.prefLabel, !isEnabled && styles.prefLabelDisabled]}>{type.label}</Text>
                  <Text style={styles.prefDesc}>{type.description}</Text>
                </View>
                <Switch
                  value={isEnabled}
                  onValueChange={(val) => togglePreference(type.key, val)}
                  trackColor={{ false: '#d1d5db', true: '#93c5fd' }}
                  thumbColor={isEnabled ? '#2563eb' : '#9ca3af'}
                  disabled={saving === type.key}
                />
                {saving === type.key && (
                  <ActivityIndicator size="small" color="#2563eb" style={{ marginLeft: 8 }} />
                )}
              </View>
            );
          })
        ) : (
          <Text style={styles.emptyText}>Tidak ada jenis notifikasi</Text>
        )}

        <View style={styles.infoBox}>
          <Ionicons name="information-circle" size={18} color="#3b82f6" />
          <Text style={styles.infoText}>
            Notifikasi yang dinonaktifkan tidak akan dikirim ke perangkat Anda. 
            Pengaturan ini dapat diubah kapan saja.
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
  prefIcon: { width: 36, height: 36, borderRadius: 18, backgroundColor: '#f3f4f6', alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  prefInfo: { flex: 1, marginRight: 8 },
  prefLabel: { fontSize: 14, fontWeight: '600', color: '#111827' },
  prefLabelDisabled: { color: '#9ca3af' },
  prefDesc: { fontSize: 11, color: '#9ca3af', marginTop: 2 },

  infoBox: { flexDirection: 'row', gap: 10, backgroundColor: '#eff6ff', borderRadius: 12, padding: 14, marginTop: 16, borderWidth: 1, borderColor: '#bfdbfe' },
  infoText: { flex: 1, fontSize: 12, color: '#1e40af', lineHeight: 18 },

  emptyText: { fontSize: 13, color: '#9ca3af', textAlign: 'center', paddingVertical: 30 },
});

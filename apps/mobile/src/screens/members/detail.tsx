import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  FlatList,
  ActivityIndicator,
  TouchableOpacity,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, router } from 'expo-router';
import apiClient, { unwrap } from '../../lib/api-client';

interface MemberDetail {
  id: string;
  namaLengkap: string;
  noAnggota: string;
  tingkat: string;
  statusKeanggotaan: string;
  alamat?: string;
  noHp?: string;
  email?: string;
  ranting?: { nama: string };
}

interface DuesItem {
  id: string;
  tahun: number;
  bulan: number;
  jumlah: number;
  status: string;
  tag?: string;
}

interface TrainingItem {
  id: string;
  nama: string;
  tanggal: string;
  statusKehadiran: string;
}

interface DocumentItem {
  id: string;
  nama: string;
  tipe: string;
  createdAt: string;
}

const TABS = [
  { key: 'info', label: 'Info', icon: 'person' },
  { key: 'dues', label: 'Iuran', icon: 'cash' },
  { key: 'trainings', label: 'Latihan', icon: 'fitness' },
  { key: 'documents', label: 'Dokumen', icon: 'document-text' },
];

export default function MemberDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [member, setMember] = useState<MemberDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('info');

  const [dues, setDues] = useState<DuesItem[]>([]);
  const [duesLoading, setDuesLoading] = useState(false);

  const [trainings, setTrainings] = useState<TrainingItem[]>([]);
  const [trainingsLoading, setTrainingsLoading] = useState(false);

  const [documents, setDocuments] = useState<DocumentItem[]>([]);
  const [docsLoading, setDocsLoading] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const res = await apiClient.get(`/members/${id}`);
        setMember(unwrap(res));
      } catch {
        /* ignore */
      }
      setLoading(false);
    })();
  }, [id]);

  useEffect(() => {
    if (activeTab === 'dues' && dues.length === 0) {
      setDuesLoading(true);
      apiClient
        .get(`/members/${id}/dues`)
        .then((r) => setDues((unwrap(r) ?? []) as DuesItem[]))
        .catch(() => {})
        .finally(() => setDuesLoading(false));
    }
    if (activeTab === 'trainings' && trainings.length === 0) {
      setTrainingsLoading(true);
      apiClient
        .get(`/members/${id}/trainings`)
        .then((r) => setTrainings((unwrap(r) ?? []) as TrainingItem[]))
        .catch(() => {})
        .finally(() => setTrainingsLoading(false));
    }
    if (activeTab === 'documents' && documents.length === 0) {
      setDocsLoading(true);
      apiClient
        .get(`/members/${id}/documents`)
        .then((r) => setDocuments((unwrap(r) ?? []) as DocumentItem[]))
        .catch(() => {})
        .finally(() => setDocsLoading(false));
    }
  }, [activeTab, id]);

  if (loading)
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#2563eb" />
      </View>
    );
  if (!member)
    return (
      <View style={styles.center}>
        <Text style={styles.errorText}>Anggota tidak ditemukan</Text>
      </View>
    );

  const statusColor = member.statusKeanggotaan === 'aktif' ? '#16a34a' : '#dc2626';
  const statusLabel = member.statusKeanggotaan === 'aktif' ? 'Aktif' : 'Nonaktif';

  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];

  const renderInfo = () => (
    <View style={styles.infoCard}>
      <View style={styles.infoRow}>
        <Ionicons name="card" size={18} color="#6b7280" />
        <View style={styles.infoContent}>
          <Text style={styles.infoLabel}>No. Anggota</Text>
          <Text style={styles.infoValue}>{member.noAnggota}</Text>
        </View>
      </View>
      <View style={styles.infoRow}>
        <Ionicons name="trending-up" size={18} color="#6b7280" />
        <View style={styles.infoContent}>
          <Text style={styles.infoLabel}>Tingkat</Text>
          <Text style={styles.infoValue}>{member.tingkat}</Text>
        </View>
      </View>
      <View style={styles.infoRow}>
        <Ionicons name="shield-checkmark" size={18} color="#6b7280" />
        <View style={styles.infoContent}>
          <Text style={styles.infoLabel}>Status</Text>
          <Text style={[styles.infoValue, { color: statusColor }]}>{statusLabel}</Text>
        </View>
      </View>
      {member.ranting && (
        <View style={styles.infoRow}>
          <Ionicons name="location" size={18} color="#6b7280" />
          <View style={styles.infoContent}>
            <Text style={styles.infoLabel}>Ranting</Text>
            <Text style={styles.infoValue}>{member.ranting.nama}</Text>
          </View>
        </View>
      )}
      {member.alamat && (
        <View style={styles.infoRow}>
          <Ionicons name="home" size={18} color="#6b7280" />
          <View style={styles.infoContent}>
            <Text style={styles.infoLabel}>Alamat</Text>
            <Text style={styles.infoValue}>{member.alamat}</Text>
          </View>
        </View>
      )}
      {member.noHp && (
        <View style={styles.infoRow}>
          <Ionicons name="call" size={18} color="#6b7280" />
          <View style={styles.infoContent}>
            <Text style={styles.infoLabel}>No. HP</Text>
            <Text style={styles.infoValue}>{member.noHp}</Text>
          </View>
        </View>
      )}
      {member.email && (
        <View style={styles.infoRow}>
          <Ionicons name="mail" size={18} color="#6b7280" />
          <View style={styles.infoContent}>
            <Text style={styles.infoLabel}>Email</Text>
            <Text style={styles.infoValue}>{member.email}</Text>
          </View>
        </View>
      )}
    </View>
  );

  const renderDues = () => {
    if (duesLoading) return <ActivityIndicator size="small" color="#2563eb" style={{ marginTop: 24 }} />;
    if (dues.length === 0)
      return (
        <View style={styles.empty}>
          <Ionicons name="cash" size={48} color="#d1d5db" />
          <Text style={styles.emptyText}>Belum ada data iuran</Text>
        </View>
      );
    return (
      <FlatList
        data={dues}
        keyExtractor={(item) => item.id}
        scrollEnabled={false}
        contentContainerStyle={{ paddingBottom: 8 }}
        renderItem={({ item }) => {
          const dueStatus = item.status === 'lunas' ? '#16a34a' : '#dc2626';
          const dueLabel = item.status === 'lunas' ? 'Lunas' : 'Belum Lunas';
          return (
            <View style={styles.listCard}>
              <View style={styles.listCardBody}>
                <Text style={styles.listCardTitle}>
                  {months[item.bulan - 1]} {item.tahun}
                </Text>
                <Text style={styles.listCardMeta}>
                  Rp {item.jumlah?.toLocaleString('id-ID')}
                  {item.tag ? ` · ${item.tag}` : ''}
                </Text>
              </View>
              <View style={[styles.statusBadge, { backgroundColor: item.status === 'lunas' ? '#ecfdf5' : '#fef2f2' }]}>
                <Text style={[styles.statusText, { color: dueStatus }]}>{dueLabel}</Text>
              </View>
            </View>
          );
        }}
      />
    );
  };

  const renderTrainings = () => {
    if (trainingsLoading) return <ActivityIndicator size="small" color="#2563eb" style={{ marginTop: 24 }} />;
    if (trainings.length === 0)
      return (
        <View style={styles.empty}>
          <Ionicons name="fitness" size={48} color="#d1d5db" />
          <Text style={styles.emptyText}>Belum ada data latihan</Text>
        </View>
      );
    return (
      <FlatList
        data={trainings}
        keyExtractor={(item) => item.id}
        scrollEnabled={false}
        contentContainerStyle={{ paddingBottom: 8 }}
        renderItem={({ item }) => {
          const hadirColor = item.statusKehadiran === 'hadir' ? '#16a34a' : item.statusKehadiran === 'izin' ? '#d97706' : '#dc2626';
          const hadirLabel = item.statusKehadiran === 'hadir' ? 'Hadir' : item.statusKehadiran === 'izin' ? 'Izin' : 'Absen';
          return (
            <View style={styles.listCard}>
              <View style={styles.listCardBody}>
                <Text style={styles.listCardTitle}>{item.nama}</Text>
                <Text style={styles.listCardMeta}>
                  {new Date(item.tanggal).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}
                </Text>
              </View>
              <View style={[styles.statusBadge, { backgroundColor: item.statusKehadiran === 'hadir' ? '#ecfdf5' : item.statusKehadiran === 'izin' ? '#fef3c7' : '#fef2f2' }]}>
                <Text style={[styles.statusText, { color: hadirColor }]}>{hadirLabel}</Text>
              </View>
            </View>
          );
        }}
      />
    );
  };

  const renderDocuments = () => {
    if (docsLoading) return <ActivityIndicator size="small" color="#2563eb" style={{ marginTop: 24 }} />;
    if (documents.length === 0)
      return (
        <View style={styles.empty}>
          <Ionicons name="document-text" size={48} color="#d1d5db" />
          <Text style={styles.emptyText}>Belum ada dokumen</Text>
        </View>
      );
    return (
      <FlatList
        data={documents}
        keyExtractor={(item) => item.id}
        scrollEnabled={false}
        contentContainerStyle={{ paddingBottom: 8 }}
        renderItem={({ item }) => (
          <View style={styles.listCard}>
            <Ionicons name="document-text" size={22} color="#2563eb" style={{ marginRight: 12 }} />
            <View style={styles.listCardBody}>
              <Text style={styles.listCardTitle}>{item.nama}</Text>
              <Text style={styles.listCardMeta}>
                {item.tipe} · {new Date(item.createdAt).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}
              </Text>
            </View>
          </View>
        )}
      />
    );
  };

  const tabContent = () => {
    switch (activeTab) {
      case 'info': return renderInfo();
      case 'dues': return renderDues();
      case 'trainings': return renderTrainings();
      case 'documents': return renderDocuments();
      default: return null;
    }
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={22} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle} numberOfLines={1}>
          Detail Anggota
        </Text>
      </View>

      <View style={styles.profileCard}>
        <View style={styles.avatarLarge}>
          <Text style={styles.avatarText}>{member.namaLengkap.charAt(0)}</Text>
        </View>
        <Text style={styles.name}>{member.namaLengkap}</Text>
        <View style={[styles.statusBadge, { backgroundColor: member.statusKeanggotaan === 'aktif' ? '#ecfdf5' : '#fef2f2', marginTop: 8 }]}>
          <Text style={[styles.statusText, { color: statusColor }]}>{statusLabel}</Text>
        </View>
        {member.ranting && <Text style={styles.ranting}>{member.ranting.nama}</Text>}
      </View>

      <View style={styles.tabRow}>
        {TABS.map((tab) => (
          <TouchableOpacity
            key={tab.key}
            style={[styles.tab, activeTab === tab.key && styles.tabActive]}
            onPress={() => setActiveTab(tab.key)}
          >
            <Ionicons
              name={tab.icon as any}
              size={16}
              color={activeTab === tab.key ? '#2563eb' : '#6b7280'}
            />
            <Text style={[styles.tabLabel, activeTab === tab.key && styles.tabLabelActive]}>
              {tab.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <View style={styles.tabContent}>{tabContent()}</View>

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
  headerTitle: { color: '#fff', fontSize: 18, fontWeight: '700', flex: 1 },

  profileCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    margin: 16,
    marginBottom: 0,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  avatarLarge: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#eff6ff',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  avatarText: { fontSize: 24, fontWeight: '700', color: '#2563eb' },
  name: { fontSize: 20, fontWeight: '700', color: '#111827', textAlign: 'center' },
  ranting: { fontSize: 13, color: '#6b7280', marginTop: 6 },
  statusBadge: { paddingHorizontal: 14, paddingVertical: 5, borderRadius: 12 },
  statusText: { fontSize: 12, fontWeight: '600' },

  tabRow: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    marginHorizontal: 16,
    marginTop: 12,
    borderRadius: 12,
    padding: 4,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    paddingVertical: 8,
    borderRadius: 10,
  },
  tabActive: { backgroundColor: '#eff6ff' },
  tabLabel: { fontSize: 12, fontWeight: '500', color: '#6b7280' },
  tabLabelActive: { color: '#2563eb', fontWeight: '600' },

  tabContent: { paddingHorizontal: 16, marginTop: 12 },

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
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  infoContent: { flex: 1 },
  infoLabel: { fontSize: 11, color: '#9ca3af', marginBottom: 2 },
  infoValue: { fontSize: 14, fontWeight: '500', color: '#111827' },

  listCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 14,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#f3f4f6',
  },
  listCardBody: { flex: 1 },
  listCardTitle: { fontSize: 14, fontWeight: '600', color: '#111827' },
  listCardMeta: { fontSize: 12, color: '#6b7280', marginTop: 2 },

  empty: { alignItems: 'center', paddingTop: 40 },
  emptyText: { fontSize: 14, color: '#9ca3af', marginTop: 12 },
});
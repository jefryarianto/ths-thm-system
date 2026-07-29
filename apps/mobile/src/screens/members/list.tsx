import React, { useState } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, RefreshControl } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { router } from 'expo-router';
import { useMembers, STATUS_OPTIONS, TINGKAT_OPTIONS } from '../../hooks/use-members';
import { useRefresh } from '../../hooks/use-refresh';
import { LoadingView, FilterChips, SearchBar } from '../../components/ui/shared';

export default function MembersScreen() {
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [filterTingkat, setFilterTingkat] = useState('');

  const { data: members, loading, refetch } = useMembers(search, filterStatus, filterTingkat);
  const { refreshing, onRefresh } = useRefresh(refetch);

  if (loading) return <LoadingView message="Memuat data anggota..." />;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={{ flex: 1 }}>
          <Text style={styles.headerTitle}>Anggota</Text>
          <Text style={styles.headerSub}>{(members ?? []).length} anggota</Text>
        </View>
        <TouchableOpacity
          style={styles.addBtn}
          activeOpacity={0.7}
          onPress={() => router.push('/members/create')}
        >
          <Ionicons name="add" size={22} color="#fff" />
        </TouchableOpacity>
      </View>

      <SearchBar value={search} onChangeText={setSearch} placeholder="Cari anggota..." />

      <FilterChips options={STATUS_OPTIONS} selected={filterStatus} onChange={setFilterStatus} />
      <FilterChips options={TINGKAT_OPTIONS} selected={filterTingkat} onChange={setFilterTingkat} />

      <FlatList
        data={members}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ padding: 16 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Ionicons name="people" size={48} color="#d1d5db" />
            <Text style={styles.emptyText}>Belum ada anggota</Text>
          </View>
        }
        renderItem={({ item }) => {
          const statusColor = item.statusKeanggotaan === 'aktif' ? '#16a34a' : '#dc2626';
          const statusLabel = item.statusKeanggotaan === 'aktif' ? 'Aktif' : 'Nonaktif';
          return (
            <TouchableOpacity
              style={styles.card}
              activeOpacity={0.7}
              onPress={() => {
                const { router: r } = require('expo-router');
                r.push(`/members/${item.id}`);
              }}
            >
              <View style={styles.avatar}>
                <Text style={styles.avatarText}>{item.namaLengkap.charAt(0)}</Text>
              </View>
              <View style={styles.cardBody}>
                <Text style={styles.name}>{item.namaLengkap}</Text>
                <View style={styles.metaRow}>
                  <Text style={styles.metaText}>{item.noAnggota}</Text>
                  {item.ranting && (
                    <>
                      <Text style={styles.metaDot}>·</Text>
                      <Ionicons name="location" size={11} color="#9ca3af" />
                      <Text style={styles.metaText}>{item.ranting.nama}</Text>
                    </>
                  )}
                </View>
                <View style={styles.metaRow}>
                  <Text style={styles.tingkatText}>{item.tingkat}</Text>
                </View>
              </View>
              <View
                style={[
                  styles.statusBadge,
                  { backgroundColor: item.statusKeanggotaan === 'aktif' ? '#ecfdf5' : '#fef2f2' },
                ]}
              >
                <Text style={[styles.statusText, { color: statusColor }]}>{statusLabel}</Text>
              </View>
            </TouchableOpacity>
          );
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f3f4f6' },
  header: { backgroundColor: '#2563eb', padding: 24, paddingTop: 60, paddingBottom: 20, flexDirection: 'row', alignItems: 'center' },
  addBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: 'rgba(255,255,255,0.2)', alignItems: 'center', justifyContent: 'center' },
  headerTitle: { color: '#fff', fontSize: 22, fontWeight: '700' },
  headerSub: { color: '#bfdbfe', fontSize: 13, marginTop: 4 },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 14,
    padding: 14,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#f3f4f6',
    shadowColor: '#000',
    shadowOpacity: 0.03,
    shadowRadius: 4,
    elevation: 1,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#eff6ff',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  avatarText: { fontSize: 16, fontWeight: '700', color: '#2563eb' },
  cardBody: { flex: 1 },
  name: { fontSize: 15, fontWeight: '600', color: '#111827' },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 3, marginTop: 3 },
  metaText: { fontSize: 12, color: '#6b7280' },
  metaDot: { fontSize: 12, color: '#9ca3af' },
  tingkatText: { fontSize: 11, color: '#2563eb', fontWeight: '500', marginTop: 2 },
  statusBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 10, marginLeft: 8 },
  statusText: { fontSize: 11, fontWeight: '600' },
  empty: { alignItems: 'center', paddingTop: 60 },
  emptyText: { fontSize: 14, color: '#9ca3af', marginTop: 12 },
});

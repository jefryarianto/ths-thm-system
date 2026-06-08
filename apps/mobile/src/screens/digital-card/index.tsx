import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import QRCode from 'react-native-qrcode-svg';
import apiClient from '../../lib/api-client';

interface MemberInfo {
  nomorAnggota: string;
  namaLengkap: string;
  tingkat: string;
  ranting: { nama: string } | null;
}

export default function DigitalCardScreen() {
  const [member, setMember] = useState<MemberInfo | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const res = await apiClient.get('/auth/me');
        const me = res.data.data;
        const memberRes = await apiClient.get('/members', { params: { limit: 1 } });
        setMember(memberRes.data.data?.[0] || { namaLengkap: me.namaLengkap, nomorAnggota: '-', tingkat: '-', ranting: { nama: '-' } });
      } catch { /* ignore */ }
      setLoading(false);
    })();
  }, []);

  if (loading) return <View style={styles.container}><ActivityIndicator size="large" /></View>;

  const qrValue = JSON.stringify({
    nomorAnggota: member?.nomorAnggota,
    namaLengkap: member?.namaLengkap,
    valid: true,
  });

  return (
    <View style={styles.container}>
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <Text style={styles.orgName}>THS-THM</Text>
          <Text style={styles.cardTitle}>Kartu Anggota Digital</Text>
        </View>
        <View style={styles.cardBody}>
          <View style={styles.photoPlaceholder}>
            <Text style={styles.photoText}>Foto</Text>
          </View>
          <View style={styles.infoBlock}>
            <Text style={styles.memberName}>{member?.namaLengkap || '-'}</Text>
            <Text style={styles.memberId}>{member?.nomorAnggota || '-'}</Text>
            <Text style={styles.memberLevel}>Tingkat: {member?.tingkat || '-'}</Text>
            <Text style={styles.memberRanting}>Ranting: {member?.ranting?.nama || '-'}</Text>
          </View>
        </View>
        <View style={styles.qrContainer}>
          <QRCode value={qrValue} size={120} />
          <Text style={styles.qrHint}>Scan untuk verifikasi</Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f3f4f6', padding: 20, justifyContent: 'center' },
  card: { backgroundColor: '#fff', borderRadius: 16, overflow: 'hidden', shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 16, elevation: 5 },
  cardHeader: { backgroundColor: '#1d4ed8', padding: 20, alignItems: 'center' },
  orgName: { color: '#bfdbfe', fontSize: 12, fontWeight: '600', letterSpacing: 2 },
  cardTitle: { color: '#fff', fontSize: 16, fontWeight: '700', marginTop: 4 },
  cardBody: { flexDirection: 'row', padding: 20 },
  photoPlaceholder: { width: 80, height: 100, backgroundColor: '#e5e7eb', borderRadius: 8, justifyContent: 'center', alignItems: 'center' },
  photoText: { color: '#9ca3af', fontSize: 12 },
  infoBlock: { flex: 1, marginLeft: 16, justifyContent: 'center' },
  memberName: { fontSize: 18, fontWeight: '700', color: '#111827' },
  memberId: { fontSize: 14, color: '#6b7280', marginTop: 4, fontFamily: 'monospace' },
  memberLevel: { fontSize: 13, color: '#374151', marginTop: 8 },
  memberRanting: { fontSize: 13, color: '#374151', marginTop: 2 },
  qrContainer: { backgroundColor: '#f9fafb', padding: 16, alignItems: 'center', borderTopWidth: 1, borderTopColor: '#e5e7eb' },
  qrHint: { fontSize: 11, color: '#9ca3af', marginTop: 8 },
});
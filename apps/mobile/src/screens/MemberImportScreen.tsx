import React, { useState } from 'react';
import { View, Text, ActivityIndicator, Alert } from 'react-native';
import DocumentPicker from 'react-native-document-picker';
import { uploadCsv } from '../services/memberService';
import { registerForPushNotifications } from '../lib/fcm';

export default function MemberImportScreen() {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);

  const pickFile = async () => {
    try {
      const res = await DocumentPicker.pickSingle({
        type: DocumentPicker.types.plainText,
      });
      if (!res.name.endsWith('.csv')) {
        Alert.alert('Error', 'File harus CSV');
        return;
      }
      setLoading(true);
      const uploadResult = await uploadCsv(res);
      setResult(uploadResult);
    } catch (e) {
      if (DocumentPicker.isCancel(e)) {
        return;
      }
      Alert.alert('Gagal upload', String(e));
    } finally {
      setLoading(false);
    }
  };

  const registerToken = async () => {
    const token = await registerForPushNotifications();
    if (token) {
      Alert.alert('Sukses', 'Token FCM terdaftar');
    } else {
      Alert.alert('Gagal', 'Tidak bisa mendapatkan token FCM');
    }
  };

  return (
    <View style={{ flex: 1, padding: 20, justifyContent: 'center' }}>
      <View style={{ marginBottom: 16 }}>
        <Text style={{ fontSize: 18, fontWeight: '700', marginBottom: 12, textAlign: 'center' }}>Import CSV Anggota</Text>
        <View style={{ marginBottom: 12 }}>
          <Button title="Pilih File CSV" onPress={pickFile} disabled={loading} color="#2563eb" />
        </View>
        {loading && <ActivityIndicator style={{ marginTop: 10 }} />}
        {result && (
          <View style={{ marginTop: 20, padding: 16, backgroundColor: '#f0fdf4', borderRadius: 8 }}>
            <Text style={{ fontWeight: '600' }}>Hasil Import:</Text>
            <Text>Berhasil: {result.success}</Text>
            <Text>Incomplete: {result.incomplete}</Text>
            <Text>Errors: {result.errors}</Text>
          </View>
        )}
      </View>
      <View style={{ marginTop: 30, paddingTop: 20, borderTopWidth: 1, borderTopColor: '#e5e7eb' }}>
        <Button title="Daftarkan Token FCM" onPress={registerToken} color="#6b7280" />
      </View>
    </View>
  );
}

function Button(props: { title: string; onPress: () => void; disabled?: boolean; color?: string }) {
  return (
    <View style={{ backgroundColor: props.color || '#2563eb', borderRadius: 8, overflow: 'hidden' }}>
      <Text
        onPress={props.disabled ? undefined : props.onPress}
        style={{
          color: '#fff',
          textAlign: 'center',
          padding: 14,
          fontWeight: '600',
          opacity: props.disabled ? 0.5 : 1,
        }}
      >
        {props.title}
      </Text>
    </View>
  );
}
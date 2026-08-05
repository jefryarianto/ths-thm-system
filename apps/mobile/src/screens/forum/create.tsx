import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  ActivityIndicator,
} from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { router } from 'expo-router';
import apiClient, { unwrap } from '../../lib/api-client';
import { createForumThread } from '../../hooks/use-forum';
import { LoadingView } from '../../components/ui/shared';

interface Category {
  id: string;
  nama: string;
}

export default function CreateThreadScreen() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [categoryId, setCategoryId] = useState('');
  const [judul, setJudul] = useState('');
  const [konten, setKonten] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const res = await apiClient.get('/forum/categories');
        const data = (unwrap(res) ?? []) as Category[];
        setCategories(data);
        if (data.length > 0) setCategoryId(data[0].id);
      } catch {
        Alert.alert('Error', 'Gagal memuat kategori');
      }
      setLoading(false);
    })();
  }, []);

  const handleSubmit = async () => {
    if (!categoryId || !judul.trim() || !konten.trim()) {
      Alert.alert('Error', 'Semua field harus diisi');
      return;
    }
    setSubmitting(true);
    try {
      const result = await createForumThread(categoryId, judul.trim(), konten.trim());
      // result is the unwrapped thread object which includes an id
      const threadResult = result as { id?: string } | null;
      if (threadResult?.id) {
        router.replace(`/forum/t/${threadResult.id}` as any);
      } else {
        router.back();
      }
    } catch (err: any) {
      Alert.alert('Gagal', err?.response?.data?.message || 'Gagal membuat thread');
    }
    setSubmitting(false);
  };

  if (loading) return <LoadingView message="Memuat kategori..." />;

  return (
    <ScrollView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={22} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Buat Thread Baru</Text>
      </View>

      <View style={styles.section}>
        {/* Kategori */}
        <View style={styles.fieldGroup}>
          <Text style={styles.fieldLabel}>Kategori</Text>
          <View style={styles.selectContainer}>
            {categories.map((cat) => (
              <TouchableOpacity
                key={cat.id}
                style={[
                  styles.selectOption,
                  categoryId === cat.id && styles.selectOptionActive,
                ]}
                onPress={() => setCategoryId(cat.id)}
              >
                <Text
                  style={[
                    styles.selectOptionText,
                    categoryId === cat.id && styles.selectOptionTextActive,
                  ]}
                >
                  {cat.nama}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Judul */}
        <View style={styles.fieldGroup}>
          <Text style={styles.fieldLabel}>Judul</Text>
          <TextInput
            style={styles.input}
            value={judul}
            onChangeText={setJudul}
            placeholder="Judul thread..."
            placeholderTextColor="#9ca3af"
          />
        </View>

        {/* Konten */}
        <View style={styles.fieldGroup}>
          <Text style={styles.fieldLabel}>Konten</Text>
          <TextInput
            style={[styles.input, styles.kontenInput]}
            value={konten}
            onChangeText={setKonten}
            placeholder="Tulis konten thread..."
            placeholderTextColor="#9ca3af"
            multiline
            numberOfLines={8}
            textAlignVertical="top"
          />
        </View>

        {/* Submit */}
        <TouchableOpacity
          style={[styles.submitBtn, submitting && styles.btnDisabled]}
          onPress={handleSubmit}
          disabled={submitting}
        >
          {submitting ? (
            <ActivityIndicator color="#fff" size="small" />
          ) : (
            <>
              <Ionicons name="send" size={18} color="#fff" />
              <Text style={styles.submitBtnText}>Buat Thread</Text>
            </>
          )}
        </TouchableOpacity>
      </View>

      <View style={{ height: 40 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f3f4f6' },
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
  headerTitle: { color: '#fff', fontSize: 18, fontWeight: '700' },

  section: { padding: 16 },

  fieldGroup: { marginBottom: 20 },
  fieldLabel: { fontSize: 13, fontWeight: '600', color: '#374151', marginBottom: 8 },

  selectContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  selectOption: {
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 10,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#d1d5db',
  },
  selectOptionActive: {
    backgroundColor: '#eff6ff',
    borderColor: '#2563eb',
  },
  selectOptionText: { fontSize: 13, color: '#374151', fontWeight: '500' },
  selectOptionTextActive: { color: '#2563eb', fontWeight: '600' },

  input: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 10,
    padding: 12,
    fontSize: 15,
    color: '#111827',
  },
  kontenInput: { minHeight: 160, textAlignVertical: 'top' },

  submitBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#2563eb',
    paddingVertical: 14,
    borderRadius: 12,
    marginTop: 8,
  },
  submitBtnText: { fontSize: 16, fontWeight: '600', color: '#fff' },
  btnDisabled: { opacity: 0.5 },
});

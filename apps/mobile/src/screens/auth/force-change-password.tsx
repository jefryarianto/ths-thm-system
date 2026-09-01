import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { router, useLocalSearchParams } from 'expo-router';
import apiClient from '../../lib/api-client';
import { safeIconName } from '../../lib/icons';

export default function ForceChangePasswordScreen() {
  const { token } = useLocalSearchParams<{ token: string }>();
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [loading, setLoading] = useState(false);

  const minLengthOk = newPassword.length >= 6;
  const passwordsMatch = newPassword.length > 0 && newPassword === confirmPassword;

  const handleSubmit = async () => {
    if (!newPassword || !confirmPassword) {
      Alert.alert('Error', 'Semua kolom harus diisi');
      return;
    }
    if (!minLengthOk) {
      Alert.alert('Error', 'Password minimal 6 karakter');
      return;
    }
    if (newPassword !== confirmPassword) {
      Alert.alert('Error', 'Konfirmasi password tidak cocok');
      return;
    }

    setLoading(true);
    try {
      await apiClient.post('/auth/force-change-password', {
        token,
        newPassword,
      });
      Alert.alert('Berhasil', 'Password berhasil diubah. Silakan login dengan password baru.');
      router.replace('/login' as any);
    } catch (error: any) {
      const msg =
        error?.response?.data?.message ||
        'Gagal mengubah password. Token mungkin sudah kadaluarsa.';
      Alert.alert('Error', msg);
    } finally {
      setLoading(false);
    }
  };

  if (!token) {
    return (
      <View style={styles.center}>
        <Text style={styles.errorText}>Token tidak valid.</Text>
        <TouchableOpacity style={styles.button} onPress={() => router.replace('/login' as any)}>
          <Text style={styles.buttonText}>Kembali ke Login</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
        <Text style={styles.backText}>← Kembali</Text>
      </TouchableOpacity>

      <View style={styles.header}>
        <Text style={styles.title}>Ubah Password</Text>
        <Text style={styles.subtitle}>
          Anda harus mengubah password sebelum melanjutkan.
        </Text>
      </View>

      <View style={styles.form}>
        <Text style={styles.label}>Password Baru</Text>
        <View style={styles.inputWrapper}>
          <TextInput
            style={styles.input}
            value={newPassword}
            onChangeText={setNewPassword}
            placeholder="Minimal 6 karakter"
            secureTextEntry={!showPassword}
            autoCapitalize="none"
            autoCorrect={false}
          />
          <TouchableOpacity
            style={styles.eyeBtn}
            onPress={() => setShowPassword((v) => !v)}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Ionicons
              name={safeIconName(showPassword ? 'eye-off-outline' : 'eye-outline')}
              size={20}
              color="#6b7280"
            />
          </TouchableOpacity>
        </View>

        <Text style={styles.label}>Konfirmasi Password</Text>
        <View style={styles.inputWrapper}>
          <TextInput
            style={styles.input}
            value={confirmPassword}
            onChangeText={setConfirmPassword}
            placeholder="Ketik ulang password baru"
            secureTextEntry={!showConfirm}
            autoCapitalize="none"
            autoCorrect={false}
          />
          <TouchableOpacity
            style={styles.eyeBtn}
            onPress={() => setShowConfirm((v) => !v)}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Ionicons
              name={safeIconName(showConfirm ? 'eye-off-outline' : 'eye-outline')}
              size={20}
              color="#6b7280"
            />
          </TouchableOpacity>
        </View>

        <View style={styles.requirements}>
          <Text style={styles.requirementsTitle}>Password harus:</Text>
          <View style={styles.requirementRow}>
            <Ionicons
              name={safeIconName(minLengthOk ? 'checkmark-circle' : 'ellipse-outline')}
              size={18}
              color={minLengthOk ? '#16a34a' : '#9ca3af'}
            />
            <Text style={styles.requirementText}>Minimal 6 karakter</Text>
          </View>
          <View style={styles.requirementRow}>
            <Ionicons
              name={safeIconName(passwordsMatch ? 'checkmark-circle' : 'ellipse-outline')}
              size={18}
              color={passwordsMatch ? '#16a34a' : '#9ca3af'}
            />
            <Text style={styles.requirementText}>Konfirmasi password cocok</Text>
          </View>
        </View>

        <TouchableOpacity
          style={[styles.button, loading && styles.buttonDisabled]}
          onPress={handleSubmit}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.buttonText}>Ubah Password</Text>
          )}
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f3f4f6',
    justifyContent: 'center',
    padding: 24,
  },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24 },
  errorText: { color: '#dc2626', fontSize: 16, fontWeight: 'bold', marginBottom: 16 },
  backBtn: { position: 'absolute', top: 60, left: 24, zIndex: 10 },
  backText: { fontSize: 14, color: '#2563eb', fontWeight: '500' },
  header: { alignItems: 'center', marginBottom: 32 },
  title: { fontSize: 28, fontWeight: 'bold', color: '#1d4ed8' },
  subtitle: {
    fontSize: 14,
    color: '#6b7280',
    marginTop: 8,
    textAlign: 'center',
    lineHeight: 20,
  },
  form: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 24,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 2,
  },
  label: { fontSize: 14, fontWeight: '600', color: '#374151', marginBottom: 6 },
  inputWrapper: { position: 'relative', marginBottom: 12 },
  input: {
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 8,
    padding: 12,
    paddingRight: 44,
    fontSize: 16,
    backgroundColor: '#f9fafb',
  },
  eyeBtn: {
    position: 'absolute',
    right: 12,
    top: 0,
    bottom: 0,
    justifyContent: 'center',
  },
  requirements: {
    backgroundColor: '#eff6ff',
    borderWidth: 1,
    borderColor: '#bfdbfe',
    borderRadius: 8,
    padding: 12,
    marginTop: 4,
  },
  requirementsTitle: {
    fontSize: 12,
    fontWeight: '600',
    color: '#1d4ed8',
    marginBottom: 6,
  },
  requirementRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 4 },
  requirementText: { fontSize: 13, color: '#1e40af' },
  button: {
    backgroundColor: '#2563eb',
    borderRadius: 8,
    padding: 14,
    alignItems: 'center',
    marginTop: 16,
  },
  buttonDisabled: { opacity: 0.5 },
  buttonText: { color: '#fff', fontSize: 16, fontWeight: '600' },
});

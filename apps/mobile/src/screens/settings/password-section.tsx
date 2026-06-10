import React, { useState } from 'react';
import {
  View, Text, StyleSheet, TextInput,
  TouchableOpacity, Alert, ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import apiClient from '../../lib/api-client';

export default function PasswordSection() {
  const [showPasswordForm, setShowPasswordForm] = useState(false);
  const [passwordForm, setPasswordForm] = useState({ oldPassword: '', newPassword: '', confirmPassword: '' });
  const [savingPassword, setSavingPassword] = useState(false);
  const [showOldPass, setShowOldPass] = useState(false);
  const [showNewPass, setShowNewPass] = useState(false);

  const handleChangePassword = async () => {
    if (!passwordForm.oldPassword || !passwordForm.newPassword) {
      Alert.alert('Error', 'Semua field password harus diisi');
      return;
    }
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      Alert.alert('Error', 'Password baru dan konfirmasi tidak cocok');
      return;
    }
    if (passwordForm.newPassword.length < 6) {
      Alert.alert('Error', 'Password baru minimal 6 karakter');
      return;
    }
    setSavingPassword(true);
    try {
      await apiClient.patch('/auth/change-password', {
        oldPassword: passwordForm.oldPassword,
        newPassword: passwordForm.newPassword,
      });
      setPasswordForm({ oldPassword: '', newPassword: '', confirmPassword: '' });
      setShowPasswordForm(false);
      Alert.alert('Berhasil', 'Password berhasil diganti');
    } catch (err: any) {
      Alert.alert('Error', err?.response?.data?.message || 'Gagal mengganti password');
    } finally {
      setSavingPassword(false);
    }
  };

  return (
    <View>
      <View style={styles.sectionHeader}>
        <Ionicons name="lock-closed" size={20} color="#2563eb" />
        <Text style={styles.sectionTitle}>Ganti Password</Text>
      </View>

      <View style={styles.card}>
        {!showPasswordForm ? (
          <TouchableOpacity style={styles.editButton} onPress={() => setShowPasswordForm(true)}>
            <Ionicons name="key" size={14} color="#2563eb" />
            <Text style={styles.editButtonText}>Ganti Password</Text>
          </TouchableOpacity>
        ) : (
          <>
            <Text style={styles.fieldLabel}>Password Lama</Text>
            <View style={styles.passwordRow}>
              <TextInput
                style={[styles.input, { flex: 1 }]}
                value={passwordForm.oldPassword}
                onChangeText={(t) => setPasswordForm((p) => ({ ...p, oldPassword: t }))}
                placeholder="Masukkan password lama"
                secureTextEntry={!showOldPass}
              />
              <TouchableOpacity style={styles.eyeButton} onPress={() => setShowOldPass(!showOldPass)}>
                <Ionicons name={showOldPass ? 'eye-off' : 'eye'} size={20} color="#6b7280" />
              </TouchableOpacity>
            </View>

            <Text style={styles.fieldLabel}>Password Baru</Text>
            <View style={styles.passwordRow}>
              <TextInput
                style={[styles.input, { flex: 1 }]}
                value={passwordForm.newPassword}
                onChangeText={(t) => setPasswordForm((p) => ({ ...p, newPassword: t }))}
                placeholder="Minimal 6 karakter"
                secureTextEntry={!showNewPass}
              />
              <TouchableOpacity style={styles.eyeButton} onPress={() => setShowNewPass(!showNewPass)}>
                <Ionicons name={showNewPass ? 'eye-off' : 'eye'} size={20} color="#6b7280" />
              </TouchableOpacity>
            </View>

            <Text style={styles.fieldLabel}>Konfirmasi Password Baru</Text>
            <TextInput
              style={styles.input}
              value={passwordForm.confirmPassword}
              onChangeText={(t) => setPasswordForm((p) => ({ ...p, confirmPassword: t }))}
              placeholder="Ulangi password baru"
              secureTextEntry
            />

            <View style={styles.buttonRow}>
              <TouchableOpacity
                style={styles.cancelButton}
                onPress={() => {
                  setShowPasswordForm(false);
                  setPasswordForm({ oldPassword: '', newPassword: '', confirmPassword: '' });
                }}
              >
                <Text style={styles.cancelButtonText}>Batal</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.saveButton, savingPassword && styles.buttonDisabled]}
                onPress={handleChangePassword}
                disabled={savingPassword}
              >
                {savingPassword ? (
                  <ActivityIndicator color="#fff" size="small" />
                ) : (
                  <Text style={styles.saveButtonText}>Ganti</Text>
                )}
              </TouchableOpacity>
            </View>
          </>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 },
  sectionTitle: { fontSize: 16, fontWeight: '600', color: '#111827' },
  card: { backgroundColor: '#fff', borderRadius: 12, padding: 16, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 8, elevation: 2 },
  fieldLabel: { fontSize: 13, fontWeight: '600', color: '#374151', marginBottom: 6, marginTop: 12 },
  input: { borderWidth: 1, borderColor: '#d1d5db', borderRadius: 8, padding: 12, fontSize: 15, backgroundColor: '#f9fafb' },
  editButton: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 8 },
  editButtonText: { fontSize: 14, fontWeight: '600', color: '#2563eb' },
  buttonRow: { flexDirection: 'row', justifyContent: 'flex-end', gap: 8, marginTop: 16 },
  saveButton: { backgroundColor: '#2563eb', borderRadius: 8, paddingVertical: 10, paddingHorizontal: 20, alignItems: 'center' },
  saveButtonText: { color: '#fff', fontSize: 14, fontWeight: '600' },
  cancelButton: { borderWidth: 1, borderColor: '#d1d5db', borderRadius: 8, paddingVertical: 10, paddingHorizontal: 20, alignItems: 'center' },
  cancelButtonText: { color: '#374151', fontSize: 14, fontWeight: '600' },
  buttonDisabled: { opacity: 0.5 },
  passwordRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  eyeButton: { padding: 8 },
});

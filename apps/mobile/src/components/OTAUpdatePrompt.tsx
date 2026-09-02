import React from 'react';
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  ActivityIndicator,
  StyleSheet,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface OTAUpdatePromptProps {
  /** Whether the modal is visible */
  visible: boolean;
  /** Whether an update is currently being downloaded */
  isDownloading: boolean;
  /** The version info of the available update */
  availableVersion: string | null;
  /** Error message, if any */
  error: string | null;
  /** Called when user taps "Update Now" */
  onUpdate: () => void;
  /** Called when user taps "Later" */
  onDismiss: () => void;
}

/**
 * A modal dialog that prompts the user to install an available OTA update.
 * Shows a download spinner while the update is being fetched.
 */
export function OTAUpdatePrompt({
  visible,
  isDownloading,
  availableVersion,
  error,
  onUpdate,
  onDismiss,
}: OTAUpdatePromptProps) {
  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={!isDownloading ? onDismiss : undefined}
    >
      <View style={styles.overlay}>
        <View style={styles.dialog}>
          {/* Icon */}
          <View style={styles.iconContainer}>
            <Ionicons
              name={isDownloading ? 'cloud-download' : 'arrow-up-circle'}
              size={48}
              color="#6366f1"
            />
          </View>

          {/* Title */}
          <Text style={styles.title}>
            {isDownloading ? 'Memperbarui Aplikasi...' : 'Pembaruan Tersedia'}
          </Text>

          {/* Description */}
          <Text style={styles.description}>
            {isDownloading
              ? 'Sedang mengunduh pembaruan. Jangan tutup aplikasi.'
              : error
                ? `Gagal memperbarui: ${error}`
                : `Versi baru ${availableVersion ? `(${availableVersion})` : ''} tersedia. Ingin memperbarui sekarang?`}
          </Text>

          {/* Error retry info */}
          {error && !isDownloading && (
            <Text style={styles.errorHint}>
              Anda dapat mencoba lagi nanti atau memperbarui secara manual dari Play Store.
            </Text>
          )}

          {/* Progress / Buttons */}
          {isDownloading ? (
            <View style={styles.downloadingContainer}>
              <ActivityIndicator size="large" color="#6366f1" />
              <Text style={styles.downloadingText}>Mengunduh...</Text>
            </View>
          ) : (
            <View style={styles.buttonRow}>
              {error ? (
                <>
                  <TouchableOpacity style={styles.buttonSecondary} onPress={onDismiss}>
                    <Text style={styles.buttonSecondaryText}>Tutup</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.buttonPrimary} onPress={onUpdate}>
                    <Text style={styles.buttonPrimaryText}>Coba Lagi</Text>
                  </TouchableOpacity>
                </>
              ) : (
                <>
                  <TouchableOpacity style={styles.buttonSecondary} onPress={onDismiss}>
                    <Text style={styles.buttonSecondaryText}>Nanti Saja</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.buttonPrimary} onPress={onUpdate}>
                    <Ionicons name="download" size={16} color="#fff" style={{ marginRight: 6 }} />
                    <Text style={styles.buttonPrimaryText}>Perbarui Sekarang</Text>
                  </TouchableOpacity>
                </>
              )}
            </View>
          )}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  dialog: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 28,
    width: '100%',
    maxWidth: 380,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.25,
    shadowRadius: 16,
    elevation: 16,
  },
  iconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#eef2ff',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1e293b',
    marginBottom: 8,
    textAlign: 'center',
  },
  description: {
    fontSize: 14,
    color: '#64748b',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 20,
  },
  errorHint: {
    fontSize: 12,
    color: '#94a3b8',
    textAlign: 'center',
    marginBottom: 16,
    fontStyle: 'italic',
  },
  downloadingContainer: {
    alignItems: 'center',
    paddingVertical: 16,
  },
  downloadingText: {
    fontSize: 14,
    color: '#6366f1',
    marginTop: 12,
    fontWeight: '500',
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 12,
    width: '100%',
  },
  buttonPrimary: {
    flex: 1,
    backgroundColor: '#6366f1',
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonPrimaryText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '600',
  },
  buttonSecondary: {
    flex: 1,
    backgroundColor: '#f1f5f9',
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonSecondaryText: {
    color: '#64748b',
    fontSize: 15,
    fontWeight: '600',
  },
});

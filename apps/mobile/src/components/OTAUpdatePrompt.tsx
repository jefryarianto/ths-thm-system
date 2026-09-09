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
import { theme } from '../theme';

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
              color={theme.colors.primary}
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
              <ActivityIndicator size="large" color={theme.colors.primary} />
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
                    <Ionicons name="download" size={16} color={theme.colors.textOnPrimary} style={{ marginRight: 6 }} />
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
    backgroundColor: theme.colors.overlay,
    justifyContent: 'center',
    alignItems: 'center',
    padding: theme.spacing.xxl,
  },
  dialog: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.xl,
    padding: theme.spacing.xxxl - 4,
    width: '100%',
    maxWidth: 380,
    alignItems: 'center',
    shadowColor: theme.colors.dark,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.25,
    shadowRadius: 16,
    elevation: 16,
  },
  iconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: theme.colors.primaryLight,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: theme.spacing.lg,
  },
  title: {
    fontSize: theme.typography.size.xl,
    fontWeight: theme.typography.weight.bold,
    color: theme.colors.text,
    marginBottom: theme.spacing.sm,
    textAlign: 'center',
  },
  description: {
    fontSize: theme.typography.size.md,
    color: theme.colors.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: theme.spacing.xl,
  },
  errorHint: {
    fontSize: theme.typography.size.sm,
    color: theme.colors.textMuted,
    textAlign: 'center',
    marginBottom: theme.spacing.lg,
    fontStyle: 'italic',
  },
  downloadingContainer: {
    alignItems: 'center',
    paddingVertical: theme.spacing.lg,
  },
  downloadingText: {
    fontSize: theme.typography.size.md,
    color: theme.colors.primary,
    marginTop: theme.spacing.md,
    fontWeight: theme.typography.weight.medium,
  },
  buttonRow: {
    flexDirection: 'row',
    gap: theme.spacing.md,
    width: '100%',
  },
  buttonPrimary: {
    flex: 1,
    backgroundColor: theme.colors.primary,
    borderRadius: theme.radius.md,
    paddingVertical: theme.spacing.md + 2,
    paddingHorizontal: theme.spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonPrimaryText: {
    color: theme.colors.textOnPrimary,
    fontSize: 15,
    fontWeight: theme.typography.weight.semibold,
  },
  buttonSecondary: {
    flex: 1,
    backgroundColor: theme.colors.surfaceMuted,
    borderRadius: theme.radius.md,
    paddingVertical: theme.spacing.md + 2,
    paddingHorizontal: theme.spacing.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonSecondaryText: {
    color: theme.colors.textSecondary,
    fontSize: 15,
    fontWeight: theme.typography.weight.semibold,
  },
});

import { useState, useEffect, useCallback } from 'react';
import { Modal, View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { LoadingSpinner } from './ui/shared';
import { proactivelyRefresh } from '../lib/api-client';
import { scheduleExpiryWarning, resetSessionExpired } from '../lib/session-expired';
import { theme } from '../theme';

interface SessionExpiryWarningProps {
  visible: boolean;
  expiresInSeconds: number;
  onDismiss: () => void;
}

function formatTime(totalSeconds: number): string {
  const m = Math.floor(totalSeconds / 60);
  const s = totalSeconds % 60;
  return m > 0 ? `${m}:${String(s).padStart(2, '0')}` : `${s}`;
}

export function SessionExpiryWarning({ visible, expiresInSeconds: initial, onDismiss }: SessionExpiryWarningProps) {
  const [remaining, setRemaining] = useState(initial);
  const [refreshing, setRefreshing] = useState(false);

  // Reset remaining when the modal reopens with a new value
  useEffect(() => {
    if (visible) setRemaining(initial);
  }, [visible, initial]);

  useEffect(() => {
    if (!visible || remaining <= 0) {
      if (remaining <= 0 && visible) onDismiss();
      return;
    }
    const timer = setInterval(() => {
      setRemaining((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          onDismiss();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [visible, remaining, onDismiss]);

  const handleExtend = useCallback(async () => {
    setRefreshing(true);
    try {
      const newToken = await proactivelyRefresh();
      if (newToken) {
        resetSessionExpired();
        scheduleExpiryWarning(newToken);
      }
      onDismiss();
    } catch {
      onDismiss();
    } finally {
      setRefreshing(false);
    }
  }, [onDismiss]);

  const progressPercent = Math.max(0, Math.min(100, (remaining / initial) * 100));
  const isUrgent = remaining <= 60;

  return (
    <Modal transparent visible={visible} animationType="fade" onRequestClose={onDismiss}>
      <View style={styles.overlay}>
        <View style={styles.card}>
          {/* Warning Icon */}
          <View style={[styles.iconContainer, isUrgent ? styles.iconUrgent : styles.iconWarning]}>
            <Text style={styles.iconText}>!</Text>
          </View>

          {/* Title */}
          <Text style={styles.title}>Sesi Akan Berakhir</Text>

          {/* Countdown */}
          <Text style={styles.subtitle}>Sisa waktu Anda:</Text>
          <Text style={[styles.countdown, isUrgent && styles.countdownUrgent]}>
            {formatTime(remaining)}
          </Text>

          {/* Progress Bar */}
          <View style={styles.progressTrack}>
            <View
              style={[
                styles.progressFill,
                { width: `${progressPercent}%` },
                isUrgent ? styles.progressUrgent : styles.progressNormal,
              ]}
            />
          </View>

          <Text style={styles.hint}>Klik &quot;Perpanjang Sesi&quot; untuk tetap masuk.</Text>

          {/* Action Buttons */}
          <View style={styles.buttons}>
            <TouchableOpacity
              style={[styles.extendBtn, refreshing && styles.btnDisabled]}
              onPress={handleExtend}
              disabled={refreshing}
              activeOpacity={0.7}
            >
              {refreshing ? (
                <LoadingSpinner size="small" color={theme.colors.textOnPrimary} />
              ) : (
                <Text style={styles.extendBtnText}>Perpanjang Sesi</Text>
              )}
            </TouchableOpacity>

            <TouchableOpacity style={styles.logoutBtn} onPress={onDismiss} activeOpacity={0.7}>
              <Text style={styles.logoutBtnText}>Logout</Text>
            </TouchableOpacity>
          </View>
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
    paddingHorizontal: theme.spacing.xxl,
  },
  card: {
    width: '100%',
    maxWidth: 340,
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.xl,
    paddingVertical: theme.spacing.xxxl,
    paddingHorizontal: theme.spacing.xxl,
    alignItems: 'center',
    shadowColor: theme.colors.dark,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
  },
  iconContainer: {
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: theme.spacing.lg,
  },
  iconWarning: {
    backgroundColor: theme.colors.warningLight,
  },
  iconUrgent: {
    backgroundColor: theme.colors.dangerLight,
  },
  iconText: {
    fontSize: 28,
    fontWeight: '800',
    color: theme.colors.warning,
  },
  title: {
    fontSize: theme.typography.size.xl,
    fontWeight: theme.typography.weight.bold,
    color: theme.colors.text,
    marginBottom: theme.spacing.xs,
  },
  subtitle: {
    fontSize: theme.typography.size.md,
    color: theme.colors.textSecondary,
    marginBottom: theme.spacing.xs,
  },
  countdown: {
    fontSize: 42,
    fontWeight: '800',
    fontVariant: ['tabular-nums'],
    color: theme.colors.warning,
    marginBottom: theme.spacing.lg,
  },
  countdownUrgent: {
    color: theme.colors.danger,
  },
  progressTrack: {
    width: '100%',
    height: 6,
    borderRadius: 3,
    backgroundColor: theme.colors.border,
    overflow: 'hidden',
    marginBottom: theme.spacing.lg,
  },
  progressFill: {
    height: '100%',
    borderRadius: 3,
  },
  progressNormal: {
    backgroundColor: theme.colors.warning,
  },
  progressUrgent: {
    backgroundColor: theme.colors.danger,
  },
  hint: {
    fontSize: 13,
    color: theme.colors.textMuted,
    textAlign: 'center',
    marginBottom: theme.spacing.xxl,
  },
  buttons: {
    width: '100%',
    gap: 10,
  },
  extendBtn: {
    width: '100%',
    backgroundColor: theme.colors.primary,
    borderRadius: theme.radius.md,
    paddingVertical: theme.spacing.md + 2,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 48,
  },
  extendBtnText: {
    color: theme.colors.textOnPrimary,
    fontSize: theme.typography.size.lg,
    fontWeight: theme.typography.weight.semibold,
  },
  btnDisabled: {
    opacity: 0.6,
  },
  logoutBtn: {
    width: '100%',
    backgroundColor: theme.colors.surfaceMuted,
    borderRadius: theme.radius.md,
    paddingVertical: theme.spacing.md,
    alignItems: 'center',
  },
  logoutBtnText: {
    color: theme.colors.textSecondary,
    fontSize: theme.typography.size.md,
    fontWeight: theme.typography.weight.medium,
  },
});

import { useState, useEffect, useCallback } from 'react';
import { Modal, View, Text, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import { proactivelyRefresh } from '../lib/api-client';
import { scheduleExpiryWarning, resetSessionExpired } from '../lib/session-expired';

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
                <ActivityIndicator size="small" color="#fff" />
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
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  card: {
    width: '100%',
    maxWidth: 340,
    backgroundColor: '#fff',
    borderRadius: 20,
    paddingVertical: 32,
    paddingHorizontal: 24,
    alignItems: 'center',
    shadowColor: '#000',
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
    marginBottom: 16,
  },
  iconWarning: {
    backgroundColor: '#fef3c7',
  },
  iconUrgent: {
    backgroundColor: '#fee2e2',
  },
  iconText: {
    fontSize: 28,
    fontWeight: '800',
    color: '#d97706',
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    color: '#6b7280',
    marginBottom: 4,
  },
  countdown: {
    fontSize: 42,
    fontWeight: '800',
    fontVariant: ['tabular-nums'],
    color: '#d97706',
    marginBottom: 16,
  },
  countdownUrgent: {
    color: '#dc2626',
  },
  progressTrack: {
    width: '100%',
    height: 6,
    borderRadius: 3,
    backgroundColor: '#e5e7eb',
    overflow: 'hidden',
    marginBottom: 16,
  },
  progressFill: {
    height: '100%',
    borderRadius: 3,
  },
  progressNormal: {
    backgroundColor: '#f59e0b',
  },
  progressUrgent: {
    backgroundColor: '#dc2626',
  },
  hint: {
    fontSize: 13,
    color: '#9ca3af',
    textAlign: 'center',
    marginBottom: 24,
  },
  buttons: {
    width: '100%',
    gap: 10,
  },
  extendBtn: {
    width: '100%',
    backgroundColor: '#2563eb',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 48,
  },
  extendBtnText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  btnDisabled: {
    opacity: 0.6,
  },
  logoutBtn: {
    width: '100%',
    backgroundColor: '#f3f4f6',
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
  },
  logoutBtnText: {
    color: '#6b7280',
    fontSize: 14,
    fontWeight: '500',
  },
});

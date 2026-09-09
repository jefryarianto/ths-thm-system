import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Platform,
} from 'react-native';
import { router } from 'expo-router';
import { logError } from '../lib/error-logger';
import { theme } from '../theme';

interface State {
  hasError: boolean;
  errorMessage?: string;
  errorStack?: string;
  resetKey: number;
}

const MAX_MESSAGE_LENGTH = 500;
const MAX_STACK_LENGTH = 2000;

function extractErrorDetails(error: unknown): { message: string; stack?: string } {
  if (error instanceof Error) {
    return {
      message: (error.message || String(error)).slice(0, MAX_MESSAGE_LENGTH),
      stack: error.stack ? error.stack.slice(0, MAX_STACK_LENGTH) : undefined,
    };
  }
  return { message: String(error).slice(0, MAX_MESSAGE_LENGTH) };
}

/**
 * Error boundary global — menangkap exception saat render lalu menampilkan
 * layar error yang MEMUAT detail teknis (pesan + stack) supaya crash
 * tidak lagi "invisible" bagi developer.
 *
 * Tombol "Coba Lagi" mengubah `key` wrapper sehingga SELURUH subtree
 * di-remount dari nol — state screen yang rusak dibersihkan benar-benar
 * (bukan sekadar re-render screen yang sama → loop).
 */
export class GlobalErrorBoundary extends React.Component<React.PropsWithChildren, State> {
  constructor(props: React.PropsWithChildren) {
    super(props);
    this.state = { hasError: false, resetKey: 0 };
  }

  static getDerivedStateFromError(error: unknown): Partial<State> {
    const details = extractErrorDetails(error);
    return { hasError: true, ...details };
  }

  componentDidCatch(error: any, errorInfo: any) {
    logError(error, {
      module: 'GlobalErrorBoundary',
      action: 'component-catch',
      componentStack: errorInfo?.componentStack?.slice(0, MAX_STACK_LENGTH),
    });
  }

  handleReset = () => {
    this.setState((prev: State) => ({
      hasError: false,
      errorMessage: undefined,
      errorStack: undefined,
      resetKey: prev.resetKey + 1,
    }));
  };

  handleGoHome = () => {
    this.handleReset();
    try {
      router.replace('/');
    } catch {
      // Reset via key tetap berjalan — navigasi hanya bonus
    }
  };

  render() {
    if (this.state.hasError) {
      return (
        <ScrollView style={styles.container} contentContainerStyle={styles.content}>
          <Text style={styles.title}>Terjadi Kesalahan</Text>
          <Text style={styles.subtitle}>Aplikasi mengalami error tak terduga.</Text>

          {(this.state.errorMessage || this.state.errorStack) && (
            <View style={styles.detailBox}>
              <Text style={styles.detailLabel}>Detail Teknis (untuk laporan ke pengembang):</Text>
              {this.state.errorMessage ? (
                <Text style={styles.detailText} selectable>{this.state.errorMessage}</Text>
              ) : null}
              {this.state.errorStack ? (
                <Text style={styles.detailStack} selectable numberOfLines={10}>
                  {this.state.errorStack}
                </Text>
              ) : null}
            </View>
          )}

          <TouchableOpacity style={styles.button} onPress={this.handleReset} activeOpacity={0.8}>
            <Text style={styles.buttonText}>Coba Lagi</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.secondaryButton} onPress={this.handleGoHome} activeOpacity={0.8}>
            <Text style={styles.secondaryButtonText}>Kembali ke Beranda</Text>
          </TouchableOpacity>

          <Text style={styles.hint}>Laporkan pesan "Detail Teknis" di atas ke pengembang agar error ini bisa diperbaiki.</Text>
        </ScrollView>
      );
    }

    // Key berubah saat "Coba Lagi" → seluruh subtree di-remount dari nol
    // (state screen yang crash dibersihkan) — retry benar-benar reset.

    return (
      <View key={this.state.resetKey} style={styles.fill}>
        {this.props.children}
      </View>
    );
  }
}

const styles = StyleSheet.create({
  fill: {
    flex: 1,
  },
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  content: {
    flexGrow: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: theme.spacing.xxl,
  },
  title: {
    fontSize: theme.typography.size.xl,
    fontWeight: theme.typography.weight.bold,
    marginBottom: theme.spacing.sm,
    color: theme.colors.text,
  },
  subtitle: {
    fontSize: theme.typography.size.md,
    textAlign: 'center',
    marginBottom: theme.spacing.lg,
    color: theme.colors.textSecondary,
  },
  detailBox: {
    alignSelf: 'stretch',
    backgroundColor: theme.colors.surfaceMuted,
    borderRadius: theme.radius.sm,
    borderWidth: 1,
    borderColor: theme.colors.borderStrong,
    padding: theme.spacing.md,
    marginBottom: theme.spacing.lg,
  },
  detailLabel: {
    fontSize: theme.typography.size.sm,
    fontWeight: theme.typography.weight.bold,
    color: theme.colors.textSecondary,
    marginBottom: 6,
  },
  detailText: {
    fontSize: 13,
    fontWeight: theme.typography.weight.medium,
    color: theme.colors.danger,
  },
  detailStack: {
    fontSize: 11,
    fontFamily: Platform.select({ ios: 'Menlo', android: 'monospace', default: 'monospace' }),
    color: theme.colors.textMuted,
    lineHeight: 16,
    marginTop: theme.spacing.sm,
  },
  button: {
    backgroundColor: theme.colors.primary,
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: 10,
    borderRadius: 6,
  },
  buttonText: {
    color: theme.colors.textOnPrimary,
    fontWeight: theme.typography.weight.semibold,
  },
  secondaryButton: {
    marginTop: 10,
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: 10,
    borderRadius: 6,
    backgroundColor: theme.colors.surfaceMuted,
  },
  secondaryButtonText: {
    color: theme.colors.textSecondary,
    fontWeight: theme.typography.weight.semibold,
  },
  hint: {
    marginTop: theme.spacing.lg,
    fontSize: theme.typography.size.sm,
    color: theme.colors.textMuted,
    textAlign: 'center',
  },
});
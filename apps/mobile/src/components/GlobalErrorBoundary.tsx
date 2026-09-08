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
    backgroundColor: '#fff',
  },
  content: {
    flexGrow: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 16,
    color: '#666',
  },
  detailBox: {
    alignSelf: 'stretch',
    backgroundColor: '#f8fafc',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    padding: 12,
    marginBottom: 16,
  },
  detailLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#334155',
    marginBottom: 6,
  },
  detailText: {
    fontSize: 13,
    fontWeight: '500',
    color: '#b91c1c',
  },
  detailStack: {
    fontSize: 11,
    fontFamily: Platform.select({ ios: 'Menlo', android: 'monospace', default: 'monospace' }),
    color: '#64748b',
    lineHeight: 16,
    marginTop: 8,
  },
  button: {
    backgroundColor: '#2563eb',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 6,
  },
  buttonText: {
    color: '#fff',
    fontWeight: '600',
  },
  secondaryButton: {
    marginTop: 10,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 6,
    backgroundColor: '#f3f4f6',
  },
  secondaryButtonText: {
    color: '#374151',
    fontWeight: '600',
  },
  hint: {
    marginTop: 16,
    fontSize: 12,
    color: '#9ca3af',
    textAlign: 'center',
  },
});
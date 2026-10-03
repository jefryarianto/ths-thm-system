import 'package:flutter/material.dart';

import '../../core/theme/app_theme.dart';
import 'app_loading_spinner.dart';

/// Tampilan state kosong, error, dan loading yang reusable untuk seluruh
/// aplikasi — mengganti class `_Error` dan `Center(child: Text(...))`
/// yang dulunya digandakan di setiap layar.
///
/// Tiga komponen:
/// - [EmptyStateView] — daftar kosong / belum ada data.
/// - [ErrorStateView] — gagal memuat, dengan tombol "Coba Lagi".
/// - [LoadingStateView] — indikator penuh layar yang konsisten.

/// Ilustrasi sederhana berupa lingkaran lembut + ikon — mengganti
/// `Icon(Icons.error_outline, size: 48)` polos agar ada hierarchy.
class _StateIcon extends StatelessWidget {
  final IconData icon;
  final Color color;
  final Color containerColor;

  const _StateIcon({
    required this.icon,
    required this.color,
    required this.containerColor,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      width: 80,
      height: 80,
      decoration: BoxDecoration(
        color: containerColor,
        shape: BoxShape.circle,
      ),
      alignment: Alignment.center,
      child: Icon(icon, size: 36, color: color),
    );
  }
}

/// State kosong — dipakai ketika list/daftar kosong atau belum pernah
/// dimuat. Pesan utama menjelaskan apa yang terjadi, [action] memberi
/// langkah selanjutnya (opsional).
class EmptyStateView extends StatelessWidget {
  final IconData icon;
  final String title;
  final String? message;
  final String? actionLabel;
  final VoidCallback? onAction;

  const EmptyStateView({
    super.key,
    this.icon = Icons.inbox_outlined,
    required this.title,
    this.message,
    this.actionLabel,
    this.onAction,
  });

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    return Center(
      child: Padding(
        padding: const EdgeInsets.all(AppTheme.space24),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            _StateIcon(
              icon: icon,
              color: theme.colorScheme.onSurfaceVariant,
              containerColor: theme.colorScheme.surfaceContainerHighest,
            ),
            const SizedBox(height: AppTheme.space20),
            Text(
              title,
              textAlign: TextAlign.center,
              style: theme.textTheme.titleMedium?.copyWith(
                fontWeight: FontWeight.w700,
                color: theme.colorScheme.onSurface,
              ),
            ),
            if (message != null) ...[
              const SizedBox(height: AppTheme.space8),
              Text(
                message!,
                textAlign: TextAlign.center,
                style: theme.textTheme.bodyMedium?.copyWith(
                  color: theme.colorScheme.onSurfaceVariant,
                ),
              ),
            ],
            if (actionLabel != null && onAction != null) ...[
              const SizedBox(height: AppTheme.space20),
              FilledButton.tonal(
                onPressed: onAction,
                child: Text(actionLabel!),
              ),
            ],
          ],
        ),
      ),
    );
  }
}

/// State error — pesan kegagalan dengan tombol retry yang jelas.
/// [message] wajib, [onRetry] opsional (layar tanpa retry bisa tetap pakai).
class ErrorStateView extends StatelessWidget {
  final String message;
  final VoidCallback? onRetry;
  final String retryLabel;

  const ErrorStateView({
    super.key,
    required this.message,
    this.onRetry,
    this.retryLabel = 'Coba Lagi',
  });

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final isDark = theme.brightness == Brightness.dark;

    return Center(
      child: Padding(
        padding: const EdgeInsets.all(AppTheme.space24),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            _StateIcon(
              icon: Icons.error_outline,
              color: theme.colorScheme.error,
              containerColor: isDark
                  ? theme.colorScheme.errorContainer.withValues(alpha: 0.35)
                  : AppTheme.errorContainer,
            ),
            const SizedBox(height: AppTheme.space20),
            Text(
              'Terjadi kesalahan',
              textAlign: TextAlign.center,
              style: theme.textTheme.titleMedium?.copyWith(
                fontWeight: FontWeight.w700,
                color: theme.colorScheme.onSurface,
              ),
            ),
            const SizedBox(height: AppTheme.space8),
            Text(
              message,
              textAlign: TextAlign.center,
              style: theme.textTheme.bodyMedium?.copyWith(
                color: theme.colorScheme.onSurfaceVariant,
              ),
            ),
            if (onRetry != null) ...[
              const SizedBox(height: AppTheme.space20),
              FilledButton.icon(
                onPressed: onRetry,
                icon: const Icon(Icons.refresh_rounded, size: 18),
                label: Text(retryLabel),
              ),
            ],
          ],
        ),
      ),
    );
  }
}

/// State loading penuh layar — selalu memakai [AppLoadingSpinner] agar
/// animasi sinkron antar layar.
class LoadingStateView extends StatelessWidget {
  final String? message;

  const LoadingStateView({super.key, this.message});

  @override
  Widget build(BuildContext context) {
    return Center(child: AppLoadingSpinner(message: message));
  }
}

/// Widget adapter untuk state BLoC standar — memetakan tiga state
/// (loading/error/loaded) ke tampilan di atas, sehingga layar tinggal
/// memberikan builder untuk data.
///
/// ```dart
/// StateViewSwitcher<DocumentState>(
///   isLoading: (s) => s is DocumentLoading,
///   isError: (s) => s is DocumentError,
///   errorMessage: (s) => (s as DocumentError).message,
///   onRetry: () => bloc.add(const DocumentLoadRequested()),
///   child: (state) => _list((state as DocumentLoaded).documents),
/// )
/// ```
class StateViewSwitcher<T> extends StatelessWidget {
  final T state;
  final bool Function(T) isLoading;
  final bool Function(T) isError;
  final String Function(T) errorMessage;
  final VoidCallback? onRetry;
  final String loadingMessage;
  final Widget Function(T) child;

  const StateViewSwitcher({
    super.key,
    required this.state,
    required this.isLoading,
    required this.isError,
    required this.errorMessage,
    this.onRetry,
    this.loadingMessage = 'Memuat data',
    required this.child,
  });

  @override
  Widget build(BuildContext context) {
    if (isLoading(state)) {
      return LoadingStateView(message: loadingMessage);
    }
    if (isError(state)) {
      return ErrorStateView(message: errorMessage(state), onRetry: onRetry);
    }
    return child(state);
  }
}

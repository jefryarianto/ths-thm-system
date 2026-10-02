import 'package:flutter/material.dart';

import '../../core/theme/app_theme.dart';

/// Banner non-blocking yang menyatakan data sedang ditampilkan dari cache
/// offline (server gagal dijangkau / belum tersinkron). Memberi tombol
/// "Segarkan" agar pengguna dapat mencoba ulang tanpa harus keluar-masuk
/// halaman.
class StaleDataBanner extends StatelessWidget {
  final String? errorMessage;
  final VoidCallback onRefresh;

  const StaleDataBanner({
    super.key,
    this.errorMessage,
    required this.onRefresh,
  });

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    return Material(
      color: theme.colorScheme.tertiaryContainer,
      child: Padding(
        padding: const EdgeInsets.symmetric(
          horizontal: AppTheme.space16,
          vertical: AppTheme.space8,
        ),
        child: Row(
          children: [
            Icon(
              Icons.cloud_off_outlined,
              size: 18,
              color: theme.colorScheme.onTertiaryContainer,
            ),
            const SizedBox(width: AppTheme.space8),
            Expanded(
              child: Text(
                errorMessage != null
                    ? 'Gagal memuat ulang — menampilkan data tersimpan'
                    : 'Menampilkan data tersimpan (offline)',
                style: theme.textTheme.bodySmall?.copyWith(
                  color: theme.colorScheme.onTertiaryContainer,
                ),
              ),
            ),
            TextButton.icon(
              onPressed: onRefresh,
              icon: const Icon(Icons.refresh, size: 16),
              label: const Text('Segarkan'),
              style: TextButton.styleFrom(
                visualDensity: VisualDensity.compact,
                foregroundColor: theme.colorScheme.onTertiaryContainer,
              ),
            ),
          ],
        ),
      ),
    );
  }
}

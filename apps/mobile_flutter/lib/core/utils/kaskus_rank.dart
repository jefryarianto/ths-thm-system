import 'package:flutter/material.dart';
import '../theme/app_theme.dart';

class KaskusRank {
  final String title;
  final Color backgroundColor;
  final Color textColor;
  final Color? borderColor;

  const KaskusRank({
    required this.title,
    required this.backgroundColor,
    required this.textColor,
    this.borderColor,
  });

  static KaskusRank fromPostCount(int postCount) {
    if (postCount >= 100) {
      return KaskusRank(
        title: 'Sesepuh Forum',
        backgroundColor: Colors.amber.withValues(alpha: 0.18),
        textColor: Colors.amber.shade800,
        borderColor: Colors.amber.withValues(alpha: 0.5),
      );
    }
    if (postCount >= 50) {
      return const KaskusRank(
        title: 'Pendekar Forum',
        backgroundColor: AppTheme.successContainer,
        textColor: AppTheme.onSuccessContainer,
      );
    }
    if (postCount >= 10) {
      return const KaskusRank(
        title: 'Aktivis Forum',
        backgroundColor: AppTheme.primaryContainer,
        textColor: AppTheme.onPrimaryContainer,
      );
    }
    return const KaskusRank(
      title: 'Anggota Baru',
      backgroundColor: AppTheme.lightSurfaceDim,
      textColor: AppTheme.textMuted,
    );
  }
}

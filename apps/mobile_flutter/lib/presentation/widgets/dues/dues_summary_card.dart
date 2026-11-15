// Dues Summary Card Widget
import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';

import '../../../core/theme/app_theme.dart';
import '../../../core/utils/formatters.dart';
import '../../../logic/dues/dues_bloc.dart';
import '../skeleton_loader.dart';

class DuesSummaryCard extends StatelessWidget {
  final bool expanded;
  final VoidCallback onToggle;

  const DuesSummaryCard({
    super.key,
    required this.expanded,
    required this.onToggle,
  });

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    return BlocBuilder<DuesBloc, DuesState>(
      buildWhen: (prev, curr) =>
          curr is DuesLoaded || curr is DuesLoading || curr is DuesError,
      builder: (context, state) {
        if (state is DuesLoading) {
          return _buildSkeleton(theme);
        }
        if (state is DuesError) {
          return _buildError(theme, state.message);
        }
        if (state is! DuesLoaded) return const SizedBox.shrink();

        final dues = state.dues;
        final totalTagihan = dues.fold<double>(0, (s, d) => s + d.jumlah);
        final totalDibayar =
            dues.where((d) => d.isPaid).fold<double>(0, (s, d) => s + d.jumlah);

        final lockStatus = state.lockStatus;
        final isLocked = lockStatus?.isLocked == true;

        final children = <Widget>[];

        if (isLocked) {
          children.add(_buildLockBanner(lockStatus!));
          children.add(const SizedBox(height: 12));
        }

        children.add(_buildSummaryRows(totalTagihan, totalDibayar));

        // Kartu ringkasan memakai gradien aksen Nordy (teal → ungu) dengan
        // teks/ikon putih (`onAccentGradient`) yang lolos WCAG di kedua ujung.
        return Container(
          margin: const EdgeInsets.fromLTRB(16, 16, 16, 0),
          clipBehavior: Clip.antiAlias,
          decoration: BoxDecoration(
            gradient: AppTheme.accentGradient(theme.brightness),
            borderRadius: AppTheme.radiusLgAll,
            boxShadow: AppTheme.softShadow(),
          ),
          child: ExpansionTile(
            initiallyExpanded: expanded,
            onExpansionChanged: (_) => onToggle(),
            shape: const Border(),
            collapsedShape: const Border(),
            iconColor: AppTheme.onAccentGradient,
            collapsedIconColor: AppTheme.onAccentGradient,
            textColor: AppTheme.onAccentGradient,
            collapsedTextColor: AppTheme.onAccentGradient,
            leading: Icon(
              isLocked ? Icons.lock : Icons.account_balance_wallet_outlined,
              color: AppTheme.onAccentGradient,
            ),
            title: Text(
              isLocked ? 'Iuran Terkunci' : 'Ringkasan Iuran',
              style: const TextStyle(
                fontSize: 15,
                fontWeight: FontWeight.w700,
                color: AppTheme.onAccentGradient,
              ),
            ),
            trailing: AnimatedRotation(
              turns: expanded ? 0.5 : 0,
              duration: const Duration(milliseconds: 200),
              child: const Icon(
                Icons.expand_more,
                color: AppTheme.onAccentGradient,
              ),
            ),
            children: children,
          ),
        );
      },
    );
  }

  Widget _buildLockBanner(dynamic lockStatus) {
    return Container(
      margin: const EdgeInsets.fromLTRB(16, 0, 16, 12),
      padding: const EdgeInsets.all(12),
      // Panel putih solid di atas gradien agar peringatan tetap terbaca.
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(8),
      ),
      child: Row(
        children: [
          const Icon(Icons.lock, color: AppTheme.error, size: 20),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const Text(
                  'Periode Iuran Terkunci',
                  style: TextStyle(
                    fontWeight: FontWeight.bold,
                    color: AppTheme.error,
                  ),
                ),
                const SizedBox(height: 2),
                Text(
                  lockStatus.gracePeriodType == 'override'
                      ? 'Override manual - perlu unlock admin'
                      : 'Masa tenggang: ${lockStatus.graceDaysRemaining} hari lagi',
                  style: const TextStyle(
                    fontSize: 12,
                    color: AppTheme.error,
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildSummaryRows(double totalTagihan, double totalDibayar) {
    return Padding(
      padding: const EdgeInsets.fromLTRB(16, 0, 16, 16),
      child: Column(
        children: [
          _buildStatRow(
            'Total Tagihan',
            Formatters.rupiah(totalTagihan),
            Icons.receipt_long,
          ),
          _buildStatRow(
            'Sudah Dibayar',
            Formatters.rupiah(totalDibayar),
            Icons.check_circle,
          ),
          _buildStatRow(
            'Belum Dibayar',
            Formatters.rupiah(totalTagihan - totalDibayar),
            Icons.pending,
          ),
          _buildStatRow(
            'Terkumpul (Verified)',
            Formatters.rupiah(totalDibayar),
            Icons.verified,
          ),
        ],
      ),
    );
  }

  /// Baris statistik di atas gradien — seluruh teks/ikon putih agar tetap
  /// kontras; hierarki dibentuk dari ukuran & ketebalan, bukan opacity.
  Widget _buildStatRow(String label, String value, IconData icon) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 8),
      child: Row(
        children: [
          CircleAvatar(
            radius: 18,
            backgroundColor: Colors.white.withValues(alpha: 0.18),
            child: Icon(icon, size: 18, color: AppTheme.onAccentGradient),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  label,
                  style: const TextStyle(
                    fontSize: 12,
                    fontWeight: FontWeight.w500,
                    color: AppTheme.onAccentGradient,
                  ),
                ),
                Text(
                  value,
                  style: const TextStyle(
                    fontSize: 16,
                    fontWeight: FontWeight.w700,
                    color: AppTheme.onAccentGradient,
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildSkeleton(ThemeData theme) {
    return const Card(
      margin: EdgeInsets.fromLTRB(16, 16, 16, 0),
      child: SkeletonBox(height: 160),
    );
  }

  Widget _buildError(ThemeData theme, String message) {
    return Card(
      margin: const EdgeInsets.fromLTRB(16, 16, 16, 0),
      color: theme.colorScheme.errorContainer,
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Row(
          children: [
            Icon(Icons.error, color: theme.colorScheme.error),
            const SizedBox(width: 12),
            Expanded(
                child: Text(message,
                    style:
                        TextStyle(color: theme.colorScheme.onErrorContainer))),
          ],
        ),
      ),
    );
  }
}

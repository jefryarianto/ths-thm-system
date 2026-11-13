// Dues Summary Card Widget
import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';

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

        children.add(
            _buildSummaryRows(totalTagihan, totalDibayar, isLocked, theme));

        return Card(
          margin: const EdgeInsets.fromLTRB(16, 16, 16, 0),
          child: ExpansionTile(
            initiallyExpanded: expanded,
            onExpansionChanged: (_) => onToggle(),
            leading: Icon(
              isLocked ? Icons.lock : Icons.account_balance_wallet_outlined,
              color: isLocked ? Colors.red : theme.colorScheme.primary,
            ),
            title: Text(
              isLocked ? 'Iuran Terkunci' : 'Ringkasan Iuran',
              style: theme.textTheme.titleMedium?.copyWith(
                fontWeight: FontWeight.w600,
                color: isLocked ? Colors.red : null,
              ),
            ),
            trailing: AnimatedRotation(
              turns: expanded ? 0.5 : 0,
              duration: const Duration(milliseconds: 200),
              child: Icon(
                Icons.expand_more,
                color: theme.colorScheme.onSurfaceVariant,
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
      decoration: BoxDecoration(
        color: Colors.red.withValues(alpha: 0.1),
        border: Border.all(color: Colors.red.withValues(alpha: 0.3)),
        borderRadius: BorderRadius.circular(8),
      ),
      child: Row(
        children: [
          const Icon(Icons.lock, color: Colors.red, size: 20),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  'Periode Iuran Terkunci',
                  style: TextStyle(
                    fontWeight: FontWeight.bold,
                    color: Colors.red,
                  ),
                ),
                const SizedBox(height: 2),
                Text(
                  lockStatus.gracePeriodType == 'override'
                      ? 'Override manual - perlu unlock admin'
                      : 'Masa tenggang: ${lockStatus.graceDaysRemaining} hari lagi',
                  style: TextStyle(
                    fontSize: 12,
                    color: Colors.red.withValues(alpha: 0.8),
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildSummaryRows(
    double totalTagihan,
    double totalDibayar,
    bool isLocked,
    ThemeData theme,
  ) {
    return Padding(
      padding: const EdgeInsets.fromLTRB(16, 0, 16, 16),
      child: Column(
        children: [
          _buildStatRow(
            'Total Tagihan',
            Formatters.rupiah(totalTagihan),
            Icons.receipt_long,
            isLocked ? Colors.red : theme.colorScheme.primary,
          ),
          _buildStatRow(
            'Sudah Dibayar',
            Formatters.rupiah(totalDibayar),
            Icons.check_circle,
            Colors.green,
          ),
          _buildStatRow(
            'Belum Dibayar',
            Formatters.rupiah(totalTagihan - totalDibayar),
            Icons.pending,
            Colors.orange,
          ),
          _buildStatRow(
            'Terkumpul (Verified)',
            Formatters.rupiah(totalDibayar),
            Icons.verified,
            Colors.blue,
          ),
        ],
      ),
    );
  }

  Widget _buildStatRow(
    String label,
    String value,
    IconData icon,
    Color color,
  ) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 8),
      child: Row(
        children: [
          CircleAvatar(
            radius: 18,
            backgroundColor: color.withValues(alpha: 0.1),
            child: Icon(icon, size: 18, color: color),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(label,
                    style: const TextStyle(fontSize: 13, color: Colors.grey)),
                Text(
                  value,
                  style: const TextStyle(
                    fontSize: 16,
                    fontWeight: FontWeight.w600,
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

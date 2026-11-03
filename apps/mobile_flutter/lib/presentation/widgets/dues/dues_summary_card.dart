// Dues Summary Card Widget
import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';

import '../../logic/dues/dues_bloc.dart';
import '../widgets/skeleton_loader.dart';

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
          return _buildSkeleton();
        }
        if (state is DuesError) {
          return _buildError(theme, state.message);
        }
        if (state is! DuesLoaded) return const SizedBox.shrink();

        final summary = state.summary;

        return Card(
          margin: const EdgeInsets.fromLTRB(16, 16, 16, 0),
          child: ExpansionTile(
            initiallyExpanded: expanded,
            onExpansionChanged: (_) => onToggle(),
            leading: Icon(
              Icons.account_balance_wallet_outlined,
              color: theme.colorScheme.primary,
            ),
            title: Text(
              'Ringkasan Iuran',
              style: theme.textTheme.titleMedium?.copyWith(
                fontWeight: FontWeight.w600,
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
            children: [
              Padding(
                padding: const EdgeInsets.fromLTRB(16, 0, 16, 16),
                child: Column(
                  children: [
                    _buildStatRow(
                      'Total Tagihan',
                      formatRupiah(summary.totalTagihan),
                      Icons.receipt_long,
                      theme.colorScheme.primary,
                    ),
                    _buildStatRow(
                      'Sudah Dibayar',
                      formatRupiah(summary.totalDibayar),
                      Icons.check_circle,
                      Colors.green,
                    ),
                    _buildStatRow(
                      'Belum Dibayar',
                      formatRupiah(summary.totalBelumDibayar),
                      Icons.pending,
                      Colors.orange,
                    ),
                    if (summary.totalTerkumpul > 0)
                      _buildStatRow(
                        'Terkumpul (Verified)',
                        formatRupiah(summary.totalTerkumpul),
                        Icons.verified,
                        Colors.blue,
                      ),
                  ],
                ),
              ),
            ],
          );
      },
    );
  }

  Widget _buildStatRow(String label, String value, IconData icon, Color color) {
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
                Text(label, style: const TextStyle(fontSize: 13, color: Colors.grey)),
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

  Widget _buildSkeleton() {
    return Card(
      margin: const EdgeInsets.fromLTRB(16, 16, 16, 0),
      child: const SkeletonLoader(height: 160),
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
            Expanded(child: Text(message, style: TextStyle(color: theme.colorScheme.onErrorContainer))),
          ],
        ),
      ),
    );
  }
}
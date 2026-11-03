// Dues Screen - Refactored main screen using extracted components
import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';

import '../../core/theme/app_theme.dart';
import '../../core/utils/formatters.dart';
import '../../core/utils/snack_bar_helper.dart';
import '../../data/models/due.dart';
import '../../logic/dues/dues_bloc.dart';
import '../widgets/app_bar_icon_title.dart';
import '../widgets/dues/bank_info_card.dart';
import '../widgets/dues/due_list_widget.dart';
import '../widgets/dues/dues_summary_card.dart';

class DuesScreen extends StatefulWidget {
  const DuesScreen({super.key});

  @override
  State<DuesScreen> createState() => _DuesScreenState();
}

class _DuesScreenState extends State<DuesScreen> {
  @override
  void initState() {
    super.initState();
    final state = context.read<DuesBloc>().state;
    if (state is! DuesLoaded && state is! DuesLoading) {
      context.read<DuesBloc>().add(const DuesLoadRequested());
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const AppBarIconTitle(
          icon: Icons.account_balance_wallet_outlined,
          title: 'Status Iuran',
        ),
      ),
      body: RefreshIndicator(
        onRefresh: () async =>
            context.read<DuesBloc>().add(const DuesLoadRequested()),
        child: BlocBuilder<DuesBloc, DuesState>(
          builder: (context, state) {
            if (state is DuesLoading) {
              return const Center(child: CircularProgressIndicator());
            }
            if (state is DuesError) {
              return Center(
                child: Column(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    const Icon(Icons.error_outline, size: 48, color: Colors.red),
                    const SizedBox(height: 16),
                    Text(state.message),
                    const SizedBox(height: 16),
                    ElevatedButton(
                      onPressed: () => context.read<DuesBloc>().add(const DuesLoadRequested()),
                      child: const Text('Coba Lagi'),
                    ),
                  ],
                ),
              );
            }
            if (state is! DuesLoaded) {
              return const Center(child: Text('Belum ada data iuran'));
            }

            final dues = state.dues;
            final unpaid = dues.where((d) => !_isPaid(d.status)).toList();
            final hasUnpaid = unpaid.isNotEmpty;
            final unpaidSum = unpaid.fold<double>(0, (s, d) => s + d.jumlah);

            return CustomScrollView(
              slivers: [
                // Persistent overdue banner
                if (hasUnpaid)
                  SliverToBoxAdapter(
                    child: _OverdueBanner(
                      unpaidCount: unpaid.length,
                      unpaidSum: unpaidSum,
                      onTap: () => _showDueDetail(unpaid.first),
                    ),
                  ),

                // Summary card
                SliverToBoxAdapter(
                  child: DuesSummaryCard(
                    expanded: true,
                    onToggle: () {}, // Handled internally now
                  ),
                ),

                // Bank info card
                SliverToBoxAdapter(
                  child: BankInfoCard(),
                ),

                // Due list with search & filters
                SliverFillRemaining(
                  child: DueListWidget(),
                ),
              ],
            );
          },
        ),
      ),
    );
  }

  bool _isPaid(String status) {
    return status.toLowerCase().contains('lunas') ||
        status.toLowerCase() == 'paid';
  }

  void _showDueDetail(Due due) {
    showModalBottomSheet<void>(
      context: context,
      isScrollControlled: true,
      builder: (context) => _DueDetailSheet(due: due, bankInfos: state.bankInfos),
    );
  }
}

/// Private classes for the overdue banner and detail sheet
class _OverdueBanner extends StatelessWidget {
  final int unpaidCount;
  final double unpaidSum;
  final VoidCallback onTap;

  const _OverdueBanner({
    required this.unpaidCount,
    required this.unpaidSum,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    return GestureDetector(
      onTap: onTap,
      child: Container(
        width: double.infinity,
        margin: const EdgeInsets.fromLTRB(16, 16, 16, 8),
        padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
        decoration: BoxDecoration(
          gradient: LinearGradient(
            colors: [
              theme.colorScheme.error,
              theme.colorScheme.error.withValues(alpha: 0.85),
            ],
          ),
          borderRadius: BorderRadius.circular(12),
          boxShadow: [
            BoxShadow(
              color: theme.colorScheme.error.withValues(alpha: 0.3),
              blurRadius: 8,
              offset: const Offset(0, 3),
            ),
          ],
        ),
        child: Row(
          children: [
            Container(
              padding: const EdgeInsets.all(6),
              decoration: BoxDecoration(
                color: Colors.white.withValues(alpha: 0.2),
                borderRadius: BorderRadius.circular(8),
              ),
              child: const Icon(Icons.warning_amber_rounded, color: Colors.white, size: 22),
            ),
            const SizedBox(width: 12),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    '$unpaidCount iuran belum lunas',
                    style: const TextStyle(
                      color: Colors.white,
                      fontSize: 14,
                      fontWeight: FontWeight.w700,
                    ),
                  ),
                  const SizedBox(height: 2),
                  Text(
                    'Total: ${formatRupiah(unpaidSum)} — ketuk untuk bayar',
                    style: TextStyle(
                      color: Colors.white.withValues(alpha: 0.9),
                      fontSize: 12,
                    ),
                  ),
                ],
              ),
            ),
            const Icon(Icons.chevron_right, color: Colors.white, size: 28),
          ],
        ),
      ),
    );
  }
}

class _DueDetailSheet extends StatelessWidget {
  final Due due;
  final List<dynamic>? bankInfos;

  const _DueDetailSheet({required this.due, this.bankInfos});

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    return DraggableScrollableSheet(
      initialChildSize: 0.6,
      maxChildSize: 0.9,
      minChildSize: 0.4,
      builder: (context, scrollController) => Container(
        decoration: BoxDecoration(
          color: theme.colorScheme.surface,
          borderRadius: const BorderRadius.vertical(top: Radius.circular(20)),
        ),
        child: ListView(
          controller: scrollController,
          padding: const EdgeInsets.all(20),
          children: [
            Center(
              child: Container(
                width: 40,
                height: 4,
                margin: const EdgeInsets.only(top: 12, bottom: 20),
                decoration: BoxDecoration(
                  color: theme.colorScheme.onSurfaceVariant.withValues(alpha: 0.3),
                  borderRadius: BorderRadius.circular(2),
                ),
              ),
            ),
            Row(
              children: [
                CircleAvatar(
                  radius: 24,
                  backgroundColor: _getStatusColor(due.status).withValues(alpha: 0.1),
                  child: Icon(
                    _getStatusIcon(due.status),
                    color: _getStatusColor(due.status),
                    size: 24,
                  ),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        'Periode ${due.periode}',
                        style: theme.textTheme.titleLarge?.copyWith(fontWeight: FontWeight.bold),
                      ),
                      Text(
                        formatRupiah(due.jumlah),
                        style: theme.textTheme.titleMedium?.copyWith(
                          color: theme.colorScheme.primary,
                          fontWeight: FontWeight.w600,
                        ),
                      ),
                    ],
                  ),
                ),
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
                  decoration: BoxDecoration(
                    color: _getStatusColor(due.status).withValues(alpha: 0.1),
                    borderRadius: BorderRadius.circular(20),
                  ),
                  child: Text(
                    _getStatusLabel(due.status),
                    style: TextStyle(
                      color: _getStatusColor(due.status),
                      fontWeight: FontWeight.w600,
                      fontSize: 12,
                    ),
                  ),
                ),
              ],
            ),
            const SizedBox(height: 24),
            _buildDetailRow('Nomor Iuran', due.nomorIuran ?? '-', theme),
            _buildDetailRow('Tanggal Jatuh Tempo', formatDateIndo(due.tanggalJatuhTempo), theme),
            if (due.tanggalBayar != null)
              _buildDetailRow('Tanggal Bayar', formatDateIndo(due.tanggalBayar!), theme),
            if (due.metodeBayar != null)
              _buildDetailRow('Metode Bayar', due.metodeBayar!, theme),
            const SizedBox(height: 24),
            if (bankInfos?.isNotEmpty ?? false) ...[
              Text('Rekening Tujuan', style: theme.textTheme.titleMedium?.copyWith(fontWeight: FontWeight.w600)),
              const SizedBox(height: 12),
              ...bankInfos!.map((bank) => _buildBankTile(bank, theme)).toList(),
            ],
          ],
        ),
      ),
    );
  }

  Widget _buildDetailRow(String label, String value, ThemeData theme) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 8),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          SizedBox(
            width: 130,
            child: Text(label, style: theme.textTheme.bodyMedium?.copyWith(color: theme.colorScheme.onSurfaceVariant)),
          ),
          Expanded(child: Text(value, style: theme.textTheme.bodyMedium?.copyWith(fontWeight: FontWeight.w500))),
        ],
      ),
    );
  }

  Widget _buildBankTile(dynamic bank, ThemeData theme) {
    return Container(
      margin: const EdgeInsets.only(bottom: 8),
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: theme.colorScheme.surfaceContainerHighest.withValues(alpha: 0.5),
        borderRadius: BorderRadius.circular(12),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(bank.bankName ?? '', style: theme.textTheme.titleSmall?.copyWith(fontWeight: FontWeight.w600)),
          Text('${bank.accountName} • ${bank.accountNumber}', style: theme.textTheme.bodySmall),
        ],
      ),
    );
  }

  Color _getStatusColor(String status) {
    switch (status) {
      case 'dibayar':
        return Colors.green;
      case 'belum_dibayar':
        return Colors.orange;
      case 'partial':
        return Colors.blue;
      case 'verifikasi':
        return Colors.purple;
      default:
        return Colors.grey;
    }
  }

  IconData _getStatusIcon(String status) {
    switch (status) {
      case 'dibayar':
        return Icons.check_circle;
      case 'belum_dibayar':
        return Icons.pending;
      case 'partial':
        return Icons.payments_outlined;
      default:
        return Icons.help;
    }
  }

  String _getStatusLabel(String status) {
    switch (status) {
      case 'dibayar':
        return 'Lunas';
      case 'belum_dibayar':
        return 'Belum Dibayar';
      case 'partial':
        return 'Cicilan';
      case 'verifikasi':
        return 'Verifikasi';
      default:
        return status;
    }
  }
}
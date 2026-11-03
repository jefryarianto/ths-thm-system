// Due List Widget - Handles filtering, search, and rendering of due items
import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';

import '../../data/models/due.dart';
import '../../logic/dues/dues_bloc.dart';
import '../widgets/due_item_card.dart';
import '../widgets/skeleton_loader.dart';
import '../widgets/stale_data_banner.dart';
import '../widgets/state_views.dart';

class DueListWidget extends StatefulWidget {
  const DueListWidget({super.key});

  @override
  State<DueListWidget> createState() => _DueListWidgetState();
}

class _DueListWidgetState extends State<DueListWidget> {
  final TextEditingController _searchController = TextEditingController();
  String _searchQuery = '';
  String _statusFilter = 'all'; // all, unpaid, paid, partial

  @override
  void dispose() {
    _searchController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    return BlocBuilder<DuesBloc, DuesState>(
      buildWhen: (prev, curr) => curr is DuesLoaded || curr is DuesLoading || curr is DuesError,
      builder: (context, state) {
        if (state is DuesLoading) {
          return const Column(
            children: [
              StaleDataBanner(),
              Expanded(child: Center(child: SkeletonLoader(height: double.infinity))),
            ],
          );
        }
        if (state is DuesError) {
          return StateErrorView(
            message: state.message,
            onRetry: () => context.read<DuesBloc>().add(const DuesLoadRequested()),
          );
        }
        if (state is! DuesLoaded) {
          return const StateEmptyView(message: 'Belum ada data iuran');
        }

        final allDues = state.dues;

        // Apply filters
        var filtered = allDues.where((due) {
          final matchesSearch = _searchQuery.isEmpty ||
              due.periode.toLowerCase().contains(_searchQuery.toLowerCase()) ||
              due.jumlah.toString().contains(_searchQuery) ||
              (due.nomorIuran?.toLowerCase().contains(_searchQuery.toLowerCase()) ?? false);
          final matchesStatus = _statusFilter == 'all' ||
              (_statusFilter == 'unpaid' && due.status == 'belum_dibayar') ||
              (_statusFilter == 'paid' && due.status == 'dibayar') ||
              (_statusFilter == 'partial' && due.status == 'partial');
          return matchesSearch && matchesStatus;
        }).toList();

        if (filtered.isEmpty) {
          return StateEmptyView(
            message: _searchQuery.isEmpty || _statusFilter != 'all'
                ? 'Tidak ada iuran yang cocok dengan filter'
                : 'Belum ada iuran',
            action: (_searchQuery.isNotEmpty || _statusFilter != 'all')
                ? () {
                    setState(() {
                      _searchQuery = '';
                      _statusFilter = 'all';
                      _searchController.clear();
                    });
                  }
                : null,
            actionLabel: 'Reset Filter',
          );
        }

        return Column(
          children: [
            // Search & Filter Bar
            _buildFilterBar(theme),

            // Results count
            Padding(
              padding: const EdgeInsets.fromLTRB(16, 8, 16, 0),
              child: Row(
                children: [
                  Text(
                    '${filtered.length} dari ${allDues.length} iuran',
                    style: theme.textTheme.bodySmall?.copyWith(
                      color: theme.colorScheme.onSurfaceVariant,
                    ),
                  ),
                  const Spacer(),
                  if (_statusFilter != 'all' || _searchQuery.isNotEmpty)
                    TextButton.icon(
                      onPressed: () {
                        setState(() {
                          _searchQuery = '';
                          _statusFilter = 'all';
                          _searchController.clear();
                        });
                      },
                      icon: const Icon(Icons.clear_all, size: 16),
                      label: const Text('Reset Filter'),
                    ),
                ],
              ),
            ),

            // List
            Expanded(
              child: ListView.builder(
                padding: const EdgeInsets.all(16),
                itemCount: filtered.length,
                itemBuilder: (context, index) {
                  final due = filtered[index];
                  return DueItemCard(
                    due: due,
                    bankInfos: state.bankInfos,
                    onTap: () => _showDueDetail(due),
                  );
                },
              ),
            ),
          ],
        );
      },
    );
  }

  Widget _buildFilterBar(ThemeData theme) {
    return Container(
      padding: const EdgeInsets.fromLTRB(16, 16, 16, 8),
      child: Column(
        children: [
          // Search field
          TextField(
            controller: _searchController,
            decoration: InputDecoration(
              hintText: 'Cari periode, jumlah, nomor...',
              prefixIcon: const Icon(Icons.search, size: 20),
              suffixIcon: _searchQuery.isNotEmpty
                  ? IconButton(
                      icon: const Icon(Icons.clear, size: 20),
                      onPressed: () {
                        _searchController.clear();
                        setState(() => _searchQuery = '');
                      },
                    )
                  : null,
              border: OutlineInputBorder(
                borderRadius: BorderRadius.circular(12),
                borderSide: BorderSide(color: theme.colorScheme.outlineVariant),
              ),
              contentPadding: const EdgeInsets.symmetric(vertical: 12, horizontal: 16),
            ),
            onChanged: (value) => setState(() => _searchQuery = value),
          ),
          const SizedBox(height: 12),

          // Status filter chips
          SingleChildScrollView(
            scrollDirection: Axis.horizontal,
            child: Row(
              children: [
                _buildFilterChip('all', 'Semua', theme),
                _buildFilterChip('unpaid', 'Belum Bayar', theme, color: Colors.orange),
                _buildFilterChip('paid', 'Lunas', theme, color: Colors.green),
                _buildFilterChip('partial', 'Cicilan', theme, color: Colors.blue),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildFilterChip(String value, String label, ThemeData theme, {Color? color}) {
    final isSelected = _statusFilter == value;
    final chipColor = color ?? theme.colorScheme.primary;

    return Padding(
      padding: const EdgeInsets.only(right: 8),
      child: FilterChip(
        label: Text(label),
        selected: isSelected,
        onSelected: (_) => setState(() => _statusFilter = value),
        selectedColor: chipColor.withValues(alpha: 0.15),
        checkmarkColor: chipColor,
        labelStyle: TextStyle(
          color: isSelected ? chipColor : theme.colorScheme.onSurfaceVariant,
          fontWeight: isSelected ? FontWeight.w600 : FontWeight.w500,
        ),
        side: BorderSide(
          color: isSelected ? chipColor : theme.colorScheme.outlineVariant,
        ),
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20)),
      ),
    );
  }

  void _showDueDetail(Due due) {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      builder: (ctx) => _DueDetailSheet(due: due, bankInfos: context.read<DuesBloc>().state is DuesLoaded
          ? (context.read<DuesBloc>().state as DuesLoaded).bankInfos
          : null),
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
            if (due.buktiBayarPath != null)
              _buildDetailRow('Bukti Bayar', 'Tersedia (tap untuk lihat)', theme),
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
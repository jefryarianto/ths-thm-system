import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';

import '../../../data/models/due.dart';
import '../../../logic/dues/dues_bloc.dart';
import '../due_item_card.dart';
import '../skeleton_loader.dart';
import '../stale_data_banner.dart';
import '../state_views.dart';

/// Widget daftar iuran dengan pencarian dan filter status.
class DueListWidget extends StatefulWidget {
  final void Function(Due due)? onTap;
  final void Function(Due due)? onUpload;

  const DueListWidget({
    super.key,
    this.onTap,
    this.onUpload,
  });

  @override
  State<DueListWidget> createState() => _DueListWidgetState();
}

class _DueListWidgetState extends State<DueListWidget> {
  final TextEditingController _searchController = TextEditingController();
  String _searchQuery = '';
  String _statusFilter = 'all'; // all, unpaid, paid

  @override
  void dispose() {
    _searchController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    return BlocBuilder<DuesBloc, DuesState>(
      buildWhen: (prev, curr) =>
          curr is DuesLoaded || curr is DuesLoading || curr is DuesError,
      builder: (context, state) {
        if (state is DuesLoading) {
          return Padding(
            padding: const EdgeInsets.all(16),
            child: Column(
              children: [
                StaleDataBanner(
                  onRefresh: () =>
                      context.read<DuesBloc>().add(const DuesLoadRequested()),
                ),
                const SizedBox(height: 12),
                const SkeletonBox(height: 120),
                const SizedBox(height: 12),
                const SkeletonBox(height: 120),
              ],
            ),
          );
        }
        if (state is DuesError) {
          return ErrorStateView(
            message: state.message,
            onRetry: () =>
                context.read<DuesBloc>().add(const DuesLoadRequested()),
          );
        }
        if (state is! DuesLoaded) {
          return const EmptyStateView(
            title: 'Belum ada data iuran',
            message: 'Tagihan iuran Anda akan muncul di sini.',
          );
        }

        final allDues = state.dues;

        // Terapkan filter pencarian dan status
        final filtered = allDues.where((due) {
          final query = _searchQuery.toLowerCase();
          final matchesSearch = query.isEmpty ||
              due.periode.toLowerCase().contains(query) ||
              due.jumlah.toString().contains(query) ||
              due.id.toLowerCase().contains(query);

          final status = due.status.toLowerCase();
          final isPaid = status.contains('lunas') || status == 'paid';
          final matchesStatus = _statusFilter == 'all' ||
              (_statusFilter == 'unpaid' && !isPaid) ||
              (_statusFilter == 'paid' && isPaid);

          return matchesSearch && matchesStatus;
        }).toList();

        return Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Search & Filter Bar
            _buildFilterBar(theme),

            // Jumlah hasil filter
            Padding(
              padding: const EdgeInsets.fromLTRB(16, 4, 16, 8),
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
                    TextButton(
                      onPressed: () {
                        setState(() {
                          _searchQuery = '';
                          _statusFilter = 'all';
                          _searchController.clear();
                        });
                      },
                      child: const Text('Reset Filter'),
                    ),
                ],
              ),
            ),

            if (filtered.isEmpty)
              Padding(
                padding: const EdgeInsets.symmetric(vertical: 32),
                child: EmptyStateView(
                  title: 'Tidak ada iuran ditemukan',
                  message: 'Coba ubah kata kunci pencarian atau filter status.',
                  actionLabel: 'Reset Filter',
                  onAction: () {
                    setState(() {
                      _searchQuery = '';
                      _statusFilter = 'all';
                      _searchController.clear();
                    });
                  },
                ),
              )
            else
              ListView.builder(
                shrinkWrap: true,
                physics: const NeverScrollableScrollPhysics(),
                padding: const EdgeInsets.symmetric(horizontal: 16),
                itemCount: filtered.length,
                itemBuilder: (context, index) {
                  final due = filtered[index];
                  return DueItemCard(
                    due: due,
                    onTap: () => widget.onTap?.call(due),
                    onUpload: due.canUploadProof
                        ? () => widget.onUpload?.call(due)
                        : null,
                  );
                },
              ),
          ],
        );
      },
    );
  }

  Widget _buildFilterBar(ThemeData theme) {
    return Padding(
      padding: const EdgeInsets.fromLTRB(16, 12, 16, 4),
      child: Column(
        children: [
          TextField(
            controller: _searchController,
            decoration: InputDecoration(
              hintText: 'Cari periode (cth. 2026-04)...',
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
              contentPadding:
                  const EdgeInsets.symmetric(vertical: 10, horizontal: 14),
              border: OutlineInputBorder(
                borderRadius: BorderRadius.circular(12),
              ),
            ),
            onChanged: (v) => setState(() => _searchQuery = v),
          ),
          const SizedBox(height: 8),
          SingleChildScrollView(
            scrollDirection: Axis.horizontal,
            child: Row(
              children: [
                _buildChip('all', 'Semua', theme),
                const SizedBox(width: 8),
                _buildChip('unpaid', 'Belum Lunas', theme,
                    color: Colors.red),
                const SizedBox(width: 8),
                _buildChip('paid', 'Lunas', theme,
                    color: Colors.green),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildChip(String value, String label, ThemeData theme,
      {Color? color}) {
    final isSelected = _statusFilter == value;
    final primaryColor = color ?? theme.colorScheme.primary;

    return FilterChip(
      label: Text(label),
      selected: isSelected,
      onSelected: (_) => setState(() => _statusFilter = value),
      selectedColor: primaryColor.withValues(alpha: 0.15),
      checkmarkColor: primaryColor,
      labelStyle: TextStyle(
        color: isSelected
            ? primaryColor
            : theme.colorScheme.onSurfaceVariant,
        fontWeight: isSelected ? FontWeight.w700 : FontWeight.w500,
      ),
    );
  }
}

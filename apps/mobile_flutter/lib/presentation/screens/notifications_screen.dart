import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:go_router/go_router.dart';

import '../../core/theme/app_theme.dart';
import '../../core/utils/formatters.dart';
import '../../data/models/notification_item.dart';
import '../../logic/notification/notification_bloc.dart';
import '../widgets/app_loading_spinner.dart';

class NotificationsScreen extends StatefulWidget {
  const NotificationsScreen({super.key});

  @override
  State<NotificationsScreen> createState() => _NotificationsScreenState();
}

class _NotificationsScreenState extends State<NotificationsScreen> {
  String _filter = 'all';

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Notifikasi'),
        actions: [
          BlocBuilder<NotificationBloc, NotificationState>(
            buildWhen: (p, c) =>
                p is NotificationLoaded && c is NotificationLoaded,
            builder: (context, state) {
              final unread =
                  state is NotificationLoaded ? state.unreadCount : 0;
              if (unread == 0) return const SizedBox.shrink();
              return TextButton(
                onPressed: () => context
                    .read<NotificationBloc>()
                    .add(const NotificationMarkAllRead()),
                child: const Text('Semua Dibaca',
                    style: TextStyle(color: Colors.white)),
              );
            },
          ),
          PopupMenuButton<String>(
            color: Colors.white,
            onSelected: (value) {
              if (value == 'delete_all') _confirmDeleteAll(context);
            },
            itemBuilder: (context) => const [
              PopupMenuItem(
                value: 'delete_all',
                child: Text('Hapus Semua',
                    style: TextStyle(color: AppTheme.danger)),
              ),
            ],
          ),
        ],
      ),
      body: Column(
        children: [
          _buildFilterBar(),
          Expanded(
            child: BlocBuilder<NotificationBloc, NotificationState>(
              builder: (context, state) {
                if (state is NotificationLoading) {
                  return const AppLoadingSpinner();
                }
                if (state is NotificationError) {
                  return _ErrorView(
                    message: state.message,
                    onRetry: () => context
                        .read<NotificationBloc>()
                        .add(const NotificationLoadRequested()),
                  );
                }
                if (state is! NotificationLoaded) {
                  return const Center(child: Text('Tidak ada notifikasi'));
                }
                final items = _applyFilter(state.notifications);
                if (items.isEmpty) {
                  return const Center(child: Text('Tidak ada notifikasi'));
                }
                return RefreshIndicator(
                  onRefresh: () async => context
                      .read<NotificationBloc>()
                      .add(const NotificationLoadRequested()),
                  child: ListView.builder(
                    padding: const EdgeInsets.all(12),
                    itemCount: items.length,
                    itemBuilder: (context, i) => _NotificationCard(
                      item: items[i],
                      onTap: () => _handleTap(context, items[i]),
                    ),
                  ),
                );
              },
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildFilterBar() {
    return Container(
      color: Colors.white,
      padding: const EdgeInsets.fromLTRB(16, 4, 16, 10),
      child: Row(
        children: [
          _chip('all', 'Semua'),
          const SizedBox(width: 6),
          _chip('unread', 'Belum Dibaca'),
          const SizedBox(width: 6),
          _chip('read', 'Dibaca'),
        ],
      ),
    );
  }

  Widget _chip(String value, String label) {
    final active = _filter == value;
    return ChoiceChip(
      label: Text(label),
      selected: active,
      showCheckmark: false,
      labelStyle: TextStyle(
        fontSize: 12,
        color: active ? Colors.white : Colors.grey.shade700,
        fontWeight: FontWeight.w600,
      ),
      selectedColor: AppTheme.primary,
      backgroundColor: Colors.grey.shade100,
      side: BorderSide(color: Colors.grey.shade300),
      onSelected: (_) => setState(() => _filter = value),
    );
  }

  List<NotificationItem> _applyFilter(List<NotificationItem> items) {
    switch (_filter) {
      case 'unread':
        return items.where((n) => !n.isRead).toList();
      case 'read':
        return items.where((n) => n.isRead).toList();
      default:
        return items;
    }
  }

  void _handleTap(BuildContext context, NotificationItem item) {
    context.read<NotificationBloc>().add(NotificationMarkRead(item.id));
    final screen = item.data?['screen'];
    if (item.tipe == 'data_incomplete' ||
        screen == 'profile/edit' ||
        screen == 'profile') {
      context.go('/profile');
    }
  }

  Future<void> _confirmDeleteAll(BuildContext context) async {
    final ok = await showDialog<bool>(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Hapus Semua'),
        content: const Text('Yakin ingin menghapus semua notifikasi?'),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context, false),
            child: const Text('Batal'),
          ),
          TextButton(
            onPressed: () => Navigator.pop(context, true),
            child:
                const Text('Hapus', style: TextStyle(color: AppTheme.danger)),
          ),
        ],
      ),
    );
    if (ok == true && context.mounted) {
      context.read<NotificationBloc>().add(const NotificationDelete('all'));
    }
  }
}

class _NotificationCard extends StatelessWidget {
  final NotificationItem item;
  final VoidCallback onTap;

  const _NotificationCard({required this.item, required this.onTap});

  @override
  Widget build(BuildContext context) {
    final unread = !item.isRead;
    return Card(
      margin: const EdgeInsets.only(bottom: 8),
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(12),
        side: BorderSide(
          color: unread
              ? AppTheme.primary.withValues(alpha: 0.6)
              : Colors.grey.shade200,
          width: unread ? 1.2 : 1,
        ),
      ),
      child: InkWell(
        borderRadius: BorderRadius.circular(12),
        onTap: onTap,
        child: Padding(
          padding: const EdgeInsets.all(14),
          child: Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(_icon(item.tipe), style: const TextStyle(fontSize: 22)),
              const SizedBox(width: 12),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      item.judul,
                      style: TextStyle(
                        fontSize: 14,
                        fontWeight: unread ? FontWeight.w700 : FontWeight.w500,
                        color: Colors.black87,
                      ),
                    ),
                    if (item.isi.isNotEmpty) ...[
                      const SizedBox(height: 4),
                      Text(
                        item.isi,
                        maxLines: 3,
                        overflow: TextOverflow.ellipsis,
                        style: TextStyle(
                          fontSize: 13,
                          color: Colors.grey.shade700,
                          height: 1.4,
                        ),
                      ),
                    ],
                    if (item.tipe == 'data_incomplete') ...[
                      const SizedBox(height: 6),
                      const Text(
                        'Ketuk untuk melengkapi profil →',
                        style: TextStyle(
                          fontSize: 12,
                          fontWeight: FontWeight.w600,
                          color: AppTheme.primary,
                        ),
                      ),
                    ],
                    const SizedBox(height: 6),
                    Text(
                      Formatters.relative(item.createdAt),
                      style:
                          TextStyle(fontSize: 11, color: Colors.grey.shade500),
                    ),
                  ],
                ),
              ),
              if (unread)
                Container(
                  width: 8,
                  height: 8,
                  margin: const EdgeInsets.only(top: 6),
                  decoration: const BoxDecoration(
                    color: AppTheme.primary,
                    shape: BoxShape.circle,
                  ),
                ),
            ],
          ),
        ),
      ),
    );
  }

  String _icon(String tipe) {
    const map = {
      'welcome': '👋',
      'data_incomplete': '⚠️',
      'reminder_latihan': '🥋',
      'reminder_pendadaran': '🎓',
      'reminder_iuran': '💰',
      'status_klaim': '📋',
      'dokumen_ready': '✅',
      'badge_earned': '🏅',
      'approval_request': '✅',
      'umum': '📢',
    };
    return map[tipe] ?? '📢';
  }
}

class _ErrorView extends StatelessWidget {
  final String message;
  final VoidCallback onRetry;

  const _ErrorView({required this.message, required this.onRetry});

  @override
  Widget build(BuildContext context) {
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(24),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            const Icon(Icons.error_outline, size: 48, color: AppTheme.danger),
            const SizedBox(height: 12),
            Text(message, textAlign: TextAlign.center),
            const SizedBox(height: 16),
            FilledButton(onPressed: onRetry, child: const Text('Coba Lagi')),
          ],
        ),
      ),
    );
  }
}

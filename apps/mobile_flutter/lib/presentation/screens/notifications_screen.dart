import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:go_router/go_router.dart';

import '../../core/theme/app_theme.dart';
import '../../core/utils/formatters.dart';
import '../../data/models/notification_item.dart';
import '../../logic/notification/notification_bloc.dart';
import '../widgets/app_bar_icon_title.dart';
import '../widgets/skeleton_loader.dart';
import '../widgets/stale_data_banner.dart';
import '../widgets/state_views.dart';

class NotificationsScreen extends StatefulWidget {
  const NotificationsScreen({super.key});

  @override
  State<NotificationsScreen> createState() => _NotificationsScreenState();
}

class _NotificationsScreenState extends State<NotificationsScreen> {
  String _filter = 'all';
  //true = urutkan yang belum dibaca di atas (default). Pengguna bisa toggle.
  bool _unreadOnlyFirst = true;

  @override
  void initState() {
    super.initState();
    // Muat daftar notifikasi segera saat halaman dibuka (sebelumnya hanya
    // dimuat lewat pull-to-refresh / retry).
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (mounted) {
        context.read<NotificationBloc>().add(const NotificationLoadRequested());
      }
    });
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const AppBarIconTitle(
          icon: Icons.notifications_outlined,
          title: 'Notifikasi',
        ),
        actions: [
          BlocBuilder<NotificationBloc, NotificationState>(
            buildWhen: (p, c) => c is NotificationLoaded,
            builder: (context, state) {
              final unread =
                  state is NotificationLoaded ? state.unreadCount : 0;
              if (unread == 0) return const SizedBox.shrink();
              return TextButton(
                onPressed: () => context
                    .read<NotificationBloc>()
                    .add(const NotificationMarkAllRead()),
                child: const Text('Semua Dibaca'),
              );
            },
          ),
PopupMenuButton<String>(
                color: Theme.of(context).colorScheme.surface,
                onSelected: (value) {
              if (value == 'delete_all') _confirmDeleteAll(context);
            },
            itemBuilder: (context) => [
              PopupMenuItem(
                value: 'delete_all',
                child: Text('Hapus Semua',
                    style:
                        TextStyle(color: Theme.of(context).colorScheme.error)),
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
                  return const SkeletonNotificationList();
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
                  return const EmptyStateView(
                    icon: Icons.notifications_none_rounded,
                    title: 'Tidak ada notifikasi',
                    message: 'Notifikasi akan muncul di sini saat tersedia.',
                  );
                }
                final items = _applyFilter(state.notifications);
                return Column(
                  children: [
                    // Banner data cache (offline / gagal segarkan).
                    if (state.isStale)
                      StaleDataBanner(
                        errorMessage: state.errorMessage,
                        onRefresh: () => context
                            .read<NotificationBloc>()
                            .add(const NotificationLoadRequested()),
                      ),
                    if (items.isEmpty)
                      const Expanded(
                        child: EmptyStateView(
                          icon: Icons.notifications_off_outlined,
                          title: 'Tidak ada notifikasi',
                          message: 'Tidak ada notifikasi pada filter ini.',
                        ),
                      )
                    else
                      Expanded(
                        child: RefreshIndicator(
                          onRefresh: () async => context
                              .read<NotificationBloc>()
                              .add(const NotificationLoadRequested()),
                          child: ListView.builder(
                            padding: const EdgeInsets.all(AppTheme.space12),
                            itemCount: items.length,
                            itemBuilder: (context, i) {
                              final item = items[i];
                              return Dismissible(
                                key: ValueKey(item.id),
                                direction: DismissDirection.endToStart,
                                background: Container(
                                  alignment: Alignment.centerRight,
                                  padding: const EdgeInsets.only(
                                      right: AppTheme.space20),
                                  decoration: BoxDecoration(
                                    color:
                                        Theme.of(context).colorScheme.errorContainer,
                                    borderRadius:
                                        BorderRadius.circular(AppTheme.space12),
                                  ),
                                  child: Icon(Icons.delete_outline_rounded,
                                      color: Theme.of(context)
                                          .colorScheme
                                          .onErrorContainer),
                                ),
                                confirmDismiss: (_) async =>
                                    await _confirmDelete(context, item.judul) ??
                                    false,
                                onDismissed: (_) => context
                                    .read<NotificationBloc>()
                                    .add(NotificationDelete(item.id)),
                                child: _NotificationCard(
                                  item: item,
                                  onTap: () => _handleTap(context, item),
                                ),
                              );
                            },
                          ),
                        ),
                      ),
                  ],
                );
              },
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildFilterBar() {
    final theme = Theme.of(context);
    return Container(
      padding: const EdgeInsets.fromLTRB(
          AppTheme.space16, AppTheme.space4, AppTheme.space16, AppTheme.space8),
      child: Row(
        children: [
          Expanded(
            child: Container(
              padding: const EdgeInsets.all(AppTheme.space4),
              decoration: BoxDecoration(
                color: theme.colorScheme.surfaceContainerHighest,
                borderRadius: BorderRadius.circular(AppTheme.space12),
              ),
              child: Row(
                children: [
                  Expanded(child: _segment('all', 'Semua')),
                  Expanded(child: _segment('unread', 'Belum Dibaca')),
                  Expanded(child: _segment('read', 'Dibaca')),
                ],
              ),
            ),
          ),
          const SizedBox(width: AppTheme.space8),
          _sortToggle(theme),
        ],
      ),
    );
  }

  Widget _segment(String value, String label) {
    final active = _filter == value;
    final theme = Theme.of(context);
    return GestureDetector(
      onTap: () => setState(() => _filter = value),
      child: AnimatedContainer(
        duration: const Duration(milliseconds: 180),
        curve: Curves.easeOutCubic,
        padding: const EdgeInsets.symmetric(vertical: AppTheme.space8),
        decoration: BoxDecoration(
          color: active ? theme.colorScheme.primary : Colors.transparent,
          borderRadius: BorderRadius.circular(AppTheme.space8),
        ),
        alignment: Alignment.center,
        child: Text(
          label,
          style: TextStyle(
            fontSize: 12,
            fontWeight: FontWeight.w700,
            color: active
                ? theme.colorScheme.onPrimary
                : theme.colorScheme.onSurfaceVariant,
          ),
        ),
      ),
    );
  }

  Widget _sortToggle(ThemeData theme) {
    return Tooltip(
      message: _unreadOnlyFirst
          ? 'Belum dibaca di atas'
          : 'Notifikasi terbaru di atas',
      child: InkWell(
        borderRadius: BorderRadius.circular(AppTheme.space12),
        onTap: () => setState(() => _unreadOnlyFirst = !_unreadOnlyFirst),
        child: Container(
          padding: const EdgeInsets.all(AppTheme.space8),
          decoration: BoxDecoration(
            color: theme.colorScheme.surfaceContainerHighest,
            borderRadius: BorderRadius.circular(AppTheme.space12),
          ),
          child: Icon(
            _unreadOnlyFirst
                ? Icons.unfold_more_rounded
                : Icons.expand_more_rounded,
            size: 20,
            color: theme.colorScheme.onSurfaceVariant,
          ),
        ),
      ),
    );
  }

  List<NotificationItem> _applyFilter(List<NotificationItem> items) {
    final filtered = switch (_filter) {
      'unread' => items.where((n) => !n.isRead).toList(),
      'read' => items.where((n) => n.isRead).toList(),
      _ => List<NotificationItem>.from(items),
    };
    if (_unreadOnlyFirst) {
      filtered.sort((a, b) {
        if (a.isRead == b.isRead) {
          return b.createdAt.compareTo(a.createdAt);
        }
        return a.isRead ? 1 : -1;
      });
    } else {
      filtered.sort((b, a) => a.createdAt.compareTo(b.createdAt));
    }
    return filtered;
  }

  void _handleTap(BuildContext context, NotificationItem item) {
    if (!item.isRead) {
      context.read<NotificationBloc>().add(NotificationMarkRead(item.id));
    }
    final target = _deepLink(item);
    if (target != null) context.go(target);
  }

  /// Resolve deep link dari payload notifikasi (`data.screen` / `data.route` /
  /// `tipe`). Mengembalikan null bila tidak ada tujuan yang valid agar tidak
  /// menggantung pengguna di halaman yang tidak relevan.
  String? _deepLink(NotificationItem item) {
    final data = item.data ?? const <String, dynamic>{};
    final screen = data['screen']?.toString() ?? '';
    final route = data['route']?.toString() ?? '';

    // Prioritaskan route eksplisit bila tersedia.
    if (route.startsWith('/')) return route;

    switch (item.tipe) {
      case 'data_incomplete':
      case 'profile':
        return '/profile/edit';
      case 'assessment':
        final kegiatanId = data['kegiatanId']?.toString();
        if (kegiatanId != null && kegiatanId.isNotEmpty) {
          return '/pendadaran/$kegiatanId/penilaian';
        }
        return '/pendadaran';
      case 'dues':
        return '/dues';
      case 'forum':
        final threadId = data['threadId']?.toString();
        if (threadId != null && threadId.isNotEmpty) {
          return '/forum/t/$threadId';
        }
        return '/forum';
      case 'document':
      case 'dokumen':
        final documentId = data['documentId']?.toString();
        if (documentId != null && documentId.isNotEmpty) {
          return '/documents/$documentId';
        }
        return '/documents';
      case 'news':
      case 'berita':
        final slug = (data['slug'] ?? data['beritaSlug'])?.toString();
        if (slug != null && slug.isNotEmpty) {
          return '/berita/$slug';
        }
        return '/berita/status';
      case 'pendadaran':
      case 'graduation':
        final pendadaranId = data['pendadaranId']?.toString();
        if (pendadaranId != null && pendadaranId.isNotEmpty) {
          return '/pendadaran/$pendadaranId';
        }
        return '/pendadaran';
      case 'gamification':
      case 'badge':
        return '/gamification';
      case 'registration':
        return '/admin/registrations';
      case 'claim':
        return '/admin/claims';
      case 'kegiatan':
        final kegiatanId = data['kegiatanId']?.toString();
        if (kegiatanId != null && kegiatanId.isNotEmpty) {
          return '/kegiatan/$kegiatanId';
        }
        return '/home';
      case 'kta':
        return '/kta';
    }

    switch (screen) {
      case 'profile/edit':
      case 'profile':
        return '/profile/edit';
      case 'pendadaran':
        return '/pendadaran';
      case 'forum':
        return '/forum';
      case 'documents':
      case 'document':
        return '/documents';
      case 'berita':
      case 'news':
        return '/berita/status';
      case 'gamification':
        return '/gamification';
      case 'kta':
        return '/kta';
      case 'dues':
        return '/dues';
      case 'admin/registrations':
        return '/admin/registrations';
      case 'admin/claims':
        return '/admin/claims';
    }
    return null;
  }

  Future<bool?> _confirmDelete(BuildContext context, String judul) {
    return showDialog<bool>(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Hapus Notifikasi'),
        content: Text('Yakin ingin menghapus "$judul"?'),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context, false),
            child: const Text('Batal'),
          ),
          TextButton(
            onPressed: () => Navigator.pop(context, true),
            child: Text('Hapus',
                style: TextStyle(color: Theme.of(context).colorScheme.error)),
          ),
        ],
      ),
    );
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
            child: Text('Hapus',
                style: TextStyle(color: Theme.of(context).colorScheme.error)),
          ),
        ],
      ),
    );
    if (ok == true && context.mounted) {
      context.read<NotificationBloc>().add(const NotificationDeleteAll());
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
    final theme = Theme.of(context);
    return Card(
      margin: const EdgeInsets.only(bottom: AppTheme.space8),
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(AppTheme.space12),
        side: BorderSide(
          color: unread
              ? theme.colorScheme.primary.withValues(alpha: 0.6)
              : theme.colorScheme.outlineVariant,
          width: unread ? 1.2 : 1,
        ),
      ),
      child: InkWell(
        borderRadius: BorderRadius.circular(12),
        onTap: onTap,
        child: Padding(
          padding: const EdgeInsets.all(AppTheme.space16),
          child: Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(_icon(item.tipe), style: const TextStyle(fontSize: 22)),
              const SizedBox(width: AppTheme.space12),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      item.judul,
                      style: TextStyle(
                        fontSize: 14,
                        fontWeight: unread ? FontWeight.w700 : FontWeight.w500,
                        color: theme.colorScheme.onSurface,
                      ),
                    ),
                    if (item.isi.isNotEmpty) ...[
                      const SizedBox(height: AppTheme.space4),
                      Text(
                        item.isi,
                        maxLines: 3,
                        overflow: TextOverflow.ellipsis,
                        style: TextStyle(
                          fontSize: 13,
                          color: theme.colorScheme.onSurfaceVariant,
                          height: 1.4,
                        ),
                      ),
                    ],
                    if (item.tipe == 'data_incomplete') ...[
                      const SizedBox(height: 6),
                      Text(
                        'Ketuk untuk melengkapi profil →',
                        style: TextStyle(
                          fontSize: 12,
                          fontWeight: FontWeight.w600,
                          color: Theme.of(context).colorScheme.primary,
                        ),
                      ),
                    ],
                    const SizedBox(height: AppTheme.space4),
                    Text(
                      Formatters.relative(item.createdAt),
                      style: TextStyle(
                          fontSize: 11,
                          color: theme.colorScheme.onSurfaceVariant),
                    ),
                  ],
                ),
              ),
              if (unread)
                Container(
                  width: 8,
                  height: 8,
                  margin: const EdgeInsets.only(top: AppTheme.space4),
                  decoration: BoxDecoration(
                    color: theme.colorScheme.primary,
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
        padding: const EdgeInsets.all(AppTheme.space24),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Icon(Icons.error_outline,
                size: 48, color: Theme.of(context).colorScheme.error),
            const SizedBox(height: AppTheme.space12),
            Text(message, textAlign: TextAlign.center),
            const SizedBox(height: AppTheme.space16),
            FilledButton(onPressed: onRetry, child: const Text('Coba Lagi')),
          ],
        ),
      ),
    );
  }
}

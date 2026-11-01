import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:go_router/go_router.dart';

import '../../core/theme/app_theme.dart';
import '../../data/models/forum.dart';
import '../../logic/forum/forum_bloc.dart';
import '../widgets/app_bar_icon_title.dart';
import '../widgets/skeleton_loader.dart';
import '../widgets/stale_data_banner.dart';
import '../widgets/state_views.dart';

class ForumScreen extends StatefulWidget {
  const ForumScreen({super.key});

  @override
  State<ForumScreen> createState() => _ForumScreenState();
}

class _ForumScreenState extends State<ForumScreen> {
  static const _gradients = [
    [AppTheme.primary, AppTheme.primaryDark],
    [AppTheme.info, AppTheme.primary],
    [AppTheme.navy, AppTheme.primaryDark],
    [AppTheme.primaryLight, AppTheme.info],
  ];

  @override
  void initState() {
    super.initState();
    final state = context.read<ForumBloc>().state;
    if (state is ForumInitial) {
      context.read<ForumBloc>().add(const ForumCategoriesLoadRequested());
    }
  }

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;

    return Scaffold(
      backgroundColor: isDark ? AppTheme.darkBackground : AppTheme.lightBackground,
      appBar: AppBar(
        title: const AppBarIconTitle(
          icon: Icons.forum_outlined,
          title: 'Forum Komunitas',
        ),
        actions: [
          IconButton(
            icon: const Icon(Icons.add),
            tooltip: 'Buat Thread',
            onPressed: () => context.push<void>('/forum/create'),
          ),
        ],
      ),
      body: BlocBuilder<ForumBloc, ForumState>(
        builder: (context, state) {
          final categories = state is ForumCategoriesLoaded
              ? state.categories
              : state.cachedCategories;

          if (categories.isNotEmpty) {
            final content = _categoriesList(context, categories);
            if (state is ForumCategoriesLoaded && state.isStale) {
              return Column(
                children: [
                  StaleDataBanner(
                    errorMessage: state.errorMessage,
                    onRefresh: () => context
                        .read<ForumBloc>()
                        .add(const ForumCategoriesLoadRequested()),
                  ),
                  Expanded(child: content),
                ],
              );
            }
            return content;
          }

          if (state is ForumLoading) {
            return const SkeletonNotificationList();
          }
          if (state is ForumError) {
            return ErrorStateView(
              message: state.message,
              onRetry: () => context
                  .read<ForumBloc>()
                  .add(const ForumCategoriesLoadRequested()),
            );
          }
          return const SkeletonNotificationList();
        },
      ),
    );
  }

  Widget _categoriesList(BuildContext context, List<ForumCategory> cats) {
    if (cats.isEmpty) {
      return const EmptyStateView(
        icon: Icons.category_outlined,
        title: 'Belum ada kategori forum',
        message: 'Kategori forum akan muncul setelah ditambahkan.',
      );
    }

    final totalThreads = cats.fold<int>(0, (sum, c) => sum + c.threadCount);
    final isDark = Theme.of(context).brightness == Brightness.dark;

    return RefreshIndicator(
      onRefresh: () async =>
          context.read<ForumBloc>().add(const ForumCategoriesLoadRequested()),
      child: ListView(
        physics: const AlwaysScrollableScrollPhysics(),
        padding: const EdgeInsets.symmetric(
          horizontal: AppTheme.space16,
          vertical: AppTheme.space12,
        ),
        children: [
          // ── Hero Banner (Kaskus / iOsGods Style Header) ──
          Container(
            padding: const EdgeInsets.all(AppTheme.space16),
            decoration: BoxDecoration(
              gradient: const LinearGradient(
                colors: [AppTheme.primary, AppTheme.navy],
                begin: Alignment.topLeft,
                end: Alignment.bottomRight,
              ),
              borderRadius: BorderRadius.circular(16),
              boxShadow: [
                BoxShadow(
                  color: AppTheme.primary.withValues(alpha: 0.25),
                  blurRadius: 10,
                  offset: const Offset(0, 4),
                ),
              ],
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  children: [
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                      decoration: BoxDecoration(
                        color: Colors.white.withValues(alpha: 0.18),
                        borderRadius: BorderRadius.circular(20),
                      ),
                      child: const Row(
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          Icon(Icons.auto_awesome, size: 12, color: Colors.white),
                          SizedBox(width: 4),
                          Text(
                            'KOMUNITAS THS-THM',
                            style: TextStyle(
                              color: Colors.white,
                              fontSize: 10,
                              fontWeight: FontWeight.bold,
                              letterSpacing: 0.5,
                            ),
                          ),
                        ],
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: AppTheme.space8),
                const Text(
                  'Forum Diskusi & Berbagi',
                  style: TextStyle(
                    color: Colors.white,
                    fontSize: 18,
                    fontWeight: FontWeight.bold,
                  ),
                ),
                const SizedBox(height: 4),
                Text(
                  'Ruang resmi anggota untuk berdiskusi, bertukar ilmu, dan pengumuman.',
                  style: TextStyle(
                    color: Colors.white.withValues(alpha: 0.82),
                    fontSize: 12,
                  ),
                ),
                const SizedBox(height: AppTheme.space12),
                Row(
                  children: [
                    _statPill(Icons.folder_outlined, '${cats.length} Kategori'),
                    const SizedBox(width: 8),
                    _statPill(Icons.chat_bubble_outline, '$totalThreads Thread'),
                  ],
                ),
              ],
            ),
          ),

          const SizedBox(height: AppTheme.space16),

          const Text(
            'Kategori Forum',
            style: TextStyle(
              fontSize: 14,
              fontWeight: FontWeight.bold,
            ),
          ),
          const SizedBox(height: AppTheme.space8),

          // ── Category List ──
          ...cats.asMap().entries.map((entry) {
            final idx = entry.key;
            final c = entry.value;
            final grad = _gradients[idx % _gradients.length];

            return Container(
              margin: const EdgeInsets.only(bottom: 10),
              decoration: BoxDecoration(
                color: isDark ? AppTheme.darkSurface : AppTheme.lightSurface,
                borderRadius: BorderRadius.circular(14),
                border: Border.all(
                  color: isDark ? AppTheme.darkSurfaceVariant : AppTheme.lightSurfaceDim,
                  width: 0.8,
                ),
                boxShadow: [
                  BoxShadow(
                    color: Colors.black.withValues(alpha: 0.03),
                    blurRadius: 6,
                    offset: const Offset(0, 2),
                  ),
                ],
              ),
              child: InkWell(
                borderRadius: BorderRadius.circular(14),
                onTap: () => context.push<void>(
                    '/forum/c/${c.id}?name=${Uri.encodeComponent(c.nama)}'),
                child: Padding(
                  padding: const EdgeInsets.all(AppTheme.space12),
                  child: Row(
                    children: [
                      Container(
                        width: 44,
                        height: 44,
                        decoration: BoxDecoration(
                          gradient: LinearGradient(
                            colors: grad,
                            begin: Alignment.topLeft,
                            end: Alignment.bottomRight,
                          ),
                          borderRadius: BorderRadius.circular(12),
                        ),
                        child: const Icon(
                          Icons.folder_open,
                          color: Colors.white,
                          size: 22,
                        ),
                      ),
                      const SizedBox(width: AppTheme.space12),
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(
                              c.nama,
                              style: const TextStyle(
                                fontWeight: FontWeight.bold,
                                fontSize: 14,
                              ),
                            ),
                            if (c.deskripsi.isNotEmpty) ...[
                              const SizedBox(height: 2),
                              Text(
                                c.deskripsi,
                                maxLines: 1,
                                overflow: TextOverflow.ellipsis,
                                style: const TextStyle(
                                  fontSize: 11,
                                  color: AppTheme.textMuted,
                                ),
                              ),
                            ],
                            const SizedBox(height: 4),
                            Container(
                              padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                              decoration: BoxDecoration(
                                color: isDark
                                    ? AppTheme.darkSurfaceVariant
                                    : AppTheme.lightSurfaceDim,
                                borderRadius: BorderRadius.circular(4),
                              ),
                              child: Row(
                                mainAxisSize: MainAxisSize.min,
                                children: [
                                  const Icon(Icons.chat_bubble_outline,
                                      size: 10, color: AppTheme.primary),
                                  const SizedBox(width: 4),
                                  Text(
                                    '${c.threadCount} thread',
                                    style: const TextStyle(
                                      fontSize: 10,
                                      fontWeight: FontWeight.w600,
                                      color: AppTheme.textMuted,
                                    ),
                                  ),
                                ],
                              ),
                            ),
                          ],
                        ),
                      ),
                      const Icon(Icons.chevron_right, color: AppTheme.textMuted),
                    ],
                  ),
                ),
              ),
            );
          }),
        ],
      ),
    );
  }

  Widget _statPill(IconData icon, String text) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
      decoration: BoxDecoration(
        color: Colors.white.withValues(alpha: 0.16),
        borderRadius: BorderRadius.circular(20),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(icon, size: 12, color: Colors.white),
          const SizedBox(width: 5),
          Text(
            text,
            style: const TextStyle(
              color: Colors.white,
              fontSize: 11,
              fontWeight: FontWeight.w600,
            ),
          ),
        ],
      ),
    );
  }
}

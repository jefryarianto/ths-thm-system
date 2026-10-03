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
    return Scaffold(
      appBar: AppBar(
        title: const AppBarIconTitle(
          icon: Icons.forum_outlined,
          title: 'Forum Komunitas',
        ),
        actions: [
          IconButton(
            icon: const Icon(Icons.add),
            onPressed: () => context.push<void>('/forum/create'),
          ),
        ],
      ),
      body: BlocBuilder<ForumBloc, ForumState>(
        builder: (context, state) {
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
          if (state is! ForumCategoriesLoaded) {
            return const SkeletonNotificationList();
          }
          if (state.isStale) {
            return Column(
              children: [
                StaleDataBanner(
                  errorMessage: state.errorMessage,
                  onRefresh: () => context
                      .read<ForumBloc>()
                      .add(const ForumCategoriesLoadRequested()),
                ),
                Expanded(child: _categoriesList(context, state.categories)),
              ],
            );
          }
          return _categoriesList(context, state.categories);
        },
      ),
    );
  }

  Widget _categoriesList(BuildContext context, List<ForumCategory> cats) {
    if (cats.isEmpty) {
      return const EmptyStateView(
        icon: Icons.category_outlined,
        title: 'Belum ada kategori forum',
        message: 'Kategori forum akan muncul di sini.',
      );
    }
    return RefreshIndicator(
      onRefresh: () async =>
          context.read<ForumBloc>().add(const ForumCategoriesLoadRequested()),
      child: ListView.builder(
        physics: const AlwaysScrollableScrollPhysics(),
        padding: const EdgeInsets.all(AppTheme.space12),
        itemCount: cats.length,
        itemBuilder: (context, i) {
          final c = cats[i];
          return Card(
            margin: const EdgeInsets.only(bottom: 8),
            child: ListTile(
              leading: Container(
                width: 44,
                height: 44,
                decoration: BoxDecoration(
                  color: Theme.of(context)
                      .colorScheme
                      .primary
                      .withValues(alpha: 0.12),
                  borderRadius: BorderRadius.circular(12),
                ),
                child: Icon(Icons.folder_open,
                    color: Theme.of(context).colorScheme.primary),
              ),
              title: Text(c.nama,
                  style: const TextStyle(fontWeight: FontWeight.w600)),
              subtitle: Text('${c.threadCount} thread',
                  style: TextStyle(
                      fontSize: 12,
                      color: Theme.of(context).colorScheme.onSurfaceVariant)),
              trailing: const Icon(Icons.chevron_right),
              onTap: () => context.push<void>(
                  '/forum/c/${c.id}?name=${Uri.encodeComponent(c.nama)}'),
            ),
          );
        },
      ),
    );
  }
}

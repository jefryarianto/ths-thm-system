import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:go_router/go_router.dart';

import '../../core/theme/app_theme.dart';
import '../../logic/forum/forum_bloc.dart';
import '../widgets/app_bar_icon_title.dart';
import '../widgets/app_loading_spinner.dart';
import '../widgets/app_search_field.dart';
import '../widgets/forum_thread_row.dart';
import '../widgets/stale_data_banner.dart';
import '../widgets/state_views.dart';

class ForumThreadsScreen extends StatefulWidget {
  final String categoryId;
  final String categoryName;
  const ForumThreadsScreen(
      {super.key, required this.categoryId, this.categoryName = ''});

  @override
  State<ForumThreadsScreen> createState() => _ForumThreadsScreenState();
}

class _ForumThreadsScreenState extends State<ForumThreadsScreen> {
  final _search = TextEditingController();
  Timer? _searchDebounce;

  @override
  void initState() {
    super.initState();
    context
        .read<ForumBloc>()
        .add(ForumThreadsLoadRequested(categoryId: widget.categoryId));
  }

  @override
  void dispose() {
    _searchDebounce?.cancel();
    _search.dispose();
    super.dispose();
  }

  void _doSearch(String q) {
    _searchDebounce?.cancel();
    _searchDebounce = Timer(const Duration(milliseconds: 300), () {
      if (mounted) {
        context.read<ForumBloc>().add(ForumThreadsLoadRequested(
            categoryId: widget.categoryId, search: q));
      }
    });
  }

  void _restoreCategoriesIfEmpty() {
    final state = context.read<ForumBloc>().state;
    if (state is ForumInitial || state.cachedCategories.isEmpty) {
      context.read<ForumBloc>().add(const ForumCategoriesLoadRequested());
    }
  }

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;

    return PopScope(
      canPop: true,
      onPopInvokedWithResult: (didPop, result) {
        if (!didPop && mounted) {
          _restoreCategoriesIfEmpty();
        }
      },
      child: Scaffold(
        backgroundColor:
            isDark ? AppTheme.darkBackground : AppTheme.lightBackground,
        appBar: AppBar(
          title: AppBarIconTitle(
            icon: Icons.forum_outlined,
            title:
                widget.categoryName.isNotEmpty ? widget.categoryName : 'Forum',
          ),
          actions: [
            IconButton(
              icon: const Icon(Icons.add),
              tooltip: 'Buat Thread Baru',
              onPressed: () => context.push<void>('/forum/create'),
            ),
          ],
        ),
        body: Column(
          children: [
            // ── Search Bar ──
            Padding(
              padding: const EdgeInsets.fromLTRB(
                AppTheme.space16,
                AppTheme.space12,
                AppTheme.space16,
                AppTheme.space8,
              ),
              child: AppSearchField(
                controller: _search,
                hintText: 'Cari topik diskusi...',
                onChanged: _doSearch,
              ),
            ),

            // ── Thread List ──
            Expanded(
              child: BlocBuilder<ForumBloc, ForumState>(
                builder: (context, state) {
                  final threads = state is ForumThreadsLoaded
                      ? state.threads
                      : state.cachedThreads;

                  if (threads.isNotEmpty) {
                    final list = ListView.builder(
                      physics: const AlwaysScrollableScrollPhysics(),
                      itemCount: threads.length,
                      itemBuilder: (context, i) {
                        final t = threads[i];
                        return ForumThreadRow(thread: t);
                      },
                    );

                    final refreshList = RefreshIndicator(
                      onRefresh: () async {
                        context.read<ForumBloc>().add(ForumThreadsLoadRequested(
                            categoryId: widget.categoryId));
                      },
                      child: list,
                    );

                    if (state is ForumThreadsLoaded && state.isStale) {
                      return Column(
                        children: [
                          StaleDataBanner(
                            errorMessage: state.errorMessage,
                            onRefresh: () => context.read<ForumBloc>().add(
                                ForumThreadsLoadRequested(
                                    categoryId: widget.categoryId)),
                          ),
                          Expanded(child: refreshList),
                        ],
                      );
                    }

                    return refreshList;
                  }

                  if (state is ForumLoading) {
                    return const AppLoadingSpinner(message: 'Memuat topik...');
                  }
                  if (state is ForumError) {
                    return ErrorStateView(
                      message: state.message,
                      onRetry: () => context.read<ForumBloc>().add(
                          ForumThreadsLoadRequested(
                              categoryId: widget.categoryId)),
                    );
                  }

                  return EmptyStateView(
                    icon: Icons.forum_outlined,
                    title: 'Belum ada thread',
                    message: _search.text.isNotEmpty
                        ? 'Tidak ditemukan topik sesuai pencarian Anda.'
                        : 'Jadilah anggota pertama yang memulai topik di kategori ini.',
                    actionLabel: 'Buat Thread Baru',
                    onAction: () => context.push<void>('/forum/create'),
                  );
                },
              ),
            ),
          ],
        ),
      ),
    );
  }
}

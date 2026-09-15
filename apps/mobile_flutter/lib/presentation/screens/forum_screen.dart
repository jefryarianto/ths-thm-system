import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:go_router/go_router.dart';

import '../../core/theme/app_theme.dart';
import '../../logic/forum/forum_bloc.dart';
import '../widgets/app_loading_spinner.dart';

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
        title: const Text('Forum Komunitas'),
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
            return const AppLoadingSpinner(message: 'Memuat forum...');
          }
          if (state is ForumError) return Center(child: Text(state.message));
          if (state is! ForumCategoriesLoaded) return const AppLoadingSpinner();
          final cats = state.categories;
          if (cats.isEmpty) {
            return const Center(child: Text('Belum ada kategori forum'));
          }
          return RefreshIndicator(
            onRefresh: () async => context
                .read<ForumBloc>()
                .add(const ForumCategoriesLoadRequested()),
            child: ListView.builder(
              physics: const AlwaysScrollableScrollPhysics(),
              padding: const EdgeInsets.all(12),
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
                        color: AppTheme.primary.withValues(alpha: 0.08),
                        borderRadius: BorderRadius.circular(12),
                      ),
                      child: const Icon(Icons.folder_open,
                          color: AppTheme.primary),
                    ),
                    title: Text(c.nama,
                        style: const TextStyle(fontWeight: FontWeight.w600)),
                    subtitle: Text('${c.threadCount} thread',
                        style: TextStyle(
                            fontSize: 12, color: Colors.grey.shade600)),
                    trailing: const Icon(Icons.chevron_right),
                    onTap: () => context.push<void>(
                        '/forum/c/${c.id}?name=${Uri.encodeComponent(c.nama)}'),
                  ),
                );
              },
            ),
          );
        },
      ),
    );
  }
}

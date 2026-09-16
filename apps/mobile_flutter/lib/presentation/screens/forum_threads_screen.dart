import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:go_router/go_router.dart';

import '../../core/theme/app_theme.dart';
import '../../logic/forum/forum_bloc.dart';
import '../widgets/app_bar_icon_title.dart';
import '../widgets/app_loading_spinner.dart';

class ForumThreadsScreen extends StatefulWidget {
  final String categoryId;
  final String categoryName;
  const ForumThreadsScreen(
      {super.key, required this.categoryId, this.categoryName = ''});

  @override
  State<ForumThreadsScreen> createState() => _ForumThreadsScreenState();
}

class _ForumThreadsScreenState extends State<ForumThreadsScreen> {
  String _search = '';

  @override
  void initState() {
    super.initState();
    context
        .read<ForumBloc>()
        .add(ForumThreadsLoadRequested(categoryId: widget.categoryId));
  }

  void _doSearch(String q) {
    setState(() => _search = q);
    context.read<ForumBloc>().add(
        ForumThreadsLoadRequested(categoryId: widget.categoryId, search: q));
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: AppBarIconTitle(
          icon: Icons.forum_outlined,
          title:
              widget.categoryName.isNotEmpty ? widget.categoryName : 'Thread',
        ),
        actions: [
          IconButton(
              icon: const Icon(Icons.add),
              onPressed: () => context.push<void>('/forum/create')),
        ],
      ),
      body: Column(children: [
        Padding(
          padding: const EdgeInsets.fromLTRB(16, 12, 16, 8),
          child: TextField(
            decoration: const InputDecoration(
              hintText: 'Cari thread...',
              prefixIcon: Icon(Icons.search, size: 20),
              isDense: true,
            ),
            onChanged: _doSearch,
          ),
        ),
        Expanded(
          child: BlocBuilder<ForumBloc, ForumState>(
            builder: (context, state) {
              if (state is ForumLoading) {
                return const AppLoadingSpinner(message: 'Memuat thread...');
              }
              if (state is ForumError) {
                return Center(child: Text(state.message));
              }
              if (state is! ForumThreadsLoaded) {
                return const AppLoadingSpinner();
              }
              final threads = state.threads;
              if (threads.isEmpty) {
                return const Center(child: Text('Belum ada thread'));
              }
              return RefreshIndicator(
                onRefresh: () async => _doSearch(_search),
                child: ListView.builder(
                  physics: const AlwaysScrollableScrollPhysics(),
                  padding: const EdgeInsets.all(12),
                  itemCount: threads.length,
                  itemBuilder: (context, i) {
                    final t = threads[i];
                    return Card(
                      margin: const EdgeInsets.only(bottom: 8),
                      child: ListTile(
                        title: Row(children: [
                          if (t.isPinned)
                            const Icon(Icons.push_pin,
                                size: 14, color: AppTheme.primary),
                          if (t.isPinned) const SizedBox(width: 4),
                          Expanded(
                              child: Text(t.judul,
                                  maxLines: 1,
                                  overflow: TextOverflow.ellipsis,
                                  style: const TextStyle(
                                      fontWeight: FontWeight.w600))),
                        ]),
                        subtitle: Padding(
                          padding: const EdgeInsets.only(top: 6),
                          child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Text(t.konten,
                                    maxLines: 2,
                                    overflow: TextOverflow.ellipsis,
                                    style: TextStyle(
                                        fontSize: 12,
                                        color: Colors.grey.shade600)),
                                const SizedBox(height: 6),
                                Row(children: [
                                  CircleAvatar(
                                      radius: 10,
                                      backgroundColor: AppTheme.primary
                                          .withValues(alpha: 0.1),
                                      child: Text(
                                          t.author.namaLengkap.isNotEmpty
                                              ? t.author.namaLengkap[0]
                                              : '?',
                                          style: const TextStyle(
                                              fontSize: 10,
                                              fontWeight: FontWeight.w700,
                                              color: AppTheme.primary))),
                                  const SizedBox(width: 6),
                                  Expanded(
                                      child: Text(t.author.namaLengkap,
                                          style: TextStyle(
                                              fontSize: 11,
                                              color: Colors.grey.shade600))),
                                  Text('${t.postCount} balasan',
                                      style: TextStyle(
                                          fontSize: 11,
                                          color: Colors.grey.shade500)),
                                ]),
                              ]),
                        ),
                        trailing: const Icon(Icons.chevron_right),
                        onTap: () => context.push<void>('/forum/t/${t.id}'),
                      ),
                    );
                  },
                ),
              );
            },
          ),
        ),
      ]),
    );
  }
}

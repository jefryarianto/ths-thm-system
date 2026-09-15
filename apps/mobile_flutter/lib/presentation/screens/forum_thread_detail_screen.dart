import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';

import '../../core/theme/app_theme.dart';
import '../../core/utils/formatters.dart';
import '../../logic/forum/forum_bloc.dart';
import '../widgets/app_loading_spinner.dart';

class ForumThreadDetailScreen extends StatefulWidget {
  final String threadId;
  const ForumThreadDetailScreen({super.key, required this.threadId});

  @override
  State<ForumThreadDetailScreen> createState() =>
      _ForumThreadDetailScreenState();
}

class _ForumThreadDetailScreenState extends State<ForumThreadDetailScreen> {
  final _replyCtrl = TextEditingController();
  bool _submitting = false;

  @override
  void initState() {
    super.initState();
    context
        .read<ForumBloc>()
        .add(ForumThreadLoadRequested(id: widget.threadId));
  }

  @override
  void dispose() {
    _replyCtrl.dispose();
    super.dispose();
  }

  void _submitReply() {
    final text = _replyCtrl.text.trim();
    if (text.isEmpty || _submitting) return;
    setState(() => _submitting = true);
    context
        .read<ForumBloc>()
        .add(ForumCreatePostRequested(threadId: widget.threadId, konten: text));
    _replyCtrl.clear();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Detail Thread')),
      body: BlocListener<ForumBloc, ForumState>(
        listener: (context, state) {
          if (_submitting && state is ForumThreadLoaded) {
            setState(() => _submitting = false);
          }
        },
        child: BlocBuilder<ForumBloc, ForumState>(
          builder: (context, state) {
            if (state is ForumLoading) {
              return const AppLoadingSpinner(message: 'Memuat thread...');
            }
            if (state is ForumError) return Center(child: Text(state.message));
            if (state is! ForumThreadLoaded) return const AppLoadingSpinner();
            final thread = state.thread;
            final posts = state.posts;
            return Column(children: [
              Expanded(
                child: ListView(padding: const EdgeInsets.all(16), children: [
                  Text(thread.judul,
                      style: const TextStyle(
                          fontSize: 18, fontWeight: FontWeight.w700)),
                  const SizedBox(height: 8),
                  Row(children: [
                    CircleAvatar(
                        radius: 14,
                        backgroundColor:
                            AppTheme.primary.withValues(alpha: 0.1),
                        child: Text(
                            thread.author.namaLengkap.isNotEmpty
                                ? thread.author.namaLengkap[0]
                                : '?',
                            style: const TextStyle(
                                fontSize: 12,
                                fontWeight: FontWeight.w700,
                                color: AppTheme.primary))),
                    const SizedBox(width: 8),
                    Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(thread.author.namaLengkap,
                              style: const TextStyle(
                                  fontSize: 13, fontWeight: FontWeight.w600)),
                          Text(Formatters.dateLong(thread.createdAt),
                              style: TextStyle(
                                  fontSize: 11, color: Colors.grey.shade500)),
                        ]),
                  ]),
                  const SizedBox(height: 12),
                  Text(thread.konten, style: const TextStyle(height: 1.5)),
                  const Divider(height: 32),
                  Text('${posts.length} Balasan',
                      style: const TextStyle(fontWeight: FontWeight.w700)),
                  const SizedBox(height: 8),
                  ...posts.map((p) => Card(
                        margin: const EdgeInsets.only(bottom: 8),
                        child: Padding(
                          padding: const EdgeInsets.all(12),
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Row(children: [
                                CircleAvatar(
                                    radius: 10,
                                    backgroundColor:
                                        AppTheme.primary.withValues(alpha: 0.1),
                                    child: Text(
                                        p.author.namaLengkap.isNotEmpty
                                            ? p.author.namaLengkap[0]
                                            : '?',
                                        style: const TextStyle(
                                            fontSize: 9,
                                            fontWeight: FontWeight.w700,
                                            color: AppTheme.primary))),
                                const SizedBox(width: 6),
                                Text(p.author.namaLengkap,
                                    style: const TextStyle(
                                        fontSize: 12,
                                        fontWeight: FontWeight.w600)),
                                const Spacer(),
                                Text(Formatters.relative(p.createdAt),
                                    style: TextStyle(
                                        fontSize: 11,
                                        color: Colors.grey.shade500)),
                              ]),
                              const SizedBox(height: 8),
                              Text(p.konten,
                                  style: const TextStyle(
                                      fontSize: 13, height: 1.4)),
                            ],
                          ),
                        ),
                      )),
                ]),
              ),
              Container(
                padding: EdgeInsets.fromLTRB(
                    16, 8, 16, MediaQuery.of(context).viewInsets.bottom + 8),
                decoration: BoxDecoration(color: Colors.white, boxShadow: [
                  BoxShadow(
                      color: Colors.black.withValues(alpha: 0.05),
                      blurRadius: 4)
                ]),
                child: Row(children: [
                  Expanded(
                      child: TextField(
                    controller: _replyCtrl,
                    decoration: const InputDecoration(
                        hintText: 'Tulis balasan...', isDense: true),
                    maxLines: null,
                  )),
                  const SizedBox(width: 8),
                  IconButton(
                    icon: _submitting
                        ? const AppLoadingSpinner.small()
                        : const Icon(Icons.send, color: AppTheme.primary),
                    onPressed: _submitting ? null : _submitReply,
                  ),
                ]),
              ),
            ]);
          },
        ),
      ),
    );
  }
}

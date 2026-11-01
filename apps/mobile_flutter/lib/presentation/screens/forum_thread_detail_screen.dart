import 'dart:async';
import 'dart:io';

import 'package:cached_network_image/cached_network_image.dart';
import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:image_picker/image_picker.dart';

import '../../core/api/api_client.dart';
import '../../core/theme/app_theme.dart';
import '../../core/utils/formatters.dart';
import '../../logic/forum/forum_bloc.dart';
import '../widgets/app_loading_spinner.dart';
import '../widgets/forum_reaction_bar.dart';
import '../widgets/state_views.dart';

class _MentionOption {
  final String id;
  final String nama;
  const _MentionOption({required this.id, required this.nama});
}

class ForumThreadDetailScreen extends StatefulWidget {
  final String threadId;
  const ForumThreadDetailScreen({super.key, required this.threadId});

  @override
  State<ForumThreadDetailScreen> createState() =>
      _ForumThreadDetailScreenState();
}

class _ForumThreadDetailScreenState extends State<ForumThreadDetailScreen> {
  final _replyCtrl = TextEditingController();
  final _imagePicker = ImagePicker();
  bool _submitting = false;
  final List<String> _attachedPaths = [];

  List<_MentionOption> _mentionOptions = [];
  bool _showMentions = false;
  Timer? _mentionDebounce;

  @override
  void initState() {
    super.initState();
    _replyCtrl.addListener(_onReplyChanged);
    context
        .read<ForumBloc>()
        .add(ForumThreadLoadRequested(id: widget.threadId));
  }

  @override
  void dispose() {
    _mentionDebounce?.cancel();
    _replyCtrl.dispose();
    super.dispose();
  }

  /// Deteksi `@query` tepat sebelum karet, debounce 300ms, lalu cari anggota.
  void _onReplyChanged() {
    final text = _replyCtrl.text;
    final selection = _replyCtrl.selection;
    final caret = selection.isValid && selection.baseOffset >= 0
        ? selection.baseOffset.clamp(0, text.length)
        : text.length;
    final before = text.substring(0, caret);
    final match =
        RegExp(r'@([\p{L}\p{M}\d_ -]{0,30})$', unicode: true).firstMatch(before);
    final query = match?.group(1)?.trim() ?? '';
    _mentionDebounce?.cancel();
    if (query.length < 2) {
      if (_showMentions && mounted) {
        setState(() {
          _showMentions = false;
          _mentionOptions = [];
        });
      }
      return;
    }
    _mentionDebounce = Timer(const Duration(milliseconds: 300), () async {
      try {
        final res = await ApiClient()
            .dio
            .get('/forum/mentions', queryParameters: {'search': query});
        final raw = res.data is Map && res.data['data'] is List
            ? res.data['data'] as List
            : const [];
        final options = raw
            .whereType<Map<String, dynamic>>()
            .map((m) => _MentionOption(
                  id: m['id']?.toString() ?? '',
                  nama: m['nama']?.toString() ?? '',
                ))
            .where((o) => o.nama.isNotEmpty)
            .toList();
        if (mounted) {
          setState(() {
            _mentionOptions = options;
            _showMentions = options.isNotEmpty;
          });
        }
      } catch (_) {
        if (mounted && _showMentions) {
          setState(() {
            _mentionOptions = [];
            _showMentions = false;
          });
        }
      }
    });
  }

  void _insertMention(_MentionOption option) {
    final text = _replyCtrl.text;
    final selection = _replyCtrl.selection;
    final caret = selection.isValid && selection.baseOffset >= 0
        ? selection.baseOffset.clamp(0, text.length)
        : text.length;
    final before = text.substring(0, caret);
    final match =
        RegExp(r'@([\p{L}\p{M}\d_ -]{0,30})$', unicode: true).firstMatch(before);
    final start = match?.start ?? caret;
    final next = '${before.substring(0, start)}@${option.nama} ${text.substring(caret)}';
    final newCaret = start + option.nama.length + 2;
    _replyCtrl.value = TextEditingValue(
      text: next,
      selection: TextSelection.collapsed(offset: newCaret),
    );
    setState(() {
      _showMentions = false;
      _mentionOptions = [];
    });
  }

  Future<void> _pickImage() async {
    final source = await showModalBottomSheet<ImageSource>(
      context: context,
      builder: (context) => SafeArea(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            const SizedBox(height: AppTheme.space8),
            const Text('Lampirkan Gambar',
                style: TextStyle(fontSize: 16, fontWeight: FontWeight.w700)),
            const SizedBox(height: 4),
            ListTile(
              leading: const Icon(Icons.photo_camera_outlined,
                  color: AppTheme.info),
              title: const Text('Ambil Foto (Kamera)',
                  style: TextStyle(fontWeight: FontWeight.w600)),
              onTap: () => Navigator.of(context).pop(ImageSource.camera),
            ),
            ListTile(
              leading: const Icon(Icons.photo_library_outlined,
                  color: AppTheme.info),
              title: const Text('Pilih dari Galeri',
                  style: TextStyle(fontWeight: FontWeight.w600)),
              onTap: () => Navigator.of(context).pop(ImageSource.gallery),
            ),
          ],
        ),
      ),
    );
    if (source == null || !mounted) return;
    try {
      final result = await _imagePicker.pickImage(
        source: source,
        maxWidth: 1600,
        maxHeight: 1600,
        imageQuality: 85,
      );
      if (result == null || !mounted) return;
      setState(() => _attachedPaths.add(result.path));
    } catch (_) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Gagal memilih gambar')),
        );
      }
    }
  }

  void _submitReply() {
    final text = _replyCtrl.text.trim();
    if (text.isEmpty || _submitting) return;
    setState(() => _submitting = true);
    context.read<ForumBloc>().add(ForumCreatePostRequested(
        threadId: widget.threadId, konten: text, imagePaths: List.of(_attachedPaths)));
    _replyCtrl.clear();
    _attachedPaths.clear();
    setState(() {
      _showMentions = false;
      _mentionOptions = [];
    });
  }

  void _reactThread(String emoji) {
    context
        .read<ForumBloc>()
        .add(ForumThreadReactRequested(threadId: widget.threadId, emoji: emoji));
  }

  void _reactPost(String postId, String emoji) {
    context.read<ForumBloc>().add(ForumPostReactRequested(
        threadId: widget.threadId, postId: postId, emoji: emoji));
  }

  String _absolute(String path) => ApiClient.resolveAbsolute(path);

  Widget _buildImages(List<String> images, double size) {
    if (images.isEmpty) return const SizedBox.shrink();
    return Padding(
      padding: const EdgeInsets.only(top: AppTheme.space8),
      child: Wrap(
        spacing: 6,
        runSpacing: 6,
        children: [
          for (final path in images)
            GestureDetector(
              onTap: () => Navigator.of(context).push(
                MaterialPageRoute(
                  builder: (_) => _FullScreenImage(url: _absolute(path)),
                ),
              ),
              child: ClipRRect(
                borderRadius: BorderRadius.circular(8),
                child: CachedNetworkImage(
                  imageUrl: _absolute(path),
                  width: size,
                  height: size,
                  fit: BoxFit.cover,
                  placeholder: (_, __) => Container(
                    width: size,
                    height: size,
                    color: Theme.of(context)
                        .colorScheme
                        .surfaceContainerHighest,
                  ),
                  errorWidget: (_, __, ___) => Container(
                    width: size,
                    height: size,
                    color: Theme.of(context)
                        .colorScheme
                        .surfaceContainerHighest,
                    child: const Icon(Icons.broken_image_outlined, size: 20),
                  ),
                ),
              ),
            ),
        ],
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Detail Thread')),
      body: BlocListener<ForumBloc, ForumState>(
        listener: (context, state) {
          if (_submitting && (state is ForumThreadLoaded || state is ForumError)) {
            setState(() => _submitting = false);
          }
        },
        child: BlocBuilder<ForumBloc, ForumState>(
          builder: (context, state) {
            if (state is ForumLoading) {
              return const AppLoadingSpinner(message: 'Memuat thread...');
            }
            if (state is ForumError) {
              return ErrorStateView(
                message: state.message,
                onRetry: () => context
                    .read<ForumBloc>()
                    .add(ForumThreadLoadRequested(id: widget.threadId)),
              );
            }
            if (state is! ForumThreadLoaded) return const AppLoadingSpinner();
            final thread = state.thread;
            final posts = state.posts;
            final itemCount = posts.length + 1;
            return Column(children: [
              Expanded(
                child: ListView.builder(
                  padding: const EdgeInsets.all(AppTheme.space16),
                  itemCount: itemCount,
                  itemBuilder: (context, index) {
                    if (index == 0) {
                      return Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(thread.judul,
                              style: const TextStyle(
                                  fontSize: 18, fontWeight: FontWeight.w700)),
                          const SizedBox(height: AppTheme.space8),
                          Row(children: [
                            CircleAvatar(
                                radius: 14,
                                backgroundColor:
                                    AppTheme.primary.withValues(alpha: 0.1),
                                child: Text(
                                    thread.author.namaLengkap.isNotEmpty
                                        ? thread.author.namaLengkap[0]
                                        : '?',
                                    style: TextStyle(
                                        fontSize: 12,
                                        fontWeight: FontWeight.w700,
                                        color: Theme.of(context)
                                            .colorScheme
                                            .primary))),
                            const SizedBox(width: AppTheme.space8),
                            Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  Text(thread.author.namaLengkap,
                                      style: const TextStyle(
                                          fontSize: 13,
                                          fontWeight: FontWeight.w600)),
                                  Text(Formatters.dateLong(thread.createdAt),
                                      style: TextStyle(
                                          fontSize: 11,
                                          color: Theme.of(context)
                                              .colorScheme
                                              .onSurfaceVariant)),
                                ]),
                          ]),
                          const SizedBox(height: AppTheme.space12),
                          Text(thread.konten,
                              style: const TextStyle(height: 1.5)),
                          _buildImages(thread.images, 96),
                          ForumReactionBar(
                            reactions: thread.reactions,
                            currentUserEmoji: thread.currentUserEmoji,
                            onReact: _reactThread,
                          ),
                          const Divider(height: 32),
                          Text('${posts.length} Balasan',
                              style: const TextStyle(
                                  fontWeight: FontWeight.w700)),
                          const SizedBox(height: AppTheme.space8),
                        ],
                      );
                    }
                    final p = posts[index - 1];
                    return Card(
                      margin: const EdgeInsets.only(bottom: 8),
                      child: Padding(
                        padding: const EdgeInsets.all(AppTheme.space12),
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Row(children: [
                              CircleAvatar(
                                  radius: 10,
                                  backgroundColor: AppTheme.primary
                                      .withValues(alpha: 0.1),
                                  child: Text(
                                      p.author.namaLengkap.isNotEmpty
                                          ? p.author.namaLengkap[0]
                                          : '?',
                                      style: TextStyle(
                                          fontSize: 9,
                                          fontWeight: FontWeight.w700,
                                          color: Theme.of(context)
                                              .colorScheme
                                              .primary))),
                              const SizedBox(width: 6),
                              Text(p.author.namaLengkap,
                                  style: const TextStyle(
                                      fontSize: 12, fontWeight: FontWeight.w600)),
                              const Spacer(),
                              Text(Formatters.relative(p.createdAt),
                                  style: TextStyle(
                                      fontSize: 11,
                                      color: Theme.of(context)
                                          .colorScheme
                                          .onSurfaceVariant)),
                            ]),
                            const SizedBox(height: AppTheme.space8),
                            Text(p.konten,
                                style: const TextStyle(
                                    fontSize: 13, height: 1.4)),
                            _buildImages(p.images, 72),
                            ForumReactionBar(
                              compact: true,
                              reactions: p.reactions,
                              currentUserEmoji: p.currentUserEmoji,
                              onReact: (emoji) => _reactPost(p.id, emoji),
                            ),
                          ],
                        ),
                      ),
                    );
                  },
                ),
              ),
              Container(
                padding: EdgeInsets.fromLTRB(
                    16, 8, 16, MediaQuery.of(context).viewInsets.bottom + 8),
                decoration: BoxDecoration(
                    color: Theme.of(context).colorScheme.surface,
                    boxShadow: [
                      BoxShadow(
                          color: Colors.black.withValues(alpha: 0.05),
                          blurRadius: 4)
                    ]),
                child: Column(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    if (_showMentions && _mentionOptions.isNotEmpty)
                      Container(
                        constraints: const BoxConstraints(maxHeight: 140),
                        margin: const EdgeInsets.only(bottom: 6),
                        child: ListView.builder(
                          shrinkWrap: true,
                          itemCount: _mentionOptions.length,
                          itemBuilder: (context, i) {
                            final option = _mentionOptions[i];
                            return ListTile(
                              dense: true,
                              leading: const Icon(Icons.person_outline,
                                  size: 18),
                              title: Text(option.nama,
                                  style: const TextStyle(
                                      fontSize: 13,
                                      fontWeight: FontWeight.w600)),
                              onTap: () => _insertMention(option),
                            );
                          },
                        ),
                      ),
                    if (_attachedPaths.isNotEmpty)
                      Padding(
                        padding: const EdgeInsets.only(bottom: 6),
                        child: Align(
                          alignment: Alignment.centerLeft,
                          child: Wrap(
                            spacing: 6,
                            runSpacing: 6,
                            children: [
                              for (final path in List.of(_attachedPaths))
                                Stack(
                                  children: [
                                    ClipRRect(
                                      borderRadius: BorderRadius.circular(6),
                                      child: Image.file(
                                        File(path),
                                        width: 48,
                                        height: 48,
                                        fit: BoxFit.cover,
                                      ),
                                    ),
                                    Positioned(
                                      top: 0,
                                      right: 0,
                                      child: GestureDetector(
                                        onTap: () => setState(
                                            () => _attachedPaths.remove(path)),
                                        child: Container(
                                          decoration: BoxDecoration(
                                            color: Colors.black54,
                                            borderRadius:
                                                BorderRadius.circular(8),
                                          ),
                                          child: const Icon(Icons.close,
                                              size: 12, color: Colors.white),
                                        ),
                                      ),
                                    ),
                                  ],
                                ),
                            ],
                          ),
                        ),
                      ),
                    Row(children: [
                      IconButton(
                        icon: Icon(Icons.image_outlined,
                            color: Theme.of(context).colorScheme.primary),
                        onPressed: _submitting ? null : _pickImage,
                        tooltip: 'Lampirkan gambar',
                      ),
                      Expanded(
                          child: TextField(
                        controller: _replyCtrl,
                        decoration: const InputDecoration(
                            hintText: 'Tulis balasan... (@ untuk mention)',
                            isDense: true),
                        maxLines: null,
                      )),
                      const SizedBox(width: AppTheme.space8),
                      IconButton(
                        icon: _submitting
                            ? const AppLoadingSpinner.small()
                            : Icon(Icons.send,
                                color: Theme.of(context).colorScheme.primary),
                        onPressed: _submitting ? null : _submitReply,
                      ),
                    ]),
                  ],
                ),
              ),
            ]);
          },
        ),
      ),
    );
  }
}

/// Viewer layar penuh untuk lampiran gambar (zoom pinch).
class _FullScreenImage extends StatelessWidget {
  final String url;
  const _FullScreenImage({required this.url});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: Colors.black,
      appBar: AppBar(
        backgroundColor: Colors.black,
        foregroundColor: Colors.white,
        iconTheme: const IconThemeData(color: Colors.white),
      ),
      body: Center(
        child: InteractiveViewer(
          child: CachedNetworkImage(imageUrl: url, fit: BoxFit.contain),
        ),
      ),
    );
  }
}

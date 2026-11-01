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
                      final opAuthor = thread.author;
                      final opAuthorName = opAuthor.namaLengkap.isNotEmpty
                          ? opAuthor.namaLengkap
                          : 'Anggota';
                      final opTingkat = opAuthor.tingkat;
                      final isDark = Theme.of(context).brightness == Brightness.dark;

                      return Container(
                        margin: const EdgeInsets.only(bottom: AppTheme.space16),
                        padding: const EdgeInsets.all(AppTheme.space16),
                        decoration: BoxDecoration(
                          color: isDark ? AppTheme.darkSurface : AppTheme.lightSurface,
                          borderRadius: BorderRadius.circular(16),
                          border: Border.all(
                            color: isDark ? AppTheme.darkSurfaceVariant : AppTheme.lightSurfaceDim,
                            width: 0.8,
                          ),
                          boxShadow: [
                            BoxShadow(
                              color: Colors.black.withValues(alpha: 0.04),
                              blurRadius: 8,
                              offset: const Offset(0, 2),
                            ),
                          ],
                        ),
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            // Badges (Pin, Hot, Lock)
                            Wrap(
                              spacing: 6,
                              runSpacing: 4,
                              children: [
                                if (thread.isPinned)
                                  Container(
                                    padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                                    decoration: BoxDecoration(
                                      color: AppTheme.primaryContainer,
                                      borderRadius: BorderRadius.circular(4),
                                    ),
                                    child: const Text(
                                      '📌 SEMATAN',
                                      style: TextStyle(
                                        fontSize: 9,
                                        fontWeight: FontWeight.bold,
                                        color: AppTheme.onPrimaryContainer,
                                      ),
                                    ),
                                  ),
                                if (thread.isHot)
                                  Container(
                                    padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                                    decoration: BoxDecoration(
                                      color: Colors.amber.withValues(alpha: 0.18),
                                      borderRadius: BorderRadius.circular(4),
                                      border: Border.all(color: Colors.amber.withValues(alpha: 0.4)),
                                    ),
                                    child: const Text(
                                      '🔥 HOT',
                                      style: TextStyle(
                                        fontSize: 9,
                                        fontWeight: FontWeight.bold,
                                        color: Colors.amber,
                                      ),
                                    ),
                                  ),
                                if (thread.isLocked)
                                  Container(
                                    padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                                    decoration: BoxDecoration(
                                      color: AppTheme.errorContainer,
                                      borderRadius: BorderRadius.circular(4),
                                    ),
                                    child: const Text(
                                      '🔒 KUNCI',
                                      style: TextStyle(
                                        fontSize: 9,
                                        fontWeight: FontWeight.bold,
                                        color: AppTheme.onErrorContainer,
                                      ),
                                    ),
                                  ),
                              ],
                            ),
                            const SizedBox(height: AppTheme.space8),

                            // Judul Thread
                            Text(
                              thread.judul,
                              style: const TextStyle(
                                fontSize: 18,
                                fontWeight: FontWeight.bold,
                                height: 1.3,
                              ),
                            ),
                            const SizedBox(height: AppTheme.space12),

                            // Author Box (Kaskus / iOsGods style)
                            Container(
                              padding: const EdgeInsets.all(AppTheme.space12),
                              decoration: BoxDecoration(
                                color: isDark
                                    ? AppTheme.darkSurfaceVariant.withValues(alpha: 0.35)
                                    : AppTheme.lightSurfaceDim.withValues(alpha: 0.5),
                                borderRadius: BorderRadius.circular(10),
                              ),
                              child: Row(
                                children: [
                                  CircleAvatar(
                                    radius: 18,
                                    backgroundColor: AppTheme.primary,
                                    child: Text(
                                      opAuthorName.isNotEmpty ? opAuthorName[0].toUpperCase() : 'A',
                                      style: const TextStyle(
                                        fontSize: 14,
                                        fontWeight: FontWeight.bold,
                                        color: Colors.white,
                                      ),
                                    ),
                                  ),
                                  const SizedBox(width: AppTheme.space12),
                                  Expanded(
                                    child: Column(
                                      crossAxisAlignment: CrossAxisAlignment.start,
                                      children: [
                                        Row(
                                          children: [
                                            Flexible(
                                              child: Text(
                                                opAuthorName,
                                                maxLines: 1,
                                                overflow: TextOverflow.ellipsis,
                                                style: const TextStyle(
                                                  fontSize: 13,
                                                  fontWeight: FontWeight.bold,
                                                ),
                                              ),
                                            ),
                                            if (opTingkat != null && opTingkat.isNotEmpty) ...[
                                              const SizedBox(width: 4),
                                              Container(
                                                padding: const EdgeInsets.symmetric(horizontal: 4, vertical: 1),
                                                decoration: BoxDecoration(
                                                  color: AppTheme.primaryContainer,
                                                  borderRadius: BorderRadius.circular(3),
                                                ),
                                                child: Text(
                                                  opTingkat,
                                                  style: const TextStyle(
                                                    fontSize: 9,
                                                    fontWeight: FontWeight.bold,
                                                    color: AppTheme.onPrimaryContainer,
                                                  ),
                                                ),
                                              ),
                                            ],
                                          ],
                                        ),
                                        const SizedBox(height: 2),
                                        Text(
                                          'Diposting ${Formatters.dateLong(thread.createdAt)} • ${thread.viewCount} views',
                                          style: const TextStyle(
                                            fontSize: 11,
                                            color: AppTheme.textMuted,
                                          ),
                                        ),
                                      ],
                                    ),
                                  ),
                                  Container(
                                    padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                                    decoration: BoxDecoration(
                                      color: AppTheme.primaryContainer,
                                      borderRadius: BorderRadius.circular(4),
                                    ),
                                    child: const Text(
                                      '#1 OP',
                                      style: TextStyle(
                                        fontSize: 10,
                                        fontWeight: FontWeight.bold,
                                        color: AppTheme.onPrimaryContainer,
                                      ),
                                    ),
                                  ),
                                ],
                              ),
                            ),
                            const SizedBox(height: AppTheme.space16),

                            // Konten
                            Text(
                              thread.konten,
                              style: const TextStyle(fontSize: 14, height: 1.55),
                            ),
                            _buildImages(thread.images, 96),
                            const SizedBox(height: AppTheme.space12),

                            ForumReactionBar(
                              reactions: thread.reactions,
                              currentUserEmoji: thread.currentUserEmoji,
                              onReact: _reactThread,
                            ),
                            const Divider(height: 32),
                            Row(
                              children: [
                                const Icon(Icons.chat_bubble_outline, size: 16, color: AppTheme.primary),
                                const SizedBox(width: 6),
                                Text(
                                  '${posts.length} Balasan Diskusi',
                                  style: const TextStyle(
                                    fontWeight: FontWeight.bold,
                                    fontSize: 14,
                                  ),
                                ),
                              ],
                            ),
                          ],
                        ),
                      );
                    }
                    final p = posts[index - 1];
                    final pAuthor = p.author;
                    final pAuthorName = pAuthor.namaLengkap.isNotEmpty
                        ? pAuthor.namaLengkap
                        : 'Anggota';
                    final isDark = Theme.of(context).brightness == Brightness.dark;

                    return Container(
                      margin: const EdgeInsets.only(bottom: 10),
                      padding: const EdgeInsets.all(AppTheme.space12),
                      decoration: BoxDecoration(
                        color: isDark ? AppTheme.darkSurface : AppTheme.lightSurface,
                        borderRadius: BorderRadius.circular(12),
                        border: Border.all(
                          color: p.isSolution
                              ? AppTheme.success
                              : (isDark ? AppTheme.darkSurfaceVariant : AppTheme.lightSurfaceDim),
                          width: p.isSolution ? 1.5 : 0.8,
                        ),
                      ),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Row(
                            children: [
                              CircleAvatar(
                                radius: 14,
                                backgroundColor: AppTheme.primary,
                                child: Text(
                                  pAuthorName.isNotEmpty ? pAuthorName[0].toUpperCase() : 'A',
                                  style: const TextStyle(
                                    fontSize: 11,
                                    fontWeight: FontWeight.bold,
                                    color: Colors.white,
                                  ),
                                ),
                              ),
                              const SizedBox(width: AppTheme.space8),
                              Expanded(
                                child: Column(
                                  crossAxisAlignment: CrossAxisAlignment.start,
                                  children: [
                                    Row(
                                      children: [
                                        Flexible(
                                          child: Text(
                                            pAuthorName,
                                            maxLines: 1,
                                            overflow: TextOverflow.ellipsis,
                                            style: const TextStyle(
                                              fontSize: 12,
                                              fontWeight: FontWeight.bold,
                                            ),
                                          ),
                                        ),
                                        if (pAuthor.tingkat != null && pAuthor.tingkat!.isNotEmpty) ...[
                                          const SizedBox(width: 4),
                                          Container(
                                            padding: const EdgeInsets.symmetric(horizontal: 4, vertical: 1),
                                            decoration: BoxDecoration(
                                              color: AppTheme.primaryContainer,
                                              borderRadius: BorderRadius.circular(3),
                                            ),
                                            child: Text(
                                              pAuthor.tingkat!,
                                              style: const TextStyle(
                                                fontSize: 8,
                                                fontWeight: FontWeight.bold,
                                                color: AppTheme.onPrimaryContainer,
                                              ),
                                            ),
                                          ),
                                        ],
                                      ],
                                    ),
                                    Text(
                                      Formatters.relative(p.createdAt),
                                      style: const TextStyle(
                                        fontSize: 10,
                                        color: AppTheme.textMuted,
                                      ),
                                    ),
                                  ],
                                ),
                              ),
                              if (p.isSolution)
                                Container(
                                  padding: const EdgeInsets.symmetric(horizontal: 5, vertical: 2),
                                  decoration: BoxDecoration(
                                    color: AppTheme.successContainer,
                                    borderRadius: BorderRadius.circular(4),
                                  ),
                                  child: const Row(
                                    mainAxisSize: MainAxisSize.min,
                                    children: [
                                      Icon(Icons.check_circle, size: 10, color: AppTheme.onSuccessContainer),
                                      SizedBox(width: 2),
                                      Text(
                                        'SOLUSI',
                                        style: TextStyle(
                                          fontSize: 9,
                                          fontWeight: FontWeight.bold,
                                          color: AppTheme.onSuccessContainer,
                                        ),
                                      ),
                                    ],
                                  ),
                                ),
                              const SizedBox(width: 4),
                              Text(
                                '#${index + 1}',
                                style: const TextStyle(
                                  fontSize: 10,
                                  fontWeight: FontWeight.w600,
                                  color: AppTheme.textMuted,
                                ),
                              ),
                            ],
                          ),
                          const SizedBox(height: AppTheme.space8),
                          Text(
                            p.konten,
                            style: const TextStyle(fontSize: 13, height: 1.45),
                          ),
                          _buildImages(p.images, 72),
                          const SizedBox(height: AppTheme.space8),
                          ForumReactionBar(
                            compact: true,
                            reactions: p.reactions,
                            currentUserEmoji: p.currentUserEmoji,
                            onReact: (emoji) => _reactPost(p.id, emoji),
                          ),
                        ],
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

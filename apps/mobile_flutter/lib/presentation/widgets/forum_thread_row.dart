import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';

import '../../core/theme/app_theme.dart';
import '../../data/models/forum.dart';

/// Baris thread padat dengan gaya perpaduan Kaskus & iOsGods.
/// Menampilkan avatar penulis, badge sematan / HOT / kunci,
/// tingkat keanggotaan, jumlah post, statistik (balasan/views),
/// dan info balasan terakhir.
class ForumThreadRow extends StatelessWidget {
  final ForumThread thread;

  const ForumThreadRow({super.key, required this.thread});

  String _formatDate(String isoString) {
    if (isoString.isEmpty) return '';
    try {
      final date = DateTime.parse(isoString);
      final now = DateTime.now();
      final diff = now.difference(date);

      if (diff.inMinutes < 60) {
        return '${diff.inMinutes.clamp(1, 59)}m lalu';
      } else if (diff.inHours < 24) {
        return '${diff.inHours}j lalu';
      } else if (diff.inDays < 7) {
        return '${diff.inDays}h lalu';
      } else {
        return '${date.day.toString().padLeft(2, '0')}/${date.month.toString().padLeft(2, '0')}/${date.year}';
      }
    } catch (_) {
      return isoString;
    }
  }

  String _getInitials(String name) {
    final clean = name.trim();
    if (clean.isEmpty) return 'A';
    final parts = clean.split(' ').where((p) => p.isNotEmpty).toList();
    if (parts.length >= 2) {
      return '${parts[0][0]}${parts[1][0]}'.toUpperCase();
    }
    return clean.substring(0, clean.length >= 2 ? 2 : 1).toUpperCase();
  }

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final surfaceColor = isDark ? AppTheme.darkSurface : AppTheme.lightSurface;
    final textTheme = Theme.of(context).textTheme;

    final authorName = thread.author.namaLengkap.isNotEmpty
        ? thread.author.namaLengkap
        : 'Anggota';
    final tingkat = thread.author.tingkat;
    final postCount = thread.authorPostCount;

    return InkWell(
      onTap: () => context.push<void>('/forum/t/${thread.id}'),
      child: Container(
        padding: const EdgeInsets.symmetric(
          horizontal: AppTheme.space16,
          vertical: AppTheme.space12,
        ),
        decoration: BoxDecoration(
          color: surfaceColor,
          border: Border(
            bottom: BorderSide(
              color: isDark ? AppTheme.darkSurfaceVariant : AppTheme.lightSurfaceDim,
              width: 0.8,
            ),
          ),
        ),
        child: Row(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // ── Left: Author Avatar with initials gradient ──
            Container(
              width: 40,
              height: 40,
              decoration: BoxDecoration(
                shape: BoxShape.circle,
                gradient: const LinearGradient(
                  colors: [AppTheme.primary, AppTheme.primaryDark],
                  begin: Alignment.topLeft,
                  end: Alignment.bottomRight,
                ),
                boxShadow: [
                  BoxShadow(
                    color: Colors.black.withValues(alpha: 0.08),
                    blurRadius: 4,
                    offset: const Offset(0, 2),
                  ),
                ],
              ),
              alignment: Alignment.center,
              child: Text(
                _getInitials(authorName),
                style: const TextStyle(
                  color: Colors.white,
                  fontWeight: FontWeight.bold,
                  fontSize: 14,
                ),
              ),
            ),
            const SizedBox(width: AppTheme.space12),

            // ── Main Content Column ──
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  // Badges (Pin, Hot, Lock) + Title
                  Wrap(
                    crossAxisAlignment: WrapCrossAlignment.center,
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
                          child: const Row(
                            mainAxisSize: MainAxisSize.min,
                            children: [
                              Icon(Icons.push_pin, size: 10, color: AppTheme.onPrimaryContainer),
                              SizedBox(width: 2),
                              Text(
                                'SEMATAN',
                                style: TextStyle(
                                  fontSize: 9,
                                  fontWeight: FontWeight.bold,
                                  color: AppTheme.onPrimaryContainer,
                                ),
                              ),
                            ],
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
                          child: const Row(
                            mainAxisSize: MainAxisSize.min,
                            children: [
                              Icon(Icons.local_fire_department, size: 10, color: Colors.amber),
                              SizedBox(width: 2),
                              Text(
                                'HOT',
                                style: TextStyle(
                                  fontSize: 9,
                                  fontWeight: FontWeight.bold,
                                  color: Colors.amber,
                                ),
                              ),
                            ],
                          ),
                        ),
                      if (thread.isLocked)
                        Container(
                          padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                          decoration: BoxDecoration(
                            color: AppTheme.errorContainer,
                            borderRadius: BorderRadius.circular(4),
                          ),
                          child: const Row(
                            mainAxisSize: MainAxisSize.min,
                            children: [
                              Icon(Icons.lock, size: 10, color: AppTheme.onErrorContainer),
                              SizedBox(width: 2),
                              Text(
                                'KUNCI',
                                style: TextStyle(
                                  fontSize: 9,
                                  fontWeight: FontWeight.bold,
                                  color: AppTheme.onErrorContainer,
                                ),
                              ),
                            ],
                          ),
                        ),
                    ],
                  ),
                  const SizedBox(height: 3),

                  // Judul Thread
                  Text(
                    thread.judul,
                    maxLines: 2,
                    overflow: TextOverflow.ellipsis,
                    style: textTheme.titleSmall?.copyWith(
                      fontWeight: FontWeight.bold,
                      height: 1.25,
                    ),
                  ),

                  // Cuplikan Konten
                  if (thread.konten.isNotEmpty) ...[
                    const SizedBox(height: 2),
                    Text(
                      thread.konten,
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                      style: textTheme.bodySmall?.copyWith(
                        color: AppTheme.textMuted,
                        fontSize: 11,
                      ),
                    ),
                  ],

                  const SizedBox(height: 6),

                  // Author, Tingkat, Post Count & Date
                  Row(
                    children: [
                      Flexible(
                        child: Text(
                          authorName,
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                          style: const TextStyle(
                            fontSize: 11,
                            fontWeight: FontWeight.w600,
                          ),
                        ),
                      ),
                      if (tingkat != null && tingkat.isNotEmpty) ...[
                        const SizedBox(width: 4),
                        Container(
                          padding: const EdgeInsets.symmetric(horizontal: 4, vertical: 1),
                          decoration: BoxDecoration(
                            color: AppTheme.primaryContainer.withValues(alpha: 0.7),
                            borderRadius: BorderRadius.circular(3),
                          ),
                          child: Text(
                            tingkat,
                            style: const TextStyle(
                              fontSize: 9,
                              fontWeight: FontWeight.bold,
                              color: AppTheme.onPrimaryContainer,
                            ),
                          ),
                        ),
                      ],
                      if (postCount > 0) ...[
                        const SizedBox(width: 4),
                        Container(
                          padding: const EdgeInsets.symmetric(horizontal: 4, vertical: 1),
                          decoration: BoxDecoration(
                            color: isDark ? AppTheme.darkSurfaceVariant : AppTheme.lightSurfaceDim,
                            borderRadius: BorderRadius.circular(3),
                          ),
                          child: Text(
                            '$postCount post',
                            style: const TextStyle(
                              fontSize: 9,
                              fontWeight: FontWeight.w500,
                              color: AppTheme.textMuted,
                            ),
                          ),
                        ),
                      ],
                      const SizedBox(width: 4),
                      Text(
                        '• ${_formatDate(thread.createdAt)}',
                        style: const TextStyle(fontSize: 10, color: AppTheme.textMuted),
                      ),
                    ],
                  ),

                  const SizedBox(height: 4),

                  // Footer: Balasan / Views / Terakhir dibalas
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Row(
                        children: [
                          const Icon(Icons.chat_bubble_outline, size: 12, color: AppTheme.primary),
                          const SizedBox(width: 3),
                          Text(
                            '${thread.postCount}',
                            style: const TextStyle(
                              fontSize: 11,
                              fontWeight: FontWeight.w600,
                              color: AppTheme.primary,
                            ),
                          ),
                          const SizedBox(width: 8),
                          const Icon(Icons.visibility_outlined, size: 12, color: AppTheme.textMuted),
                          const SizedBox(width: 3),
                          Text(
                            '${thread.viewCount}',
                            style: const TextStyle(fontSize: 11, color: AppTheme.textMuted),
                          ),
                        ],
                      ),
                      if (thread.lastPost != null)
                        Flexible(
                          child: Text(
                            'Balasan: ${thread.lastPost!.authorName} (${_formatDate(thread.lastPost!.createdAt)})',
                            maxLines: 1,
                            overflow: TextOverflow.ellipsis,
                            style: const TextStyle(
                              fontSize: 10,
                              fontStyle: FontStyle.italic,
                              color: AppTheme.textMuted,
                            ),
                          ),
                        ),
                    ],
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }
}

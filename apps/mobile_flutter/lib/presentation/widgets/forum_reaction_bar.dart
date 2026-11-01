import 'package:flutter/material.dart';

import '../../core/theme/app_theme.dart';

/// Daftar emoji reaksi yang diterima server (samakan dengan backend).
const List<String> kForumReactionEmojis = [
  '👍',
  '❤️',
  '🟢',
  '😂',
  '😮',
  '😢',
  '🙏',
  '🔥',
  '💡',
  '🎉',
  '👎',
];

/// Bar reaksi emoji untuk thread/post forum.
/// Chip reaksi yang sudah ada + tombol buka picker. Tap chip = toggle
/// (emoji yang sama dihapus, sesuai perilaku server).
class ForumReactionBar extends StatefulWidget {
  final Map<String, int> reactions;
  final String? currentUserEmoji;
  final ValueChanged<String> onReact;
  final bool compact;

  const ForumReactionBar({
    super.key,
    required this.reactions,
    required this.currentUserEmoji,
    required this.onReact,
    this.compact = false,
  });

  @override
  State<ForumReactionBar> createState() => _ForumReactionBarState();
}

class _ForumReactionBarState extends State<ForumReactionBar> {
  bool _pickerOpen = false;

  @override
  Widget build(BuildContext context) {
    final entries = widget.reactions.entries
        .where((e) => e.value > 0)
        .toList(growable: false);
    final chipFont = widget.compact ? 11.0 : 12.0;
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Wrap(
          spacing: 6,
          runSpacing: 4,
          crossAxisAlignment: WrapCrossAlignment.center,
          children: [
            for (final e in entries)
              ActionChip(
                label: Text(
                  '${e.key} ${e.value}',
                  style: TextStyle(fontSize: chipFont),
                ),
                backgroundColor: widget.currentUserEmoji == e.key
                    ? AppTheme.primary.withValues(alpha: 0.12)
                    : null,
                side: widget.currentUserEmoji == e.key
                    ? BorderSide(color: AppTheme.primary.withValues(alpha: 0.5))
                    : null,
                onPressed: () => widget.onReact(e.key),
              ),
            InkWell(
              borderRadius: BorderRadius.circular(16),
              onTap: () => setState(() => _pickerOpen = !_pickerOpen),
              child: Padding(
                padding: const EdgeInsets.all(4),
                child: Icon(
                  Icons.add_reaction_outlined,
                  size: widget.compact ? 16 : 18,
                  color: Theme.of(context).colorScheme.onSurfaceVariant,
                ),
              ),
            ),
          ],
        ),
        if (_pickerOpen)
          Container(
            margin: const EdgeInsets.only(top: 4),
            padding: const EdgeInsets.all(6),
            decoration: BoxDecoration(
              color: Theme.of(context).colorScheme.surfaceContainerHigh,
              borderRadius: BorderRadius.circular(10),
              border: Border.all(
                color: Theme.of(context).colorScheme.outlineVariant,
              ),
            ),
            child: Wrap(
              spacing: 2,
              runSpacing: 2,
              children: [
                for (final emoji in kForumReactionEmojis)
                  InkWell(
                    borderRadius: BorderRadius.circular(8),
                    onTap: () {
                      setState(() => _pickerOpen = false);
                      widget.onReact(emoji);
                    },
                    child: Padding(
                      padding: const EdgeInsets.all(6),
                      child: Text(
                        emoji,
                        style: TextStyle(
                          fontSize: widget.compact ? 18 : 20,
                          color: widget.currentUserEmoji == emoji
                              ? AppTheme.primary
                              : null,
                        ),
                      ),
                    ),
                  ),
              ],
            ),
          ),
      ],
    );
  }
}

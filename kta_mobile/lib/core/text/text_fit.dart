import 'dart:math' as math;
import 'package:flutter/foundation.dart';
import 'package:flutter/material.dart';

class FittedText {
  final String text;
  final double size;
  final bool overflow;

  const FittedText({
    required this.text,
    required this.size,
    required this.overflow,
  });

  @override
  bool operator ==(Object other) =>
      identical(this, other) ||
      other is FittedText &&
          runtimeType == other.runtimeType &&
          text == other.text &&
          size == other.size &&
          overflow == other.overflow;

  @override
  int get hashCode => Object.hash(text, size, overflow);

  @override
  String toString() => 'FittedText(text: $text, size: $size, overflow: $overflow)';
}

class WrappedText {
  final List<String> lines;
  final double size;
  final bool overflow;

  const WrappedText({
    required this.lines,
    required this.size,
    required this.overflow,
  });

  @override
  bool operator ==(Object other) =>
      identical(this, other) ||
      other is WrappedText &&
          runtimeType == other.runtimeType &&
          listEquals(lines, other.lines) &&
          size == other.size &&
          overflow == other.overflow;

  @override
  int get hashCode => Object.hash(Object.hashAll(lines), size, overflow);

  @override
  String toString() => 'WrappedText(lines: $lines, size: $size, overflow: $overflow)';
}

TextPainter _createPainter(
  String text,
  double size,
  bool bold, {
  String fontFamily = 'KTADejaVu',
}) {
  return TextPainter(
    text: TextSpan(
      text: text,
      style: TextStyle(
        fontFamily: fontFamily,
        fontSize: size,
        fontWeight: bold ? FontWeight.w700 : FontWeight.w400,
      ),
    ),
    textDirection: TextDirection.ltr,
  )..layout();
}

FittedText fitSingle(
  String text,
  double maxWidth,
  double baseSize,
  double minSize,
  bool bold, {
  String fontFamily = 'KTADejaVu',
}) {
  final upper = text.trim().toUpperCase();
  double size = baseSize;

  while (size > minSize &&
      _createPainter(upper, size, bold, fontFamily: fontFamily).width > maxWidth) {
    size = math.max(minSize, size - 0.25);
  }

  final overflow =
      _createPainter(upper, size, bold, fontFamily: fontFamily).width > maxWidth;

  return FittedText(text: upper, size: size, overflow: overflow);
}

WrappedText wrap(
  String text,
  double maxWidth,
  int maxLines,
  double baseSize,
  double minSize,
  bool bold, {
  String fontFamily = 'KTADejaVu',
}) {
  final upper = text.trim().toUpperCase();
  final words = upper
      .split(RegExp(r'\s+'))
      .where((w) => w.isNotEmpty)
      .toList();

  for (double size = baseSize; size >= minSize - 0.01; size -= 0.25) {
    final lines = <String>[];
    String line = '';

    for (final word in words) {
      final chunks = <String>[];
      String chunk = '';
      for (final char in word.split('')) {
        if (chunk.isNotEmpty &&
            _createPainter(chunk + char, size, bold, fontFamily: fontFamily).width > maxWidth) {
          chunks.add(chunk);
          chunk = char;
        } else {
          chunk += char;
        }
      }
      if (chunk.isNotEmpty) chunks.add(chunk);

      for (final part in chunks) {
        final candidate = line.isEmpty ? part : '$line $part';
        if (line.isNotEmpty &&
            _createPainter(candidate, size, bold, fontFamily: fontFamily).width > maxWidth) {
          lines.add(line);
          line = part;
        } else {
          line = candidate;
        }
      }
    }
    if (line.isNotEmpty) lines.add(line);

    if (lines.length <= maxLines &&
        lines.every((l) => _createPainter(l, size, bold, fontFamily: fontFamily).width <= maxWidth)) {
      return WrappedText(lines: lines, size: size, overflow: false);
    }
  }

  return WrappedText(lines: const [], size: minSize, overflow: true);
}

import 'dart:convert';
import 'dart:typed_data';
import 'package:cached_network_image/cached_network_image.dart';
import 'package:flutter/material.dart';

/// Avatar anggota berbentuk persegi membulat agar konsisten di seluruh
/// aplikasi. Mendukung `imageUrl` (termasuk `data:` base64 URI dan `http(s)` URL)
/// serta `image` (ImageProvider) langsung. Menampilkan inisial saat tidak ada foto.
class MemberAvatar extends StatelessWidget {
  final double size;
  final ImageProvider? image;
  final String? imageUrl;
  final String initials;
  final Widget? overlay;

  const MemberAvatar({
    super.key,
    required this.size,
    required this.initials,
    this.image,
    this.imageUrl,
    this.overlay,
  });

  Uint8List? _decodeDataUrl(String url) {
    try {
      final comma = url.indexOf(',');
      if (comma == -1) return null;
      return base64Decode(url.substring(comma + 1));
    } catch (_) {
      return null;
    }
  }

  Widget _buildImageWidget(Widget fallback) {
    if (image != null) {
      return Image(
        image: image!,
        fit: BoxFit.cover,
        errorBuilder: (_, __, ___) => fallback,
      );
    }

    final url = imageUrl?.trim() ?? '';
    if (url.isEmpty) return fallback;

    if (url.startsWith('data:')) {
      final bytes = _decodeDataUrl(url);
      if (bytes != null) {
        return Image.memory(
          bytes,
          fit: BoxFit.cover,
          gaplessPlayback: true,
          errorBuilder: (_, __, ___) => fallback,
        );
      }
      return fallback;
    }

    if (url.startsWith('http://') || url.startsWith('https://')) {
      return CachedNetworkImage(
        imageUrl: url,
        fit: BoxFit.cover,
        placeholder: (_, __) => fallback,
        errorWidget: (_, __, ___) => fallback,
      );
    }

    return fallback;
  }

  @override
  Widget build(BuildContext context) {
    final colorScheme = Theme.of(context).colorScheme;
    final fallback = Container(
      color: colorScheme.primary.withValues(alpha: 0.15),
      alignment: Alignment.center,
      child: Text(
        initials,
        style: TextStyle(
          fontSize: size * 0.32,
          fontWeight: FontWeight.w800,
          color: colorScheme.primary,
        ),
      ),
    );

    return ClipRRect(
      borderRadius: BorderRadius.circular(16),
      child: SizedBox(
        width: size,
        height: size,
        child: Stack(
          fit: StackFit.expand,
          children: [
            _buildImageWidget(fallback),
            if (overlay != null) Positioned.fill(child: overlay!),
          ],
        ),
      ),
    );
  }
}

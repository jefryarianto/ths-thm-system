import 'package:flutter/material.dart';

/// Avatar anggota berbentuk persegi membulat agar konsisten di seluruh
/// aplikasi. Menampilkan inisial saat tidak ada foto.
class MemberAvatar extends StatelessWidget {
  final double size;
  final ImageProvider? image;
  final String initials;
  final Widget? overlay;

  const MemberAvatar({
    super.key,
    required this.size,
    required this.initials,
    this.image,
    this.overlay,
  });

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
            if (image == null)
              fallback
            else
              Image(
                image: image!,
                fit: BoxFit.cover,
                errorBuilder: (_, __, ___) => fallback,
              ),
            if (overlay != null) Positioned.fill(child: overlay!),
          ],
        ),
      ),
    );
  }
}

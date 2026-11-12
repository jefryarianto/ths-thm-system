import 'dart:io';

import 'package:flutter/material.dart';

/// Membungkus konten aplikasi dengan latar halaman pilihan pengguna.
/// Saat tidak ada latar, konten ditampilkan apa adanya (perilaku lama).
class AppBackgroundShell extends StatelessWidget {
  final String? imagePath;
  final bool isDark;
  final Widget child;

  const AppBackgroundShell({
    super.key,
    required this.imagePath,
    required this.isDark,
    required this.child,
  });

  @override
  Widget build(BuildContext context) {
    final path = imagePath;
    if (path == null) return child;

    return AppBackgroundLayer(
      isDark: isDark,
      background: Image.file(
        File(path),
        key: ValueKey(path),
        fit: BoxFit.cover,
        gaplessPlayback: true,
      ),
      child: child,
    );
  }
}

/// Lapisan latar + scrim + tema transparan. Dipisah dari [AppBackgroundShell]
/// agar dapat diuji tanpa memuat gambar dari disk.
class AppBackgroundLayer extends StatelessWidget {
  final Widget background;
  final bool isDark;
  final Widget child;

  const AppBackgroundLayer({
    super.key,
    required this.background,
    required this.isDark,
    required this.child,
  });

  @override
  Widget build(BuildContext context) {
    return Stack(
      fit: StackFit.expand,
      children: [
        background,
        ColoredBox(color: Colors.black.withValues(alpha: isDark ? 0.5 : 0.25)),
        Theme(
          data: Theme.of(context)
              .copyWith(scaffoldBackgroundColor: Colors.transparent),
          child: child,
        ),
      ],
    );
  }
}

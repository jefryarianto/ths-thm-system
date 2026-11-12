import 'dart:io';

import 'package:flutter/material.dart';

/// Membungkus konten aplikasi dengan latar halaman pilihan pengguna.
/// Saat tidak ada latar, konten ditampilkan apa adanya (perilaku lama).
class AppBackgroundShell extends StatefulWidget {
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
  State<AppBackgroundShell> createState() => _AppBackgroundShellState();
}

class _AppBackgroundShellState extends State<AppBackgroundShell> {
  bool _failed = false;

  @override
  void didUpdateWidget(covariant AppBackgroundShell oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (oldWidget.imagePath != widget.imagePath) _failed = false;
  }

  @override
  Widget build(BuildContext context) {
    final path = widget.imagePath;
    // File bisa dihapus OS/pembersih saat aplikasi berjalan: kembali ke
    // perilaku normal tanpa latar, bukan menampilkan scrim di atas halaman.
    if (path == null || _failed || !File(path).existsSync()) {
      return widget.child;
    }

    return AppBackgroundLayer(
      isDark: widget.isDark,
      background: Image.file(
        File(path),
        key: ValueKey(path),
        fit: BoxFit.cover,
        gaplessPlayback: true,
        errorBuilder: (_, __, ___) {
          WidgetsBinding.instance.addPostFrameCallback((_) {
            if (mounted && !_failed) setState(() => _failed = true);
          });
          return const SizedBox.shrink();
        },
      ),
      child: widget.child,
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

import 'package:flutter/material.dart';

/// Judul AppBar bergaya ikon + teks untuk header menu THS-THM.
///
/// Warna ikon mengikuti tema AppBar (`foregroundColor`), sehingga otomatis
/// gelap di atas latar emas. Contoh: `AppBarIconTitle(icon: Icons.school_outlined, title: 'Pendadaran')`.
class AppBarIconTitle extends StatelessWidget {
  final IconData icon;
  final String title;
  final double iconSize;

  const AppBarIconTitle({
    super.key,
    required this.icon,
    required this.title,
    this.iconSize = 20,
  });

  @override
  Widget build(BuildContext context) {
    return Row(
      mainAxisSize: MainAxisSize.min,
      children: [
        Icon(icon, size: iconSize),
        const SizedBox(width: 8),
        Text(title),
      ],
    );
  }
}
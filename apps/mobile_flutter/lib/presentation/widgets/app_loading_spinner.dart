import 'package:flutter/material.dart';

import '../../core/theme/app_theme.dart';

/// Loading indicator konsisten untuk seluruh aplikasi, meniru komponen web
/// `BreathableLogo` (https://ths-thm.cloud/login).
///
/// Konstruktor default menampilkan **logo THS-THM yang "bernapas"**: gambar
/// logo perlahan mengembang & menciut (scale 1 ↔ 1.12) dikelilingi halo lembut
/// yang menyala/redup mengikuti siklus yang sama — menggantikan dua cincin
/// berputar. `.small` tetap satu cincin sederhana (untuk tombol).
class AppLoadingSpinner extends StatelessWidget {
  final double size;
  final double strokeWidth;
  final Color? color;
  final String? message;
  final bool small;

  const AppLoadingSpinner({
    super.key,
    this.size = 80,
    this.strokeWidth = 4,
    this.color,
    this.message,
    this.small = false,
  });

  const AppLoadingSpinner.small({
    super.key,
    this.size = 20,
    this.strokeWidth = 2,
    this.color,
    this.message,
  }) : small = true;

  @override
  Widget build(BuildContext context) {
    if (small) {
      final spinner = SizedBox(
        width: size,
        height: size,
        child: CircularProgressIndicator(
          strokeWidth: strokeWidth,
          color: color ?? AppTheme.primary,
        ),
      );
      return message == null
          ? Center(child: spinner)
          : Center(child: _withMessage(context, spinner, message!));
    }

    return Center(
      child: _BreathableLogo(size: size, message: message),
    );
  }

  Widget _withMessage(BuildContext context, Widget spinner, String text) {
    final theme = Theme.of(context);
    return Column(
      mainAxisSize: MainAxisSize.min,
      children: [
        spinner,
        const SizedBox(height: 16),
        Text(
          text,
          style: TextStyle(
            fontSize: 13,
            color: theme.colorScheme.onSurfaceVariant,
          ),
        ),
      ],
    );
  }
}

/// Logo "breathable": gambar logo THS-THM mengembang & menciut seperti sedang
/// bernapas (3,2 detik per siklus, ease-in-out), dikelilingi halo lingkaran
/// lembut yang membesar & menyala saat logo menarik napas, lalu mengecil &
/// meredup saat membuang napas. Cerminan langsung keyframes CSS `breathe` /
/// `breathe-halo` di apps/web/app/globals.css.
class _BreathableLogo extends StatefulWidget {
  final double size;
  final String? message;

  const _BreathableLogo({
    required this.size,
    this.message,
  });

  @override
  State<_BreathableLogo> createState() => _BreathableLogoState();
}

class _BreathableLogoState extends State<_BreathableLogo>
    with TickerProviderStateMixin {
  late final AnimationController _breathe;

  @override
  void initState() {
    super.initState();
    // Satu siklus "napas" 3,2 detik bolak-balik (scale 1 ↔ 1.12).
    _breathe = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 3200),
    )..repeat(reverse: true);
  }

  @override
  void dispose() {
    _breathe.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    // Logo fill ~60% dari area agar ada ruang "bernafas" di dalam bingkai
    // (sama dengan logoSize = size * 0.6 di versi web).
    final logoSize = widget.size * 0.6;

    // Scale logo: 1 (membuang napas) ↔ 1.12 (menarik napas).
    final logoScale = Tween<double>(begin: 1.0, end: 1.12)
        .animate(CurvedAnimation(parent: _breathe, curve: Curves.easeInOut));
    // Opacity logo: 0.9 ↔ 1.0 — sedikit menyala saat mengembang.
    final logoOpacity = Tween<double>(begin: 0.9, end: 1.0)
        .animate(CurvedAnimation(parent: _breathe, curve: Curves.easeInOut));

    // Halo: scale 0.92 ↔ 1.08, opacity 0.35 ↔ 0.6 (bg-primary/10 → /25).
    final haloScale = Tween<double>(begin: 0.92, end: 1.08)
        .animate(CurvedAnimation(parent: _breathe, curve: Curves.easeInOut));
    final haloOpacity = Tween<double>(begin: 0.35, end: 0.6)
        .animate(CurvedAnimation(parent: _breathe, curve: Curves.easeInOut));

    final isDark = Theme.of(context).brightness == Brightness.dark;
    final haloColor = isDark ? AppTheme.primary : AppTheme.primary;

    final logo = SizedBox(
      width: widget.size,
      height: widget.size,
      child: Stack(
        alignment: Alignment.center,
        children: [
          // Halo: lingkaran lembut di belakang logo, mengembang saat logo
          // menarik napas.
          ScaleTransition(
            scale: haloScale,
            child: FadeTransition(
              opacity: haloOpacity,
              child: Container(
                width: widget.size,
                height: widget.size,
                decoration: BoxDecoration(
                  shape: BoxShape.circle,
                  color: haloColor.withValues(alpha: 0.10),
                ),
              ),
            ),
          ),
          // Bingkai tipis sebagai jangkar visual logo saat "bernapas".
          Container(
            width: widget.size,
            height: widget.size,
            decoration: BoxDecoration(
              shape: BoxShape.circle,
              border: Border.all(
                color: haloColor.withValues(alpha: 0.15),
                width: 1,
              ),
            ),
          ),
          // Logo yang "bernapas".
          ScaleTransition(
            scale: logoScale,
            child: FadeTransition(
              opacity: logoOpacity,
              child: Image.asset(
                'assets/images/logo.png',
                width: logoSize,
                height: logoSize,
                fit: BoxFit.contain,
              ),
            ),
          ),
        ],
      ),
    );

    if (widget.message == null) return logo;

    return Column(
      mainAxisSize: MainAxisSize.min,
      children: [
        logo,
        const SizedBox(height: 24),
        // Teks ikut "bernapas" bersama logo (sama seperti versi web).
        ScaleTransition(
          scale: logoScale,
          child: FadeTransition(
            opacity: logoOpacity,
            child: Text(
              widget.message!,
              textAlign: TextAlign.center,
              style: TextStyle(
                fontSize: 14,
                fontWeight: FontWeight.w500,
                color: isDark
                    ? AppTheme.onDarkPrimaryContainer
                    : AppTheme.navy,
              ),
            ),
          ),
        ),
      ],
    );
  }
}

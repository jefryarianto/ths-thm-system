import 'dart:math' show pi;

import 'package:flutter/material.dart';

import '../../core/theme/app_theme.dart';

/// Loading indicator konsisten untuk seluruh aplikasi, meniru komponen web
/// `LogoSpinner` (https://ths-thm.cloud/login).
///
/// Konstruktor default menampilkan **logo THS-THM dikelilingi dua busur
/// lingkaran berputar berlawanan arah**: busur primary berputar 1 detik searah
/// jarum jam, busur aksen 0,5 detik berlawanan arah — cerminan kelas CSS
/// `.logo-spinner` di apps/web/app/globals.css. `.small` tetap satu cincin
/// sederhana (untuk tombol).
class AppLoadingSpinner extends StatelessWidget {
  final double size;
  final double strokeWidth;
  final Color? color;
  final String? message;
  final bool small;

  const AppLoadingSpinner({
    super.key,
    this.size = 48,
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
      child: _LogoSpinner(size: size, message: message),
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

/// Logo dikelilingi dua busur berputar berlawanan arah. Busur primary
/// (searah jarum jam, 1 detik) berlawanan arah dengan busur aksen (0,5 detik),
/// sama seperti `.logo-spinner` / `::after` pada versi web.
class _LogoSpinner extends StatefulWidget {
  final double size;
  final String? message;

  const _LogoSpinner({
    required this.size,
    this.message,
  });

  @override
  State<_LogoSpinner> createState() => _LogoSpinnerState();
}

class _LogoSpinnerState extends State<_LogoSpinner>
    with TickerProviderStateMixin {
  late final AnimationController _primary;
  late final AnimationController _accent;

  @override
  void initState() {
    super.initState();
    _primary = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 1000),
    )..repeat();
    _accent = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 500),
    )..repeat(reverse: true);
  }

  @override
  void dispose() {
    _primary.dispose();
    _accent.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    // Tebal busur ~1/12 diameter (var(--spinner-ring) di versi web).
    final ringWidth = widget.size / 12;
    // Logo mengisi ~55% area di dalam ring.
    final logoSize = widget.size * 0.55;

    final isDark = Theme.of(context).brightness == Brightness.dark;
    const primaryColor = AppTheme.primary;
    // Aksen emas: `warningContainer` (terang) / `warning` (gelap) — warna
    // keemasan terdekat di palet untuk busur kedua.
    final accentColor =
        isDark ? AppTheme.warningContainer : AppTheme.warning;
    // 270° busur (border-top/border-left solid, sisi lain transparan).
    const sweep = pi / 2 + 0.35;

    final spinner = SizedBox(
      width: widget.size,
      height: widget.size,
      child: Stack(
        alignment: Alignment.center,
        children: [
          // Busur primary: 3/4 lingkaran searah jarum jam (border-top penuh,
          // border-right transparan di CSS).
          RotationTransition(
            turns: _primary,
            child: CustomPaint(
              size: Size(widget.size, widget.size),
              painter: _ArcPainter(
                color: primaryColor,
                strokeWidth: ringWidth,
                startAngle: -pi / 2, // atas
                sweepAngle: sweep, // ~270°
              ),
            ),
          ),
          // Busur aksen: ~270° berlawanan arah (border-left penuh).
          RotationTransition(
            turns: _accent,
            child: CustomPaint(
              size: Size(widget.size, widget.size),
              painter: _ArcPainter(
                color: accentColor,
                strokeWidth: ringWidth,
                startAngle: pi / 2, // bawah
                sweepAngle: sweep,
              ),
            ),
          ),
          Image.asset(
            'assets/images/logo.png',
            width: logoSize,
            height: logoSize,
            fit: BoxFit.contain,
          ),
        ],
      ),
    );

    if (widget.message == null) return spinner;

    return Column(
      mainAxisSize: MainAxisSize.min,
      children: [
        spinner,
        const SizedBox(height: 24),
        Text(
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
      ],
    );
  }
}

/// Menggambar satu busur melingkar (sama dengan border-top/border-left solid
/// + sisi lain transparan pada `.logo-spinner`).
class _ArcPainter extends CustomPainter {
  final Color color;
  final double strokeWidth;
  final double startAngle;
  final double sweepAngle;

  const _ArcPainter({
    required this.color,
    required this.strokeWidth,
    required this.startAngle,
    required this.sweepAngle,
  });

  @override
  void paint(Canvas canvas, Size size) {
    final radius = (size.width - strokeWidth) / 2;
    final rect = Rect.fromCircle(
      center: Offset(size.width / 2, size.height / 2),
      radius: radius,
    );
    final paint = Paint()
      ..color = color
      ..style = PaintingStyle.stroke
      ..strokeWidth = strokeWidth
      ..strokeCap = StrokeCap.round;
    canvas.drawArc(rect, startAngle, sweepAngle, false, paint);
  }

  @override
  bool shouldRepaint(_ArcPainter oldDelegate) =>
      color != oldDelegate.color ||
      strokeWidth != oldDelegate.strokeWidth ||
      startAngle != oldDelegate.startAngle ||
      sweepAngle != oldDelegate.sweepAngle;
}

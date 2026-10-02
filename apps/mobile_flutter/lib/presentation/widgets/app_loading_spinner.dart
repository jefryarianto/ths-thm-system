import 'dart:math' show pi;

import 'package:flutter/material.dart';

import '../../core/theme/app_theme.dart';

/// Loading indicator konsisten untuk seluruh aplikasi, meniru komponen web
/// `LogoSpinner` (https://ths-thm.cloud/login).
///
/// Konstruktor default menampilkan **logo THS-THM dikelilingi dua busur
/// lingkaran berputar berlawanan arah**: busur primary berputar 1 detik searah
/// jarum jam, busur aksen 0,5 detik berlawanan arah — cerminan kelas CSS
/// `.logo-spinner` di apps/web/app/globals.css. Konstruktor `.small`
/// menampilkan dua cincin yang sama tanpa logo (untuk tombol & ruang sempit).
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
    this.strokeWidth = 2.5,
    this.color,
    this.message,
  }) : small = true;

  @override
  Widget build(BuildContext context) {
    final accent = Theme.of(context).brightness == Brightness.dark
        ? AppTheme.gold300
        : AppTheme.gold400;
    final spinner = small
        ? _DualRings(
            size: size,
            ringWidth: strokeWidth,
            primaryColor: color ?? AppTheme.primary,
            accentColor: accent,
          )
        : _LogoSpinner(
            size: size,
            ringWidth: size / 12,
            accentColor: accent,
          );

    if (message == null) {
      return small ? spinner : Center(child: spinner);
    }

    return Center(child: _withMessage(context, spinner, message!));
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
  final double ringWidth;
  final Color accentColor;
  final String? message;

  const _LogoSpinner({
    required this.size,
    required this.ringWidth,
    required this.accentColor,
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
    final logoSize = widget.size * 0.55;
    final isDark = Theme.of(context).brightness == Brightness.dark;
    const primaryColor = AppTheme.primary;
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
                strokeWidth: widget.ringWidth,
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
                color: widget.accentColor,
                strokeWidth: widget.ringWidth,
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
            color: isDark ? AppTheme.onDarkPrimaryContainer : AppTheme.navy,
          ),
        ),
      ],
    );
  }
}

/// Dua cincin berputar berlawanan arah tanpa logo — varian `.small` untuk
/// tombol & ruang sempit, cerminan `SmallLogoSpinner` di web. Ringkas & tetap
/// konsisten dengan identitas loading THS-THM.
class _DualRings extends StatefulWidget {
  final double size;
  final double ringWidth;
  final Color primaryColor;
  final Color accentColor;

  const _DualRings({
    required this.size,
    required this.ringWidth,
    required this.primaryColor,
    required this.accentColor,
  });

  @override
  State<_DualRings> createState() => _DualRingsState();
}

class _DualRingsState extends State<_DualRings> with TickerProviderStateMixin {
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
    const sweep = pi / 2 + 0.35;
    return SizedBox(
      width: widget.size,
      height: widget.size,
      child: Stack(
        alignment: Alignment.center,
        children: [
          RotationTransition(
            turns: _primary,
            child: CustomPaint(
              size: Size(widget.size, widget.size),
              painter: _ArcPainter(
                color: widget.primaryColor,
                strokeWidth: widget.ringWidth,
                startAngle: -pi / 2,
                sweepAngle: sweep,
              ),
            ),
          ),
          RotationTransition(
            turns: _accent,
            child: CustomPaint(
              size: Size(widget.size, widget.size),
              painter: _ArcPainter(
                color: widget.accentColor,
                strokeWidth: widget.ringWidth,
                startAngle: pi / 2,
                sweepAngle: sweep,
              ),
            ),
          ),
        ],
      ),
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

import 'dart:math' as math;

import 'package:flutter/material.dart';

import '../../core/theme/app_theme.dart';

/// Loading spinner konsisten untuk seluruh aplikasi.
///
/// Konstruktor default menampilkan dua cincin gradien yang berputar berlawanan
/// arah (gradien navy di luar, gradien biru di dalam) + logo THS-THM di tengah.
/// `.small` tetap satu cincin (untuk tombol).
class AppLoadingSpinner extends StatelessWidget {
  final double size;
  final double strokeWidth;
  final Color? color;
  final String? message;
  final bool small;

  const AppLoadingSpinner({
    super.key,
    this.size = 160,
    this.strokeWidth = 15,
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

    final dual = _DualRingSpinner(size: size);
    if (message == null) return Center(child: dual);
    return Center(child: _withMessage(context, dual, message!));
  }

  Widget _withMessage(BuildContext context, Widget spinner, String text) {
    return Column(
      mainAxisSize: MainAxisSize.min,
      children: [
        spinner,
        const SizedBox(height: 16),
        Text(
          text,
          style: TextStyle(
            fontSize: 13,
            color: Colors.grey.shade600,
          ),
        ),
      ],
    );
  }
}

/// Dua cincin gradien berputar berlawanan arah + logo di tengah.
class _DualRingSpinner extends StatefulWidget {
  final double size;
  const _DualRingSpinner({required this.size});

  @override
  State<_DualRingSpinner> createState() => _DualRingSpinnerState();
}

class _DualRingSpinnerState extends State<_DualRingSpinner>
    with TickerProviderStateMixin {
  static const _goldLight = Color(0xFFFFE9A8);

  late final AnimationController _outer;
  late final AnimationController _inner;

  @override
  void initState() {
    super.initState();
    _outer = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 1200),
    )..repeat();
    // Berputar konstan berlawanan arah jarum jam (tanpa reverse agar tidak
    // bolak-balik) sehingga terlihat saling berlawanan dengan cincin luar.
    _inner = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 900),
    )..repeat();
  }

  @override
  void dispose() {
    _outer.dispose();
    _inner.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final size = widget.size;
    final innerSize = size * 0.58;
    final innerPad = (size - innerSize) / 2;
    // Logo tengah diperbesar proporsional (0.72×inner → 0.92×inner) dengan
    // bantalan putih lebih tipis agar logo THS-THM lebih menonjol.
    final logoSize = innerSize * 0.92;

    return SizedBox(
      width: size,
      height: size,
      child: Stack(
        alignment: Alignment.center,
        children: [
          Positioned.fill(
            child: RotationTransition(
              // Animasi luar: clockwise (0 → 1).
              turns: _outer,
              child: SizedBox.expand(
                child: CustomPaint(
                  painter: _GradientArcPainter(
                    gradientColors: const [
                      AppTheme.primaryDark,
                      AppTheme.primaryLight,
                      AppTheme.primaryDark,
                    ],
                    strokeWidth: size * 0.04,
                    startAngle: -math.pi / 2,
                    sweepAngle: 4.7,
                  ),
                ),
              ),
            ),
          ),
          Padding(
            padding: EdgeInsets.all(innerPad),
            child: RotationTransition(
              // Animasi dalam: counter-clockwise (1 → 0).
              turns: Tween<double>(begin: 1, end: 0).animate(_inner),
              child: SizedBox.expand(
                child: CustomPaint(
                  painter: _GradientArcPainter(
                    gradientColors: const [
                      AppTheme.primaryLight,
                      _goldLight,
                      AppTheme.primaryLight,
                    ],
                    strokeWidth: size * 0.03,
                    startAngle: math.pi / 2,
                    sweepAngle: 4.7,
                  ),
                ),
              ),
            ),
          ),
          ScaleTransition(
            scale: Tween<double>(begin: 0.9, end: 1.0).animate(_inner),
            child: Container(
              width: logoSize,
              height: logoSize,
              decoration: const BoxDecoration(
                shape: BoxShape.circle,
                color: Colors.white,
              ),
              padding: EdgeInsets.all(logoSize * 0.08),
              child: Image.asset(
                'assets/images/logo.png',
                fit: BoxFit.contain,
              ),
            ),
          ),
        ],
      ),
    );
  }
}

/// Painter satu cincin gradien (efek "komet"): transparan → warna → transparan.
///
/// Memakai `SweepGradient` agar satu arc panjang dengan warna yang memudar di
/// kedua ujungnya. Ujung transparan menghadap arah putaran sehingga cincin
/// tampak seperti bercahaya dan berputar berkelanjutan (tanpa garis lompatan).
class _GradientArcPainter extends CustomPainter {
  final List<Color> gradientColors;
  final double strokeWidth;
  final double startAngle;
  final double sweepAngle;

  const _GradientArcPainter({
    required this.gradientColors,
    required this.strokeWidth,
    this.startAngle = 0,
    this.sweepAngle = math.pi * 2,
  });

  @override
  void paint(Canvas canvas, Size size) {
    final rect = Offset.zero & size;
    final arcRect = rect.deflate(strokeWidth / 2);
    final gradient = SweepGradient(
      colors: gradientColors,
      startAngle: startAngle,
      endAngle: startAngle + sweepAngle,
    );
    final paint = Paint()
      ..shader = gradient.createShader(rect)
      ..style = PaintingStyle.stroke
      ..strokeWidth = strokeWidth
      ..strokeCap = StrokeCap.round;

    if (sweepAngle >= math.pi * 2) {
      canvas.drawCircle(arcRect.center, arcRect.longestSide / 2, paint);
      return;
    }
    canvas.drawArc(arcRect, startAngle, sweepAngle, false, paint);
  }

  @override
  bool shouldRepaint(covariant _GradientArcPainter oldDelegate) =>
      oldDelegate.gradientColors != gradientColors ||
      oldDelegate.strokeWidth != strokeWidth ||
      oldDelegate.startAngle != startAngle ||
      oldDelegate.sweepAngle != sweepAngle;
}
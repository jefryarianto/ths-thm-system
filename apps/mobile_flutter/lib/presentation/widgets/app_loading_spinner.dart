import 'dart:math' as math;

import 'package:flutter/material.dart';

import '../../core/theme/app_theme.dart';

/// Loading spinner konsisten untuk seluruh aplikasi, meniru spinner login web
/// (https://ths-thm.cloud/login).
///
/// Konstruktor default menampilkan dua cincin 90° berputar berlawanan arah
/// (cincin luar navy, cincin dalam biru) + logo THS-THM di tengah yang
/// berdenyut (opacity pulse) + teks opsional di bawahnya. `.small` tetap satu
/// cincin sederhana (untuk tombol).
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

    final dual = _DualRingSpinner(
      size: size,
      strokeWidth: strokeWidth,
      message: message,
    );
    return Center(child: dual);
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

/// Dua cincin bergaya spinner login web: busur 90° berputar berlawanan arah
/// (cincin luar navy #334E68→#627D98 searah jarum jam, cincin dalam biru
/// #3B82F6→#93C5FD berlawanan) + logo di tengah yang berdenyut. Tekstur
/// opacity pulse meniru Tailwind `animate-pulse` (2 detik bolak-balik).
class _DualRingSpinner extends StatefulWidget {
  final double size;
  final double strokeWidth;
  final String? message;

  const _DualRingSpinner({
    required this.size,
    required this.strokeWidth,
    this.message,
  });

  @override
  State<_DualRingSpinner> createState() => _DualRingSpinnerState();
}

class _DualRingSpinnerState extends State<_DualRingSpinner>
    with TickerProviderStateMixin {
  // Warna persis Tailwind di apps/web/app/login/page.tsx.
  static const _navyDark = Color(0xFF334E68); // tailwind navy-600
  static const _navyLight = Color(0xFF627D98); // tailwind navy-400
  static const _blueDark = Color(0xFF3B82F6); // tailwind blue-500
  static const _blueLight = Color(0xFF93C5FD); // tailwind blue-300
  static const _textColor = Color(0xFF243B53); // tailwind navy-700

  late final AnimationController _outer;
  late final AnimationController _inner;
  late final AnimationController _pulse;

  @override
  void initState() {
    super.initState();
    // Cincin luar: `animate-spin` (1 s, searah jarum jam).
    _outer = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 1000),
    )..repeat();
    // Cincin dalam: `animate-[spin_1.5s_linear_infinite_reverse]` (1,5 s,
    // berlawanan arah jarum jam) — pakai Tween 1 → 0 agar tidak bolak-balik.
    _inner = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 1500),
    )..repeat();
    // Denyut logo & teks: Tailwind `animate-pulse` = opacity 1 ↔ 0,5 tiap 2 s.
    _pulse = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 1000),
    )..repeat(reverse: true);
  }

  @override
  void dispose() {
    _outer.dispose();
    _inner.dispose();
    _pulse.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final size = widget.size;
    // Geometri web: cincin luar = full box, cincin dalam inset-2 (0,8×),
    // logo inset-4 (0,6×), stroke `border-4` (4 px).
    final innerSize = size * 0.8;
    final innerPad = (size - innerSize) / 2;
    final logoSize = size * 0.6;

    final rings = SizedBox(
      width: size,
      height: size,
      child: Stack(
        alignment: Alignment.center,
        children: [
          RotationTransition(
            // Cincin luar: clockwise (0 → 1), busur atas (kiri) → kanan.
            turns: _outer,
            child: SizedBox.expand(
              child: CustomPaint(
                painter: _SolidArcPainter(
                  colors: const [_navyDark, _navyLight],
                  strokeWidth: widget.strokeWidth,
                  startAngle: -math.pi / 2,
                  sweepAngle: math.pi / 2,
                ),
              ),
            ),
          ),
          Padding(
            padding: EdgeInsets.all(innerPad),
            child: RotationTransition(
              // Cincin dalam: counter-clockwise (1 → 0), busur bawah → kiri.
              turns: Tween<double>(begin: 1, end: 0).animate(_inner),
              child: SizedBox.expand(
                child: CustomPaint(
                  painter: _SolidArcPainter(
                    colors: const [_blueDark, _blueLight],
                    strokeWidth: widget.strokeWidth,
                    startAngle: math.pi / 2,
                    sweepAngle: math.pi / 2,
                  ),
                ),
              ),
            ),
          ),
          FadeTransition(
            opacity: _pulse,
            child: Image.asset(
              'assets/images/logo.png',
              width: logoSize,
              height: logoSize,
              fit: BoxFit.contain,
            ),
          ),
        ],
      ),
    );

    if (widget.message == null) return rings;

    final message = Column(
      mainAxisSize: MainAxisSize.min,
      children: [
        rings,
        const SizedBox(height: 24),
        FadeTransition(
          opacity: _pulse,
          child: Text(
            widget.message!,
            style: TextStyle(
              fontSize: 14,
              fontWeight: FontWeight.w500,
              color: Theme.of(context).brightness == Brightness.dark
                  ? _blueLight // dark:text-blue-300
                  : _textColor,
            ),
          ),
        ),
      ],
    );
    return message;
  }
}

/// Satu busur 90° solid dengan warna yang bergeser halus (gradasi radius)
/// meniru dua sisi border yang saling bertemu di sudut pada web.
class _SolidArcPainter extends CustomPainter {
  final List<Color> colors;
  final double strokeWidth;
  final double startAngle;
  final double sweepAngle;

  const _SolidArcPainter({
    required this.colors,
    required this.strokeWidth,
    this.startAngle = 0,
    this.sweepAngle = math.pi / 2,
  });

  @override
  void paint(Canvas canvas, Size size) {
    final rect = Offset.zero & size;
    final arcRect = rect.deflate(strokeWidth / 2);
    final gradient = SweepGradient(
      colors: colors,
      startAngle: startAngle,
      endAngle: startAngle + sweepAngle,
    );
    final paint = Paint()
      ..shader = gradient.createShader(rect)
      ..style = PaintingStyle.stroke
      ..strokeWidth = strokeWidth
      ..strokeCap = StrokeCap.butt;

    canvas.drawArc(arcRect, startAngle, sweepAngle, false, paint);
  }

  @override
  bool shouldRepaint(covariant _SolidArcPainter oldDelegate) =>
      oldDelegate.colors != colors ||
      oldDelegate.strokeWidth != strokeWidth ||
      oldDelegate.startAngle != startAngle ||
      oldDelegate.sweepAngle != sweepAngle;
}

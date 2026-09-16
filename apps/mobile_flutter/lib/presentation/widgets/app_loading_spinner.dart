import 'dart:math' as math;

import 'package:flutter/material.dart';

import '../../core/theme/app_theme.dart';

/// Loading spinner konsisten untuk seluruh aplikasi.
///
/// Konstruktor default menampilkan dua cincin gradien yang berputar berlawanan
/// arah (gradien hitam di luar, gradien biru di dalam) + logo THS-THM di tengah.
/// Jarak antar-cincin dibuat sama dengan jarak cincin-dalam—logo (spacing
/// seragam). `.small` tetap satu cincin (untuk tombol).
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

  /// Proporsi geometri dual-ring (dalam satuan pecahan ukuran, 0..1):
  /// `[strokeLuar, strokeDalam, celahLuarKeDalam, celahDalamKeLogo]`.
  ///
  /// Dr/diupayakan **sama persis** antara celah antar-cincin dengan celah
  /// cincin-dalam → logo (permintaan desain: jarak seragam). Dijamin lewat
  /// rumus konten pada `_DualRingSpinnerState.build`; test memakai helper ini
  /// agar perubahan masa depan tidak membuat jarak melenceng diam-diam.
  static List<double> debugSpacingFractions() {
    const wo = 0.05; // stroke cincin luar
    const wi = 0.0375; // stroke cincin dalam
    const g = 0.075; // celah seragam target
    const innerSize = 1 - 2 * (wo + g);
    const logoSize = innerSize - 2 * (wi + g);
    // Cincin luar digambar di kotak penuh → tepi-dalam berada di radius 0.5-wo.
    const ringGap = (0.5 - wo) - innerSize / 2;
    // Radius tepi-dalam cincin dalam = innerSize/2 - wi; logo radius = logoSize/2.
    const logoGap = innerSize / 2 - wi - logoSize / 2;
    return [wo, wi, ringGap, logoGap];
  }

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
  /// Gradien ring sesuai permintaan desain:
  /// - ring **dalam**: gradien biru (biru rosario → biru muda).
  /// - ring **luar**: gradien hitam (abu sangat gelap → hitam pekat).
  /// Ujung gradien sama warna dengan ujung lain (efek "komet") sehingga
  /// putaran terlihat mulus tanpa lompatan.
  static const _blueDeep = AppTheme.info; // 0xFF2B5AA6
  static const _blueLight = Color(0xFF7FB3F7);
  static const _blackMid = Color(0xFF414141);
  static const _blackCore = Color(0xFF000000);

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
    // Geometri jarak seragam (lihat AppLoadingSpinner.debugSpacingFractions):
    //   wo = 0.05×size (stroke luar), wi = 0.0375×size (stroke dalam),
    //   g = 0.075×size (celah seragam).
    //   innerSize = size − 2(wo+g) ; logoSize = innerSize − 2(wi+g).
    // Cek: celah luar→dalam = (size/2 − wo) − innerSize/2 = g dan
    //      celah dalam→logo = innerSize/2 − wi − logoSize/2 = g — sama persis.
    const woFrac = 0.05;
    const wiFrac = 0.0375;
    const gapFrac = 0.075;
    final wo = size * woFrac;
    final wi = size * wiFrac;
    final innerSize = size * (1 - 2 * (woFrac + gapFrac));
    final innerPad = (size - innerSize) / 2;
    final logoSize = innerSize - 2 * (wi + size * gapFrac);

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
                      _blackMid,
                      _blackCore,
                      _blackMid,
                    ],
                    strokeWidth: wo,
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
                      _blueDeep,
                      _blueLight,
                      _blueDeep,
                    ],
                    strokeWidth: wi,
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
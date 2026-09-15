import 'package:flutter/material.dart';

import '../../core/theme/app_theme.dart';

/// Loading spinner konsisten untuk seluruh aplikasi.
///
/// Konstruktor default meniru animasi login web: dua cincin berlawanan arah
/// (navy di luar, biru di dalam) + logo THS-THM di tengah.
/// `.small` tetap satu cincin (untuk tombol).
class AppLoadingSpinner extends StatelessWidget {
  final double size;
  final double strokeWidth;
  final Color? color;
  final String? message;
  final bool small;

  const AppLoadingSpinner({
    super.key,
    this.size = 32,
    this.strokeWidth = 3,
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

/// Dua cincin berputar berlawanan arah + logo di tengah — ala login web.
class _DualRingSpinner extends StatefulWidget {
  final double size;
  const _DualRingSpinner({required this.size});

  @override
  State<_DualRingSpinner> createState() => _DualRingSpinnerState();
}

class _DualRingSpinnerState extends State<_DualRingSpinner>
    with TickerProviderStateMixin {
  static const _navy = Color(0xFF334E68);
  static const _blue = Color(0xFF3B82F6);

  late final AnimationController _outer;
  late final AnimationController _inner;

  @override
  void initState() {
    super.initState();
    _outer = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 1200),
    )..repeat();
    _inner = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 900),
    )..repeat(reverse: true);
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
    final logoSize = innerSize * 0.62;

    return SizedBox(
      width: size,
      height: size,
      child: Stack(
        alignment: Alignment.center,
        children: [
          Positioned.fill(
            child: RotationTransition(
              turns: _outer,
              child: const CircularProgressIndicator(
                strokeWidth: 3,
                color: _navy,
              ),
            ),
          ),
          Padding(
            padding: EdgeInsets.all(innerPad),
            child: RotationTransition(
              turns: _inner,
              child: const SizedBox.expand(
                child: CircularProgressIndicator(
                  strokeWidth: 2.5,
                  color: _blue,
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
              padding: EdgeInsets.all(logoSize * 0.16),
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
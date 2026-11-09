import 'dart:ui' as ui;
import 'package:flutter/material.dart';
import 'package:qr_flutter/qr_flutter.dart';
import '../../../../core/design/colors.dart';

class KtaQrCode extends StatelessWidget {
  final String data;
  final ui.Image? logoImage;
  final double size;

  const KtaQrCode({
    required this.data,
    this.logoImage,
    this.size = 185.0,
    super.key,
  });

  KtaQrPainter createPainter() => KtaQrPainter(
        data: data,
        logoImage: logoImage,
        size: size,
      );

  @override
  Widget build(BuildContext context) {
    return CustomPaint(
      size: Size(size, size),
      painter: createPainter(),
    );
  }
}

class KtaQrPainter extends CustomPainter {
  final String data;
  final ui.Image? logoImage;
  final double size;

  KtaQrPainter({
    required this.data,
    this.logoImage,
    required this.size,
  });

  @override
  void paint(Canvas canvas, Size canvasSize) {
    final effectiveSize = size > 0 ? size : canvasSize.width;
    if (effectiveSize <= 0) return;

    final qrData = data.isEmpty ? ' ' : data;
    final qrCode = QrCode.fromData(
      data: qrData,
      errorCorrectLevel: QrErrorCorrectLevel.H,
    );
    final qrImage = QrImage(qrCode);
    final n = qrImage.moduleCount;
    const quietZone = 4;
    final full = n + quietZone * 2;
    final moduleSize = effectiveSize / full;

    // White background
    canvas.drawRect(
      Rect.fromLTWH(0, 0, effectiveSize, effectiveSize),
      Paint()..color = Colors.white,
    );

    // Gradient paint for modules
    final gradient = const LinearGradient(
      begin: Alignment.topLeft,
      end: Alignment.bottomRight,
      colors: [KTAColors.deepNavy, KTAColors.brightBlue],
    ).createShader(Rect.fromLTWH(0, 0, effectiveSize, effectiveSize));

    final modulePaint = Paint()..shader = gradient;

    // Draw modules
    for (int row = 0; row < n; row++) {
      for (int col = 0; col < n; col++) {
        if (qrImage.isDark(row, col)) {
          final x = (col + quietZone) * moduleSize;
          final y = (row + quietZone) * moduleSize;
          canvas.drawRect(
            Rect.fromLTWH(x, y, moduleSize, moduleSize),
            modulePaint,
          );
        }
      }
    }

    // Center logo
    if (logoImage != null) {
      final logoWidth = (n * 0.08).ceil() * moduleSize;
      final cx = effectiveSize / 2;
      final cy = effectiveSize / 2;
      final r = logoWidth * 0.7;

      // White circle behind logo
      canvas.drawCircle(Offset(cx, cy), r, Paint()..color = Colors.white);

      // Logo image in a white circle mask
      canvas.save();
      final clipPath = Path()
        ..addOval(Rect.fromCircle(center: Offset(cx, cy), radius: r));
      canvas.clipPath(clipPath);

      final src = Rect.fromLTWH(
        0,
        0,
        logoImage!.width.toDouble(),
        logoImage!.height.toDouble(),
      );
      final dst = Rect.fromLTWH(
        cx - logoWidth / 2,
        cy - logoWidth / 2,
        logoWidth,
        logoWidth,
      );
      canvas.drawImageRect(
        logoImage!,
        src,
        dst,
        Paint()..filterQuality = FilterQuality.high,
      );
      canvas.restore();
    }
  }

  Future<ui.Image> toImage([double? targetSize]) async {
    final s = targetSize ?? size;
    final recorder = ui.PictureRecorder();
    final canvas = Canvas(recorder);
    paint(canvas, Size(s, s));
    final picture = recorder.endRecording();
    return picture.toImage(s.toInt(), s.toInt());
  }

  @override
  bool shouldRepaint(covariant KtaQrPainter oldDelegate) =>
      oldDelegate.data != data ||
      oldDelegate.logoImage != logoImage ||
      oldDelegate.size != size;
}

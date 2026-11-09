import 'dart:ui' as ui;
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:kta_mobile/features/kta/presentation/widgets/kta_qr_code.dart';

void main() {
  Future<ui.Image> createTestImage({int width = 20, int height = 20}) async {
    final recorder = ui.PictureRecorder();
    final canvas = Canvas(recorder);
    canvas.drawRect(
      Rect.fromLTWH(0, 0, width.toDouble(), height.toDouble()),
      Paint()..color = Colors.red,
    );
    final picture = recorder.endRecording();
    return picture.toImage(width, height);
  }

  group('KtaQrCode', () {
    testWidgets('renders CustomPaint without error when logoImage is null', (tester) async {
      await tester.pumpWidget(
        const MaterialApp(
          home: Scaffold(
            body: Center(
              child: KtaQrCode(
                data: 'https://example.com/verify/001',
                size: 185,
              ),
            ),
          ),
        ),
      );

      expect(find.byType(KtaQrCode), findsOneWidget);
      expect(find.byType(CustomPaint), findsWidgets);
    });

    testWidgets('renders CustomPaint with logoImage provided', (tester) async {
      final logo = await createTestImage(width: 40, height: 40);

      await tester.pumpWidget(
        MaterialApp(
          home: Scaffold(
            body: Center(
              child: KtaQrCode(
                data: 'https://example.com/verify/001',
                logoImage: logo,
                size: 185,
              ),
            ),
          ),
        ),
      );

      expect(find.byType(KtaQrCode), findsOneWidget);
    });

    test('paints on Canvas directly without error with and without logo', () async {
      final logo = await createTestImage(width: 40, height: 40);

      final qrWidgetWithoutLogo = const KtaQrCode(
        data: 'https://example.com/verify/001',
        size: 185,
      );
      final qrWidgetWithLogo = KtaQrCode(
        data: 'https://example.com/verify/001',
        logoImage: logo,
        size: 185,
      );

      final painterWithoutLogo = qrWidgetWithoutLogo.createPainter();
      final painterWithLogo = qrWidgetWithLogo.createPainter();

      final recorder = ui.PictureRecorder();
      final canvas = Canvas(recorder);
      final size = const Size(185, 185);

      expect(() => painterWithoutLogo.paint(canvas, size), returnsNormally);
      expect(() => painterWithLogo.paint(canvas, size), returnsNormally);

      final picture = recorder.endRecording();
      expect(picture, isNotNull);
    });

    test('handles empty data string gracefully', () {
      final painter = KtaQrPainter(data: '', size: 185);
      final recorder = ui.PictureRecorder();
      final canvas = Canvas(recorder);
      expect(() => painter.paint(canvas, const Size(185, 185)), returnsNormally);
    });

    test('handles zero or negative size gracefully', () {
      final painter = KtaQrPainter(data: 'https://example.com', size: 0);
      final recorder = ui.PictureRecorder();
      final canvas = Canvas(recorder);
      expect(() => painter.paint(canvas, Size.zero), returnsNormally);
    });

    test('generates ui.Image via toImage() successfully', () async {
      final logo = await createTestImage(width: 20, height: 20);
      final painter = KtaQrPainter(
        data: 'https://example.com/verify/001',
        logoImage: logo,
        size: 100,
      );

      final image = await painter.toImage(100);
      expect(image.width, 100);
      expect(image.height, 100);
    });

    test('shouldRepaint returns true when properties change', () async {
      final logo1 = await createTestImage(width: 10, height: 10);
      final logo2 = await createTestImage(width: 10, height: 10);

      final p1 = KtaQrPainter(data: 'data1', logoImage: logo1, size: 185);
      final p1Same = KtaQrPainter(data: 'data1', logoImage: logo1, size: 185);
      final p2Data = KtaQrPainter(data: 'data2', logoImage: logo1, size: 185);
      final p3Logo = KtaQrPainter(data: 'data1', logoImage: logo2, size: 185);
      final p4Size = KtaQrPainter(data: 'data1', logoImage: logo1, size: 200);

      expect(p1.shouldRepaint(p1Same), isFalse);
      expect(p1.shouldRepaint(p2Data), isTrue);
      expect(p1.shouldRepaint(p3Logo), isTrue);
      expect(p1.shouldRepaint(p4Size), isTrue);
    });
  });
}

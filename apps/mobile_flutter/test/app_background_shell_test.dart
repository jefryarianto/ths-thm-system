import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:mobile_flutter/presentation/widgets/app_background_shell.dart';

const _background = ColoredBox(color: Colors.red);

Widget _app({
  required String? imagePath,
  bool isDark = false,
  Widget background = _background,
}) =>
    MaterialApp(
      theme: ThemeData(brightness: isDark ? Brightness.dark : Brightness.light),
      home: imagePath == null
          ? AppBackgroundShell(
              imagePath: null,
              isDark: isDark,
              child: const Scaffold(body: Text('konten')),
            )
          : AppBackgroundLayer(
              background: background,
              isDark: isDark,
              child: const Scaffold(body: Text('konten')),
            ),
    );

void main() {
  testWidgets('tanpa gambar hanya menampilkan child', (tester) async {
    await tester.pumpWidget(_app(imagePath: null));

    expect(find.text('konten'), findsOneWidget);
    expect(find.byType(Image), findsNothing);
  });

  testWidgets('latar menampilkan background, scrim, dan scaffold transparan',
      (tester) async {
    await tester.pumpWidget(_app(imagePath: 'unused'));

    expect(find.byWidget(_background), findsOneWidget);
    expect(
      find.byWidgetPredicate(
        (w) => w is ColoredBox && w.color == Colors.black.withValues(alpha: 0.25),
      ),
      findsOneWidget,
    );
    expect(
      Theme.of(tester.element(find.text('konten'))).scaffoldBackgroundColor,
      Colors.transparent,
    );
  });

  testWidgets('scrim lebih gelap pada tema gelap', (tester) async {
    await tester.pumpWidget(_app(imagePath: 'unused', isDark: true));

    expect(
      find.byWidgetPredicate(
        (w) => w is ColoredBox && w.color == Colors.black.withValues(alpha: 0.5),
      ),
      findsOneWidget,
    );
  });
}

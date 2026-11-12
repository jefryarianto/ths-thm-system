import 'dart:ui' as ui;

import 'package:flutter/foundation.dart';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:mobile_flutter/presentation/widgets/member_avatar.dart';

class _TestImageProvider extends ImageProvider<_TestImageProvider> {
  _TestImageProvider(this._image);

  final ui.Image _image;

  @override
  Future<_TestImageProvider> obtainKey(ImageConfiguration configuration) =>
      SynchronousFuture<_TestImageProvider>(this);

  @override
  ImageStreamCompleter loadImage(
    _TestImageProvider key,
    ImageDecoderCallback decode,
  ) =>
      OneFrameImageStreamCompleter(
        SynchronousFuture<ImageInfo>(ImageInfo(image: _image)),
      );
}

void main() {
  TestWidgetsFlutterBinding.ensureInitialized();

  testWidgets('menampilkan inisial dengan sudut membulat radius 16',
      (tester) async {
    await tester.pumpWidget(const MaterialApp(
      home: Scaffold(body: MemberAvatar(size: 64, initials: 'AB')),
    ));

    expect(find.text('AB'), findsOneWidget);
    expect(find.byType(Image), findsNothing);
    final clip = tester.widget<ClipRRect>(find.byType(ClipRRect));
    expect(clip.borderRadius, BorderRadius.circular(16));
  });

  testWidgets('menampilkan image dengan BoxFit.cover', (tester) async {
    final image = (await tester.runAsync(
      () => createTestImage(width: 1, height: 1),
    ))!;
    addTearDown(image.dispose);
    await tester.pumpWidget(MaterialApp(
      home: Scaffold(
        body: MemberAvatar(
          size: 64,
          initials: 'AB',
          image: _TestImageProvider(image),
        ),
      ),
    ));
    await tester.pump();

    final widget = tester.widget<Image>(find.byType(Image));
    expect(widget.fit, BoxFit.cover);
  });

  testWidgets('menampilkan overlay di atas avatar', (tester) async {
    await tester.pumpWidget(const MaterialApp(
      home: Scaffold(
        body: MemberAvatar(
          size: 64,
          initials: 'AB',
          overlay: Text('overlay'),
        ),
      ),
    ));

    expect(find.text('overlay'), findsOneWidget);
  });
}

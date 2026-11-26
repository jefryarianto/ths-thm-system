import 'package:bloc_test/bloc_test.dart';
import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:mocktail/mocktail.dart';

import 'package:mobile_flutter/logic/claim/claim_bloc.dart';
import 'package:mobile_flutter/presentation/screens/claim_account_form_screen.dart';

class MockClaimBloc extends MockBloc<ClaimEvent, ClaimState>
    implements ClaimBloc {}

void main() {
  const story = 'Saya menjadi anggota sejak 2019 dan aktif hingga sekarang.';
  late MockClaimBloc claimBloc;

  Finder field(String label) {
    return find.descendant(
      of: find.byWidgetPredicate(
        (w) => w is InputDecorator && w.decoration.labelText == label,
      ),
      matching: find.byType(EditableText),
    );
  }

  void setLargeSurface(WidgetTester tester) {
    tester.view.physicalSize = const Size(1080, 2400);
    tester.view.devicePixelRatio = 1;
    addTearDown(tester.view.reset);
  }

  setUpAll(() {
    registerFallbackValue(const ClaimLoadRequested());
  });

  setUp(() {
    claimBloc = MockClaimBloc();
    when(() => claimBloc.state).thenReturn(const ClaimInitial());
  });

  Widget buildSubject() {
    return MaterialApp(
      home: BlocProvider<ClaimBloc>.value(
        value: claimBloc,
        child: const ClaimAccountFormScreen(),
      ),
    );
  }

  Future<void> fillRequiredIdentity(WidgetTester tester) async {
    await tester.enterText(field('Nama Lengkap *'), 'Nama Uji');
    await tester.enterText(field('Tempat Dadar *'), 'Bandung');
    await tester.enterText(field('Tahun Dadar *'), '2019');
    await tester.enterText(field('Email *'), 'uji@example.com');
  }

  testWidgets('metode pembuktian tampil dengan unggah sebagai default',
      (tester) async {
    setLargeSurface(tester);
    await tester.pumpWidget(buildSubject());

    expect(find.widgetWithText(RadioListTile<String>, 'Unggah bukti'),
        findsOneWidget);
    expect(find.widgetWithText(RadioListTile<String>, 'Ceritakan histori'),
        findsOneWidget);
    final group = tester.widget<RadioGroup<String>>(
      find.ancestor(
        of: find.widgetWithText(RadioListTile<String>, 'Unggah bukti'),
        matching: find.byType(RadioGroup<String>),
      ),
    );
    expect(group.groupValue, 'unggah');
  });

  testWidgets('submit mode cerita mengirim modeBukti dan ceritaHistori',
      (tester) async {
    setLargeSurface(tester);
    await tester.pumpWidget(buildSubject());
    await fillRequiredIdentity(tester);

    await tester
        .tap(find.widgetWithText(RadioListTile<String>, 'Ceritakan histori'));
    await tester.pump();
    await tester.enterText(
        field('Tulis riwayat keanggotaan Anda (20–1000 karakter)'), story);
    await tester.tap(find.text('Kirim Klaim'));
    await tester.pump();

    final captured =
        verify(() => claimBloc.add(captureAny<ClaimEvent>())).captured;
    final event = captured.single as ClaimCreateRequested;
    expect(event.modeBukti, 'cerita');
    expect(event.ceritaHistori, story);
  });

  testWidgets('submit unggah tanpa berkas diblokir lokal', (tester) async {
    setLargeSurface(tester);
    await tester.pumpWidget(buildSubject());
    await fillRequiredIdentity(tester);

    await tester.tap(find.text('Kirim Klaim'));
    await tester.pumpAndSettle();

    expect(find.text('Mode unggah memerlukan minimal satu berkas bukti'),
        findsOneWidget);
    verifyNever(() => claimBloc.add(any<ClaimEvent>()));
  });
}

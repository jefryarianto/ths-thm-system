import 'package:bloc_test/bloc_test.dart';
import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:mocktail/mocktail.dart';

import 'package:mobile_flutter/logic/claim/claim_bloc.dart';
import 'package:mobile_flutter/presentation/screens/claim_account_form_screen.dart';
import 'package:mobile_flutter/presentation/widgets/org_structure_fields.dart';

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

  Future<void> selectTanggalLahir(WidgetTester tester) async {
    await tester.tap(find.ancestor(
      of: find.text('Pilih'),
      matching: find.byType(InkWell),
    ));
    await tester.pumpAndSettle();
    await tester.tap(find.text('OK'));
    await tester.pumpAndSettle();
  }

  Future<void> selectRanting(WidgetTester tester) async {
    final org = tester.widget<OrgStructureFields>(
      find.byType(OrgStructureFields),
    );
    org.onRantingChanged('ranting-1');
    await tester.pump();
  }

  Future<void> fillRequiredIdentity(WidgetTester tester) async {
    await tester.enterText(field('Nama Lengkap *'), 'Nama Uji');
    await tester.enterText(field('Tempat Lahir *'), 'Bandung');
    await selectTanggalLahir(tester);
    await tester.enterText(field('Tempat Pendadaran (Dadar) *'), 'Bandung');
    await tester.enterText(field('Tahun Pendadaran (Dadar) *'), '2019');
    await tester.enterText(field('Email *'), 'uji@example.com');
    await tester.enterText(field('Alamat *'), 'Jl. Uji No. 1');
    await selectRanting(tester);
  }

  Future<void> fillParityFields(WidgetTester tester) async {
    await tester.enterText(field('Pekerjaan'), 'Guru');
    await tester.enterText(field('Pelantikan'), '12 JULI 2020');
    await tester.enterText(field('Catatan'), 'Catatan uji');
  }

  testWidgets('metode pembuktian tampil dengan unggah sebagai default',
      (tester) async {
    setLargeSurface(tester);
    await tester.pumpWidget(buildSubject());

    expect(find.text('Unggah bukti'), findsOneWidget);
    expect(find.text('Ceritakan histori'), findsOneWidget);
    final group = tester.widget<RadioGroup<String>>(
      find.ancestor(
        of: find.text('Unggah bukti'),
        matching: find.byType(RadioGroup<String>),
      ),
    );
    expect(group.groupValue, 'unggah');
    expect(find.byType(RadioListTile<String>), findsNothing);
  });

  testWidgets('submit mode cerita mengirim modeBukti dan ceritaHistori',
      (tester) async {
    setLargeSurface(tester);
    await tester.pumpWidget(buildSubject());
    await fillRequiredIdentity(tester);
    await fillParityFields(tester);

    await tester.tap(find.text('Ceritakan histori'));
    await tester.pump();
    expect(find.widgetWithText(InputDecorator, 'Cerita Histori Keanggotaan *'),
        findsOneWidget);
    await tester.enterText(field('Cerita Histori Keanggotaan *'), story);
    await tester.tap(find.text('Kirim Klaim'));
    await tester.pump();

    final captured =
        verify(() => claimBloc.add(captureAny<ClaimEvent>())).captured;
    final event = captured.single as ClaimCreateRequested;
    expect(event.modeBukti, 'cerita');
    expect(event.ceritaHistori, story);
    expect(event.pekerjaan, 'Guru');
    expect(event.pelantikan, '12 JULI 2020');
    expect(event.catatan, 'Catatan uji');
  });

  testWidgets('submit unggah tanpa berkas diblokir lokal', (tester) async {
    setLargeSurface(tester);
    await tester.pumpWidget(buildSubject());
    await fillRequiredIdentity(tester);

    await tester.tap(find.text('Kirim Klaim'));
    await tester.pumpAndSettle();

    expect(find.text('Unggah minimal satu berkas bukti'), findsOneWidget);
    verifyNever(() => claimBloc.add(any<ClaimEvent>()));
  });
}

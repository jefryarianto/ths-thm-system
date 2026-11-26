import 'dart:io';

import 'package:bloc_test/bloc_test.dart';
import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:mobile_flutter/core/utils/kta_layout.dart';
import 'package:mobile_flutter/data/models/kta_application.dart';
import 'package:mobile_flutter/logic/kta_application/kta_application_bloc.dart';
import 'package:mobile_flutter/logic/member/member_bloc.dart';
import 'package:mobile_flutter/presentation/screens/kta_screen.dart';
import 'package:mobile_flutter/presentation/widgets/kta_card_widget.dart';
import 'package:mocktail/mocktail.dart';

import 'helpers/kta_apply_fixtures.dart';

class MockKtaApplicationBloc
    extends MockBloc<KtaApplicationEvent, KtaApplicationState>
    implements KtaApplicationBloc {}

class MockMemberBloc extends MockBloc<MemberEvent, MemberState>
    implements MemberBloc {}

void main() {
  setUpAll(() async {
    await KtaLayoutCalculator.ensureFonts();
  });

  Future<void> pumpKtaScreen(
    WidgetTester tester, {
    required KtaAppStatus status,
    bool generated = false,
    bool adminIssued = false,
  }) async {
    final memberBloc = MockMemberBloc();
    final ktaBloc = MockKtaApplicationBloc();
    final memberState = memberLoaded(
      generated: generated,
      adminIssued: adminIssued,
    );
    final ktaState = KtaApplicationLoaded(
      application: ktaApplication(status: status),
    );

    when(() => memberBloc.state).thenReturn(memberState);
    whenListen(memberBloc, Stream<MemberState>.value(memberState));
    when(() => ktaBloc.state).thenReturn(ktaState);
    whenListen(ktaBloc, Stream<KtaApplicationState>.value(ktaState));

    await tester.pumpWidget(
      MaterialApp(
        home: MultiBlocProvider(
          providers: [
            BlocProvider<MemberBloc>.value(value: memberBloc),
            BlocProvider<KtaApplicationBloc>.value(value: ktaBloc),
          ],
          child: const KtaScreen(),
        ),
      ),
    );
    await tester.pumpAndSettle();
  }

  testWidgets('Generate KTA tidak muncul sebelum status dapat diterbitkan',
      (tester) async {
    await pumpKtaScreen(tester, status: KtaAppStatus.paymentSetup);

    expect(find.text('Generate KTA'), findsNothing);
    expect(find.text('Menunggu penerbitan admin'), findsOneWidget);
  });

  testWidgets('Generate KTA tidak muncul walau status dapat diterbitkan',
      (tester) async {
    await pumpKtaScreen(tester, status: KtaAppStatus.paymentVerified);

    expect(find.text('Generate KTA'), findsNothing);
    expect(find.text('Menunggu penerbitan admin'), findsOneWidget);
  });

  testWidgets('kartu tidak tampil bila adminIssued=false', (tester) async {
    await pumpKtaScreen(
      tester,
      status: KtaAppStatus.cardGenerated,
      generated: true,
      adminIssued: false,
    );

    expect(find.byType(KtaFlipCard), findsNothing);
    expect(find.text('Menunggu penerbitan admin'), findsOneWidget);
  });

  testWidgets('kartu tampil bila generated dan adminIssued=true',
      (tester) async {
    await pumpKtaScreen(
      tester,
      status: KtaAppStatus.cardGenerated,
      generated: true,
      adminIssued: true,
    );

    expect(find.byType(KtaFlipCard), findsOneWidget);
    expect(find.text('Menunggu penerbitan admin'), findsNothing);
  });

  testWidgets('gagal memuat status KTA menampilkan error dengan retry',
      (tester) async {
    final memberBloc = MockMemberBloc();
    final ktaBloc = MockKtaApplicationBloc();
    final memberState = memberLoaded(generated: false);
    const ktaState = KtaApplicationError(message: 'Gagal memuat status KTA');

    when(() => memberBloc.state).thenReturn(memberState);
    whenListen(memberBloc, Stream<MemberState>.value(memberState));
    when(() => ktaBloc.state).thenReturn(ktaState);
    whenListen(ktaBloc, Stream<KtaApplicationState>.value(ktaState));

    await tester.pumpWidget(
      MaterialApp(
        home: MultiBlocProvider(
          providers: [
            BlocProvider<MemberBloc>.value(value: memberBloc),
            BlocProvider<KtaApplicationBloc>.value(value: ktaBloc),
          ],
          child: const KtaScreen(),
        ),
      ),
    );
    await tester.pumpAndSettle();

    expect(find.text('Gagal memuat status KTA'), findsOneWidget);
    expect(find.text('Coba Lagi'), findsOneWidget);
    expect(find.text('Menunggu penerbitan admin'), findsNothing);
  });

  testWidgets('error member menampilkan snackbar dan menjaga kartu',
      (tester) async {
    final memberBloc = MockMemberBloc();
    final ktaBloc = MockKtaApplicationBloc();
    final memberState = memberLoaded(generated: false);
    const errorMessage = 'KTA tidak dapat diterbitkan (status: PAYMENT_SETUP)';
    final ktaState = KtaApplicationLoaded(
      application: ktaApplication(status: KtaAppStatus.paymentSetup),
    );

    when(() => memberBloc.state).thenReturn(memberState);
    whenListen(
      memberBloc,
      Stream<MemberState>.fromIterable([
        memberState,
        const MemberError(message: errorMessage),
      ]),
    );
    when(() => ktaBloc.state).thenReturn(ktaState);
    whenListen(ktaBloc, Stream<KtaApplicationState>.value(ktaState));

    await tester.pumpWidget(
      MaterialApp(
        home: MultiBlocProvider(
          providers: [
            BlocProvider<MemberBloc>.value(value: memberBloc),
            BlocProvider<KtaApplicationBloc>.value(value: ktaBloc),
          ],
          child: const KtaScreen(),
        ),
      ),
    );
    await tester.pump();
    await tester.pump();

    expect(find.text(errorMessage), findsOneWidget);
    expect(find.text('Menunggu penerbitan admin'), findsOneWidget);
  });

  test('member mobile tidak memuat endpoint digital-card/generate', () {
    final source = File('lib/logic/member/member_bloc.dart').readAsStringSync();

    expect(source, isNot(contains('digital-card/generate')));
  });
}

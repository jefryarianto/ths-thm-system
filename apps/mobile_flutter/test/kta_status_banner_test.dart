import 'package:bloc_test/bloc_test.dart';
import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:go_router/go_router.dart';
import 'package:mobile_flutter/data/models/kta_application.dart';
import 'package:mobile_flutter/logic/kta_application/kta_application_bloc.dart';
import 'package:mobile_flutter/logic/member/member_bloc.dart';
import 'package:mobile_flutter/presentation/widgets/kta_status_banner.dart';
import 'package:mocktail/mocktail.dart';

import 'helpers/kta_apply_fixtures.dart';

class MockKtaApplicationBloc
    extends MockBloc<KtaApplicationEvent, KtaApplicationState>
    implements KtaApplicationBloc {}

class MockMemberBloc extends MockBloc<MemberEvent, MemberState>
    implements MemberBloc {}

void main() {
  ({Widget widget, GoRouter router}) buildSubject({
    required KtaApplicationState ktaState,
    required MemberState memberState,
  }) {
    final ktaBloc = MockKtaApplicationBloc();
    final memberBloc = MockMemberBloc();

    when(() => ktaBloc.state).thenReturn(ktaState);
    whenListen(ktaBloc, Stream<KtaApplicationState>.value(ktaState));
    when(() => memberBloc.state).thenReturn(memberState);
    whenListen(memberBloc, Stream<MemberState>.value(memberState));

    final router = GoRouter(
      initialLocation: '/',
      routes: [
        GoRoute(
          path: '/',
          builder: (context, state) => MultiBlocProvider(
            providers: [
              BlocProvider<KtaApplicationBloc>.value(value: ktaBloc),
              BlocProvider<MemberBloc>.value(value: memberBloc),
            ],
            child: const KtaStatusBanner(),
          ),
        ),
        GoRoute(
          path: '/kta/apply',
          builder: (context, state) => const Text('apply-page'),
        ),
        GoRoute(
          path: '/kta/status',
          builder: (context, state) => const Text('status-page'),
        ),
      ],
    );

    return (
      widget: MaterialApp.router(routerConfig: router),
      router: router,
    );
  }

  Future<GoRouter> pumpBanner(
    WidgetTester tester, {
    required KtaApplicationState ktaState,
    required bool? generated,
  }) async {
    final subject = buildSubject(
      ktaState: ktaState,
      memberState: memberLoaded(generated: generated),
    );
    addTearDown(subject.router.dispose);
    await tester.pumpWidget(subject.widget);
    await tester.pumpAndSettle();
    return subject.router;
  }

  testWidgets('Ajukan KTA muncul dan membuka /kta/apply', (tester) async {
    final router = await pumpBanner(
      tester,
      ktaState: KtaApplicationInitial(),
      generated: false,
    );

    expect(find.text('Ajukan KTA'), findsOneWidget);
    await tester.tap(find.text('Ajukan KTA'));
    await tester.pumpAndSettle();

    expect(
      router.routerDelegate.currentConfiguration.last.matchedLocation,
      '/kta/apply',
    );
  });

  testWidgets('Lihat Status muncul dan membuka /kta/status', (tester) async {
    final router = await pumpBanner(
      tester,
      ktaState: KtaApplicationLoaded(application: ktaApplication()),
      generated: false,
    );

    expect(find.text('Ajukan KTA'), findsNothing);
    expect(find.text('Lihat Status'), findsOneWidget);
    await tester.tap(find.text('Lihat Status'));
    await tester.pumpAndSettle();

    expect(
      router.routerDelegate.currentConfiguration.last.matchedLocation,
      '/kta/status',
    );
  });

  testWidgets('pengajuan ditolak menawarkan Ajukan KTA', (tester) async {
    await pumpBanner(
      tester,
      ktaState: KtaApplicationLoaded(
        application: ktaApplication(status: KtaAppStatus.rejected),
      ),
      generated: false,
    );

    expect(find.text('Ajukan KTA'), findsOneWidget);
  });

  testWidgets('pengajuan disetujui menyembunyikan banner', (tester) async {
    await pumpBanner(
      tester,
      ktaState: KtaApplicationLoaded(
        application: ktaApplication(status: KtaAppStatus.approved),
      ),
      generated: false,
    );

    expect(find.text('Ajukan KTA'), findsNothing);
    expect(find.text('Lihat Status'), findsNothing);
    expect(find.text('Pengajuan KTA disetujui'), findsNothing);
  });

  testWidgets('kartu terbit menyembunyikan banner', (tester) async {
    await pumpBanner(
      tester,
      ktaState: KtaApplicationInitial(),
      generated: true,
    );

    expect(find.text('Ajukan KTA'), findsNothing);
    expect(find.text('Lihat Status'), findsNothing);
    expect(
      find.text('Anda belum memiliki KTA, silahkan melakukan pengajuan'),
      findsNothing,
    );
  });

  testWidgets('data kartu belum tersedia menyembunyikan banner', (tester) async {
    await pumpBanner(
      tester,
      ktaState: KtaApplicationInitial(),
      generated: null,
    );

    expect(find.text('Ajukan KTA'), findsNothing);
    expect(find.text('Lihat Status'), findsNothing);
  });
}

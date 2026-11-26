import 'package:bloc_test/bloc_test.dart';
import 'package:dio/dio.dart';
import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:mobile_flutter/core/api/api_client.dart';
import 'package:mobile_flutter/data/models/kta_application.dart';
import 'package:mobile_flutter/logic/kta_application/kta_application_bloc.dart';
import 'package:mobile_flutter/logic/member/member_bloc.dart';
import 'package:mobile_flutter/presentation/screens/kta_screen.dart';
import 'package:mocktail/mocktail.dart';

import 'helpers/kta_apply_fixtures.dart';

class MockKtaApplicationBloc
    extends MockBloc<KtaApplicationEvent, KtaApplicationState>
    implements KtaApplicationBloc {}

class MockMemberBloc extends MockBloc<MemberEvent, MemberState>
    implements MemberBloc {}

class MockApiClient extends Mock implements ApiClient {}

class MockDio extends Mock implements Dio {}

void main() {
  Future<void> pumpKtaScreen(
    WidgetTester tester, {
    required KtaAppStatus status,
  }) async {
    final memberBloc = MockMemberBloc();
    final ktaBloc = MockKtaApplicationBloc();
    final memberState = memberLoaded(generated: false);
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
    expect(find.text('KTA belum dapat diterbitkan'), findsOneWidget);
  });

  testWidgets('Generate KTA muncul untuk status yang dapat diterbitkan',
      (tester) async {
    await pumpKtaScreen(tester, status: KtaAppStatus.paymentVerified);

    expect(find.text('Generate KTA'), findsOneWidget);
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
    expect(find.text('KTA belum dapat diterbitkan'), findsNothing);
  });

  testWidgets('error generate KTA menampilkan snackbar dan menjaga kartu',
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
    expect(find.text('KTA belum dapat diterbitkan'), findsOneWidget);
  });

  group('error generate KTA', () {
    late MockApiClient api;
    late MockDio dio;

    setUp(() {
      api = MockApiClient();
      dio = MockDio();
      when(() => api.getAccessToken()).thenAnswer((_) async => 'token');
      when(() => api.dio).thenReturn(dio);
      when(() => api.messageFromError(any())).thenAnswer((invocation) =>
          ApiClient().messageFromError(invocation.positionalArguments.first as Object));
    });

    blocTest<MemberBloc, MemberState>(
      'kegagalan generate menyimpan pesan API ke MemberError',
      build: () => MemberBloc(apiClient: api),
      seed: () => memberLoaded(generated: false),
      act: (bloc) => bloc.add(const MemberCardGenerateRequested()),
      wait: const Duration(milliseconds: 100),
      expect: () => [
        const MemberError(
          message: 'KTA tidak dapat diterbitkan (status: PAYMENT_SETUP)',
        ),
      ],
      setUp: () {
        const path = '/members/member-1/digital-card/generate';
        final requestOptions = RequestOptions(path: path);
        when(() => dio.post(path)).thenThrow(
              DioException(
                requestOptions: requestOptions,
                response: Response(
                  requestOptions: requestOptions,
                  statusCode: 400,
                  data: {
                    'message':
                        'KTA tidak dapat diterbitkan (status: PAYMENT_SETUP)',
                  },
                ),
              ),
            );
      },
      verify: (_) {
        verify(() => dio.post('/members/member-1/digital-card/generate')).called(1);
      },
    );
  });
}

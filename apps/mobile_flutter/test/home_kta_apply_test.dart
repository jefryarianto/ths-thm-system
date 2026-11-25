import 'package:bloc_test/bloc_test.dart';
import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:go_router/go_router.dart';
import 'package:mocktail/mocktail.dart';

import 'package:mobile_flutter/core/utils/kta_layout.dart';
import 'package:mobile_flutter/logic/auth/auth_bloc.dart';
import 'package:mobile_flutter/logic/dues/dues_bloc.dart';
import 'package:mobile_flutter/logic/gamification/gamification_bloc.dart';
import 'package:mobile_flutter/logic/home_feed/home_feed_bloc.dart';
import 'package:mobile_flutter/logic/kta_application/kta_application_bloc.dart';
import 'package:mobile_flutter/logic/member/member_bloc.dart';
import 'package:mobile_flutter/logic/notification/notification_bloc.dart';
import 'package:mobile_flutter/presentation/screens/home_screen.dart';
import 'helpers/kta_apply_fixtures.dart';

class MockAuthBloc extends MockBloc<AuthEvent, AuthState> implements AuthBloc {}

class MockMemberBloc extends MockBloc<MemberEvent, MemberState>
    implements MemberBloc {}

class MockDuesBloc extends MockBloc<DuesEvent, DuesState> implements DuesBloc {}

class MockHomeFeedBloc extends MockBloc<HomeFeedEvent, HomeFeedState>
    implements HomeFeedBloc {}

class MockNotificationBloc
    extends MockBloc<NotificationEvent, NotificationState>
    implements NotificationBloc {}

class MockGamificationBloc
    extends MockBloc<GamificationEvent, GamificationState>
    implements GamificationBloc {}

class MockKtaApplicationBloc
    extends MockBloc<KtaApplicationEvent, KtaApplicationState>
    implements KtaApplicationBloc {}

void main() {
  late MockAuthBloc authBloc;
  late MockMemberBloc memberBloc;
  late MockDuesBloc duesBloc;
  late MockHomeFeedBloc homeFeedBloc;
  late MockNotificationBloc notificationBloc;
  late MockGamificationBloc gamificationBloc;
  late MockKtaApplicationBloc ktaBloc;

  setUpAll(() async {
    await KtaLayoutCalculator.ensureFonts();
  });

  setUp(() {
    authBloc = MockAuthBloc();
    memberBloc = MockMemberBloc();
    duesBloc = MockDuesBloc();
    homeFeedBloc = MockHomeFeedBloc();
    notificationBloc = MockNotificationBloc();
    gamificationBloc = MockGamificationBloc();
    ktaBloc = MockKtaApplicationBloc();

    when(() => authBloc.state).thenReturn(AuthInitial());
    when(() => duesBloc.state).thenReturn(DuesInitial());
    when(() => homeFeedBloc.state).thenReturn(const HomeFeedInitial());
    when(() => notificationBloc.state).thenReturn(NotificationInitial());
    when(() => gamificationBloc.state).thenReturn(GamificationInitial());
    when(() => ktaBloc.state).thenReturn(KtaApplicationInitial());
  });

  Widget buildSubject() {
    final router = GoRouter(
      initialLocation: '/',
      routes: [
        GoRoute(
          path: '/',
          builder: (context, state) => const HomeScreen(),
        ),
      ],
    );

    return MultiBlocProvider(
      providers: [
        BlocProvider<AuthBloc>.value(value: authBloc),
        BlocProvider<MemberBloc>.value(value: memberBloc),
        BlocProvider<DuesBloc>.value(value: duesBloc),
        BlocProvider<HomeFeedBloc>.value(value: homeFeedBloc),
        BlocProvider<NotificationBloc>.value(value: notificationBloc),
        BlocProvider<GamificationBloc>.value(value: gamificationBloc),
        BlocProvider<KtaApplicationBloc>.value(value: ktaBloc),
      ],
      child: MaterialApp.router(routerConfig: router),
    );
  }

  testWidgets('kartu belum terbit menampilkan Ajukan KTA tanpa Generate',
      (tester) async {
    when(() => memberBloc.state).thenReturn(memberLoaded(generated: false));

    await tester.pumpWidget(buildSubject());
    await tester.pump();

    expect(find.text('Ajukan KTA'), findsOneWidget);
    expect(find.text('Generate'), findsNothing);
  });

  testWidgets('kartu terbit menyembunyikan Ajukan KTA', (tester) async {
    when(() => memberBloc.state).thenReturn(memberLoaded(generated: true));

    await tester.pumpWidget(buildSubject());
    await tester.pumpAndSettle();

    expect(find.text('Ajukan KTA'), findsNothing);
  });
}

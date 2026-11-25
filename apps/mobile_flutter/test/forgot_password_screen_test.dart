import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:go_router/go_router.dart';
import 'package:mobile_flutter/presentation/screens/forgot_password_screen.dart';

void main() {
  ({Widget widget, GoRouter router}) buildSubject() {
    final router = GoRouter(
      initialLocation: '/forgot-password',
      routes: [
        GoRoute(
          path: '/forgot-password',
          builder: (context, state) => const ForgotPasswordScreen(),
        ),
        GoRoute(
          path: '/login',
          builder: (context, state) => const Text('login-page'),
        ),
      ],
    );
    return (
      widget: MaterialApp.router(routerConfig: router),
      router: router,
    );
  }

  testWidgets('tombol kembali lupa password ada dan membuka /login',
      (tester) async {
    final subject = buildSubject();
    addTearDown(subject.router.dispose);
    await tester.pumpWidget(subject.widget);
    await tester.pumpAndSettle();

    final back = find.byTooltip('Kembali');
    expect(back, findsOneWidget);
    expect(
      find.descendant(of: back, matching: find.byIcon(Icons.arrow_back)),
      findsOneWidget,
    );

    await tester.tap(back);
    await tester.pumpAndSettle();

    expect(
      subject.router.routerDelegate.currentConfiguration.last.matchedLocation,
      '/login',
    );
    expect(find.text('login-page'), findsOneWidget);
  });
}

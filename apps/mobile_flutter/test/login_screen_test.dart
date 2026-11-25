import 'dart:convert';

import 'package:firebase_core/firebase_core.dart';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:go_router/go_router.dart';
import 'package:mobile_flutter/logic/auth/auth_bloc.dart';
import 'package:mobile_flutter/presentation/screens/login_screen.dart';
import 'package:shared_preferences/shared_preferences.dart';

const _fakeFirebaseOptions = <Object?>[
  'key',
  'app-id',
  'sender-id',
  'project-id',
  null,
  null,
  null,
  null,
  null,
  null,
  null,
  null,
  null,
  null,
];

class _FakeFirebaseApp {
  const _FakeFirebaseApp();

  List<Object?> get encoded => <Object?>[
        '[DEFAULT]',
        _fakeFirebaseOptions,
        true,
        <String?, Object?>{},
      ];
}

class _FirebaseReplyCodec extends StandardMessageCodec {
  const _FirebaseReplyCodec();

  @override
  void writeValue(WriteBuffer buffer, Object? value) {
    if (value is _FakeFirebaseApp) {
      buffer.putUint8(129);
      writeValue(buffer, value.encoded);
      return;
    }
    super.writeValue(buffer, value);
  }
}

void main() {
  setUpAll(() async {
    TestWidgetsFlutterBinding.ensureInitialized();
    const codec = _FirebaseReplyCodec();
    TestDefaultBinaryMessengerBinding.instance.defaultBinaryMessenger
        .setMockMessageHandler(
      'dev.flutter.pigeon.FirebaseCoreHostApi.initializeCore',
      (message) async => codec.encodeMessage(<Object?>[
        <Object?>[const _FakeFirebaseApp()],
      ]),
    );
    await Firebase.initializeApp();
    TestDefaultBinaryMessengerBinding.instance.defaultBinaryMessenger
        .setMockMethodCallHandler(
      const MethodChannel('plugins.it_nomads.com/flutter_secure_storage'),
      (call) async => null,
    );
    SharedPreferences.setMockInitialValues(<String, Object>{
      'app_update_cache': jsonEncode(<String, Object?>{
        'enabled': false,
        'versionCode': 0,
        'versionName': '0.0.0',
        'minVersionCode': 0,
        'changelog': '',
        'apkUrl': '',
      }),
      'app_update_cache_time': DateTime.now().millisecondsSinceEpoch,
    });
  });

  GoRouter buildRouter() {
    return GoRouter(
      initialLocation: '/login',
      routes: [
        GoRoute(
          path: '/login',
          builder: (context, state) => BlocProvider(
            create: (_) => AuthBloc(),
            child: const LoginScreen(),
          ),
        ),
      ],
    );
  }

  Future<void> pumpLogin(WidgetTester tester) async {
    final router = buildRouter();
    addTearDown(router.dispose);
    await tester.pumpWidget(MaterialApp.router(routerConfig: router));
    await tester.pump();
  }

  testWidgets('login menampilkan label identifier NRA', (tester) async {
    await pumpLogin(tester);

    expect(find.text('Email / Nomor HP / NRA'), findsOneWidget);
  });

  testWidgets('login menampilkan bantuan format NRA', (tester) async {
    await pumpLogin(tester);

    expect(
      find.text(
        'NRA boleh dengan atau tanpa tanda hubung, cth. LTK-0101-001-2026',
      ),
      findsOneWidget,
    );
  });

  testWidgets('login memakai keyboard teks untuk identifier', (tester) async {
    await pumpLogin(tester);

    final field = find.ancestor(
      of: find.text('Email / Nomor HP / NRA'),
      matching: find.byType(TextField),
    );
    expect(field, findsOneWidget);
    expect(tester.widget<TextField>(field).keyboardType, TextInputType.text);
  });

  testWidgets('login mengingatkan NRA saat kredensial kosong', (tester) async {
    await pumpLogin(tester);
    await tester.tap(find.text('Masuk'));
    await tester.pump();

    expect(
      find.text('Masukkan email/nomor HP/NRA & password'),
      findsOneWidget,
    );
  });
}

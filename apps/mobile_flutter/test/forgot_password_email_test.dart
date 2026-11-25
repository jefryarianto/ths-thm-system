import 'package:dio/dio.dart';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:mobile_flutter/core/api/api_client.dart';
import 'package:mobile_flutter/presentation/screens/forgot_password_screen.dart';

import 'helpers/capture_adapter.dart';

void main() {
  TestWidgetsFlutterBinding.ensureInitialized();

  const channel = MethodChannel('plugins.it_nomads.com/flutter_secure_storage');
  late HttpClientAdapter originalAdapter;

  setUp(() {
    originalAdapter = ApiClient().dio.httpClientAdapter;
    TestDefaultBinaryMessengerBinding.instance.defaultBinaryMessenger
        .setMockMethodCallHandler(channel, (call) async => null);
    ApiClient().dio.httpClientAdapter = CaptureAdapter();
  });

  tearDown(() {
    ApiClient().dio.httpClientAdapter = originalAdapter;
    TestDefaultBinaryMessengerBinding.instance.defaultBinaryMessenger
        .setMockMethodCallHandler(channel, null);
  });

  testWidgets('Lupa password mengirim email ternormalisasi ke API',
      (tester) async {
    final adapter = ApiClient().dio.httpClientAdapter as CaptureAdapter;

    await tester.pumpWidget(const MaterialApp(home: ForgotPasswordScreen()));
    await tester.enterText(
      find.byType(TextField),
      '  User@Example.COM  ',
    );
    await tester.tap(find.text('Kirim Tautan Reset'));
    await tester.pumpAndSettle();

    expect(adapter.lastBody['email'], 'user@example.com');
  });
}

import 'dart:io';

import 'package:bloc_test/bloc_test.dart';
import 'package:dio/dio.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:mobile_flutter/core/api/api_client.dart';
import 'package:mobile_flutter/data/models/kta_application.dart';
import 'package:mobile_flutter/logic/kta_application/kta_application_bloc.dart';
import 'package:mocktail/mocktail.dart';

class MockApiClient extends Mock implements ApiClient {}

class MockDio extends Mock implements Dio {}

void main() {
  late MockApiClient api;
  late MockDio dio;
  late String proofPath;

  final applicationJson = <String, dynamic>{
    'id': 'kta-1',
    'anggotaId': 'member-1',
    'status': 'PAYMENT_PENDING',
    'biaya': 250000,
    'rekeningTujuan': 'BCA 1234567890 a.n. THS THM',
    'buktiBayarPath': '/api/uploads/kta-proofs/bukti.png',
    'statusPembayaran': 'MENUNGGU_VERIFIKASI',
    'catatanAdmin': 'Transfer sebelum batas waktu',
    'submittedByRole': 'member',
    'createdAt': '2026-11-25T00:00:00Z',
    'updatedAt': '2026-11-26T00:00:00Z',
  };

  setUp(() async {
    registerFallbackValue(Options());
    registerFallbackValue(FormData());
    api = MockApiClient();
    dio = MockDio();
    final dir = await Directory.systemTemp.createTemp('kta-proof');
    final file = File('${dir.path}/bukti.png');
    await file.writeAsBytes(<int>[1, 2, 3]);
    proofPath = file.path;

    when(() => api.getAccessToken()).thenAnswer((_) async => 'token');
    when(() => api.dio).thenReturn(dio);
    when(
      () => dio.post(
        '/kta-applications/me/upload-proof',
        data: any(named: 'data'),
        options: any(named: 'options'),
      ),
    ).thenAnswer(
      (_) async => Response(
        requestOptions: RequestOptions(path: '/kta-applications/me/upload-proof'),
        data: {'success': true},
      ),
    );
    when(() => dio.get('/kta-applications/me')).thenAnswer(
      (_) async => Response(
        requestOptions: RequestOptions(path: '/kta-applications/me'),
        data: {'data': applicationJson},
      ),
    );
  });

  test('parses Decimal biaya serialized as string', () {
    final app = KtaApplication.fromJson({
      ...applicationJson,
      'biaya': '250000.00',
    });

    expect(app.biaya, 250000.0);
  });

  test('keeps numeric and null biaya', () {
    final numeric = KtaApplication.fromJson(applicationJson);
    final nullable = KtaApplication.fromJson({
      ...applicationJson,
      'biaya': null,
    });

    expect(numeric.biaya, 250000.0);
    expect(nullable.biaya, isNull);
  });

  blocTest<KtaApplicationBloc, KtaApplicationState>(
    'mengirim bukti ke field bukti lalu me-reload pengajuan',
    build: () => KtaApplicationBloc(apiClient: api),
    act: (bloc) => bloc.add(KtaApplicationProofUploadRequested(filePath: proofPath)),
    wait: const Duration(milliseconds: 100),
    expect: () => [
      isA<KtaApplicationLoading>(),
      isA<KtaApplicationActionSuccess>().having(
        (state) => state.message,
        'message',
        contains('menunggu verifikasi'),
      ),
      isA<KtaApplicationLoading>(),
      isA<KtaApplicationLoaded>().having(
        (state) => state.application.status,
        'status',
        KtaAppStatus.paymentPending,
      ),
    ],
    verify: (_) {
      final formData = verify(
        () => dio.post(
          any(),
          data: captureAny(named: 'data'),
          options: any(named: 'options'),
        ),
      ).captured.first as FormData;
      expect(formData.files.any((file) => file.key == 'bukti'), isTrue);
      verify(() => dio.get('/kta-applications/me')).called(1);
    },
  );
}

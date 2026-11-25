import 'package:dio/dio.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:mobile_flutter/core/api/api_client.dart';
import 'package:mobile_flutter/logic/claim/claim_bloc.dart';
import 'package:mobile_flutter/logic/registration/registration_bloc.dart';

import 'helpers/capture_adapter.dart';

void main() {
  late CaptureAdapter adapter;
  late HttpClientAdapter originalAdapter;

  setUp(() {
    originalAdapter = ApiClient().dio.httpClientAdapter;
    adapter = CaptureAdapter();
    ApiClient().dio.httpClientAdapter = adapter;
  });

  tearDown(() {
    ApiClient().dio.httpClientAdapter = originalAdapter;
  });

  test('RegistrationBloc mengirim email ternormalisasi ke API', () async {
    final bloc = RegistrationBloc();
    final done = bloc.stream.firstWhere(
      (state) =>
          state is RegistrationCreateSuccess || state is RegistrationError,
    );

    bloc.add(const RegistrationCreateRequested(
      namaLengkap: 'Uji Normalisasi',
      jenisKelamin: 'L',
      rantingId: 'r1',
      email: '  User@Example.COM  ',
    ));
    await done;

    expect(adapter.lastBody['email'], 'user@example.com');
    await bloc.close();
  });

  test('ClaimBloc mengirim email ternormalisasi ke API', () async {
    final bloc = ClaimBloc();
    final done = bloc.stream.firstWhere(
      (state) => state is ClaimCreateSuccess || state is ClaimError,
    );

    bloc.add(const ClaimCreateRequested(
      tipe: 'keanggotaan',
      namaLengkap: 'Uji Normalisasi',
      email: '  User@Example.COM  ',
    ));
    await done;

    expect(adapter.lastBody['email'], 'user@example.com');
    await bloc.close();
  });
}

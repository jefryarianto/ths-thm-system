// Unit test ApiClient: penyimpanan token ditiru via mock platform channel
// flutter_secure_storage (in-memory), dan alur refresh-token diuji dengan
// adapter Dio tiruan agar tidak ada jaringan sungguhan.
import 'dart:async';
import 'dart:convert';

import 'package:dio/dio.dart';
import 'package:flutter/services.dart';
import 'package:flutter_test/flutter_test.dart';

import 'package:mobile_flutter/core/api/api_client.dart';

void main() {
  TestWidgetsFlutterBinding.ensureInitialized();

  const channel = MethodChannel('plugins.it_nomads.com/flutter_secure_storage');
  final store = <String, String>{};
  int storageFailureMode = 0; // 0 = normal, 1 = hang, 2 = throw

  setUp(() {
    store.clear();
    storageFailureMode = 0;
    TestDefaultBinaryMessengerBinding.instance.defaultBinaryMessenger
        .setMockMethodCallHandler(channel, (call) async {
      if (storageFailureMode == 1) {
        // "Hang": channel tidak pernah membalas — dipotong oleh _storageProbe
        // (timeout 5 detik di ApiClient).
        await Completer<void>().future;
      }
      if (storageFailureMode == 2) throw PlatformException(code: 'keystore');
      switch (call.method) {
        case 'write':
          final args = (call.arguments as Map).cast<String, Object?>();
          store[args['key']! as String] = args['value']! as String;
          return null;
        case 'read':
          final args = (call.arguments as Map).cast<String, Object?>();
          return store[args['key']! as String];
        case 'delete':
          final args = (call.arguments as Map).cast<String, Object?>();
          store.remove(args['key']! as String);
          return null;
        case 'deleteAll':
          store.clear();
          return null;
        default:
          return null;
      }
    });
  });

  tearDown(() {
    TestDefaultBinaryMessengerBinding.instance.defaultBinaryMessenger
        .setMockMethodCallHandler(channel, null);
  });

  group('penyimpanan & cache token (flutter_secure_storage)', () {
    test('saveTokens lalu getAccessToken/getRefreshToken mengembalikan nilai',
        () async {
      final client = ApiClient();
      await client.saveTokens(accessToken: 'a1', refreshToken: 'r1');

      expect(await client.getAccessToken(), 'a1');
      expect(await client.getRefreshToken(), 'r1');
      expect(store['accessToken'], 'a1');
      expect(store['refreshToken'], 'r1');
    });

    test('clearTokens menghapus cache memori dan storage', () async {
      final client = ApiClient();
      await client.saveTokens(accessToken: 'a1', refreshToken: 'r1');

      await client.clearTokens();

      expect(await client.getAccessToken(), isNull);
      expect(await client.getRefreshToken(), isNull);
      expect(store, isEmpty);
    });

    test('storage hang → dibatalkan timeout, sesi tetap jalan dari memori',
        () async {
      storageFailureMode = 1;
      final client = ApiClient();

      // saveTokens selesai (degradasi), tidak menggantung selamanya.
      await client.saveTokens(accessToken: 'a1', refreshToken: 'r1');
      expect(await client.getAccessToken(), 'a1');
      expect(await client.getRefreshToken(), 'r1');
      expect(store, isEmpty); // tidak sempat tersimpan
    });

    test('storage throw → saveTokens tetap selesai tanpa error', () async {
      storageFailureMode = 2;
      final client = ApiClient();

      await client.saveTokens(accessToken: 'a2', refreshToken: 'r2');
      expect(await client.getAccessToken(), 'a2');
      expect(store, isEmpty);
    });

    test('saveUser/loadUser/clearUser bundel JSON', () async {
      final client = ApiClient();

      await client.saveUser({'id': 'u1', 'namaLengkap': 'Andi'});
      expect(await client.loadUser(), {'id': 'u1', 'namaLengkap': 'Andi'});

      await client.clearUser();
      expect(await client.loadUser(), isNull);
    });

    test('remembered identifier: simpan, baca, hapus', () async {
      final client = ApiClient();

      await client.saveRememberedIdentifier('08123');
      expect(await client.loadRememberedIdentifier(), '08123');

      await client.clearRememberedIdentifier();
      expect(await client.loadRememberedIdentifier(), isNull);
    });
  });

  group('messageFromError', () {
    test('ekstrak message dari response Map API', () {
      final err = DioException(
        requestOptions: RequestOptions(path: '/x'),
        response: Response(
          requestOptions: RequestOptions(path: '/x'),
          statusCode: 400,
          data: {'message': 'Kredensial tidak valid', 'error': 'Bad Request'},
        ),
      );

      expect(ApiClient().messageFromError(err), 'Kredensial tidak valid');
    });

    test('message validasi NestJS berbentuk List digabung', () {
      final err = DioException(
        requestOptions: RequestOptions(path: '/x'),
        response: Response(
          requestOptions: RequestOptions(path: '/x'),
          statusCode: 400,
          data: {'message': ['skor wajib diisi', 'komentar terlalu panjang']},
        ),
      );

      expect(ApiClient().messageFromError(err),
          'skor wajib diisi, komentar terlalu panjang');
    });

    test('pesan kosong → jatuh ke DioException.message', () {
      final err = DioException(
        requestOptions: RequestOptions(path: '/x'),
        message: 'connection timeout',
        response: Response(
          requestOptions: RequestOptions(path: '/x'),
          statusCode: 500,
          data: {'message': ''},
        ),
      );

      expect(ApiClient().messageFromError(err), 'connection timeout');
    });

    test('tanpa pesan apa pun → fallback dipakai', () {
      final err = DioException(requestOptions: RequestOptions(path: '/x'));

      expect(
        ApiClient().messageFromError(err, fallback: 'Gagal memuat'),
        'Gagal memuat',
      );
      expect(ApiClient().messageFromError(err), contains('DioException'));
    });

    test('error non-Dio (Exception biasa) tidak melempar', () {
      expect(
        ApiClient().messageFromError(
          Exception('boom'),
          fallback: 'Terjadi kesalahan',
        ),
        'Terjadi kesalahan',
      );
    });
  });

  group('interceptor refresh-token (adapter tiruan)', () {
    late _ScriptedAdapter adapter;
    late ApiClient client;

    setUp(() {
      adapter = _ScriptedAdapter();
      client = ApiClient();
      client.dio.httpClientAdapter = adapter;
    });

    test('200 langsung — tidak ada percobaan refresh', () async {
      adapter.onGet = (options) async => Response<Object?>(
            requestOptions: options,
            statusCode: 200,
            data: {'ok': true},
          );

      final res = await client.dio.get<Object?>('https://api.test/dues/me');

      expect(res.statusCode, 200);
      expect(adapter.refreshCalls, isEmpty);
    });

    test('401 → refresh dipanggil → request diulang dengan token baru',
        () async {
      await client.saveTokens(accessToken: 'expired', refreshToken: 'r-old');
      adapter.onGet = (options) async {
        if (options.headers['Authorization'] == 'Bearer expired') {
          return Response<Object?>(
            requestOptions: options,
            statusCode: 401,
            data: {'message': 'Unauthorized'},
          );
        }
        return Response<Object?>(
          requestOptions: options,
          statusCode: 200,
          data: {'ok': true},
        );
      };
      adapter.onPost = (options) async {
        if (options.uri.toString().endsWith('/auth/refresh')) {
          adapter.lastRefreshBody = options.data;
          adapter.refreshCalls.add('refresh');
          return Response<Object?>(
            requestOptions: options,
            statusCode: 200,
            data: {
              'success': true,
              'data': {'accessToken': 'new-a', 'refreshToken': 'r-new'},
            },
          );
        }
        return Response<Object?>(requestOptions: options, statusCode: 404);
      };

      final res = await client.dio.get<Object?>('https://api.test/dues/me');

      expect(res.statusCode, 200);
      expect(adapter.refreshCalls.length, 1);
      expect(_decodeBody(adapter.lastRefreshBody)['refreshToken'], 'r-old');
      expect(await client.getAccessToken(), 'new-a');
    });

    test('refresh gagal → token dibersihkan dan error diteruskan', () async {
      await client.saveTokens(accessToken: 'old-a', refreshToken: 'r-old');
      adapter.onGet = (options) async => Response<Object?>(
            requestOptions: options,
            statusCode: 401,
            data: {'message': 'Unauthorized'},
          );
      adapter.onPost = (options) async {
        if (options.uri.toString().endsWith('/auth/refresh')) {
          return Response<Object?>(
            requestOptions: options,
            statusCode: 401,
            data: {'message': 'token invalid'},
          );
        }
        return Response<Object?>(requestOptions: options, statusCode: 404);
      };

      await expectLater(
        client.dio.get<Object?>('https://api.test/dues/me'),
        throwsA(isA<DioException>()),
      );

      expect(await client.getAccessToken(), isNull);
      expect(await client.getRefreshToken(), isNull);
    });

    test('dua request 401 paralel → hanya SATU panggilan /auth/refresh',
        () async {
      await client.saveTokens(accessToken: 'expired', refreshToken: 'r-old');

      final gate = Completer<void>();
      adapter.onGet = (options) async {
        if (options.headers['Authorization'] == 'Bearer expired') {
          // Tahan request agar keduanya 401 bersamaan, lalu refresh tunggal.
          await gate.future;
          return Response<Object?>(
            requestOptions: options,
            statusCode: 401,
            data: {'message': 'Unauthorized'},
          );
        }
        return Response<Object?>(
          requestOptions: options,
          statusCode: 200,
          data: {'ok': true},
        );
      };
      adapter.onPost = (options) async {
        if (options.uri.toString().endsWith('/auth/refresh')) {
          adapter.refreshCalls.add('refresh');
          return Response<Object?>(
            requestOptions: options,
            statusCode: 200,
            data: {
              'success': true,
              'data': {'accessToken': 'new-a', 'refreshToken': 'r-new'},
            },
          );
        }
        return Response<Object?>(requestOptions: options, statusCode: 404);
      };

      final f1 = client.dio.get<Object?>('https://api.test/a');
      await Future<void>.delayed(Duration.zero);
      final f2 = client.dio.get<Object?>('https://api.test/b');
      await Future<void>.delayed(Duration.zero);
      gate.complete();

      final codes = await Future.wait<int>([
        f1.then<int>((r) => r.statusCode ?? 0, onError: (_) => 0),
        f2.then<int>((r) => r.statusCode ?? 0, onError: (_) => 0),
      ]);

      expect(codes, everyElement(200));
      expect(adapter.refreshCalls.length, 1);
      expect(await client.getAccessToken(), 'new-a');
    });
  });
}

/// Body request refresh bisa berupa String ter-encode (pipeline dio) atau Map
/// langsung — normalkan ke Map untuk asersi.
Map<String, dynamic> _decodeBody(Object? raw) {
  if (raw is String) return jsonDecode(raw) as Map<String, dynamic>;
  if (raw is Map) return raw.cast<String, dynamic>();
  return <String, dynamic>{};
}

/// Adapter Dio yang dapat diskrip per test; mencatat panggilan refresh.
class _ScriptedAdapter implements HttpClientAdapter {
  Future<Response<dynamic>> Function(RequestOptions options)? onGet;
  Future<Response<dynamic>> Function(RequestOptions options)? onPost;
  final List<String> refreshCalls = <String>[];
  Object? lastRefreshBody;

  @override
  void close({bool force = false}) {}

  @override
  Future<ResponseBody> fetch(
    RequestOptions options,
    Stream<Uint8List>? requestStream,
    Future<void>? cancelFuture,
  ) async {
    Response<dynamic> res = Response<Object?>(
      requestOptions: options,
      statusCode: 404,
    );
    if (options.method == 'GET' && onGet != null) {
      res = await onGet!(options);
    } else if (options.method == 'POST' && onPost != null) {
      res = await onPost!(options);
    }
    final body = res.data == null
        ? ''
        : res.data is String
            ? res.data! as String
            : jsonEncode(res.data);
    return ResponseBody.fromString(
      body,
      res.statusCode ?? 500,
      headers: {
        Headers.contentTypeHeader: [Headers.jsonContentType],
      },
    );
  }
}

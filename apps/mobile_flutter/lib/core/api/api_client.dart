import 'dart:async';
import 'dart:convert';

import 'package:dio/dio.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';

import '../constants/app_constants.dart';

class ApiClient {
  /// Ubah path relatif (mengandung `/storage/...`) menjadi URL absolut API.
  static String resolveAbsolute(String url) {
    if (url.startsWith('http://') || url.startsWith('https://')) return url;
    final base = Uri.parse(AppConstants.baseUrl);
    final origin = '${base.scheme}://${base.host}:${base.port}';
    final path = url.startsWith('/') ? url : '/$url';
    return '$origin$path';
  }

  static final ApiClient _instance = ApiClient._internal();
  factory ApiClient() => _instance;

  final Dio _dio = Dio();
  final FlutterSecureStorage _storage = const FlutterSecureStorage();
  bool _isRefreshing = false;
  Completer<void>? _refreshCompleter;

  /// Cache memori untuk token. Android Keystore di beberapa emulator hang
  /// (mis. keygen pertama boot) sehingga operasi `flutter_secure_storage`
  /// tidak pernah selesai. Cache ini menjamin interceptor & API lain tetap
  /// jalan dalam sesi ini walaupun persist gagal (degradasi: user harus login
  /// ulang setelah app direstart).
  String? _cachedAccessToken;
  String? _cachedRefreshToken;

  static const Duration _storageOpTimeout = Duration(seconds: 5);

  /// Jalankan operasi storage dengan batas waktu; jika timeout/error, hasilkan
  /// `null` alih-alih menggantung seluruh flow.
  Future<T?> _storageProbe<T>(Future<T?> future, Duration timeout) {
    final completer = Completer<T?>();
    final timer = Timer(timeout, () {
      if (!completer.isCompleted) completer.complete();
    });
    future.then(
      (value) {
        if (!completer.isCompleted) completer.complete(value);
      },
      onError: (_) {
        if (!completer.isCompleted) completer.complete();
      },
    ).whenComplete(() => timer.cancel());
    return completer.future;
  }

  ApiClient._internal() {
    _dio.options.baseUrl = AppConstants.baseUrl;
    _dio.options.connectTimeout = const Duration(seconds: 15);
    _dio.options.receiveTimeout = const Duration(seconds: 15);
    _dio.options.headers = {
      'Content-Type': 'application/json',
    };

    _dio.interceptors.add(InterceptorsWrapper(
      onRequest: (options, handler) async {
        final accessToken = await getAccessToken();
        if (accessToken != null) {
          options.headers['Authorization'] = 'Bearer $accessToken';
        }
        return handler.next(options);
      },
      onError: (error, handler) async {
        if (error.response?.statusCode == 401 &&
            !_isRefreshRequest(error.requestOptions)) {
          if (_isRefreshing) {
            // Wait for ongoing refresh
            await _refreshCompleter?.future;
            final newToken = await getAccessToken();
            if (newToken != null) {
              error.requestOptions.headers['Authorization'] =
                  'Bearer $newToken';
              try {
                final retryResponse = await _dio.fetch(error.requestOptions);
                return handler.resolve(retryResponse);
              } catch (_) {
                return handler.reject(error);
              }
            }
            return handler.reject(error);
          }

          _isRefreshing = true;
          _refreshCompleter = Completer<void>();

          try {
            final refreshToken = await getRefreshToken();
            if (refreshToken == null) {
              await clearTokens();
              return handler.reject(error);
            }

            final response = await _dio.post(
              '${AppConstants.baseUrl}/auth/refresh',
              data: {'refreshToken': refreshToken},
            );
            final newAccessToken = response.data['data']['accessToken'];
            final newRefreshToken = response.data['data']['refreshToken'];

            await saveTokens(
              accessToken: newAccessToken,
              refreshToken: newRefreshToken,
            );

            _refreshCompleter!.complete();

            // Retry original request
            error.requestOptions.headers['Authorization'] =
                'Bearer $newAccessToken';
            final retryResponse = await _dio.fetch(error.requestOptions);
            return handler.resolve(retryResponse);
          } catch (e) {
            _refreshCompleter!.complete();
            await clearTokens();
            return handler.reject(error);
          } finally {
            _isRefreshing = false;
            _refreshCompleter = null;
          }
        }
        return handler.reject(error);
      },
    ));
  }

  bool _isRefreshRequest(RequestOptions options) {
    return options.path.contains('/auth/refresh');
  }

  Dio get dio => _dio;

  /// Ambil pesan error API yang ramah pengguna dari exception Dio.
  /// Ambil pesan error API yang ramah pengguna dari exception apa pun
  /// (umumnya [DioException]). Pesan validasi NestJS (class-validator)
  /// berbentuk List — digabung agar tidak tampil mentah. [fallback]
  /// dipakai bila tidak ada pesan yang bisa diekstrak.
  String messageFromError(Object error, {String? fallback}) {
    try {
      final data = (error as dynamic).response?.data;
      if (data is Map) {
        final m = data['message'];
        if (m is List && m.isNotEmpty) return m.join(', ');
        if (m != null && m.toString().isNotEmpty) return m.toString();
      }
    } catch (_) {}
    if (error is DioException &&
        error.message != null &&
        error.message!.isNotEmpty) {
      return error.message!;
    }
    return fallback ?? error.toString();
  }

  Future<void> saveTokens({
    required String accessToken,
    required String refreshToken,
  }) async {
    _cachedAccessToken = accessToken;
    _cachedRefreshToken = refreshToken;
    // Persist best-effort dengan timeout; jika keystore hang, sesi tetap
    // berjalan via cache memori (token hilang hanya saat app direstart).
    await _storageProbe(
      _storage.write(key: 'accessToken', value: accessToken),
      _storageOpTimeout,
    );
    await _storageProbe(
      _storage.write(key: 'refreshToken', value: refreshToken),
      _storageOpTimeout,
    );
  }

  Future<String?> getAccessToken() async {
    if (_cachedAccessToken != null) return _cachedAccessToken;
    return _storageProbe(
      _storage.read(key: 'accessToken'),
      _storageOpTimeout,
    );
  }

  Future<String?> getRefreshToken() async {
    if (_cachedRefreshToken != null) return _cachedRefreshToken;
    return _storageProbe(
      _storage.read(key: 'refreshToken'),
      _storageOpTimeout,
    );
  }

  Future<void> clearTokens() async {
    _cachedAccessToken = null;
    _cachedRefreshToken = null;
    await _storageProbe(_storage.deleteAll(), _storageOpTimeout);
  }

  // ─── Convenience helpers ────────────────────────────────────────
  Future<void> saveUser(Map<String, dynamic> userJson) async {
    await _storageProbe(
      _storage.write(
        key: 'user',
        value: jsonEncode(userJson),
      ),
      _storageOpTimeout,
    );
  }

  Future<Map<String, dynamic>?> loadUser() async {
    final raw = await _storageProbe(
      _storage.read(key: 'user'),
      _storageOpTimeout,
    );
    if (raw == null) return null;
    return jsonDecode(raw) as Map<String, dynamic>;
  }

  Future<void> clearUser() async {
    await _storageProbe(_storage.delete(key: 'user'), _storageOpTimeout);
  }

  // ─── "Ingat Saya" (hanya identifier — password TIDAK pernah disimpan) ────
  static const String _rememberKey = 'remembered_identifier';

  Future<void> saveRememberedIdentifier(String identifier) async {
    await _storageProbe(
      _storage.write(key: _rememberKey, value: identifier),
      _storageOpTimeout,
    );
  }

  Future<String?> loadRememberedIdentifier() async {
    return _storageProbe(
      _storage.read(key: _rememberKey),
      _storageOpTimeout,
    );
  }

  Future<void> clearRememberedIdentifier() async {
    await _storageProbe(
      _storage.delete(key: _rememberKey),
      _storageOpTimeout,
    );
  }
}

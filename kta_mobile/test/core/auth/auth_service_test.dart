import 'package:flutter_test/flutter_test.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import 'package:kta_mobile/core/auth/auth_service.dart';

class FakeFlutterSecureStorage extends Fake implements FlutterSecureStorage {
  final Map<String, String> _storage = {};

  @override
  Future<String?> read({
    required String key,
    IOSOptions? iOptions,
    AndroidOptions? aOptions,
    LinuxOptions? lOptions,
    WebOptions? webOptions,
    MacOsOptions? mOptions,
    WindowsOptions? wOptions,
  }) async {
    return _storage[key];
  }

  @override
  Future<void> write({
    required String key,
    required String? value,
    IOSOptions? iOptions,
    AndroidOptions? aOptions,
    LinuxOptions? lOptions,
    WebOptions? webOptions,
    MacOsOptions? mOptions,
    WindowsOptions? wOptions,
  }) async {
    if (value != null) {
      _storage[key] = value;
    } else {
      _storage.remove(key);
    }
  }

  @override
  Future<void> delete({
    required String key,
    IOSOptions? iOptions,
    AndroidOptions? aOptions,
    LinuxOptions? lOptions,
    WebOptions? webOptions,
    MacOsOptions? mOptions,
    WindowsOptions? wOptions,
  }) async {
    _storage.remove(key);
  }
}

void main() {
  group('AuthService', () {
    late FakeFlutterSecureStorage fakeStorage;
    late AuthService authService;

    setUp(() {
      fakeStorage = FakeFlutterSecureStorage();
      authService = AuthService(storage: fakeStorage);
    });

    test('getToken returns null when no token is stored', () async {
      expect(await authService.getToken(), isNull);
    });

    test('isLoggedIn returns false when no token is stored', () async {
      expect(await authService.isLoggedIn(), isFalse);
    });

    test('setToken stores token and isLoggedIn returns true', () async {
      await authService.setToken('test_jwt_token_123');
      expect(await authService.getToken(), 'test_jwt_token_123');
      expect(await authService.isLoggedIn(), isTrue);
    });

    test('clearToken removes stored token', () async {
      await authService.setToken('test_jwt_token_123');
      expect(await authService.isLoggedIn(), isTrue);

      await authService.clearToken();
      expect(await authService.getToken(), isNull);
      expect(await authService.isLoggedIn(), isFalse);
    });
  });
}

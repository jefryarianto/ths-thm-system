import 'package:flutter_secure_storage/flutter_secure_storage.dart';

class AuthService {
  static const _tokenKey = 'auth_token';
  final FlutterSecureStorage storage;

  const AuthService({
    this.storage = const FlutterSecureStorage(),
  });

  Future<String?> getToken() async => await storage.read(key: _tokenKey);

  Future<void> setToken(String token) async =>
      await storage.write(key: _tokenKey, value: token);

  Future<void> clearToken() async => await storage.delete(key: _tokenKey);

  Future<bool> isLoggedIn() async => (await getToken()) != null;
}

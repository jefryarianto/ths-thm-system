import 'package:flutter/foundation.dart';

import 'api_client.dart';
import 'models.dart';
import 'token_storage.dart';

class AuthController extends ChangeNotifier {
  AuthController({required TokenStorage tokens, required ApiClient api})
      : _tokens = tokens,
        _api = api;

  final TokenStorage _tokens;
  final ApiClient _api;
  AppUser? user;
  bool isLoading = true;

  bool get isAuthenticated => user != null;

  Future<void> restoreSession() async {
    try {
      if (await _tokens.accessToken != null) {
        await _loadProfile();
      }
    } catch (_) {
      await _tokens.clear();
    } finally {
      isLoading = false;
      notifyListeners();
    }
  }

  Future<void> login(String identifier, String password) async {
    final data = await _api.post('/auth/login', {
      'identifier': identifier.trim(),
      'password': password,
    }) as Map<String, dynamic>;
    if (data['mustChangePassword'] == true) {
      throw const ApiException('Password wajib diubah melalui aplikasi lama terlebih dahulu.');
    }
    final accessToken = data['accessToken'] as String?;
    final refreshToken = data['refreshToken'] as String?;
    final userData = data['user'];
    if (accessToken == null || refreshToken == null || userData is! Map<String, dynamic>) {
      throw const ApiException('Respons login tidak lengkap.');
    }
    await _tokens.save(accessToken: accessToken, refreshToken: refreshToken);
    user = AppUser.fromJson(userData);
    notifyListeners();
  }

  Future<void> logout() async {
    await _tokens.clear();
    user = null;
    notifyListeners();
  }

  Future<void> _loadProfile() async {
    final data = await _api.get('/auth/me');
    if (data is! Map<String, dynamic>) throw const ApiException('Profil tidak valid.');
    user = AppUser.fromJson(data);
  }
}

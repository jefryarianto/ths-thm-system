import 'dart:convert';

import 'package:http/http.dart' as http;

import '../config/app_config.dart';
import 'models.dart';
import 'token_storage.dart';

class ApiClient {
  ApiClient(this._tokens, {http.Client? client}) : _client = client ?? http.Client();

  final TokenStorage _tokens;
  final http.Client _client;
  bool _refreshing = false;

  Future<dynamic> get(String path) => _request('GET', path);
  Future<dynamic> post(String path, [Map<String, dynamic>? body]) =>
      _request('POST', path, body: body);
  Future<dynamic> patch(String path, [Map<String, dynamic>? body]) =>
      _request('PATCH', path, body: body);

  Future<dynamic> _request(String method, String path,
      {Map<String, dynamic>? body, bool retried = false}) async {
    final response = await _send(method, path, body, await _tokens.accessToken);
    if (response.statusCode == 401 && !retried && await _refresh()) {
      return _request(method, path, body: body, retried: true);
    }
    return _decode(response);
  }

  Future<http.Response> _send(
    String method,
    String path,
    Map<String, dynamic>? body,
    String? token,
  ) {
    final headers = <String, String>{
      'Content-Type': 'application/json',
      if (token != null) 'Authorization': 'Bearer $token',
    };
    final uri = Uri.parse('${AppConfig.apiBaseUrl}$path');
    final encodedBody = jsonEncode(body ?? <String, dynamic>{});
    switch (method) {
      case 'POST':
        return _client.post(uri, headers: headers, body: encodedBody).timeout(const Duration(seconds: 15));
      case 'PATCH':
        return _client.patch(uri, headers: headers, body: encodedBody).timeout(const Duration(seconds: 15));
      default:
        return _client.get(uri, headers: headers).timeout(const Duration(seconds: 15));
    }
  }

  Future<bool> _refresh() async {
    if (_refreshing) return false;
    _refreshing = true;
    try {
      final refreshToken = await _tokens.refreshToken;
      if (refreshToken == null) return false;
      final response = await _send('POST', '/auth/refresh', {'refreshToken': refreshToken}, null);
      final data = _decode(response) as Map<String, dynamic>;
      final accessToken = data['accessToken'] as String?;
      final newRefreshToken = data['refreshToken'] as String?;
      if (accessToken == null || newRefreshToken == null) return false;
      await _tokens.save(accessToken: accessToken, refreshToken: newRefreshToken);
      return true;
    } catch (_) {
      await _tokens.clear();
      return false;
    } finally {
      _refreshing = false;
    }
  }

  dynamic _decode(http.Response response) {
    dynamic decoded;
    try {
      decoded = response.body.isEmpty ? <String, dynamic>{} : jsonDecode(response.body);
    } catch (_) {
      decoded = <String, dynamic>{};
    }
    final message = decoded is Map<String, dynamic>
        ? '${decoded['message'] ?? 'Permintaan gagal'}'
        : 'Permintaan gagal';
    if (response.statusCode < 200 || response.statusCode >= 300) {
      throw ApiException(message, statusCode: response.statusCode);
    }
    return decoded is Map<String, dynamic> && decoded.containsKey('data')
        ? decoded['data']
        : decoded;
  }
}

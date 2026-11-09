import 'dart:convert';
import 'package:http/http.dart' as http;
import '../models/anggota.dart';

typedef TokenGetter = String? Function();

class KtaApiService {
  final String baseUrl;
  final TokenGetter? getToken;
  final http.Client _client;

  KtaApiService({
    required this.baseUrl,
    this.getToken,
    http.Client? client,
  }) : _client = client ?? http.Client();

  Map<String, String> get _headers {
    final token = getToken?.call();
    return {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      if (token != null) 'Authorization': 'Bearer $token',
    };
  }

  String _cleanUrl(String path) {
    final base = baseUrl.endsWith('/')
        ? baseUrl.substring(0, baseUrl.length - 1)
        : baseUrl;
    final normalizedPath = path.startsWith('/') ? path : '/$path';
    return '$base$normalizedPath';
  }

  Future<Anggota> fetchAnggota(String id) async {
    final uri = Uri.parse(_cleanUrl('/api/anggota/$id'));
    final response = await _client.get(uri, headers: _headers);

    if (response.statusCode == 200) {
      final dynamic decoded = jsonDecode(response.body);
      if (decoded is Map<String, dynamic>) {
        if (decoded.containsKey('data') &&
            decoded['data'] is Map<String, dynamic>) {
          return Anggota.fromJson(decoded['data'] as Map<String, dynamic>);
        }
        return Anggota.fromJson(decoded);
      }
      throw Exception('Unexpected response format');
    } else {
      throw Exception(
        'Failed to fetch anggota: ${response.statusCode} ${response.body}',
      );
    }
  }

  Future<List<Anggota>> searchAnggota(String query) async {
    final uri = Uri.parse(_cleanUrl('/api/anggota')).replace(
      queryParameters: {'search': query},
    );
    final response = await _client.get(uri, headers: _headers);

    if (response.statusCode == 200) {
      final dynamic decoded = jsonDecode(response.body);
      if (decoded is List) {
        return decoded
            .map((e) => Anggota.fromJson(e as Map<String, dynamic>))
            .toList();
      } else if (decoded is Map<String, dynamic> && decoded['data'] is List) {
        return (decoded['data'] as List)
            .map((e) => Anggota.fromJson(e as Map<String, dynamic>))
            .toList();
      }
      throw Exception('Unexpected response format');
    } else {
      throw Exception(
        'Failed to search anggota: ${response.statusCode} ${response.body}',
      );
    }
  }
}

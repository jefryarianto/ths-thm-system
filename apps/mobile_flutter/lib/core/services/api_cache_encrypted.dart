import 'dart:async';
import 'dart:convert';

import 'package:flutter_secure_storage/flutter_secure_storage.dart';

/// Encrypted API cache using flutter_secure_storage.
///
/// Replaces the SharedPreferences-based ApiCache for sensitive data.
/// Uses the same interface for drop-in migration.
class ApiCacheEncrypted {
  ApiCacheEncrypted._();
  static final ApiCacheEncrypted instance = ApiCacheEncrypted._();

  static const String _keyPrefix = 'api_cache_enc:';
  static const Duration defaultStaleAfter = Duration(hours: 6);

  final FlutterSecureStorage _storage = const FlutterSecureStorage();

  String _fullKey(String key) => '$_keyPrefix$key';

  /// Save payload [data] for [key] with encryption.
  Future<void> set(String key, dynamic data) async {
    try {
      final payload = {
        'savedAt': DateTime.now().toIso8601String(),
        'data': data,
      };
      await _storage.write(
        key: _fullKey(key),
        value: jsonEncode(payload),
      );
    } catch (_) {
      // Cache is best-effort
    }
  }

  /// Get payload for [key]. Returns null if not found.
  /// Flag [CachedPayload.isStale] is true if age exceeds [staleAfter].
  Future<CachedPayload<T>?> get<T>(
    String key, {
    Duration staleAfter = defaultStaleAfter,
  }) async {
    try {
      final raw = await _storage.read(key: _fullKey(key));
      if (raw == null || raw.isEmpty) return null;
      final decoded = jsonDecode(raw);
      if (decoded is! Map<String, dynamic>) return null;
      final savedAt = DateTime.tryParse(decoded['savedAt']?.toString() ?? '');
      final data = decoded['data'];
      if (data == null) return null;
      final age = savedAt == null
          ? staleAfter
          : DateTime.now().difference(savedAt);
      return CachedPayload<T>(
        data: data as T,
        savedAt: savedAt ?? DateTime.now(),
        isStale: age >= staleAfter,
      );
    } catch (_) {
      return null;
    }
  }

  /// Remove single key.
  Future<void> remove(String key) async {
    try {
      await _storage.delete(key: _fullKey(key));
    } catch (_) {}
  }

  /// Clear all cache (called on logout).
  Future<void> clear() async {
    try {
      // flutter_secure_storage doesn't support prefix delete directly
      // We track keys or delete known ones
      final knownKeys = [
        'notifications',
        'dues',
        'documents',
        'home_feed',
        'forum_categories',
        'forum_threads',
        'forum_thread',
        'gamification',
        'member',
        'pendadaran',
      ];
      for (final k in knownKeys) {
        await _storage.delete(key: _fullKey(k));
      }
    } catch (_) {}
  }

  /// Clear all keys (nuclear option - deletes everything in secure storage)
  Future<void> clearAll() async {
    try {
      await _storage.deleteAll();
    } catch (_) {}
  }
}

/// Cache payload: data + metadata.
class CachedPayload<T> {
  final T data;
  final DateTime savedAt;
  final bool isStale;

  const CachedPayload({
    required this.data,
    required this.savedAt,
    required this.isStale,
  });

  String get ageDescription {
    final diff = DateTime.now().difference(savedAt);
    if (diff.inMinutes < 1) return 'baru saja';
    if (diff.inMinutes < 60) return '${diff.inMinutes} menit lalu';
    if (diff.inHours < 24) return '${diff.inHours} jam lalu';
    return '${diff.inDays} hari lalu';
  }
}

/// Standard cache keys.
class CacheKeys {
  const CacheKeys._();

  static const String notifications = 'notifications';
  static const String dues = 'dues';
  static const String documents = 'documents';
  static const String homeFeed = 'home_feed';
  static const String forumCategories = 'forum_categories';
  static const String forumThreads = 'forum_threads';
  static const String forumThread = 'forum_thread';
  static const String gamification = 'gamification';
  static const String member = 'member';
  static const String pendadaran = 'pendadaran';
}
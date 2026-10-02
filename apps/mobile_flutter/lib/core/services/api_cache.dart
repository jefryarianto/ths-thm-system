import 'dart:async';
import 'dart:convert';

import 'package:shared_preferences/shared_preferences.dart';

/// Layer cache sederhana untuk permintaan API yang sering diakses.
///
/// Menggunakan `SharedPreferences` (sudah jadi dependency) untuk menyimpan
/// payload JSON terakhir per key. Ketika aplikasi offline / server lambat,
/// UI bisa langsung menampilkan data cache alih-alih error kosong.
///
/// Kebijakan (staleness-based):
/// - [get] mengembalikan data + flag `isStale`. UI menampilkan data
///   beserta indikator "data lama" bila `isStale == true`.
/// - [set] menyimpan payload mentah + timestamp sekarang.
/// - [clear] membuang key (mis. saat logout).
///
/// Catatan: payload disimpan apa adanya; encoding JSON besar (~ratusan KB)
/// masih aman untuk `SharedPreferences`.
class ApiCache {
  ApiCache._();
  static final ApiCache instance = ApiCache._();

  static const String _keyPrefix = 'api_cache:';
  static const Duration defaultStaleAfter = Duration(hours: 6);

  Future<SharedPreferences> _prefs() => SharedPreferences.getInstance();

  String _fullKey(String key) => '$_keyPrefix$key';

  /// Simpan payload [data] (List atau Map) untuk [key].
  Future<void> set(String key, dynamic data) async {
    try {
      final prefs = await _prefs();
      final payload = {
        'savedAt': DateTime.now().toIso8601String(),
        'data': data,
      };
      await prefs.setString(_fullKey(key), jsonEncode(payload));
    } catch (_) {
      // Cache bersifat best-effort: kegagalan tidak boleh memutus flow.
    }
  }

  /// Ambil payload untuk [key]. Mengembalikan null bila tidak ada cache.
  /// Flag [CachedPayload.isStale] true bila umur cache melebihi [staleAfter].
  Future<CachedPayload<T>?> get<T>(
    String key, {
    Duration staleAfter = defaultStaleAfter,
  }) async {
    try {
      final prefs = await _prefs();
      final raw = prefs.getString(_fullKey(key));
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

  /// Buang satu key.
  Future<void> remove(String key) async {
    try {
      final prefs = await _prefs();
      await prefs.remove(_fullKey(key));
    } catch (_) {}
  }

  /// Buang seluruh cache (dipanggil saat logout).
  Future<void> clear() async {
    try {
      final prefs = await _prefs();
      final keys = prefs
          .getKeys()
          .where((k) => k.startsWith(_keyPrefix))
          .toList(growable: false);
      for (final k in keys) {
        await prefs.remove(k);
      }
    } catch (_) {}
  }
}

/// Hasil cache: data + metadata umur.
class CachedPayload<T> {
  final T data;
  final DateTime savedAt;
  final bool isStale;

  const CachedPayload({
    required this.data,
    required this.savedAt,
    required this.isStale,
  });

  /// Deskripsi umur untuk indikator UI ("diperbarui 3 jam lalu").
  String get ageDescription {
    final diff = DateTime.now().difference(savedAt);
    if (diff.inMinutes < 1) return 'baru saja';
    if (diff.inMinutes < 60) return '${diff.inMinutes} menit lalu';
    if (diff.inHours < 24) return '${diff.inHours} jam lalu';
    return '${diff.inDays} hari lalu';
  }
}

/// Key cache standar agar tidak ada kesalahan ketik antar blok.
class CacheKeys {
  const CacheKeys._();

  static const String notifications = 'notifications';
  static const String dues = 'dues';
  static const String documents = 'documents';
  static const String homeFeed = 'home_feed';
  static const String forumCategories = 'forum_categories';
  static const String gamification = 'gamification';
  static const String member = 'member';
  static const String pendadaran = 'pendadaran';
}
